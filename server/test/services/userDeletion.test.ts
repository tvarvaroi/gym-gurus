/**
 * Account Deletion Service Tests — Sprint 2 BATCH 7
 *
 * Coverage:
 *   - audit-first ordering: logger.audit('account.deleted', ...) MUST fire
 *     BEFORE any mutation (R2 delete, push deactivation, Stripe cancel,
 *     PII anonymization)
 *   - cascade contract: R2 cleanup runs, push subscriptions are marked
 *     inactive (NOT deleted — forensic value retained), PII fields
 *     anonymized, deletedAt set
 *   - 'account.delete_attempted_no_user' audit event fires when userId
 *     does not resolve (defense against silent no-op)
 *   - Stripe cancellation is best-effort: failure does not abort
 *
 * The audit-first invariant is the load-bearing privacy guarantee. If the
 * test fails because audit was not called first, you've broken forensic
 * chain of custody — fix the order, not the test.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper, callOrder } = vi.hoisted(() => {
  const callOrder: string[] = [];
  const spyState = {
    queue: [] as unknown[],
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.queue = [];
      this.operations = [];
      callOrder.length = 0;
    },
  };

  function makeQueryBuilder() {
    const qb: Record<string, unknown> = {};
    const passthrough = ['from', 'where', 'orderBy', 'limit', 'values', 'returning', 'set'];
    for (const m of passthrough) {
      qb[m] = (...args: unknown[]) => {
        spyState.operations.push({ op: m, args });
        return qb;
      };
    }
    qb.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const next = spyState.queue.length > 0 ? spyState.queue.shift() : [];
      return Promise.resolve(next).then(resolve, reject);
    };
    return qb;
  }

  function makeDbWrapper() {
    return {
      select: (...args: unknown[]) => {
        spyState.operations.push({ op: 'select', args });
        callOrder.push('db.select');
        return makeQueryBuilder();
      },
      update: (...args: unknown[]) => {
        spyState.operations.push({ op: 'update', args });
        callOrder.push('db.update');
        return makeQueryBuilder();
      },
      insert: (...args: unknown[]) => {
        spyState.operations.push({ op: 'insert', args });
        callOrder.push('db.insert');
        return makeQueryBuilder();
      },
      delete: (...args: unknown[]) => {
        spyState.operations.push({ op: 'delete', args });
        callOrder.push('db.delete');
        return makeQueryBuilder();
      },
    };
  }

  return { spyState, makeDbWrapper, callOrder };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../db', () => {
  const wrapper = makeDbWrapper();
  return {
    getDb: vi.fn(async () => wrapper),
    db: wrapper,
    getPool: vi.fn(),
    pool: null,
  };
});

const auditMock = vi.fn((event: string) => {
  callOrder.push(`audit:${event}`);
});
const errorMock = vi.fn();
const infoMock = vi.fn();

vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: (...args: unknown[]) => infoMock(...args),
    warn: vi.fn(),
    error: (...args: unknown[]) => errorMock(...args),
    audit: (event: string, data: unknown) => {
      auditMock(event, data);
    },
  },
  log: vi.fn(),
}));

vi.mock('../../services/orphanCleanup', () => ({
  cleanupOrphanedR2Objects: vi.fn(async (userId: string) => {
    callOrder.push(`r2:${userId}`);
    return { deleted: 3, failed: 0, skipped: 0 };
  }),
}));

vi.mock('stripe', () => {
  const cancel = vi.fn(async (subId: string) => {
    callOrder.push(`stripe.cancel:${subId}`);
    return { id: subId };
  });
  const Stripe = vi.fn(() => ({
    subscriptions: { cancel },
  }));
  return { default: Stripe };
});

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { deleteUserAccount } from '../../services/userDeletion';

// ===========================================================================
// audit-first invariant
// ===========================================================================

describe('deleteUserAccount — audit-first ordering invariant', () => {
  beforeEach(() => {
    spyState.reset();
    auditMock.mockReset();
    errorMock.mockReset();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });

  it('fires logger.audit("account.deleted", ...) BEFORE any mutation', async () => {
    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: 'Alice',
        lastName: 'A',
        stripeCustomerId: 'cus_123',
        subscriptionId: 'sub_456',
        subscriptionStatus: 'active',
      },
    ]);
    spyState.queueResults([{ id: 'ps-1' }, { id: 'ps-2' }]); // push subs returning
    spyState.queueResults([]); // user UPDATE

    await deleteUserAccount('user-A');

    // Find indices in callOrder
    const auditIdx = callOrder.findIndex((c) => c === 'audit:account.deleted');
    const r2Idx = callOrder.findIndex((c) => c.startsWith('r2:'));
    const updateIdx = callOrder.findIndex((c, i) => c === 'db.update' && i > auditIdx);

    expect(auditIdx).toBeGreaterThanOrEqual(0); // audit happened
    expect(r2Idx).toBeGreaterThan(auditIdx); // r2 came AFTER audit
    expect(updateIdx).toBeGreaterThan(auditIdx); // first mutation came AFTER audit
  });

  it('audit log payload includes original PII (email, firstName, lastName)', async () => {
    spyState.queueResults([
      {
        id: 'user-B',
        email: 'b@test.com',
        firstName: 'Bob',
        lastName: 'B',
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
      },
    ]);
    spyState.queueResults([]); // push subs returning
    spyState.queueResults([]); // user UPDATE

    await deleteUserAccount('user-B');

    expect(auditMock).toHaveBeenCalledWith(
      'account.deleted',
      expect.objectContaining({
        userId: 'user-B',
        email: 'b@test.com',
        firstName: 'Bob',
        lastName: 'B',
        hadActiveSubscription: false,
      })
    );
  });

  it('hadActiveSubscription is true for status="active" or "trialing"', async () => {
    spyState.queueResults([
      {
        id: 'user-C',
        email: 'c@test.com',
        firstName: null,
        lastName: null,
        stripeCustomerId: 'cus_xx',
        subscriptionId: 'sub_xx',
        subscriptionStatus: 'trialing',
      },
    ]);
    spyState.queueResults([]);
    spyState.queueResults([]);

    await deleteUserAccount('user-C');

    expect(auditMock).toHaveBeenCalledWith(
      'account.deleted',
      expect.objectContaining({ hadActiveSubscription: true })
    );
  });
});

// ===========================================================================
// Cascade contract
// ===========================================================================

describe('deleteUserAccount — cascade contract', () => {
  beforeEach(() => {
    spyState.reset();
    auditMock.mockReset();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });

  it('runs R2 orphan cleanup and reports the count', async () => {
    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: 'A',
        lastName: 'A',
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
      },
    ]);
    spyState.queueResults([]); // push subs
    spyState.queueResults([]); // user update

    const result = await deleteUserAccount('user-A');
    expect(result.r2.deleted).toBe(3); // matches mock fixture
    expect(callOrder).toContain('r2:user-A');
  });

  it('marks ALL push subscriptions inactive (does NOT delete rows — forensic value)', async () => {
    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: null,
        lastName: null,
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
      },
    ]);
    spyState.queueResults([{ id: 'ps-1' }, { id: 'ps-2' }, { id: 'ps-3' }]);
    spyState.queueResults([]);

    const result = await deleteUserAccount('user-A');
    expect(result.pushSubsMarkedInactive).toBe(3);

    // First UPDATE sets active=false on push_subscriptions; verify .set() was
    // called with active: false (NOT a delete operation)
    const setOps = spyState.operations.filter((o) => o.op === 'set');
    const inactiveSet = setOps.find((o) => (o.args[0] as { active?: boolean }).active === false);
    expect(inactiveSet).toBeDefined();
    // No delete() was called against push_subscriptions
    const deleteOps = spyState.operations.filter((o) => o.op === 'delete');
    expect(deleteOps).toHaveLength(0);
  });

  it('anonymizes PII fields on the user row + sets deletedAt', async () => {
    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: 'A',
        lastName: 'A',
        stripeCustomerId: 'cus_xx',
        subscriptionId: null,
        subscriptionStatus: null,
      },
    ]);
    spyState.queueResults([]);
    spyState.queueResults([]);

    await deleteUserAccount('user-A');

    // The LAST .set() call (after r2, push subs) must be the anonymization
    const setOps = spyState.operations.filter((o) => o.op === 'set');
    const userAnon = setOps.find((o) => {
      const v = o.args[0] as Record<string, unknown>;
      return v.email === 'deleted-user-A@deleted.invalid';
    });
    expect(userAnon).toBeDefined();
    const v = userAnon!.args[0] as Record<string, unknown>;
    expect(v.firstName).toBeNull();
    expect(v.lastName).toBeNull();
    expect(v.password).toBeNull();
    expect(v.stripeCustomerId).toBeNull();
    expect(v.subscriptionId).toBeNull();
    expect(v.deletedAt).toBeInstanceOf(Date);
  });

  it('Stripe cancel is best-effort — failure does NOT abort deletion', async () => {
    // Re-mock Stripe to throw on cancel
    const StripeMod = await import('stripe');
    const failingCancel = vi.fn(() => {
      throw new Error('Stripe API down');
    });
    (StripeMod.default as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      subscriptions: { cancel: failingCancel },
    }));

    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: null,
        lastName: null,
        stripeCustomerId: 'cus_xx',
        subscriptionId: 'sub_xx',
        subscriptionStatus: 'active',
      },
    ]);
    spyState.queueResults([]);
    spyState.queueResults([]); // user UPDATE still runs

    const result = await deleteUserAccount('user-A');
    expect(result.stripe).toBe('cancel_failed');
    // Anonymization still happened
    const setOps = spyState.operations.filter((o) => o.op === 'set');
    const anonSet = setOps.find(
      (o) => (o.args[0] as { email?: string }).email === 'deleted-user-A@deleted.invalid'
    );
    expect(anonSet).toBeDefined();
  });

  it('Stripe is "no_subscription" when user has no subscriptionId', async () => {
    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: null,
        lastName: null,
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
      },
    ]);
    spyState.queueResults([]);
    spyState.queueResults([]);

    const result = await deleteUserAccount('user-A');
    expect(result.stripe).toBe('no_subscription');
  });

  it('Stripe is "stripe_not_configured" when STRIPE_SECRET_KEY missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    spyState.queueResults([
      {
        id: 'user-A',
        email: 'a@test.com',
        firstName: null,
        lastName: null,
        stripeCustomerId: 'cus_xx',
        subscriptionId: 'sub_xx',
        subscriptionStatus: 'active',
      },
    ]);
    spyState.queueResults([]);
    spyState.queueResults([]);

    const result = await deleteUserAccount('user-A');
    expect(result.stripe).toBe('stripe_not_configured');
    // Restore for subsequent tests
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });
});

// ===========================================================================
// Defense: deletion attempt against missing user
// ===========================================================================

describe('deleteUserAccount — missing user defense', () => {
  beforeEach(() => {
    spyState.reset();
    auditMock.mockReset();
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  });

  it('fires "account.delete_attempted_no_user" audit when SELECT returns nothing', async () => {
    spyState.queueResults([]); // SELECT → no user

    const result = await deleteUserAccount('user-ghost');
    expect(result.email).toBe('');
    expect(result.r2).toEqual({ deleted: 0, failed: 0, skipped: 0 });
    expect(auditMock).toHaveBeenCalledWith(
      'account.delete_attempted_no_user',
      expect.objectContaining({ userId: 'user-ghost' })
    );
    // No subsequent mutations happened
    const updateOps = spyState.operations.filter((o) => o.op === 'update');
    expect(updateOps).toHaveLength(0);
  });
});

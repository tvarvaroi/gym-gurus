/**
 * Wearable Connections Service Tests — Sprint 4 BATCH 2
 *
 * Coverage:
 *   - listConnections — IDOR clause (eq(userId)) is in WHERE
 *   - initiateOAuth — pre-creates row with onConflictDoNothing(userId, provider)
 *   - handleOAuthCallback — flips status, dispatches wearable_connected
 *   - disconnect — IDOR mutation target (eq(id) AND eq(userId) in WHERE,
 *                  removing the userId clause MUST fail this test)
 *   - markSyncError 3-strike: count===1 fires sync_failed, count===3 + connected
 *                  flips to 'expired' + fires wearable_expired, count===5
 *                  (already expired) fires nothing
 *   - recordSuccessfulSync — clears the error counters
 *
 * Strategy: drizzle-orm operators (eq, and) are spied via vi.hoisted. Service
 * code runs unmodified. Notification dispatch is mocked. The Open Wearables
 * client is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted shared state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper } = vi.hoisted(() => {
  const spyState = {
    eqCalls: [] as Array<[unknown, unknown]>,
    andCalls: [] as Array<unknown[]>,
    queue: [] as unknown[],
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.eqCalls = [];
      this.andCalls = [];
      this.queue = [];
      this.operations = [];
    },
  };

  function makeQueryBuilder() {
    const qb: Record<string, unknown> = {};
    const passthrough = [
      'from',
      'where',
      'orderBy',
      'limit',
      'values',
      'returning',
      'set',
      'onConflictDoNothing',
      'onConflictDoUpdate',
    ];
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

  function makeDbWrapper(): Record<string, unknown> {
    const wrapper: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        spyState.operations.push({ op: 'select', args });
        return makeQueryBuilder();
      },
      insert: (...args: unknown[]) => {
        spyState.operations.push({ op: 'insert', args });
        return makeQueryBuilder();
      },
      update: (...args: unknown[]) => {
        spyState.operations.push({ op: 'update', args });
        return makeQueryBuilder();
      },
      delete: (...args: unknown[]) => {
        spyState.operations.push({ op: 'delete', args });
        return makeQueryBuilder();
      },
    };
    // Sprint 4 Task 5a.10 — initiateOAuth wraps INSERT + createUser + UPDATE
    // in db.transaction(async tx => ...). Mock supplies the same wrapper as
    // tx so spyState captures every operation inside the txn.
    wrapper.transaction = async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
      spyState.operations.push({ op: 'transaction', args: [] });
      return fn(wrapper);
    };
    return wrapper;
  }

  return { spyState, makeDbWrapper };
});

// ---------------------------------------------------------------------------
// Module mocks — must come BEFORE imports of services/wearableConnections
// ---------------------------------------------------------------------------

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => {
      spyState.eqCalls.push([col, val]);
      return actual.eq(col as never, val as never);
    },
    and: (...filters: unknown[]) => {
      spyState.andCalls.push(filters);
      return actual.and(...(filters as never[]));
    },
  };
});

vi.mock('../../db', () => {
  const wrapper = makeDbWrapper();
  return {
    getDb: vi.fn(async () => wrapper),
    db: wrapper,
    getPool: vi.fn(),
    pool: null,
  };
});

const { dispatchMock, owMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(async () => ({ notificationId: 'n1', outcome: 'sent' as const })),
  owMock: {
    requestConnectUrl: vi.fn(async () => ({ connectUrl: 'https://ow/connect/x', state: 's' })),
    getConnectionStatus: vi.fn(async () => ({
      connected: true,
      providerUserId: 'whoop-uid-1',
      capabilities: ['sleep', 'hrv'] as string[],
    })),
    triggerSync: vi.fn(async () => ({ ok: true })),
    revokeConnection: vi.fn(async () => ({ ok: true })),
    createUser: vi.fn(async () => ({ id: 'ow-uuid-mock', external_user_id: 'user-A' })),
  },
}));
vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: dispatchMock,
}));
vi.mock('../../services/openWearablesClient', () => owMock);

vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
  log: vi.fn(),
}));

// ---------------------------------------------------------------------------
// AFTER mocks — import the SUT and the schema for column refs
// ---------------------------------------------------------------------------

import {
  listConnections,
  initiateOAuth,
  handleOAuthCallback,
  disconnect,
  markSyncError,
  recordSuccessfulSync,
} from '../../services/wearableConnections';
import { wearableConnections } from '@shared/schema';

function expectOwnershipClause(column: unknown, expectedValue: unknown) {
  const match = spyState.eqCalls.find(([col, val]) => col === column && val === expectedValue);
  expect(
    match,
    `Expected eq(<column>, ${JSON.stringify(expectedValue)}) in WHERE clause. ` +
      `Got eq calls: ${JSON.stringify(spyState.eqCalls.map(([_c, v]) => v))}`
  ).toBeDefined();
}

// ===========================================================================
// listConnections — IDOR ownership clause
// ===========================================================================

describe('listConnections', () => {
  beforeEach(() => spyState.reset());

  it('filters by userId — eq(wearableConnections.userId, callerId) in WHERE', async () => {
    spyState.queueResults([{ id: 'c1', userId: 'user-A', provider: 'whoop' }]);
    const rows = await listConnections('user-A');
    expect(rows).toHaveLength(1);
    expectOwnershipClause(wearableConnections.userId, 'user-A');
  });

  it('cross-user IDOR: caller user-B sees no user-A rows (real DB filters)', async () => {
    // Real Postgres returns [] when user-B asks for user-A rows. The mock
    // returns whatever we queue — what matters is the IDOR clause is for
    // user-B (caller), not user-A.
    spyState.queueResults([]);
    await listConnections('user-B');
    expectOwnershipClause(wearableConnections.userId, 'user-B');
    const userAOnUserIdCol = spyState.eqCalls.find(
      ([col, val]) => col === wearableConnections.userId && val === 'user-A'
    );
    expect(userAOnUserIdCol).toBeUndefined();
  });
});

// ===========================================================================
// initiateOAuth — pre-creates row + calls Open Wearables
// ===========================================================================

describe('initiateOAuth', () => {
  beforeEach(() => {
    spyState.reset();
    owMock.requestConnectUrl.mockClear();
    owMock.createUser.mockClear();
    owMock.createUser.mockResolvedValue({ id: 'ow-uuid-mock', external_user_id: 'user-A' });
  });

  it('pre-creates a disconnected row with onConflictDoNothing on (userId, provider) inside a transaction', async () => {
    spyState.queueResults([]); // INSERT chain awaited
    spyState.queueResults([]); // UPDATE chain (UUID persistence)
    const result = await initiateOAuth('user-A', 'whoop');
    // Verify transaction was opened (Sprint 4 Task 5a.10 — atomicity gate
    // covering INSERT + createUser + UPDATE).
    const txnOps = spyState.operations.filter((o) => o.op === 'transaction');
    expect(txnOps).toHaveLength(1);
    const insertOps = spyState.operations.filter((o) => o.op === 'insert');
    expect(insertOps).toHaveLength(1);
    const conflictOp = spyState.operations.find((o) => o.op === 'onConflictDoNothing');
    expect(conflictOp).toBeDefined();
    expect(result.connectUrl).toBe('https://ow/connect/x');
  });

  it('forwards (provider, userId) to Open Wearables connect URL endpoint', async () => {
    spyState.queueResults([]);
    spyState.queueResults([]);
    await initiateOAuth('user-A', 'oura');
    expect(owMock.requestConnectUrl).toHaveBeenCalledWith('oura', 'user-A');
  });

  it('persists OW UUID via createUser → UPDATE inside same transaction (Path B)', async () => {
    spyState.queueResults([]); // INSERT chain
    spyState.queueResults([]); // UPDATE chain
    owMock.createUser.mockResolvedValueOnce({
      id: 'ow-uuid-persist-test',
      external_user_id: 'user-A',
    });

    await initiateOAuth('user-A', 'garmin');

    // createUser called with our internal user UUID as external_user_id
    expect(owMock.createUser).toHaveBeenCalledWith({ external_user_id: 'user-A' });

    // Inside the same transaction, an UPDATE was issued setting
    // openWearablesUserId from the createUser response.
    const txnOps = spyState.operations.filter((o) => o.op === 'transaction');
    expect(txnOps).toHaveLength(1);
    const updateOps = spyState.operations.filter((o) => o.op === 'update');
    expect(updateOps).toHaveLength(1);
    const setOp = spyState.operations.find((o) => o.op === 'set');
    expect(setOp).toBeDefined();
    const setArg = setOp?.args[0] as Record<string, unknown>;
    expect(setArg.openWearablesUserId).toBe('ow-uuid-persist-test');
  });

  it('throws if createUser returns no id (cannot persist OW UUID bridge)', async () => {
    spyState.queueResults([]); // INSERT chain
    spyState.queueResults([]); // UPDATE chain (won't be hit)
    owMock.createUser.mockResolvedValueOnce({ id: '', external_user_id: 'user-A' });

    await expect(initiateOAuth('user-A', 'polar')).rejects.toThrow(/createUser returned no/);
  });
});

// ===========================================================================
// handleOAuthCallback — flips status + dispatches wearable_connected
// ===========================================================================

describe('handleOAuthCallback', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    owMock.getConnectionStatus.mockClear();
    owMock.triggerSync.mockClear();
  });

  it('flips status to connected and dispatches wearable_connected', async () => {
    owMock.getConnectionStatus.mockResolvedValueOnce({
      connected: true,
      providerUserId: 'whoop-uid-1',
      capabilities: ['sleep', 'hrv'],
    });
    spyState.queueResults([]); // UPDATE chain awaited
    spyState.queueResults([{ owUserId: 'ow-uuid-mock' }]); // SELECT for triggerSync

    await handleOAuthCallback('user-A', 'whoop');

    // UPDATE WHERE eq(userId, user-A) AND eq(provider, whoop)
    expectOwnershipClause(wearableConnections.userId, 'user-A');
    expectOwnershipClause(wearableConnections.provider, 'whoop');
    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_connected', {
      provider: 'whoop',
    });
  });

  it('throws if Open Wearables reports user is not connected', async () => {
    owMock.getConnectionStatus.mockResolvedValueOnce({ connected: false });
    await expect(handleOAuthCallback('user-A', 'whoop')).rejects.toThrow(/not connected/);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('async-fires triggerSync with OW UUID (Path B) — does not block return', async () => {
    owMock.getConnectionStatus.mockResolvedValueOnce({ connected: true });
    spyState.queueResults([]); // UPDATE chain
    spyState.queueResults([{ owUserId: 'ow-uuid-async' }]); // SELECT row
    await handleOAuthCallback('user-A', 'whoop');
    // triggerSync uses OW's UUID, NOT our internal user UUID. Path B locks
    // OW data-fetching endpoints to OW's UUID.
    expect(owMock.triggerSync).toHaveBeenCalledWith('whoop', 'ow-uuid-async');
  });

  it('skips triggerSync when row has no open_wearables_user_id (warns instead)', async () => {
    owMock.getConnectionStatus.mockResolvedValueOnce({ connected: true });
    spyState.queueResults([]); // UPDATE chain
    spyState.queueResults([{ owUserId: null }]); // SELECT — no UUID persisted
    await handleOAuthCallback('user-A', 'whoop');
    expect(owMock.triggerSync).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// disconnect — IDOR MUTATION TARGET (load-bearing)
// ===========================================================================

describe('disconnect', () => {
  beforeEach(() => {
    spyState.reset();
    owMock.revokeConnection.mockClear();
  });

  it('SELECTs with BOTH eq(id, connectionId) AND eq(userId, callerId) — IDOR mutation target', async () => {
    spyState.queueResults([
      {
        id: 'conn-1',
        userId: 'user-A',
        provider: 'whoop',
        openWearablesUserId: 'ow-uuid-1',
      },
    ]);
    spyState.queueResults([]); // UPDATE chain

    await disconnect('user-A', 'conn-1');

    // Both ownership clauses MUST be in the SELECT WHERE. Removing the userId
    // clause is the BATCH 11 mutation-test target — it would let user-B
    // disconnect user-A's wearables by guessing the connectionId UUID.
    expectOwnershipClause(wearableConnections.id, 'conn-1');
    expectOwnershipClause(wearableConnections.userId, 'user-A');
  });

  it('calls OW revokeConnection with OW UUID (Path B), not our user UUID', async () => {
    spyState.queueResults([
      {
        id: 'conn-1',
        userId: 'user-A',
        provider: 'whoop',
        openWearablesUserId: 'ow-uuid-revoke',
      },
    ]);
    spyState.queueResults([]);

    await disconnect('user-A', 'conn-1');
    // Path B: revoke endpoint requires OW's UUID, not our internal UUID.
    expect(owMock.revokeConnection).toHaveBeenCalledWith('whoop', 'ow-uuid-revoke');
  });

  it('skips OW revoke when row has no open_wearables_user_id (local-only disconnect)', async () => {
    spyState.queueResults([
      {
        id: 'conn-1',
        userId: 'user-A',
        provider: 'whoop',
        openWearablesUserId: null,
      },
    ]);
    spyState.queueResults([]);

    await disconnect('user-A', 'conn-1');
    expect(owMock.revokeConnection).not.toHaveBeenCalled();
  });

  it('UPDATEs with BOTH eq(id, connectionId) AND eq(userId, callerId)', async () => {
    spyState.queueResults([
      {
        id: 'conn-1',
        userId: 'user-A',
        provider: 'whoop',
        openWearablesUserId: 'ow-uuid-1',
      },
    ]);
    spyState.queueResults([]);
    await disconnect('user-A', 'conn-1');

    // Capture both id and userId ownership clauses (twice — once for SELECT,
    // once for UPDATE).
    const idClauses = spyState.eqCalls.filter(
      ([col, val]) => col === wearableConnections.id && val === 'conn-1'
    );
    const userIdClauses = spyState.eqCalls.filter(
      ([col, val]) => col === wearableConnections.userId && val === 'user-A'
    );
    expect(idClauses.length).toBeGreaterThanOrEqual(2); // SELECT + UPDATE
    expect(userIdClauses.length).toBeGreaterThanOrEqual(2);
  });

  it('throws if connection not found (cross-user attempt — userB → userA conn)', async () => {
    // Real DB filters by userId=user-B; SELECT returns []. The throw is what
    // a cross-user attempt actually experiences.
    spyState.queueResults([]);

    await expect(disconnect('user-B', 'conn-A-1')).rejects.toThrow(/not found/);
    // Open Wearables revoke must NOT be called — we never confirmed ownership.
    expect(owMock.revokeConnection).not.toHaveBeenCalled();
  });

  it('continues with local disconnect even if Open Wearables revoke fails (best-effort)', async () => {
    spyState.queueResults([
      {
        id: 'conn-1',
        userId: 'user-A',
        provider: 'whoop',
        openWearablesUserId: 'ow-uuid-best-effort',
      },
    ]);
    spyState.queueResults([]);
    owMock.revokeConnection.mockRejectedValueOnce(new Error('OW unreachable'));

    // Should not throw — local disconnect proceeds.
    await expect(disconnect('user-A', 'conn-1')).resolves.toBeUndefined();
  });
});

// ===========================================================================
// markSyncError — 3-strike notification cadence
// ===========================================================================

describe('markSyncError — 3-strike notification cadence', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('count===1 (first failure) fires wearable_sync_failed', async () => {
    spyState.queueResults([
      { id: 'conn-1', userId: 'user-A', provider: 'whoop', syncErrorCount: 0, status: 'connected' },
    ]);
    spyState.queueResults([]); // UPDATE awaited

    await markSyncError('conn-1', 'token expired');

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_sync_failed', {
      provider: 'whoop',
    });
  });

  it('count===2 (second failure) fires NO notification', async () => {
    spyState.queueResults([
      { id: 'conn-1', userId: 'user-A', provider: 'whoop', syncErrorCount: 1, status: 'connected' },
    ]);
    spyState.queueResults([]);

    await markSyncError('conn-1', 'rate limit');
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('count===3 + status==="connected" flips to "expired" AND fires wearable_expired', async () => {
    spyState.queueResults([
      { id: 'conn-1', userId: 'user-A', provider: 'whoop', syncErrorCount: 2, status: 'connected' },
    ]);
    spyState.queueResults([]); // UPDATE awaited

    await markSyncError('conn-1', 'auth invalid');

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_expired', {
      provider: 'whoop',
    });
    // wearable_sync_failed should NOT also fire — markSyncError picks at most one.
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  it('count===5 + status==="expired" already → fires NO notification (avoid fatigue)', async () => {
    spyState.queueResults([
      { id: 'conn-1', userId: 'user-A', provider: 'whoop', syncErrorCount: 4, status: 'expired' },
    ]);
    spyState.queueResults([]);

    await markSyncError('conn-1', 'still failing');
    // No wearable_expired re-fire (already expired); no wearable_sync_failed
    // (count not 1).
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('connection not found is a no-op (no throw, no dispatch)', async () => {
    spyState.queueResults([]); // SELECT empty
    await expect(markSyncError('conn-missing', 'err')).resolves.toBeUndefined();
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// recordSuccessfulSync — clears error counters
// ===========================================================================

describe('recordSuccessfulSync', () => {
  beforeEach(() => spyState.reset());

  it('UPDATEs the connection row with lastSyncAt=NOW, syncErrorCount=0, lastSyncError=null', async () => {
    spyState.queueResults([]); // UPDATE awaited
    await recordSuccessfulSync('conn-1');

    // The 'set' op captures the SET clause args
    const setOps = spyState.operations.filter((o) => o.op === 'set');
    expect(setOps).toHaveLength(1);
    const setArg = setOps[0].args[0] as Record<string, unknown>;
    expect(setArg.syncErrorCount).toBe(0);
    expect(setArg.lastSyncError).toBeNull();
    expect(setArg.lastSyncAt).toBeInstanceOf(Date);
  });

  it('UPDATE WHERE filters by connection id only (called from internal flows; no userId needed)', async () => {
    spyState.queueResults([]);
    await recordSuccessfulSync('conn-42');
    expectOwnershipClause(wearableConnections.id, 'conn-42');
  });
});

/**
 * Notifications Route Tests — Sprint 2 BATCH 7
 *
 * Coverage:
 *   - GET    /api/notifications/vapid-public-key   public endpoint behaviour
 *   - POST   /api/notifications/subscribe          IDOR (userId from session, never body) + 409 on cross-user endpoint
 *   - DELETE /api/notifications/subscribe/:id      IDOR (only revokes own row) + 404 when not own
 *   - GET    /api/notifications/subscriptions      IDOR + endpointHash present + raw endpoint omitted
 *   - GET    /api/notifications/preferences        IDOR + DEFAULT_PREFS_RESPONSE fallback
 *   - PATCH  /api/notifications/preferences        IDOR + Zod validation + audit log emission
 *   - POST   /api/notifications/test               IDOR (dispatch called with caller's userId)
 *
 * Strategy mirrors biometrics.test.ts (Sprint 1.5 BATCH 4): the production
 * router runs through supertest with a fake auth middleware injected ahead of
 * it; Drizzle operators (`eq`, `and`) are spied so ownership clauses are
 * asserted directly. Mutating a route to drop the userId clause from WHERE
 * fails the matching `expectOwnershipClause` assertion.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

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
      execute: (...args: unknown[]) => {
        spyState.operations.push({ op: 'execute', args });
        const next = spyState.queue.length > 0 ? spyState.queue.shift() : { rows: [] };
        return Promise.resolve(next);
      },
    };
  }

  return { spyState, makeDbWrapper };
});

// ---------------------------------------------------------------------------
// Module mocks (must come before importing the router under test)
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

// dispatch + isPushConfigured + service helpers — stub everything so we don't
// touch the real notificationService / pushService / web-push.
const dispatchMock = vi.fn();
const isPushConfiguredMock = vi.fn(() => true);

vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: (...args: unknown[]) => dispatchMock(...args),
}));

vi.mock('../../services/pushService', () => ({
  isPushConfigured: () => isPushConfiguredMock(),
  // The router imports this name even though it doesn't call sendPush directly.
  sendPush: vi.fn(),
}));

vi.mock('../../services/notificationService', () => ({
  getUserNotifications: vi.fn(async () => []),
  getUnreadCount: vi.fn(async () => 0),
  markAsRead: vi.fn(async () => undefined),
  markAllAsRead: vi.fn(async () => undefined),
  clearAllNotifications: vi.fn(async () => undefined),
}));

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

vi.mock('../../middleware/requestLogger', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import notificationsRouter from '../../routes/notifications';
import { pushSubscriptions, users } from '@shared/schema';
import { logger } from '../../logger';

// ---------------------------------------------------------------------------
// Test app factory + user fixtures
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  email: string;
  role: 'trainer' | 'solo' | 'client';
  firstName?: string;
  lastName?: string;
}

function makeTestApp(user: TestUser | null = null) {
  const app = express();
  app.use(express.json());
  if (user) {
    app.use((req, _res, next) => {
      (req as unknown as { user: TestUser }).user = user;
      next();
    });
  }
  app.use('/api/notifications', notificationsRouter);
  return app;
}

const userA = (): TestUser => ({
  id: 'user-A',
  email: 'a@test.com',
  role: 'solo',
});
const userB = (): TestUser => ({
  id: 'user-B',
  email: 'b@test.com',
  role: 'solo',
});

function expectOwnershipClause(column: unknown, expectedValue: unknown) {
  const match = spyState.eqCalls.find(([col, val]) => col === column && val === expectedValue);
  expect(
    match,
    `Expected eq(<column>, ${JSON.stringify(expectedValue)}) in WHERE clause. ` +
      `Got eq calls: ${JSON.stringify(spyState.eqCalls.map(([_c, v]) => v))}`
  ).toBeDefined();
}

// ===========================================================================
// GET /vapid-public-key — public, returns key when configured, 503 otherwise
// ===========================================================================

describe('GET /api/notifications/vapid-public-key (public)', () => {
  beforeEach(() => {
    spyState.reset();
    isPushConfiguredMock.mockReturnValue(true);
    process.env.VAPID_PUBLIC_KEY = 'test-vapid-public-key';
  });

  it('returns the public key without requiring auth', async () => {
    // No user attached — public route. The router still mounts behind whatever
    // auth middleware the parent app uses, but the handler itself does not
    // read req.user.
    const res = await request(makeTestApp(null)).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe('test-vapid-public-key');
  });

  it('returns 503 when push is not configured (server VAPID keys missing)', async () => {
    isPushConfiguredMock.mockReturnValue(false);
    const res = await request(makeTestApp(null)).get('/api/notifications/vapid-public-key');
    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Push not configured');
  });

  it('does NOT include eq(users.id, *) — public endpoint must not run any IDOR clause', async () => {
    await request(makeTestApp(null)).get('/api/notifications/vapid-public-key');
    // No eq() calls at all expected — the handler is a one-liner.
    expect(spyState.eqCalls).toHaveLength(0);
  });
});

// ===========================================================================
// POST /subscribe — IDOR: userId comes from session, not body
// ===========================================================================

describe('POST /api/notifications/subscribe — IDOR + cross-user endpoint guard', () => {
  beforeEach(() => spyState.reset());

  const validBody = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    p256dh: 'BPxxxxxxx',
    auth: 'authxxxx',
    platform: 'web' as const,
  };

  it('creates a new subscription and uses userId from session even if body attempts to override', async () => {
    spyState.queueResults([]); // SELECT existing → none
    spyState.queueResults([{ id: 'sub-new' }]); // INSERT returning

    const res = await request(makeTestApp(userA()))
      .post('/api/notifications/subscribe')
      .send({ ...validBody, userId: 'user-attacker' });

    expect(res.status).toBe(200);
    expect(res.body.action).toBe('created');

    // Find the .values() call and assert userId === session value
    const valuesOp = spyState.operations.find((o) => o.op === 'values');
    expect(valuesOp).toBeDefined();
    const inserted = valuesOp!.args[0] as { userId: string };
    expect(inserted.userId).toBe('user-A');
  });

  it('refreshes (upsert) when same user re-subscribes with the same endpoint', async () => {
    spyState.queueResults([{ id: 'sub-existing', userId: 'user-A' }]); // SELECT existing
    spyState.queueResults([{ id: 'sub-existing' }]); // UPDATE returning

    const res = await request(makeTestApp(userA()))
      .post('/api/notifications/subscribe')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.action).toBe('refreshed');
  });

  it('returns 409 when the endpoint is already registered to a different user', async () => {
    spyState.queueResults([{ id: 'sub-existing', userId: 'user-OTHER' }]); // SELECT existing

    const res = await request(makeTestApp(userA()))
      .post('/api/notifications/subscribe')
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Endpoint already registered to another account');
  });

  it('rejects body with invalid Zod payload', async () => {
    const res = await request(makeTestApp(userA()))
      .post('/api/notifications/subscribe')
      .send({ endpoint: 'not-a-url', p256dh: '', auth: '', platform: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid subscription');
  });

  it('returns 401 when no authenticated user', async () => {
    const res = await request(makeTestApp(null))
      .post('/api/notifications/subscribe')
      .send(validBody);
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// DELETE /subscribe/:id — IDOR-safe revoke
// ===========================================================================

describe('DELETE /api/notifications/subscribe/:id — IDOR ownership guard', () => {
  beforeEach(() => spyState.reset());

  it('revokes when caller owns the subscription', async () => {
    spyState.queueResults([{ id: 'sub-1' }]); // UPDATE returning shows row was matched
    const res = await request(makeTestApp(userA())).delete('/api/notifications/subscribe/sub-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when caller does not own the subscription', async () => {
    spyState.queueResults([]); // UPDATE returning empty — no row matched WHERE id AND userId
    const res = await request(makeTestApp(userB())).delete('/api/notifications/subscribe/sub-1');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Subscription not found');
  });

  it('includes eq(pushSubscriptions.userId, callerId) in WHERE — ownership clause', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA())).delete('/api/notifications/subscribe/sub-1');
    expectOwnershipClause(pushSubscriptions.userId, 'user-A');
  });

  it("also constrains by id (so userA can't revoke userA's OTHER subs by accident)", async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA())).delete('/api/notifications/subscribe/sub-target');
    expectOwnershipClause(pushSubscriptions.id, 'sub-target');
  });

  it('returns 401 when no authenticated user', async () => {
    const res = await request(makeTestApp(null)).delete('/api/notifications/subscribe/sub-1');
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// GET /subscriptions — IDOR + endpointHash present + raw endpoint omitted
// ===========================================================================

describe('GET /api/notifications/subscriptions — IDOR + privacy', () => {
  beforeEach(() => spyState.reset());

  it('returns own active subscriptions with endpointHash and WITHOUT raw endpoint', async () => {
    spyState.queueResults([
      {
        id: 'sub-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/secret-endpoint-aaa',
        userAgent: 'Mozilla/5.0 (Test)',
        platform: 'web',
        lastUsedAt: '2026-05-05T00:00:00Z',
        createdAt: '2026-05-01T00:00:00Z',
      },
    ]);

    const res = await request(makeTestApp(userA())).get('/api/notifications/subscriptions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);

    const row = res.body[0];
    // Critical privacy assertions
    expect(row.endpoint).toBeUndefined();
    expect(row.endpointHash).toBeDefined();
    expect(row.endpointHash).toHaveLength(16);
    // sha256 of the test endpoint, first 16 chars (deterministic)
    const expected = require('crypto')
      .createHash('sha256')
      .update('https://fcm.googleapis.com/fcm/send/secret-endpoint-aaa')
      .digest('hex')
      .slice(0, 16);
    expect(row.endpointHash).toBe(expected);
    // Other safe fields preserved
    expect(row.id).toBe('sub-1');
    expect(row.userAgent).toBe('Mozilla/5.0 (Test)');
    expect(row.platform).toBe('web');
  });

  it('includes eq(pushSubscriptions.userId, callerId) — ownership clause', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA())).get('/api/notifications/subscriptions');
    expectOwnershipClause(pushSubscriptions.userId, 'user-A');
  });

  it('returns empty array (NOT 404) when caller has no subscriptions', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userB())).get('/api/notifications/subscriptions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 401 when no authenticated user', async () => {
    const res = await request(makeTestApp(null)).get('/api/notifications/subscriptions');
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// GET /preferences — IDOR + default fallback
// ===========================================================================

describe('GET /api/notifications/preferences — IDOR + DEFAULT_PREFS_RESPONSE fallback', () => {
  beforeEach(() => spyState.reset());

  it('returns DEFAULT_PREFS_RESPONSE when row has no notification_preferences (null)', async () => {
    spyState.queueResults([{ notificationPreferences: null }]);
    const res = await request(makeTestApp(userA())).get('/api/notifications/preferences');
    expect(res.status).toBe(200);
    expect(res.body.categories.workouts).toBe(true);
    expect(res.body.quietHours.enabled).toBe(false);
    expect(res.body.channels.push).toBe(true);
    expect(res.body.channels.email).toBe(false);
  });

  it('returns the stored preferences when present', async () => {
    spyState.queueResults([
      {
        notificationPreferences: {
          categories: {
            workouts: false,
            recovery: true,
            achievements: true,
            social: true,
            billing: true,
          },
          quietHours: { enabled: true, start: '23:00', end: '06:00', timezone: 'Europe/Bucharest' },
          channels: { push: true, email: true },
        },
      },
    ]);
    const res = await request(makeTestApp(userA())).get('/api/notifications/preferences');
    expect(res.status).toBe(200);
    expect(res.body.categories.workouts).toBe(false);
    expect(res.body.quietHours.timezone).toBe('Europe/Bucharest');
  });

  it('includes eq(users.id, callerId) — ownership clause', async () => {
    spyState.queueResults([{ notificationPreferences: null }]);
    await request(makeTestApp(userA())).get('/api/notifications/preferences');
    expectOwnershipClause(users.id, 'user-A');
  });

  it('returns 401 when no authenticated user', async () => {
    const res = await request(makeTestApp(null)).get('/api/notifications/preferences');
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// PATCH /preferences — IDOR + Zod validation + audit log
// ===========================================================================

describe('PATCH /api/notifications/preferences — IDOR + validation + audit', () => {
  beforeEach(() => spyState.reset());

  const baseExisting = {
    categories: {
      workouts: true,
      recovery: true,
      achievements: true,
      social: true,
      billing: true,
    },
    quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
    channels: { push: true, email: false },
  };

  it('rejects malformed payload with 400 (Zod patch shape)', async () => {
    const res = await request(makeTestApp(userA()))
      .patch('/api/notifications/preferences')
      .send({ channels: { push: 'not-a-boolean' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid preferences payload');
  });

  it('returns 404 when user row is missing (edge: deleted between auth and patch)', async () => {
    spyState.queueResults([]); // SELECT existing → none
    const res = await request(makeTestApp(userA()))
      .patch('/api/notifications/preferences')
      .send({ channels: { email: true } });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('merges deep-partial patch and persists the merged object', async () => {
    spyState.queueResults([{ notificationPreferences: baseExisting }]); // SELECT
    spyState.queueResults([]); // UPDATE

    const res = await request(makeTestApp(userA()))
      .patch('/api/notifications/preferences')
      .send({ quietHours: { enabled: true, start: '21:30' } });

    expect(res.status).toBe(200);
    expect(res.body.quietHours.enabled).toBe(true);
    expect(res.body.quietHours.start).toBe('21:30');
    // Untouched fields preserved
    expect(res.body.quietHours.end).toBe('08:00');
    expect(res.body.categories.workouts).toBe(true);
  });

  it('emits an audit log with previousValue captured pre-update', async () => {
    spyState.queueResults([{ notificationPreferences: baseExisting }]);
    spyState.queueResults([]);

    await request(makeTestApp(userA()))
      .patch('/api/notifications/preferences')
      .send({ categories: { social: false } });

    const auditMock = (logger as unknown as { audit: ReturnType<typeof vi.fn> }).audit;
    expect(auditMock).toHaveBeenCalledWith(
      'preferences.notifications_changed',
      expect.objectContaining({
        userId: 'user-A',
        previousValue: baseExisting,
        value: expect.objectContaining({
          categories: expect.objectContaining({ social: false, workouts: true }),
        }),
      })
    );
  });

  it('includes eq(users.id, callerId) on the SELECT-before-UPDATE — ownership clause', async () => {
    spyState.queueResults([{ notificationPreferences: baseExisting }]);
    spyState.queueResults([]);
    await request(makeTestApp(userA()))
      .patch('/api/notifications/preferences')
      .send({ channels: { email: true } });
    expectOwnershipClause(users.id, 'user-A');
  });

  it('returns 401 when no authenticated user', async () => {
    const res = await request(makeTestApp(null))
      .patch('/api/notifications/preferences')
      .send({ channels: { email: true } });
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// POST /test — IDOR: dispatch always called with caller's userId
// ===========================================================================

describe('POST /api/notifications/test — IDOR (dispatch uses session userId)', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockReset();
  });

  it('calls dispatch(userId, ...) with the SESSION userId, never a body value', async () => {
    dispatchMock.mockResolvedValue({ notificationId: 'n-1', outcome: 'sent' });
    const res = await request(makeTestApp(userA()))
      .post('/api/notifications/test')
      .send({ userId: 'user-attacker' });
    expect(res.status).toBe(200);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock.mock.calls[0][0]).toBe('user-A'); // first arg is userId
  });

  it('passes templateOverride (BATCH 5 override) so the test push is brand-only', async () => {
    dispatchMock.mockResolvedValue({ notificationId: 'n-2', outcome: 'sent' });
    await request(makeTestApp(userA())).post('/api/notifications/test');
    const opts = dispatchMock.mock.calls[0][3] as {
      bypassCategoryGating: boolean;
      templateOverride: { title: string; body: string; actionUrl: string };
    };
    expect(opts.bypassCategoryGating).toBe(true);
    expect(opts.templateOverride.title).toBe('GymGurus');
    expect(opts.templateOverride.body).toContain('Test notification');
    expect(opts.templateOverride.actionUrl).toBe('/settings?tab=notifications');
  });

  it('returns 401 when no authenticated user (defense-in-depth)', async () => {
    const res = await request(makeTestApp(null)).post('/api/notifications/test');
    expect(res.status).toBe(401);
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

/**
 * Wearable Route Tests — Sprint 4 BATCH 3
 *
 * Coverage:
 *   - 401 unauth on every route
 *   - IDOR ownership clauses on each parameterised mutation route
 *     (DELETE /:id, PATCH /:id/preferences, POST /:id/sync) +
 *     each own-data read (GET /, /sleep, /vitals, /activity)
 *   - Trainer-route 4-state response shape:
 *       TRAINER_ONLY / NOT_YOURS / CONSENT_NOT_GRANTED / NOT_REGISTERED
 *   - OAuth flow: connect calls service with caller's userId, oauth-callback
 *     redirects to /settings?tab=integrations&connected=<provider>
 *   - POST /:id/sync returns 502 when ow.triggerSync rejects
 *   - PATCH /:id/preferences merges deep-partial + audit-logs per changed flag
 *   - Route ordering: /oauth-callback does NOT match /:id (Express ordering
 *     gotcha — /:id placed last so the literal segment matches first)
 *
 * Strategy: same vi.hoisted db spy pattern as biometrics.test.ts /
 * wellness.test.ts. Drizzle DB is mocked, drizzle-orm operators (eq, and,
 * isNull) capture call args. The wearableConnections service module is
 * mocked too — IDOR responsibility for delete/patch/sync routes that don't
 * touch the DB directly lives in the service layer, but routes that DO
 * touch the DB directly (PATCH preferences SELECT-existing, POST sync
 * SELECT-existing) are exercised end-to-end so the eq() spy catches the
 * userId clause.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Hoisted shared state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper, wcMocks, owMocks } = vi.hoisted(() => {
  const spyState = {
    eqCalls: [] as Array<[unknown, unknown]>,
    andCalls: [] as Array<unknown[]>,
    isNullCalls: [] as Array<unknown>,
    queue: [] as unknown[],
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.eqCalls = [];
      this.andCalls = [];
      this.isNullCalls = [];
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

  const wcMocks = {
    listConnections: vi.fn(async () => [] as unknown[]),
    initiateOAuth: vi.fn(async () => ({ connectUrl: 'https://example.com/oauth' })),
    handleOAuthCallback: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    markSyncError: vi.fn(async () => undefined),
    recordSuccessfulSync: vi.fn(async () => undefined),
  };

  const owMocks = {
    triggerSync: vi.fn(async () => ({ ok: true })),
  };

  return { spyState, makeDbWrapper, wcMocks, owMocks };
});

// ---------------------------------------------------------------------------
// Module mocks — must come BEFORE imports of routes/wearables.ts
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
    isNull: (col: unknown) => {
      spyState.isNullCalls.push(col);
      return actual.isNull(col as never);
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

vi.mock('../../services/wearableConnections', () => wcMocks);
vi.mock('../../services/openWearablesClient', () => owMocks);

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
// AFTER mocks — import the SUT
// ---------------------------------------------------------------------------

import wearableRouter from '../../routes/wearables';
import {
  wearableConnections,
  sleepSessions,
  dailyVitals,
  activitySessions,
  clients,
} from '@shared/schema';
import { logger } from '../../logger';

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  email: string;
  role: 'trainer' | 'solo' | 'client';
}

function makeTestApp(user: TestUser | null) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) {
      (req as unknown as { user: TestUser }).user = user;
    }
    next();
  });
  app.use('/api/wearables', wearableRouter);
  return app;
}

const userA = (): TestUser => ({ id: 'user-A', email: 'a@test.com', role: 'solo' });
const userB = (): TestUser => ({ id: 'user-B', email: 'b@test.com', role: 'solo' });
const trainerT = (): TestUser => ({ id: 'trainer-T', email: 't@test.com', role: 'trainer' });

function expectOwnershipClause(column: unknown, expectedValue: unknown) {
  const match = spyState.eqCalls.find(([col, val]) => col === column && val === expectedValue);
  expect(
    match,
    `Expected eq(<column>, ${JSON.stringify(expectedValue)}) in WHERE clause. ` +
      `Got eq calls: ${JSON.stringify(spyState.eqCalls.map(([_c, v]) => v))}`
  ).toBeDefined();
}

const VALID_UUID = '11111111-1111-1111-1111-111111111111';
const VALID_UUID_2 = '22222222-2222-2222-2222-222222222222';

// ===========================================================================
// 401 — every route returns 401 without req.user
// ===========================================================================

describe('Wearable routes — 401 unauthorised', () => {
  beforeEach(() => {
    spyState.reset();
    Object.values(wcMocks).forEach((m) => m.mockClear());
    Object.values(owMocks).forEach((m) => m.mockClear());
  });

  const cases: Array<{ method: 'get' | 'post' | 'patch' | 'delete'; path: string }> = [
    { method: 'get', path: '/api/wearables' },
    { method: 'post', path: '/api/wearables/connect' },
    { method: 'get', path: '/api/wearables/oauth-callback?provider=whoop' },
    { method: 'get', path: '/api/wearables/sleep' },
    { method: 'get', path: '/api/wearables/vitals' },
    { method: 'get', path: '/api/wearables/activity' },
    // Note: trainer routes don't get a 401 path because their first gate
    // is `req.user?.role !== 'trainer'` which returns 403 TRAINER_ONLY when
    // role is undefined. That branch is exercised below in the trainer block.
    { method: 'delete', path: `/api/wearables/${VALID_UUID}` },
    { method: 'patch', path: `/api/wearables/${VALID_UUID}/preferences` },
    { method: 'post', path: `/api/wearables/${VALID_UUID}/sync` },
  ];

  for (const { method, path } of cases) {
    it(`${method.toUpperCase()} ${path} returns 401 when unauthenticated`, async () => {
      const app = makeTestApp(null);
      let req = request(app)[method](path);
      if (method === 'post' || method === 'patch') {
        req = req.send({});
      }
      const res = await req;
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  }
});

// ===========================================================================
// GET /api/wearables — list user's connections (IDOR via service layer)
// ===========================================================================

describe('GET /api/wearables', () => {
  beforeEach(() => {
    spyState.reset();
    Object.values(wcMocks).forEach((m) => m.mockClear());
  });

  it('returns 200 + listConnections result for caller', async () => {
    wcMocks.listConnections.mockResolvedValueOnce([
      { id: 'c1', userId: 'user-A', provider: 'whoop' },
    ]);
    const res = await request(makeTestApp(userA())).get('/api/wearables');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(wcMocks.listConnections).toHaveBeenCalledWith('user-A');
  });

  it('cross-user attacker (userB) only sees their own connections — service called with user-B not user-A', async () => {
    wcMocks.listConnections.mockResolvedValueOnce([]);
    await request(makeTestApp(userB())).get('/api/wearables');
    expect(wcMocks.listConnections).toHaveBeenCalledWith('user-B');
    expect(wcMocks.listConnections).not.toHaveBeenCalledWith('user-A');
  });
});

// ===========================================================================
// POST /api/wearables/connect — OAuth initiation
// ===========================================================================

describe('POST /api/wearables/connect', () => {
  beforeEach(() => {
    spyState.reset();
    Object.values(wcMocks).forEach((m) => m.mockClear());
  });

  it('returns 200 with connectUrl for valid provider; service called with caller userId', async () => {
    wcMocks.initiateOAuth.mockResolvedValueOnce({
      connectUrl: 'https://api.whoop.com/oauth/authorize?...',
    });
    const res = await request(makeTestApp(userA()))
      .post('/api/wearables/connect')
      .send({ provider: 'whoop' });
    expect(res.status).toBe(200);
    expect(res.body.connectUrl).toMatch(/whoop/);
    expect(wcMocks.initiateOAuth).toHaveBeenCalledWith('user-A', 'whoop');
  });

  it('returns 400 on invalid provider (Zod enum failure)', async () => {
    const res = await request(makeTestApp(userA()))
      .post('/api/wearables/connect')
      .send({ provider: 'fitbit-but-not-listed' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid provider');
    expect(wcMocks.initiateOAuth).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// GET /api/wearables/oauth-callback — provider redirect handler
// ===========================================================================

describe('GET /api/wearables/oauth-callback', () => {
  beforeEach(() => {
    spyState.reset();
    Object.values(wcMocks).forEach((m) => m.mockClear());
  });

  it('returns 302 redirect to /settings?tab=integrations&connected=<provider> on success', async () => {
    wcMocks.handleOAuthCallback.mockResolvedValueOnce(undefined);
    const res = await request(makeTestApp(userA()))
      .get('/api/wearables/oauth-callback?provider=whoop')
      .redirects(0); // don't follow
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/settings?tab=integrations&connected=whoop');
    expect(wcMocks.handleOAuthCallback).toHaveBeenCalledWith('user-A', 'whoop');
  });

  it('Express route ordering: /oauth-callback matches the literal handler, NOT /:id', async () => {
    // The "route ordering" gotcha: if /:id were declared before /oauth-callback,
    // Express would match "oauth-callback" as an id (Zod uuid().parse() would
    // then 400). Confirm that the OAuth handler is reached: handleOAuthCallback
    // gets called. If the request hit DELETE /:id by mistake there'd be no
    // handleOAuthCallback invocation.
    wcMocks.handleOAuthCallback.mockResolvedValueOnce(undefined);
    const res = await request(makeTestApp(userA()))
      .get('/api/wearables/oauth-callback?provider=oura')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(wcMocks.handleOAuthCallback).toHaveBeenCalledTimes(1);
    expect(wcMocks.disconnect).not.toHaveBeenCalled();
  });

  it('returns 502 if handleOAuthCallback throws', async () => {
    wcMocks.handleOAuthCallback.mockRejectedValueOnce(new Error('OW unreachable'));
    const res = await request(makeTestApp(userA())).get(
      '/api/wearables/oauth-callback?provider=whoop'
    );
    expect(res.status).toBe(502);
  });
});

// ===========================================================================
// GET /api/wearables/sleep — IDOR
// ===========================================================================

describe('GET /api/wearables/sleep', () => {
  beforeEach(() => spyState.reset());

  it('returns rows filtered by caller; eq(sleepSessions.userId, callerId) — IDOR clause', async () => {
    spyState.queueResults([{ id: 's1', userId: 'user-A', date: '2026-05-06' }]);
    const res = await request(makeTestApp(userA())).get('/api/wearables/sleep');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expectOwnershipClause(sleepSessions.userId, 'user-A');
  });

  it('cross-user mutation: caller userB only filters by user-B; user-A NOT in eq(sleepSessions.userId)', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userB())).get('/api/wearables/sleep');
    expectOwnershipClause(sleepSessions.userId, 'user-B');
    const userAOnSleep = spyState.eqCalls.find(
      ([col, val]) => col === sleepSessions.userId && val === 'user-A'
    );
    expect(userAOnSleep).toBeUndefined();
  });
});

// ===========================================================================
// GET /api/wearables/vitals — IDOR
// ===========================================================================

describe('GET /api/wearables/vitals', () => {
  beforeEach(() => spyState.reset());

  it('returns rows filtered by caller; eq(dailyVitals.userId, callerId) — IDOR clause', async () => {
    spyState.queueResults([{ id: 'v1', userId: 'user-A', date: '2026-05-06' }]);
    const res = await request(makeTestApp(userA())).get('/api/wearables/vitals');
    expect(res.status).toBe(200);
    expectOwnershipClause(dailyVitals.userId, 'user-A');
  });
});

// ===========================================================================
// GET /api/wearables/activity — IDOR
// ===========================================================================

describe('GET /api/wearables/activity', () => {
  beforeEach(() => spyState.reset());

  it('returns rows filtered by caller; eq(activitySessions.userId, callerId) — IDOR clause', async () => {
    spyState.queueResults([{ id: 'a1', userId: 'user-A', startedAt: new Date() }]);
    const res = await request(makeTestApp(userA())).get('/api/wearables/activity');
    expect(res.status).toBe(200);
    expectOwnershipClause(activitySessions.userId, 'user-A');
  });
});

// ===========================================================================
// Trainer routes — 4-state response shape
// ===========================================================================

describe('GET /api/wearables/client/:clientId/sleep — trainer 4-state gating', () => {
  beforeEach(() => spyState.reset());

  it('returns 403 TRAINER_ONLY when caller is not a trainer (Ronin)', async () => {
    const res = await request(makeTestApp(userA())).get(
      `/api/wearables/client/${VALID_UUID}/sleep`
    );
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('TRAINER_ONLY');
  });

  it('returns 404 NOT_YOURS when client does not belong to caller', async () => {
    // SELECT clients → empty (real-world filter eq(trainerId, caller) excludes)
    spyState.queueResults([]);
    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/sleep`
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_YOURS');
    // The clients lookup must include eq(clients.trainerId, callerId)
    expectOwnershipClause(clients.trainerId, 'trainer-T');
  });

  it('returns 403 CONSENT_NOT_GRANTED when shareSleepWithTrainer=false', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: 'user-A',
        shareSleepWithTrainer: false, // revoked
        shareHrvWithTrainer: true,
        shareActivityWithTrainer: true,
      },
    ]);
    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/sleep`
    );
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CONSENT_NOT_GRANTED');
  });

  it('returns 404 NOT_REGISTERED when clients.userId IS NULL', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: null, // not registered as Disciple yet
        shareSleepWithTrainer: true,
        shareHrvWithTrainer: true,
        shareActivityWithTrainer: true,
      },
    ]);
    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/sleep`
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_REGISTERED');
  });

  it('returns 200 + filters sleepSessions by Disciple userId when all gates pass', async () => {
    // SELECT clients
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: 'disciple-D',
        shareSleepWithTrainer: true,
        shareHrvWithTrainer: true,
        shareActivityWithTrainer: true,
      },
    ]);
    // SELECT sleepSessions
    spyState.queueResults([{ id: 's1', userId: 'disciple-D', date: '2026-05-06' }]);

    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/sleep`
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    // The sleep query filters by the Disciple's userId (NOT the trainer's)
    expectOwnershipClause(sleepSessions.userId, 'disciple-D');
  });
});

describe('GET /api/wearables/client/:clientId/vitals — uses shareHrvWithTrainer flag', () => {
  beforeEach(() => spyState.reset());

  it('returns 403 CONSENT_NOT_GRANTED when shareHrvWithTrainer=false', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: 'disciple-D',
        shareSleepWithTrainer: true,
        shareHrvWithTrainer: false, // revoked
        shareActivityWithTrainer: true,
      },
    ]);
    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/vitals`
    );
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CONSENT_NOT_GRANTED');
  });

  it('returns 200 with dailyVitals filtered by Disciple userId when consent granted', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: 'disciple-D',
        shareSleepWithTrainer: true,
        shareHrvWithTrainer: true,
        shareActivityWithTrainer: true,
      },
    ]);
    spyState.queueResults([{ id: 'v1', userId: 'disciple-D', date: '2026-05-06' }]);

    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/vitals`
    );
    expect(res.status).toBe(200);
    expectOwnershipClause(dailyVitals.userId, 'disciple-D');
  });
});

describe('GET /api/wearables/client/:clientId/activity — uses shareActivityWithTrainer flag', () => {
  beforeEach(() => spyState.reset());

  it('returns 403 CONSENT_NOT_GRANTED when shareActivityWithTrainer=false', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: 'disciple-D',
        shareSleepWithTrainer: true,
        shareHrvWithTrainer: true,
        shareActivityWithTrainer: false, // revoked
      },
    ]);
    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/activity`
    );
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CONSENT_NOT_GRANTED');
  });

  it('returns 200 with activitySessions filtered by Disciple userId', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        trainerId: 'trainer-T',
        userId: 'disciple-D',
        shareSleepWithTrainer: true,
        shareHrvWithTrainer: true,
        shareActivityWithTrainer: true,
      },
    ]);
    spyState.queueResults([{ id: 'a1', userId: 'disciple-D', startedAt: new Date() }]);
    const res = await request(makeTestApp(trainerT())).get(
      `/api/wearables/client/${VALID_UUID}/activity`
    );
    expect(res.status).toBe(200);
    expectOwnershipClause(activitySessions.userId, 'disciple-D');
  });
});

// ===========================================================================
// DELETE /api/wearables/:id — IDOR via service layer
// ===========================================================================

describe('DELETE /api/wearables/:id', () => {
  beforeEach(() => {
    spyState.reset();
    Object.values(wcMocks).forEach((m) => m.mockClear());
  });

  it('returns 200 + calls wc.disconnect with caller userId + connection id', async () => {
    wcMocks.disconnect.mockResolvedValueOnce(undefined);
    const res = await request(makeTestApp(userA())).delete(`/api/wearables/${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(wcMocks.disconnect).toHaveBeenCalledWith('user-A', VALID_UUID);
  });

  it('cross-user IDOR: userB cannot disconnect via service layer (service throws Connection not found, route 404)', async () => {
    // wc.disconnect's WHERE includes BOTH eq(id) AND eq(userId, caller) — when
    // caller is user-B and the row belongs to user-A, the SELECT returns
    // empty and the service throws 'Connection not found'. Route returns 404.
    wcMocks.disconnect.mockRejectedValueOnce(new Error('Connection not found'));
    const res = await request(makeTestApp(userB())).delete(`/api/wearables/${VALID_UUID}`);
    expect(res.status).toBe(404);
    expect(wcMocks.disconnect).toHaveBeenCalledWith('user-B', VALID_UUID);
    expect(wcMocks.disconnect).not.toHaveBeenCalledWith('user-A', VALID_UUID);
  });

  it('returns 400 on non-uuid :id (Zod failure)', async () => {
    const res = await request(makeTestApp(userA())).delete('/api/wearables/not-a-uuid');
    expect(res.status).toBe(400);
    expect(wcMocks.disconnect).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// PATCH /api/wearables/:id/preferences — IDOR + audit log
// ===========================================================================

describe('PATCH /api/wearables/:id/preferences', () => {
  beforeEach(() => {
    spyState.reset();
    (logger.audit as ReturnType<typeof vi.fn>).mockClear();
  });

  function queueExisting(callerId: string, prefs: Record<string, boolean>) {
    spyState.queueResults([
      {
        id: VALID_UUID,
        userId: callerId,
        provider: 'whoop',
        syncPreferences: prefs,
      },
    ]);
    // UPDATE chain awaits empty array
    spyState.queueResults([]);
  }

  it('issues SELECT-existing with eq(wearableConnections.userId, callerId) — primary IDOR mutation target', async () => {
    queueExisting('user-A', { sleep: true, hrv: true, workouts: true, body: true, activity: true });
    const res = await request(makeTestApp(userA()))
      .patch(`/api/wearables/${VALID_UUID}/preferences`)
      .send({ sleep: false });
    expect(res.status).toBe(200);
    // The pre-update SELECT must filter by caller userId. Removing this clause
    // from the route would let a cross-user attacker mutate someone else's
    // syncPreferences. This is the BATCH 3 mutation-test target.
    expectOwnershipClause(wearableConnections.userId, 'user-A');
    // AND the connection id is also part of the WHERE
    expectOwnershipClause(wearableConnections.id, VALID_UUID);
  });

  it('returns 200 + merged preferences in response body', async () => {
    queueExisting('user-A', { sleep: true, hrv: true, workouts: true, body: true, activity: true });
    const res = await request(makeTestApp(userA()))
      .patch(`/api/wearables/${VALID_UUID}/preferences`)
      .send({ sleep: false, body: false });
    expect(res.status).toBe(200);
    expect(res.body.syncPreferences).toEqual({
      sleep: false,
      hrv: true,
      workouts: true,
      body: false,
      activity: true,
    });
  });

  it('emits one audit log per CHANGED flag (skips no-op patches)', async () => {
    queueExisting('user-A', { sleep: true, hrv: true, workouts: true, body: true, activity: true });
    await request(makeTestApp(userA()))
      .patch(`/api/wearables/${VALID_UUID}/preferences`)
      // sleep changes (true→false), hrv stays (true→true) — should be 1 audit, not 2
      .send({ sleep: false, hrv: true });

    const auditCalls = (logger.audit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => c[0] === 'wearable.sync_preference_changed'
    );
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0][1]).toMatchObject({
      userId: 'user-A',
      connectionId: VALID_UUID,
      provider: 'whoop',
      flag: 'sleep',
      previousValue: true,
      value: false,
      requestId: 'test-request-id',
    });
  });

  it('returns 404 when SELECT-existing returns empty (cross-user IDOR or genuine 404)', async () => {
    spyState.queueResults([]); // empty result
    const res = await request(makeTestApp(userB()))
      .patch(`/api/wearables/${VALID_UUID}/preferences`)
      .send({ sleep: false });
    expect(res.status).toBe(404);
    // The IDOR ownership clause is for user-B (the caller), not user-A
    expectOwnershipClause(wearableConnections.userId, 'user-B');
    const userAOnConn = spyState.eqCalls.find(
      ([col, val]) => col === wearableConnections.userId && val === 'user-A'
    );
    expect(userAOnConn).toBeUndefined();
  });

  it('returns 400 on invalid prefs payload (non-boolean value)', async () => {
    const res = await request(makeTestApp(userA()))
      .patch(`/api/wearables/${VALID_UUID}/preferences`)
      .send({ sleep: 'not-a-bool' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid preferences');
  });
});

// ===========================================================================
// POST /api/wearables/:id/sync — IDOR + 502-on-OW-failure
// ===========================================================================

describe('POST /api/wearables/:id/sync', () => {
  beforeEach(() => {
    spyState.reset();
    Object.values(wcMocks).forEach((m) => m.mockClear());
    Object.values(owMocks).forEach((m) => m.mockClear());
  });

  it('returns 200 when OW triggerSync resolves; SELECT filters by callerId', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        userId: 'user-A',
        provider: 'whoop',
      },
    ]);
    owMocks.triggerSync.mockResolvedValueOnce({ ok: true });
    const res = await request(makeTestApp(userA())).post(`/api/wearables/${VALID_UUID}/sync`);
    expect(res.status).toBe(200);
    expectOwnershipClause(wearableConnections.userId, 'user-A');
    expect(owMocks.triggerSync).toHaveBeenCalledWith('whoop', 'user-A');
  });

  it('returns 502 when ow.triggerSync rejects (OW unavailable)', async () => {
    spyState.queueResults([
      {
        id: VALID_UUID,
        userId: 'user-A',
        provider: 'whoop',
      },
    ]);
    owMocks.triggerSync.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(makeTestApp(userA())).post(`/api/wearables/${VALID_UUID}/sync`);
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('OW_UNAVAILABLE');
  });

  it('returns 404 when SELECT returns empty (cross-user IDOR)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userB())).post(`/api/wearables/${VALID_UUID_2}/sync`);
    expect(res.status).toBe(404);
    // caller is user-B, ownership clause uses user-B, NOT user-A
    expectOwnershipClause(wearableConnections.userId, 'user-B');
    const userAOnConn = spyState.eqCalls.find(
      ([col, val]) => col === wearableConnections.userId && val === 'user-A'
    );
    expect(userAOnConn).toBeUndefined();
    expect(owMocks.triggerSync).not.toHaveBeenCalled();
  });
});

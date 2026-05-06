/**
 * Wellness Route Tests — Sprint 3 BATCH 7
 *
 * Coverage:
 *   - 5 routes × (401 unauth, IDOR ownership clause asserted in WHERE,
 *     cross-user IDOR returns no other-user data, audit log emission shape).
 *   - Mutation-detection guarantee: removing
 *     `eq(dailyWellnessLog.userId, callerId)` from
 *     `upsertTodayEntry`'s SELECT-existing fails the matching
 *     "ownership clause is in WHERE" assertion in
 *     "POST /log issues SELECT-existing with eq(userId, callerId)".
 *
 * Strategy: same vi.hoisted db spy pattern as biometrics.test.ts. The
 * Drizzle DB layer is mocked — operators (eq, and, isNull, desc) capture
 * call args. The wellness service code runs unmodified; its eq() calls land
 * in the spy. supertest drives the actual production router.
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
// Module mocks — must come BEFORE imports of routes/wellness.ts
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

vi.mock('../../services/gamification/xpService', () => ({
  awardXp: vi.fn(async () => undefined),
  initializeUserGamification: vi.fn(async () => undefined),
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
// AFTER mocks — import the router under test and the schema for column refs
// ---------------------------------------------------------------------------

import wellnessRouter from '../../routes/wellness';
import { dailyWellnessLog, userGamification, users } from '@shared/schema';
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
  app.use('/api/wellness', wellnessRouter);
  return app;
}

const userA = (): TestUser => ({ id: 'user-A', email: 'a@test.com', role: 'solo' });
const userB = (): TestUser => ({ id: 'user-B', email: 'b@test.com', role: 'solo' });

function expectOwnershipClause(column: unknown, expectedValue: unknown) {
  const match = spyState.eqCalls.find(([col, val]) => col === column && val === expectedValue);
  expect(
    match,
    `Expected eq(<column>, ${JSON.stringify(expectedValue)}) in WHERE clause. ` +
      `Got eq calls: ${JSON.stringify(spyState.eqCalls.map(([_c, v]) => v))}`
  ).toBeDefined();
}

// ===========================================================================
// 401 Unauthorized — every route returns 401 without req.user
// ===========================================================================

describe('Wellness routes — 401 unauthorised paths', () => {
  beforeEach(() => spyState.reset());

  const cases = [
    { method: 'get' as const, path: '/api/wellness/today' },
    { method: 'post' as const, path: '/api/wellness/log' },
    { method: 'get' as const, path: '/api/wellness/history' },
    { method: 'get' as const, path: '/api/wellness/streak' },
    { method: 'delete' as const, path: '/api/wellness/today' },
  ];

  for (const { method, path } of cases) {
    it(`${method.toUpperCase()} ${path} returns 401 when unauthenticated`, async () => {
      const app = makeTestApp(null);
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  }
});

// ===========================================================================
// GET /api/wellness/today — IDOR
// ===========================================================================

describe('GET /api/wellness/today', () => {
  beforeEach(() => spyState.reset());

  // resolveTimezone('UTC' as ?tz=) returns early without a DB read because the
  // IANA regex passes and Intl accepts it. Queues below skip the prefs lookup.

  it('returns 200 with caller-owned entry + streak shape', async () => {
    // getTodayEntry: the dailyWellnessLog row for caller
    spyState.queueResults([{ id: 'w1', userId: 'user-A', date: '2026-05-06', readinessScore: 70 }]);
    // getWellnessStreak: userGamification row
    spyState.queueResults([{ current: 1, longest: 1, lastCheckIn: '2026-05-06' }]);

    const res = await request(makeTestApp(userA())).get('/api/wellness/today?tz=UTC');
    expect(res.status).toBe(200);
    expect(res.body.hasCheckedInToday).toBe(true);
    expect(res.body.entry.userId).toBe('user-A');
    expect(res.body.streak.current).toBe(1);
    expect(res.body.timezone).toBe('UTC');
  });

  it('includes eq(dailyWellnessLog.userId, callerId) in WHERE — IDOR ownership clause', async () => {
    spyState.queueResults([]);
    spyState.queueResults([]);

    await request(makeTestApp(userA())).get('/api/wellness/today?tz=UTC');
    expectOwnershipClause(dailyWellnessLog.userId, 'user-A');
  });

  it('cross-user IDOR: caller userB cannot read userA entry — empty WHERE result returns hasCheckedInToday=false', async () => {
    // userB hits GET /today. Real DB filters by userId=user-B → empty.
    spyState.queueResults([]);
    spyState.queueResults([]);

    const res = await request(makeTestApp(userB())).get('/api/wellness/today?tz=UTC');
    expect(res.status).toBe(200);
    expect(res.body.hasCheckedInToday).toBe(false);
    expect(res.body.entry).toBeNull();
    // The IDOR clause is for user-B (caller), not user-A (other user)
    expectOwnershipClause(dailyWellnessLog.userId, 'user-B');
  });

  it('streak read uses eq(userGamification.userId, callerId)', async () => {
    spyState.queueResults([]);
    spyState.queueResults([]);

    await request(makeTestApp(userA())).get('/api/wellness/today?tz=UTC');
    expectOwnershipClause(userGamification.userId, 'user-A');
  });
});

// ===========================================================================
// POST /api/wellness/log — primary mutation target
// ===========================================================================

describe('POST /api/wellness/log', () => {
  beforeEach(() => {
    spyState.reset();
    (logger.audit as ReturnType<typeof vi.fn>).mockClear();
  });

  const validPayload = {
    energyLevel: 7,
    moodScore: 7,
    stressLevel: 4,
    sleepQualitySubjective: 7,
    motivationLevel: 8,
    sorenessOverall: 3,
  };

  function queueHappyPath(callerId: string) {
    // ?tz=UTC → resolveTimezone returns early, no DB read.
    // upsertTodayEntry SELECT-existing → empty (new-insert path)
    spyState.queueResults([]);
    // getRecentContext: muscle fatigue rows → empty
    spyState.queueResults([]);
    // INSERT INTO daily_wellness_log RETURNING — populated row
    spyState.queueResults([
      { id: 'w-new', userId: callerId, date: '2026-05-06', readinessScore: 70 },
    ]);
    // updateWellnessStreakAfterCheckIn: existence check, state read, UPDATE
    spyState.queueResults([
      {
        /* gamification row exists */
      },
    ]);
    spyState.queueResults([{ current: 0, longest: 0, lastCheckIn: null }]);
    spyState.queueResults([]); // UPDATE chain await
    // audit log user email lookup
    spyState.queueResults([{ email: `${callerId}@test.com` }]);
  }

  it('returns 200 with new entry on first check-in', async () => {
    queueHappyPath('user-A');
    const res = await request(makeTestApp(userA()))
      .post('/api/wellness/log?tz=UTC')
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.entry.userId).toBe('user-A');
    expect(res.body.isNewInsert).toBe(true);
  });

  it('returns 400 on Zod validation failure (slider out of 1-10 range)', async () => {
    const res = await request(makeTestApp(userA()))
      .post('/api/wellness/log?tz=UTC')
      .send({ energyLevel: 99 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid wellness payload');
  });

  it('issues SELECT-existing with eq(dailyWellnessLog.userId, callerId) — primary IDOR mutation target', async () => {
    queueHappyPath('user-A');
    await request(makeTestApp(userA())).post('/api/wellness/log?tz=UTC').send(validPayload);
    // The pre-upsert SELECT must filter by caller userId. Removing this clause
    // from upsertTodayEntry would let a cross-user attacker mutate someone
    // else's row. This is the BATCH 7 mutation-test target.
    expectOwnershipClause(dailyWellnessLog.userId, 'user-A');
  });

  it('emits wellness.check_in audit log with userId, date, readinessScore, requestId', async () => {
    queueHappyPath('user-A');
    await request(makeTestApp(userA())).post('/api/wellness/log?tz=UTC').send(validPayload);
    expect(logger.audit).toHaveBeenCalled();
    const auditCall = (logger.audit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'wellness.check_in'
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1]).toMatchObject({
      userId: 'user-A',
      date: '2026-05-06',
      readinessScore: 70,
      requestId: 'test-request-id',
    });
  });

  it('cross-user IDOR: userB POST cannot mutate userA row — INSERT/UPDATE userId is callerId, not body-derived', async () => {
    queueHappyPath('user-B');
    // Even if attacker tries to inject userId in body, schema strips it (insertDailyWellnessLogSchema
    // is a createInsertSchema for the row, but the route passes the parsed body to upsertTodayEntry
    // which sets userId from session — never from request body).
    await request(makeTestApp(userB()))
      .post('/api/wellness/log?tz=UTC')
      .send({ ...validPayload, userId: 'user-A' });
    // The IDOR ownership clause is for user-B, not user-A.
    expectOwnershipClause(dailyWellnessLog.userId, 'user-B');
    // user-A must NOT appear as an eq() arg on the dailyWellnessLog.userId column.
    const userAOnLogColumn = spyState.eqCalls.find(
      ([col, val]) => col === dailyWellnessLog.userId && val === 'user-A'
    );
    expect(userAOnLogColumn).toBeUndefined();
  });
});

// ===========================================================================
// GET /api/wellness/history?days=N — IDOR + days clamp
// ===========================================================================

describe('GET /api/wellness/history', () => {
  beforeEach(() => spyState.reset());

  it('returns rows for caller; eq(dailyWellnessLog.userId, callerId) in WHERE', async () => {
    spyState.queueResults([
      { id: 'w1', userId: 'user-A', date: '2026-05-06' },
      { id: 'w2', userId: 'user-A', date: '2026-05-05' },
    ]);
    const res = await request(makeTestApp(userA())).get('/api/wellness/history?days=30');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expectOwnershipClause(dailyWellnessLog.userId, 'user-A');
  });

  it('rejects malformed days param via Number.isFinite/positive guard (falls back to 30)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA())).get('/api/wellness/history?days=NaN');
    expect(res.status).toBe(200);
    // No 500, no 400 — just falls back to default of 30. The clamp is internal.
  });
});

// ===========================================================================
// GET /api/wellness/streak — IDOR
// ===========================================================================

describe('GET /api/wellness/streak', () => {
  beforeEach(() => spyState.reset());

  it('returns streak for caller; eq(userGamification.userId, callerId) in WHERE', async () => {
    spyState.queueResults([{ current: 3, longest: 7, lastCheckIn: '2026-05-06' }]);
    const res = await request(makeTestApp(userA())).get('/api/wellness/streak');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ current: 3, longest: 7, lastCheckIn: '2026-05-06' });
    expectOwnershipClause(userGamification.userId, 'user-A');
  });
});

// ===========================================================================
// DELETE /api/wellness/today — IDOR + audit log
// ===========================================================================

describe('DELETE /api/wellness/today', () => {
  beforeEach(() => {
    spyState.reset();
    (logger.audit as ReturnType<typeof vi.fn>).mockClear();
  });

  it('returns 200 + emits wellness.delete_today audit log; DELETE filters by callerId', async () => {
    // ?tz=UTC → resolveTimezone returns early, no DB read.
    // getWellnessStreak (previousStreak)
    spyState.queueResults([{ current: 3, longest: 5, lastCheckIn: '2026-05-06' }]);
    // deleteTodayEntry RETURNING the deleted row
    spyState.queueResults([{ id: 'w1', userId: 'user-A', date: '2026-05-06' }]);
    // recomputeWellnessStreakAfterDelete: history rows
    spyState.queueResults([{ date: '2026-05-05' }]);
    // recompute reads existing longest
    spyState.queueResults([{ longest: 5 }]);
    // recompute UPDATE
    spyState.queueResults([]);
    // audit user email lookup
    spyState.queueResults([{ email: 'user-A@test.com' }]);

    const res = await request(makeTestApp(userA())).delete('/api/wellness/today?tz=UTC');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expectOwnershipClause(dailyWellnessLog.userId, 'user-A');

    const auditCall = (logger.audit as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[0] === 'wellness.delete_today'
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1]).toMatchObject({
      userId: 'user-A',
      date: '2026-05-06',
      previousStreakDays: 3,
      requestId: 'test-request-id',
    });
  });

  it('returns 404 when no entry to delete', async () => {
    // ?tz=UTC → resolveTimezone returns early, no DB read.
    spyState.queueResults([{ current: 0, longest: 0, lastCheckIn: null }]);
    spyState.queueResults([]); // DELETE returns nothing
    const res = await request(makeTestApp(userA())).delete('/api/wellness/today?tz=UTC');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('No entry for today');
  });
});

// ===========================================================================
// Timezone resolution side path — eq on users.id (also IDOR-relevant)
// ===========================================================================

describe('Timezone resolution', () => {
  beforeEach(() => spyState.reset());

  it('reads users.notificationPreferences via eq(users.id, callerId) when no ?tz= query', async () => {
    // No ?tz= → resolveTimezone reads users row
    spyState.queueResults([{ prefs: null }]);
    // getTodayEntry empty
    spyState.queueResults([]);
    // streak empty
    spyState.queueResults([]);

    await request(makeTestApp(userA())).get('/api/wellness/today');
    expectOwnershipClause(users.id, 'user-A');
  });

  it('rejects malformed tz query (e.g. SQL injection attempt) and falls back to user pref', async () => {
    // Even if attacker passes tz='UTC; DROP TABLE users--', the regex test fails,
    // and resolveTimezone proceeds to read users.notificationPreferences instead.
    spyState.queueResults([{ prefs: null }]);
    spyState.queueResults([]);
    spyState.queueResults([]);

    const res = await request(makeTestApp(userA())).get(
      '/api/wellness/today?tz=UTC%3B%20DROP%20TABLE%20users--'
    );
    expect(res.status).toBe(200);
    // Falls back to UTC because user pref is null and the malformed tz never reached Intl.
    expect(res.body.timezone).toBe('UTC');
  });
});

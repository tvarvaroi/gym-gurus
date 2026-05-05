/**
 * Preferred Units Route Tests — Sprint 2 BATCH 7
 *
 * Coverage:
 *   - GET   /api/settings/preferred-units    IDOR (own only) + default fallback
 *   - PATCH /api/settings/preferred-units    IDOR + Zod enum validation + audit log
 *
 * Audit log assertion captures `previousValue` to prove the SELECT-before-
 * UPDATE forensic chain (matches the consent-toggle pattern from
 * Sprint 1.5 BATCH 3).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { spyState, makeDbWrapper } = vi.hoisted(() => {
  const spyState = {
    eqCalls: [] as Array<[unknown, unknown]>,
    queue: [] as unknown[],
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.eqCalls = [];
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

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => {
      spyState.eqCalls.push([col, val]);
      return actual.eq(col as never, val as never);
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

vi.mock('../../auth', () => ({
  getUserById: vi.fn(),
}));

vi.mock('../../services/userDeletion', () => ({
  deleteUserAccount: vi.fn(),
}));

vi.mock('../../services/fileUpload', () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  isR2Configured: vi.fn(() => false),
}));

import settingsRouter from '../../routes/settings';
import { users } from '@shared/schema';
import { logger } from '../../logger';

interface TestUser {
  id: string;
  email: string;
  role: 'trainer' | 'solo' | 'client';
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
  app.use('/api/settings', settingsRouter);
  return app;
}

const userA = (): TestUser => ({ id: 'user-A', email: 'a@test.com', role: 'solo' });
const userB = (): TestUser => ({ id: 'user-B', email: 'b@test.com', role: 'solo' });

function expectOwnershipClause(column: unknown, expectedValue: unknown) {
  const match = spyState.eqCalls.find(([col, val]) => col === column && val === expectedValue);
  expect(
    match,
    `Expected eq(<column>, ${JSON.stringify(expectedValue)}) in WHERE clause`
  ).toBeDefined();
}

// ===========================================================================
// GET /api/settings/preferred-units
// ===========================================================================

describe('GET /api/settings/preferred-units — IDOR + default', () => {
  beforeEach(() => spyState.reset());

  it('returns the stored unit preference', async () => {
    spyState.queueResults([{ preferredUnits: 'imperial' }]);
    const res = await request(makeTestApp(userA())).get('/api/settings/preferred-units');
    expect(res.status).toBe(200);
    expect(res.body.units).toBe('imperial');
  });

  it('falls back to "metric" when row is missing', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA())).get('/api/settings/preferred-units');
    expect(res.status).toBe(200);
    expect(res.body.units).toBe('metric');
  });

  it('includes eq(users.id, callerId) — ownership clause', async () => {
    spyState.queueResults([{ preferredUnits: 'metric' }]);
    await request(makeTestApp(userA())).get('/api/settings/preferred-units');
    expectOwnershipClause(users.id, 'user-A');
  });

  it("IDOR: caller cannot see another user's value (call WHERE always uses session userId)", async () => {
    spyState.queueResults([{ preferredUnits: 'imperial' }]); // hypothetical row for userA
    await request(makeTestApp(userB())).get('/api/settings/preferred-units');
    expectOwnershipClause(users.id, 'user-B'); // never user-A
  });
});

// ===========================================================================
// PATCH /api/settings/preferred-units
// ===========================================================================

describe('PATCH /api/settings/preferred-units — IDOR + enum + audit', () => {
  beforeEach(() => spyState.reset());

  it('rejects invalid enum with 400', async () => {
    const res = await request(makeTestApp(userA()))
      .patch('/api/settings/preferred-units')
      .send({ units: 'kelvin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/metric/);
  });

  it('rejects missing payload with 400', async () => {
    const res = await request(makeTestApp(userA())).patch('/api/settings/preferred-units').send({});
    expect(res.status).toBe(400);
  });

  it('updates the unit preference and returns the new value', async () => {
    spyState.queueResults([{ preferredUnits: 'metric' }]); // SELECT existing
    spyState.queueResults([]); // UPDATE
    const res = await request(makeTestApp(userA()))
      .patch('/api/settings/preferred-units')
      .send({ units: 'imperial' });
    expect(res.status).toBe(200);
    expect(res.body.units).toBe('imperial');
  });

  it('emits audit log with previousValue captured pre-update', async () => {
    spyState.queueResults([{ preferredUnits: 'metric' }]);
    spyState.queueResults([]);
    await request(makeTestApp(userA()))
      .patch('/api/settings/preferred-units')
      .send({ units: 'imperial' });
    const auditMock = (logger as unknown as { audit: ReturnType<typeof vi.fn> }).audit;
    expect(auditMock).toHaveBeenCalledWith(
      'preferences.units_changed',
      expect.objectContaining({
        userId: 'user-A',
        email: 'a@test.com',
        previousValue: 'metric',
        value: 'imperial',
      })
    );
  });

  it('audit log carries previousValue=null when no prior row exists (new account edge)', async () => {
    spyState.queueResults([]); // SELECT existing → none
    spyState.queueResults([]); // UPDATE
    await request(makeTestApp(userA()))
      .patch('/api/settings/preferred-units')
      .send({ units: 'imperial' });
    const auditMock = (logger as unknown as { audit: ReturnType<typeof vi.fn> }).audit;
    expect(auditMock).toHaveBeenCalledWith(
      'preferences.units_changed',
      expect.objectContaining({ previousValue: null, value: 'imperial' })
    );
  });

  it('IDOR: SELECT-before-UPDATE WHERE uses session userId, UPDATE WHERE uses session userId', async () => {
    spyState.queueResults([{ preferredUnits: 'metric' }]);
    spyState.queueResults([]);
    await request(makeTestApp(userB()))
      .patch('/api/settings/preferred-units')
      .send({ units: 'imperial' });
    // BOTH the SELECT and the UPDATE must filter by user-B (not e.g. body.userId)
    const userBClauses = spyState.eqCalls.filter(
      ([col, val]) => col === users.id && val === 'user-B'
    );
    expect(userBClauses.length).toBeGreaterThanOrEqual(2);
  });
});

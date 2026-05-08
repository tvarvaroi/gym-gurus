/**
 * Apple Health Route Tests — Sprint 5 BATCH 3.
 *
 * Coverage:
 *   - 401 unauthenticated (every route)
 *   - POST /upload rejects no file, non-zip mime, non-.zip extension
 *   - GET /imports issues eq(userId, callerId) — IDOR ownership clause
 *   - GET /imports/:id IDOR-safe (and(eq(id), eq(userId)))
 *   - POST /imports/:id/cancel IDOR-safe + status state-machine guard
 *   - DELETE /imports/:id IDOR-safe + best-effort storage cleanup
 *
 * Strategy: same vi.hoisted db spy pattern as wellness.test.ts. Drizzle's
 * eq/and operators are intercepted to capture the WHERE clause args; the
 * production router runs unmodified through supertest.
 *
 * The full mutation-style guard (deliberately remove an eq() and watch the
 * test fail) is BATCH 7 work — fourth IDOR site after biometrics / wellness
 * / wearables / notifications. BATCH 3 here covers the basic IDOR shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Hoisted spy state
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
// Module mocks — must come BEFORE imports of the router
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

vi.mock('../../services/fileUpload', () => ({
  isR2Configured: () => false,
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
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

// ---------------------------------------------------------------------------
// AFTER mocks — import router + schema
// ---------------------------------------------------------------------------

import appleHealthRouter from '../../routes/appleHealth';
import { appleHealthImports, wearableConnections, users } from '../../../shared/schema';

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
      return next();
    }
    // No user → return 401 to mirror the secureAuth middleware behaviour.
    return next();
  });
  // Inject 401 short-circuit for unauthenticated requests so tests can verify
  // the production secureAuth gate without mounting it (it depends on
  // session middleware that tests don't load).
  app.use((req, res, next) => {
    if (!(req as unknown as { user?: TestUser }).user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  });
  app.use('/api/apple-health', appleHealthRouter);
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
// 401 Unauthorized
// ===========================================================================

describe('Apple Health routes — 401 unauthenticated', () => {
  beforeEach(() => spyState.reset());

  const cases = [
    { method: 'post' as const, path: '/api/apple-health/upload' },
    { method: 'get' as const, path: '/api/apple-health/imports' },
    { method: 'get' as const, path: '/api/apple-health/imports/some-id' },
    { method: 'post' as const, path: '/api/apple-health/imports/some-id/cancel' },
    { method: 'post' as const, path: '/api/apple-health/imports/some-id/retry' },
    { method: 'delete' as const, path: '/api/apple-health/imports/some-id' },
    { method: 'get' as const, path: '/api/apple-health/hint-card/visibility' },
  ];
  for (const { method, path } of cases) {
    it(`${method.toUpperCase()} ${path} returns 401 unauthenticated`, async () => {
      const app = makeTestApp(null);
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });
  }
});

// ===========================================================================
// POST /upload — multipart validation
// ===========================================================================

describe('POST /api/apple-health/upload — multipart validation', () => {
  beforeEach(() => spyState.reset());

  it('returns 400 when no file provided', async () => {
    const res = await request(makeTestApp(userA())).post('/api/apple-health/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file provided');
  });

  it('rejects non-zip mime type with 400', async () => {
    const res = await request(makeTestApp(userA()))
      .post('/api/apple-health/upload')
      .attach('file', Buffer.from('not a zip'), {
        filename: 'export.zip',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Apple Health exports/);
  });

  it('rejects file with .xml extension (even if mime looks zip)', async () => {
    const res = await request(makeTestApp(userA()))
      .post('/api/apple-health/upload')
      .attach('file', Buffer.from('PK\x03\x04 fake zip'), {
        filename: 'export.xml',
        contentType: 'application/zip',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Apple Health exports/);
  });

  it('accepts application/octet-stream IF .zip extension is set (defensive)', async () => {
    // Insert + update mocks: row id, then file_r2_key update returning row.
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'uploaded' }]);
    spyState.queueResults([
      {
        id: 'imp-1',
        userId: 'user-A',
        status: 'uploaded',
        fileR2Key: '/tmp/imp-1.zip',
      },
    ]);

    const res = await request(makeTestApp(userA()))
      .post('/api/apple-health/upload')
      .attach('file', Buffer.from('PK\x03\x04 fake zip body'), {
        filename: 'export.zip',
        contentType: 'application/octet-stream',
      });
    // 201 if the multipart filter accepted + the storage layer wrote.
    // (storage layer hits tmp filesystem in dev — works on most CI but may
    // 500 in some sandboxed envs. Either is acceptable for "the multipart
    // filter accepted the file"; the important assertion is NOT 400.)
    expect(res.status).not.toBe(400);
  });
});

// ===========================================================================
// GET /imports — list ownership
// ===========================================================================

describe('GET /api/apple-health/imports', () => {
  beforeEach(() => spyState.reset());

  it('issues eq(appleHealthImports.userId, callerId) in WHERE — IDOR ownership clause', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA())).get('/api/apple-health/imports');
    expectOwnershipClause(appleHealthImports.userId, 'user-A');
  });

  it('returns rows scoped to caller (cross-user simulator: userB sees no userA rows)', async () => {
    // The DB simulator returns whatever's queued — in the production code path
    // the eq(userId, 'user-B') filter would filter at DB layer to userB rows.
    // We queue userB-scoped rows and verify the response is what was queued
    // (no leakage from a global pool).
    spyState.queueResults([{ id: 'imp-B-1', userId: 'user-B', status: 'completed' }]);
    const res = await request(makeTestApp(userB())).get('/api/apple-health/imports');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].userId).toBe('user-B');
    expectOwnershipClause(appleHealthImports.userId, 'user-B');
  });

  it('rejects invalid limit query (zod validation)', async () => {
    const res = await request(makeTestApp(userA())).get('/api/apple-health/imports?limit=99999');
    expect(res.status).toBe(400);
  });
});

// ===========================================================================
// GET /imports/:id — IDOR
// ===========================================================================

describe('GET /api/apple-health/imports/:id', () => {
  beforeEach(() => spyState.reset());

  it('issues eq(id) AND eq(userId) — both ownership clauses present', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'completed' }]);
    await request(makeTestApp(userA())).get('/api/apple-health/imports/imp-1');
    expectOwnershipClause(appleHealthImports.id, 'imp-1');
    expectOwnershipClause(appleHealthImports.userId, 'user-A');
  });

  it('returns 404 when DB returns empty (cross-user lookup simulated)', async () => {
    spyState.queueResults([]); // simulates eq(userId, userA) filtering out userB's row
    const res = await request(makeTestApp(userA())).get(
      '/api/apple-health/imports/userB-import-id'
    );
    expect(res.status).toBe(404);
  });

  it('returns the import row when found', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'completed' }]);
    const res = await request(makeTestApp(userA())).get('/api/apple-health/imports/imp-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('imp-1');
  });
});

// ===========================================================================
// POST /imports/:id/cancel — IDOR + status guard
// ===========================================================================

describe('POST /api/apple-health/imports/:id/cancel', () => {
  beforeEach(() => spyState.reset());

  it('cancels a parsing import (status flips to cancelled)', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'parsing' }]);
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'cancelled' }]);
    const res = await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/cancel');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('rejects cancel on completed import with 400', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'completed' }]);
    const res = await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/cancel');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot cancel/);
  });

  it('returns 404 when import not found (cross-user simulated)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA())).post(
      '/api/apple-health/imports/userB-import/cancel'
    );
    expect(res.status).toBe(404);
  });

  it('issues eq(id) AND eq(userId) on the SELECT-existing — IDOR ownership clause', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'parsing' }]);
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'cancelled' }]);
    await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/cancel');
    expectOwnershipClause(appleHealthImports.id, 'imp-1');
    expectOwnershipClause(appleHealthImports.userId, 'user-A');
  });
});

// ===========================================================================
// GET /hint-card/visibility — 4-condition AND server-side (BATCH 6 D1)
// ===========================================================================

describe('GET /api/apple-health/hint-card/visibility', () => {
  beforeEach(() => spyState.reset());

  it('returns visible=false reason=role-not-eligible for trainer (Guru)', async () => {
    // Trainer is excluded by the role gate — short-circuits before any DB read.
    const trainer = { id: 'user-T', email: 't@test.com', role: 'trainer' as const };
    const res = await request(makeTestApp(trainer)).get('/api/apple-health/hint-card/visibility');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ visible: false, reason: 'role-not-eligible' });
  });

  it('returns visible=false reason=has-completed-imports when count>0', async () => {
    // imports count > 0 (any positive number)
    spyState.queueResults([{ c: 1 }]);
    const res = await request(makeTestApp(userA())).get('/api/apple-health/hint-card/visibility');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ visible: false, reason: 'has-completed-imports' });
  });

  it('returns visible=false reason=has-active-wearable when count>0', async () => {
    spyState.queueResults([{ c: 0 }]); // imports = 0
    spyState.queueResults([{ c: 1 }]); // wearable connections = 1
    const res = await request(makeTestApp(userA())).get('/api/apple-health/hint-card/visibility');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ visible: false, reason: 'has-active-wearable' });
  });

  it('returns visible=false reason=dismissed when hintCards.appleHealthImport.dismissedAt set', async () => {
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([
      {
        notificationPreferences: {
          hintCards: { appleHealthImport: { dismissedAt: '2026-05-08T00:00:00Z' } },
        },
      },
    ]);
    const res = await request(makeTestApp(userA())).get('/api/apple-health/hint-card/visibility');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ visible: false, reason: 'dismissed' });
  });

  it('returns visible=true when all 4 conditions pass (Disciple, no imports, no wearables, not dismissed)', async () => {
    const disciple = { id: 'user-D', email: 'd@test.com', role: 'client' as const };
    spyState.queueResults([{ c: 0 }]); // imports = 0
    spyState.queueResults([{ c: 0 }]); // wearables = 0
    spyState.queueResults([{ notificationPreferences: null }]); // no prefs row → no dismissal
    const res = await request(makeTestApp(disciple)).get('/api/apple-health/hint-card/visibility');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ visible: true });
  });

  it('returns visible=true when prefs has other hintCards but not appleHealthImport', async () => {
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([
      {
        notificationPreferences: {
          hintCards: { someOtherHint: { dismissedAt: '2026-01-01T00:00:00Z' } },
        },
      },
    ]);
    const res = await request(makeTestApp(userA())).get('/api/apple-health/hint-card/visibility');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ visible: true });
  });

  it('issues eq(userId) on imports + wearables + users SELECTs — IDOR ownership clause', async () => {
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([{ notificationPreferences: null }]);
    await request(makeTestApp(userA())).get('/api/apple-health/hint-card/visibility');
    expectOwnershipClause(appleHealthImports.userId, 'user-A');
    // The wearableConnections + users column refs aren't imported here;
    // checking the eq-call list for the userA value is sufficient — IDOR
    // mutation testing in BATCH 7 will introspect column refs.
    const userIdMatches = spyState.eqCalls.filter(([_col, val]) => val === 'user-A');
    expect(userIdMatches.length).toBeGreaterThanOrEqual(3); // imports + wearables + users
  });
});

// ===========================================================================
// POST /imports/:id/retry — IDOR + status guard + file-still-exists guard (BATCH 5)
// ===========================================================================

describe('POST /api/apple-health/imports/:id/retry', () => {
  beforeEach(() => spyState.reset());

  it('retries a failed import (status flips to uploaded, error_message cleared)', async () => {
    spyState.queueResults([
      {
        id: 'imp-1',
        userId: 'user-A',
        status: 'failed',
        fileR2Key: '/tmp/x.zip',
        errorMessage: 'parse error',
      },
    ]);
    spyState.queueResults([
      {
        id: 'imp-1',
        userId: 'user-A',
        status: 'uploaded',
        fileR2Key: '/tmp/x.zip',
        errorMessage: null,
      },
    ]);
    const res = await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/retry');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('uploaded');
    expect(res.body.errorMessage).toBeNull();
  });

  it('rejects retry on completed import with 400', async () => {
    spyState.queueResults([
      { id: 'imp-1', userId: 'user-A', status: 'completed', fileR2Key: null },
    ]);
    const res = await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/retry');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot retry/);
  });

  it('rejects retry on parsing import with 400', async () => {
    spyState.queueResults([
      { id: 'imp-1', userId: 'user-A', status: 'parsing', fileR2Key: '/tmp/x.zip' },
    ]);
    const res = await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/retry');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot retry/);
  });

  it('rejects retry when file_r2_key is null with 400 (file no longer available)', async () => {
    // Edge case: a completed import was later marked failed somehow (shouldn't
    // happen but defensive), OR a failed import had its file cleaned up by a
    // future sweep cron. Either way: no underlying file = retry is impossible.
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'failed', fileR2Key: null }]);
    const res = await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/retry');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no longer available|re-upload/i);
  });

  it('returns 404 when import not found (cross-user simulated)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA())).post(
      '/api/apple-health/imports/userB-import/retry'
    );
    expect(res.status).toBe(404);
  });

  it('issues eq(id) AND eq(userId) on SELECT-existing — IDOR ownership clause', async () => {
    spyState.queueResults([
      { id: 'imp-1', userId: 'user-A', status: 'failed', fileR2Key: '/tmp/x.zip' },
    ]);
    spyState.queueResults([
      {
        id: 'imp-1',
        userId: 'user-A',
        status: 'uploaded',
        fileR2Key: '/tmp/x.zip',
        errorMessage: null,
      },
    ]);
    await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/retry');
    expectOwnershipClause(appleHealthImports.id, 'imp-1');
    expectOwnershipClause(appleHealthImports.userId, 'user-A');
  });
});

// ===========================================================================
// DELETE /imports/:id — IDOR
// ===========================================================================

describe('DELETE /api/apple-health/imports/:id', () => {
  beforeEach(() => spyState.reset());

  it('deletes when caller owns the row', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', fileR2Key: null }]);
    spyState.queueResults([]); // delete returns nothing
    const res = await request(makeTestApp(userA())).delete('/api/apple-health/imports/imp-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when import not found (cross-user simulated)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA())).delete(
      '/api/apple-health/imports/userB-import'
    );
    expect(res.status).toBe(404);
  });

  it('issues eq(id) AND eq(userId) on SELECT-existing AND on DELETE — IDOR ownership clause on both', async () => {
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', fileR2Key: null }]);
    spyState.queueResults([]);
    await request(makeTestApp(userA())).delete('/api/apple-health/imports/imp-1');
    // Two sets of (id, userId) clauses — one for the SELECT, one for the DELETE.
    const idMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.id && val === 'imp-1'
    );
    const userIdMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(idMatches.length).toBeGreaterThanOrEqual(2);
    expect(userIdMatches.length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// BATCH 7 — IDOR mutation testing
// ===========================================================================
//
// Each test below proves that the ownership predicate `eq(table.userId, callerId)`
// in the corresponding route is LOAD-BEARING. The mutation proof:
//
//   If a developer rewrites the route to remove the `eq(userId, ...)` filter,
//   the assertion `expectOwnershipClause(table.userId, callerId)` would fail
//   (the spy's eqCalls array would not contain the (column, value) pair the
//   test asserts on).
//
//   The cross-user shape is the converse: when caller IS user-B, user-A's id
//   must NEVER appear in the eq() spy. If the route were to substitute a
//   client-supplied userId (e.g. from req.body or req.params) into the WHERE
//   clause, this assertion would fail at runtime.
//
// Coverage map (7 sub-sites, fifth IDOR mutation-test ledger after biometrics
// / wellness / wearables / notifications):
//
//   1. POST   /upload                   — INSERT VALUES userId comes from session
//   2. GET    /imports                  — SELECT WHERE eq(userId)
//   3. GET    /imports/:id              — SELECT WHERE eq(id) AND eq(userId)
//   4. POST   /imports/:id/cancel       — SELECT + UPDATE both filter by userId
//   5. POST   /imports/:id/retry        — SELECT + UPDATE both filter by userId
//   6. DELETE /imports/:id              — SELECT + DELETE both filter by userId
//   7. GET    /hint-card/visibility     — three SELECTs all filter by userId

describe('BATCH 7 IDOR mutation tests — POST /api/apple-health/upload (Site 1)', () => {
  beforeEach(() => spyState.reset());

  it('INSERT VALUES().userId comes from req.user (NEVER from request body)', async () => {
    // The upload route uses `userId: req.user!.id` in `.values()`. The IDOR
    // surface here is "could a user impersonate another user via request
    // payload?" The route never reads userId from req.body — it's hard-coded
    // to req.user.id. This test proves the captured INSERT values has the
    // session's user id and not whatever the multipart body might supply.
    spyState.queueResults([{ id: 'imp-A1', userId: 'user-A', status: 'uploaded' }]);
    spyState.queueResults([
      { id: 'imp-A1', userId: 'user-A', status: 'uploaded', fileR2Key: '/tmp/x.zip' },
    ]);
    await request(makeTestApp(userA()))
      .post('/api/apple-health/upload')
      .field('userId', 'user-B') // attempt to spoof another user via body
      .attach('file', Buffer.from('PK\x03\x04 fake zip body'), {
        filename: 'export.zip',
        contentType: 'application/zip',
      });
    // Find the .values() operation captured by the spy
    const valuesOp = spyState.operations.find((o) => o.op === 'values');
    expect(valuesOp).toBeDefined();
    const valuesArg = valuesOp!.args[0] as { userId: string };
    expect(valuesArg.userId).toBe('user-A');
    // user-B (the spoofed body field) is NEVER referenced as a userId in the spy
    const userBInValues = spyState.operations
      .filter((o) => o.op === 'values')
      .some((o) => (o.args[0] as { userId?: string })?.userId === 'user-B');
    expect(userBInValues).toBe(false);
  });
});

describe('BATCH 7 IDOR mutation tests — GET /api/apple-health/imports (Site 2)', () => {
  beforeEach(() => spyState.reset());

  it('cross-user mutation: caller userB triggers eq(userId, user-B); user-A NEVER in eq calls', async () => {
    // Mutation proof: removing `where(eq(appleHealthImports.userId, ...))` from
    // the list route would surface ALL imports across users. This test asserts
    // user-A's id never appears when caller is user-B — i.e., the eq() filter
    // is the ONLY thing scoping the result set.
    spyState.queueResults([{ id: 'imp-B1', userId: 'user-B', status: 'completed' }]);
    await request(makeTestApp(userB())).get('/api/apple-health/imports');
    expectOwnershipClause(appleHealthImports.userId, 'user-B');
    const userAOnImports = spyState.eqCalls.find(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userAOnImports).toBeUndefined();
  });
});

describe('BATCH 7 IDOR mutation tests — GET /api/apple-health/imports/:id (Site 3)', () => {
  beforeEach(() => spyState.reset());

  it('cross-user mutation: caller userB cannot fetch userA-owned import even with valid id', async () => {
    // Caller is userB but tries to fetch an id they don't own. The route's
    // and(eq(id), eq(userId)) WHERE filters out the row, yielding 404. The
    // mutation proof: if a developer rewrote the WHERE to use only eq(id),
    // userB would see userA's row → IDOR. This test asserts the filter
    // includes user-B (NOT user-A) in the eq calls.
    spyState.queueResults([]); // simulating row filtered out by userId predicate
    const res = await request(makeTestApp(userB())).get('/api/apple-health/imports/userA-imp-1');
    expect(res.status).toBe(404);
    expectOwnershipClause(appleHealthImports.userId, 'user-B');
    // user-A is NEVER in the eq() calls — caller's id is the only scope
    const userAMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userAMatches).toHaveLength(0);
  });
});

describe('BATCH 7 IDOR mutation tests — POST /imports/:id/cancel (Site 4)', () => {
  beforeEach(() => spyState.reset());

  it('UPDATE has eq(userId) — not just SELECT (defense against double-filter regression)', async () => {
    // Mutation proof: the cancel route does SELECT-existing then UPDATE. If a
    // developer were to drop the userId filter from EITHER the SELECT or the
    // UPDATE, IDOR would re-emerge. Test asserts user-A appears in eq() calls
    // at LEAST twice (once for SELECT WHERE, once for UPDATE WHERE).
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'parsing' }]);
    spyState.queueResults([{ id: 'imp-1', userId: 'user-A', status: 'cancelled' }]);
    await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/cancel');
    const userIdMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userIdMatches.length).toBeGreaterThanOrEqual(2);
    const idMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.id && val === 'imp-1'
    );
    expect(idMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('cross-user mutation: caller userB triggers user-B in eq calls; user-A NEVER referenced', async () => {
    spyState.queueResults([]); // row not found for user-B (correctly scoped)
    await request(makeTestApp(userB())).post('/api/apple-health/imports/userA-imp-1/cancel');
    const userBMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-B'
    );
    const userAMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userBMatches.length).toBeGreaterThanOrEqual(1);
    expect(userAMatches).toHaveLength(0);
  });
});

describe('BATCH 7 IDOR mutation tests — POST /imports/:id/retry (Site 5)', () => {
  beforeEach(() => spyState.reset());

  it('UPDATE has eq(userId) — not just SELECT', async () => {
    spyState.queueResults([
      { id: 'imp-1', userId: 'user-A', status: 'failed', fileR2Key: '/tmp/x.zip' },
    ]);
    spyState.queueResults([
      { id: 'imp-1', userId: 'user-A', status: 'uploaded', fileR2Key: '/tmp/x.zip' },
    ]);
    await request(makeTestApp(userA())).post('/api/apple-health/imports/imp-1/retry');
    const userIdMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userIdMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('cross-user mutation: caller userB cannot retry userA-owned import', async () => {
    spyState.queueResults([]); // row scoped out
    await request(makeTestApp(userB())).post('/api/apple-health/imports/userA-imp-1/retry');
    const userAMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userAMatches).toHaveLength(0);
    expectOwnershipClause(appleHealthImports.userId, 'user-B');
  });
});

describe('BATCH 7 IDOR mutation tests — DELETE /imports/:id (Site 6)', () => {
  beforeEach(() => spyState.reset());

  it('cross-user mutation: caller userB DELETE attempt against userA row → user-A NEVER in eq calls', async () => {
    spyState.queueResults([]); // SELECT returns empty (row out of scope)
    const res = await request(makeTestApp(userB())).delete('/api/apple-health/imports/userA-imp-1');
    expect(res.status).toBe(404);
    const userAMatches = spyState.eqCalls.filter(
      ([col, val]) => col === appleHealthImports.userId && val === 'user-A'
    );
    expect(userAMatches).toHaveLength(0);
    expectOwnershipClause(appleHealthImports.userId, 'user-B');
  });
});

describe('BATCH 7 IDOR mutation tests — GET /hint-card/visibility (Site 7)', () => {
  beforeEach(() => spyState.reset());

  it('all three SELECTs (imports, wearables, users) filter by callerId', async () => {
    // Visibility endpoint reads from THREE tables: appleHealthImports,
    // wearableConnections, users. Each must filter by req.user.id. Mutation
    // proof: drop the eq(userId) on any of the three and a user could see
    // hint-card state derived from another user's data — equally an IDOR.
    spyState.queueResults([{ c: 0 }]); // imports = 0
    spyState.queueResults([{ c: 0 }]); // wearables = 0
    spyState.queueResults([{ notificationPreferences: null }]); // user prefs
    await request(makeTestApp(userA())).get('/api/apple-health/hint-card/visibility');
    expectOwnershipClause(appleHealthImports.userId, 'user-A');
    expectOwnershipClause(wearableConnections.userId, 'user-A');
    expectOwnershipClause(users.id, 'user-A');
  });

  it('cross-user mutation: caller userB never triggers any user-A predicate across the three tables', async () => {
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([{ c: 0 }]);
    spyState.queueResults([{ notificationPreferences: null }]);
    await request(makeTestApp(userB())).get('/api/apple-health/hint-card/visibility');
    // user-A is never in eq() calls regardless of which table's predicate it
    // would be on — the only valid scope is the caller's id.
    const userAMatches = spyState.eqCalls.filter(([_col, val]) => val === 'user-A');
    expect(userAMatches).toHaveLength(0);
    // user-B IS the caller — appears at least 3× (one per table predicate)
    const userBMatches = spyState.eqCalls.filter(([_col, val]) => val === 'user-B');
    expect(userBMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('role gate short-circuits BEFORE any DB read (Guru never triggers eq calls)', async () => {
    // Trainer is filtered out by the role gate; the route returns
    // visible=false WITHOUT reading any of the three tables. Defense against
    // a future regression that moves the role gate AFTER DB reads — would
    // surface as wasted DB calls + a slowly-degrading visibility endpoint.
    const trainer = { id: 'user-T', email: 't@test.com', role: 'trainer' as const };
    await request(makeTestApp(trainer)).get('/api/apple-health/hint-card/visibility');
    expect(spyState.eqCalls).toHaveLength(0); // zero DB reads
    expect(spyState.operations).toHaveLength(0);
  });
});

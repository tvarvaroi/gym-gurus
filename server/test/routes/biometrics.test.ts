/**
 * Biometrics Route Tests — Sprint 1.5 BATCH 4
 *
 * Coverage:
 *   - IDOR ownership checks on all 11 single-resource routes
 *     (asserts the WHERE clause includes eq(table.userId, req.user.id))
 *   - Trainer-side route consent gating (GET /client/:clientId)
 *   - Photo upload constraints (mime allow-list, file size, pose validation)
 *   - Body metrics date validation (BATCH 2 smoke cases ported verbatim)
 *   - Settings consent role-gating + audit log emission
 *
 * Strategy: tests run the actual production router via supertest. The
 * Drizzle DB layer is mocked — operators (eq, and, isNull, inArray) capture
 * call args so IDOR ownership clauses can be asserted directly. Mutating a
 * route to remove `eq(table.userId, req.user!.id)` will fail the matching
 * "ownership clause is in WHERE" assertion (mutation-detection guarantee).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Hoisted shared state — used by mock factories below
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper } = vi.hoisted(() => {
  const spyState = {
    eqCalls: [] as Array<[unknown, unknown]>,
    andCalls: [] as Array<unknown[]>,
    isNullCalls: [] as Array<unknown>,
    inArrayCalls: [] as Array<[unknown, unknown]>,
    queue: [] as unknown[],
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.eqCalls = [];
      this.andCalls = [];
      this.isNullCalls = [];
      this.inArrayCalls = [];
      this.queue = [];
      this.operations = [];
    },
  };

  // Per-chain query builder. Thenable so `await db.select().from(t).where(c)`
  // resolves to the next queued result. CRITICAL: only the chain object is
  // thenable — the top-level `db` wrapper must NOT be (otherwise Vitest sees
  // `.then` on the mocked module export and unwraps the whole `db` to its
  // first await result).
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
// Module mocks — must come BEFORE imports of routes/biometrics.ts
// ---------------------------------------------------------------------------

// Drizzle operator capture. Real implementations still run so SQL chunks
// remain valid (we just observe the calls).
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
    inArray: (col: unknown, vals: unknown) => {
      spyState.inArrayCalls.push([col, vals]);
      return actual.inArray(col as never, vals as never);
    },
  };
});

// DB layer — both `db` (used by settings.ts) and `getDb()` (used by
// biometrics.ts) share one builder instance, so the operations queue is
// global and dequeues in call order regardless of which route ran.
vi.mock('../../db', () => {
  const wrapper = makeDbWrapper();
  return {
    getDb: vi.fn(async () => wrapper),
    db: wrapper,
    getPool: vi.fn(),
    pool: null,
  };
});

// File upload — keep the test off the real R2 path. Default isR2Configured()
// returns false so the dev base64 fallback runs (exercises sharp pipeline).
vi.mock('../../services/fileUpload', () => ({
  uploadImage: vi.fn(async () => 'https://r2.example.com/uploaded.webp'),
  deleteImage: vi.fn(async () => undefined),
  isR2Configured: vi.fn(() => false),
}));

// Logger — silence + provide a spy on audit() for the consent log assertion.
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

// requestLogger — getRequestId() is called by settings.ts for audit log
// correlation; return a deterministic value.
vi.mock('../../middleware/requestLogger', () => ({
  getRequestId: vi.fn(() => 'test-request-id'),
}));

// Auth getUserById — only used by settings.ts in unrelated routes; stubbed
// to avoid loading real DB code paths.
vi.mock('../../auth', () => ({
  getUserById: vi.fn(),
}));

// ---------------------------------------------------------------------------
// AFTER mocks — import the routers under test and the real schema
// ---------------------------------------------------------------------------

import biometricsRouter from '../../routes/biometrics';
import settingsRouter from '../../routes/settings';
import { bodyMetrics, progressPhotos, clients } from '@shared/schema';
import { logger } from '../../logger';

// ---------------------------------------------------------------------------
// Test app factory — drops a fake auth middleware in front of the router so
// `req.user` is populated without hitting real session/cookie code.
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  email: string;
  role: 'trainer' | 'solo' | 'client';
  firstName?: string;
  lastName?: string;
}

function makeTestApp(user: TestUser, mountPath: '/api/biometrics' | '/api/settings') {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as unknown as { user: TestUser }).user = user;
    next();
  });
  app.use(mountPath, mountPath === '/api/biometrics' ? biometricsRouter : settingsRouter);
  return app;
}

const userA = (): TestUser => ({
  id: 'user-A',
  email: 'a@test.com',
  role: 'solo',
  firstName: 'Alice',
  lastName: 'A',
});

const userB = (): TestUser => ({
  id: 'user-B',
  email: 'b@test.com',
  role: 'solo',
  firstName: 'Bob',
  lastName: 'B',
});

const trainer = (): TestUser => ({
  id: 'trainer-1',
  email: 'guru@test.com',
  role: 'trainer',
  firstName: 'Guru',
  lastName: 'G',
});

const disciple = (): TestUser => ({
  id: 'user-D',
  email: 'disciple@test.com',
  role: 'client',
  firstName: 'Dis',
  lastName: 'D',
});

// Helper: assert that the spy recorded an eq() call for the ownership clause
// `eq(<column>, <value>)` somewhere during the request. This is the IDOR
// mutation-detection check — if a route stops including the userId clause
// in WHERE, this assertion fails.
function expectOwnershipClause(column: unknown, expectedValue: unknown) {
  const match = spyState.eqCalls.find(([col, val]) => col === column && val === expectedValue);
  expect(
    match,
    `Expected eq(<column>, ${JSON.stringify(expectedValue)}) in WHERE clause. ` +
      `Got eq calls: ${JSON.stringify(spyState.eqCalls.map(([_c, v]) => v))}`
  ).toBeDefined();
}

// ===========================================================================
// IDOR — body metrics single-resource routes
// ===========================================================================

describe('IDOR: GET /api/biometrics/:id', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 when caller owns the resource', async () => {
    spyState.queueResults([{ id: 'm1', userId: 'user-A', recordedAt: '2026-05-01T00:00:00Z' }]);
    const res = await request(makeTestApp(userA(), '/api/biometrics')).get('/api/biometrics/m1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('m1');
  });

  it('returns 404 when caller does not own the resource', async () => {
    // Real DB would filter to 0 rows because of eq(userId, attacker). Mock
    // simulates that by returning empty.
    spyState.queueResults([]);
    const res = await request(makeTestApp(userB(), '/api/biometrics')).get('/api/biometrics/m1');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });

  it('includes eq(bodyMetrics.userId, callerId) in WHERE — ownership clause', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA(), '/api/biometrics')).get('/api/biometrics/m1');
    expectOwnershipClause(bodyMetrics.userId, 'user-A');
  });
});

describe('IDOR: PUT /api/biometrics/:id', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 with updated row when caller owns the resource', async () => {
    const existing = { id: 'm1', userId: 'user-A' };
    const updated = { id: 'm1', userId: 'user-A', weightKg: '80.5' };
    spyState.queueResults([existing], [updated]);

    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .put('/api/biometrics/m1')
      .send({ weightKg: '80.5' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('m1');
  });

  it('returns 404 when caller does not own the resource', async () => {
    spyState.queueResults([]); // SELECT returns empty -> 404 path
    const res = await request(makeTestApp(userB(), '/api/biometrics'))
      .put('/api/biometrics/m1')
      .send({ weightKg: '80.5' });
    expect(res.status).toBe(404);
  });

  it('includes eq(bodyMetrics.userId, callerId) in pre-update SELECT', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA(), '/api/biometrics'))
      .put('/api/biometrics/m1')
      .send({ weightKg: '80.5' });
    expectOwnershipClause(bodyMetrics.userId, 'user-A');
  });
});

describe('IDOR: DELETE /api/biometrics/:id', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 when caller owns the resource', async () => {
    const existing = { id: 'm1', userId: 'user-A' };
    spyState.queueResults([existing], []); // SELECT returns row, DELETE returns nothing meaningful
    const res = await request(makeTestApp(userA(), '/api/biometrics')).delete('/api/biometrics/m1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when caller does not own the resource', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userB(), '/api/biometrics')).delete('/api/biometrics/m1');
    expect(res.status).toBe(404);
  });

  it('includes eq(bodyMetrics.userId, callerId) in pre-delete SELECT', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA(), '/api/biometrics')).delete('/api/biometrics/m1');
    expectOwnershipClause(bodyMetrics.userId, 'user-A');
  });
});

// ===========================================================================
// IDOR — body metrics list + create
// ===========================================================================

describe('IDOR: GET /api/biometrics (list)', () => {
  beforeEach(() => spyState.reset());

  it('scopes the list query to the caller via eq(bodyMetrics.userId, callerId)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA(), '/api/biometrics')).get('/api/biometrics');
    expect(res.status).toBe(200);
    expectOwnershipClause(bodyMetrics.userId, 'user-A');
  });
});

describe('POST /api/biometrics (create) — userId comes from session, not body', () => {
  beforeEach(() => spyState.reset());

  it('injects userId from session even if body attempts to override', async () => {
    const newRow = { id: 'm-new', userId: 'user-A' };
    spyState.queueResults([newRow]);

    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ userId: 'user-attacker', weightKg: '70.0' });

    expect(res.status).toBe(201);

    // The .values() call must have received userId === 'user-A'. Find the
    // values() operation and assert userId came from session.
    const valuesOp = spyState.operations.find((o) => o.op === 'values');
    expect(valuesOp).toBeDefined();
    const inserted = valuesOp!.args[0] as { userId: string };
    expect(inserted.userId).toBe('user-A');
  });
});

// ===========================================================================
// IDOR — progress photos single-resource routes
// ===========================================================================

describe('IDOR: GET /api/biometrics/photos/:id', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 when caller owns the photo', async () => {
    spyState.queueResults([{ id: 'p1', userId: 'user-A' }]);
    const res = await request(makeTestApp(userA(), '/api/biometrics')).get(
      '/api/biometrics/photos/p1'
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('p1');
  });

  it('returns 404 when caller does not own the photo', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userB(), '/api/biometrics')).get(
      '/api/biometrics/photos/p1'
    );
    expect(res.status).toBe(404);
  });

  it('includes eq(progressPhotos.userId, callerId) in WHERE', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA(), '/api/biometrics')).get('/api/biometrics/photos/p1');
    expectOwnershipClause(progressPhotos.userId, 'user-A');
  });
});

describe('IDOR: DELETE /api/biometrics/photos/:id', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 when caller owns the photo', async () => {
    const existing = {
      id: 'p1',
      userId: 'user-A',
      imageUrl: 'data:...',
      thumbnailUrl: 'data:...',
    };
    spyState.queueResults([existing], []);
    const res = await request(makeTestApp(userA(), '/api/biometrics')).delete(
      '/api/biometrics/photos/p1'
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when caller does not own the photo', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userB(), '/api/biometrics')).delete(
      '/api/biometrics/photos/p1'
    );
    expect(res.status).toBe(404);
  });

  it('includes eq(progressPhotos.userId, callerId) in pre-delete SELECT', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(userA(), '/api/biometrics')).delete('/api/biometrics/photos/p1');
    expectOwnershipClause(progressPhotos.userId, 'user-A');
  });
});

describe('IDOR: POST /api/biometrics/photos/:id/compare/:otherId', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 when caller owns BOTH photos', async () => {
    const both = [{ id: 'p1' }, { id: 'p2' }];
    const updated = { id: 'p1', comparesPhotoId: 'p2' };
    spyState.queueResults(both, [updated]);

    const res = await request(makeTestApp(userA(), '/api/biometrics')).post(
      '/api/biometrics/photos/p1/compare/p2'
    );
    expect(res.status).toBe(200);
    expect(res.body.comparesPhotoId).toBe('p2');
  });

  it('returns 404 when caller does not own both photos', async () => {
    // Real DB filters by eq(userId) + inArray(id, [p1, p2]). If attacker
    // owns 1 of 2, length !== 2.
    spyState.queueResults([{ id: 'p1' }]); // only one match
    const res = await request(makeTestApp(userB(), '/api/biometrics')).post(
      '/api/biometrics/photos/p1/compare/p2'
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when comparing a photo with itself', async () => {
    const res = await request(makeTestApp(userA(), '/api/biometrics')).post(
      '/api/biometrics/photos/p1/compare/p1'
    );
    expect(res.status).toBe(400);
  });

  it('includes eq(progressPhotos.userId, callerId) AND inArray(progressPhotos.id, [id, otherId])', async () => {
    spyState.queueResults([]); // length !== 2 -> 404, but spies still record
    await request(makeTestApp(userA(), '/api/biometrics')).post(
      '/api/biometrics/photos/p1/compare/p2'
    );
    expectOwnershipClause(progressPhotos.userId, 'user-A');
    const inArrayMatch = spyState.inArrayCalls.find(
      ([col, vals]) =>
        col === progressPhotos.id &&
        Array.isArray(vals) &&
        (vals as string[]).includes('p1') &&
        (vals as string[]).includes('p2')
    );
    expect(inArrayMatch).toBeDefined();
  });
});

describe('IDOR: GET /api/biometrics/photos (list)', () => {
  beforeEach(() => spyState.reset());

  it('scopes the list query to the caller via eq(progressPhotos.userId, callerId)', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(userA(), '/api/biometrics')).get(
      '/api/biometrics/photos'
    );
    expect(res.status).toBe(200);
    expectOwnershipClause(progressPhotos.userId, 'user-A');
  });
});

// ===========================================================================
// Trainer-side route — GET /api/biometrics/client/:clientId
// Consent + ownership gating
// ===========================================================================

describe('Trainer: GET /api/biometrics/client/:clientId', () => {
  beforeEach(() => spyState.reset());

  it('returns 200 with metrics when trainer owns the client AND consent flag is on', async () => {
    const clientRow = {
      id: 'client-1',
      trainerId: 'trainer-1',
      email: 'disciple@test.com',
      shareBodyMetricsWithTrainer: true,
    };
    const userRow = { id: 'user-D' };
    const metrics = [{ id: 'm1', userId: 'user-D' }];
    spyState.queueResults([clientRow], [userRow], metrics);

    const res = await request(makeTestApp(trainer(), '/api/biometrics')).get(
      '/api/biometrics/client/client-1'
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('returns 403 when consent flag is OFF', async () => {
    const clientRow = {
      id: 'client-1',
      trainerId: 'trainer-1',
      email: 'disciple@test.com',
      shareBodyMetricsWithTrainer: false,
    };
    spyState.queueResults([clientRow]);

    const res = await request(makeTestApp(trainer(), '/api/biometrics')).get(
      '/api/biometrics/client/client-1'
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('not shared');
  });

  it('returns 404 when trainer does not own the client (different trainerId)', async () => {
    spyState.queueResults([]); // eq(trainerId, caller) filters to 0 rows
    const res = await request(makeTestApp(trainer(), '/api/biometrics')).get(
      '/api/biometrics/client/client-not-mine'
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Client not found');
  });

  it('returns [] when the client row exists but no registered Disciple matches the email', async () => {
    const clientRow = {
      id: 'client-1',
      trainerId: 'trainer-1',
      email: 'unregistered@test.com',
      shareBodyMetricsWithTrainer: true,
    };
    spyState.queueResults([clientRow], []); // SELECT users -> empty
    const res = await request(makeTestApp(trainer(), '/api/biometrics')).get(
      '/api/biometrics/client/client-1'
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('includes eq(clients.trainerId, callerId) in client lookup — IDOR ownership', async () => {
    spyState.queueResults([]);
    await request(makeTestApp(trainer(), '/api/biometrics')).get('/api/biometrics/client/client-1');
    expectOwnershipClause(clients.trainerId, 'trainer-1');
  });
});

// ===========================================================================
// Photo upload constraints — mime allow-list + file size + body validation
// ===========================================================================

describe('POST /api/biometrics/photos — upload constraints', () => {
  beforeEach(() => spyState.reset());

  // Smallest valid 1x1 PNG (decoded from the canonical base64 representation).
  // Using a known-good blob avoids hand-built headers that fail libspng's
  // strict validation.
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
    'base64'
  );

  it('returns 400 when uploading SVG (not in mime allow-list — XSS surface)', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    );
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics/photos')
      .field('pose', 'front')
      .attach('image', svg, { filename: 'attack.svg', contentType: 'image/svg+xml' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Unsupported image format');
  });

  it('returns 400 when no file is provided', async () => {
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics/photos')
      .field('pose', 'front');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file provided');
  });

  it('returns 400 when pose is missing', async () => {
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics/photos')
      .attach('image', tinyPng, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when pose is not in the allowed enum', async () => {
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics/photos')
      .field('pose', 'butterfly') // not in enum
      .attach('image', tinyPng, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('accepts a valid PNG with valid pose and assigns userId from session', async () => {
    const newRow = { id: 'p-new', userId: 'user-A' };
    spyState.queueResults([newRow]);

    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics/photos')
      .field('pose', 'front')
      .attach('image', tinyPng, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    const valuesOp = spyState.operations.find((o) => o.op === 'values');
    expect(valuesOp).toBeDefined();
    const inserted = valuesOp!.args[0] as { userId: string };
    expect(inserted.userId).toBe('user-A');
  });
});

// ===========================================================================
// Body metrics date validation — BATCH 2 smoke cases ported verbatim
// ===========================================================================

describe('POST /api/biometrics — recordedAt validation (BATCH 2 smoke cases)', () => {
  beforeEach(() => spyState.reset());

  it('rejects a future date beyond now+60s clock-skew tolerance', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ recordedAt: future, weightKg: '80' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(JSON.stringify(res.body.details)).toContain('Cannot log future entries');
  });

  it('rejects an ancient date (1900-01-01 — far before the 2010 floor)', async () => {
    const ancient = '1900-01-01T00:00:00Z';
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ recordedAt: ancient, weightKg: '80' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.details)).toContain('Date too far in the past');
  });

  it('accepts a legitimate backdate (2015-06-15)', async () => {
    spyState.queueResults([{ id: 'm-new', userId: 'user-A' }]);
    const backdate = '2015-06-15T12:00:00Z';
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ recordedAt: backdate, weightKg: '80' });

    expect(res.status).toBe(201);
  });

  it('accepts a near-future date within the 60s clock-skew window', async () => {
    spyState.queueResults([{ id: 'm-new', userId: 'user-A' }]);
    const skew = new Date(Date.now() + 30 * 1000).toISOString(); // +30s
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ recordedAt: skew, weightKg: '80' });

    expect(res.status).toBe(201);
  });

  it('accepts payload with no recordedAt (column has DB-default)', async () => {
    spyState.queueResults([{ id: 'm-new', userId: 'user-A' }]);
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ weightKg: '80' });

    expect(res.status).toBe(201);
  });

  it('rejects exactly the 2010-01-01 boundary minus one day', async () => {
    const justBeforeFloor = '2009-12-31T23:59:59Z';
    const res = await request(makeTestApp(userA(), '/api/biometrics'))
      .post('/api/biometrics')
      .send({ recordedAt: justBeforeFloor, weightKg: '80' });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.details)).toContain('Date too far in the past');
  });
});

// ===========================================================================
// Settings consent — role gating + audit log emission
// ===========================================================================

describe('GET /api/settings/biometrics-sharing — role gating', () => {
  beforeEach(() => {
    spyState.reset();
    (logger.audit as ReturnType<typeof vi.fn>).mockClear();
  });

  it('returns 403 for Ronin (solo) caller', async () => {
    const res = await request(makeTestApp(userA(), '/api/settings')).get(
      '/api/settings/biometrics-sharing'
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Disciple-only setting');
  });

  it('returns 403 for Guru (trainer) caller', async () => {
    const res = await request(makeTestApp(trainer(), '/api/settings')).get(
      '/api/settings/biometrics-sharing'
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 with consent flag for Disciple (client)', async () => {
    spyState.queueResults([{ shareBodyMetricsWithTrainer: true }]);
    const res = await request(makeTestApp(disciple(), '/api/settings')).get(
      '/api/settings/biometrics-sharing'
    );
    expect(res.status).toBe(200);
    expect(res.body.shareBodyMetricsWithTrainer).toBe(true);
    expect(res.body.hasTrainer).toBe(true);
  });

  it('returns shareBodyMetricsWithTrainer:true (default) when no client row matches', async () => {
    spyState.queueResults([]);
    const res = await request(makeTestApp(disciple(), '/api/settings')).get(
      '/api/settings/biometrics-sharing'
    );
    expect(res.status).toBe(200);
    expect(res.body.shareBodyMetricsWithTrainer).toBe(true);
    expect(res.body.hasTrainer).toBe(false);
  });
});

describe('PATCH /api/settings/biometrics-sharing — role gating + audit log', () => {
  beforeEach(() => {
    spyState.reset();
    (logger.audit as ReturnType<typeof vi.fn>).mockClear();
  });

  it('returns 403 for Ronin (solo) and emits NO audit log', async () => {
    const res = await request(makeTestApp(userA(), '/api/settings'))
      .patch('/api/settings/biometrics-sharing')
      .send({ shareBodyMetricsWithTrainer: false });
    expect(res.status).toBe(403);
    expect(logger.audit).not.toHaveBeenCalled();
  });

  it('returns 403 for Guru (trainer) and emits NO audit log', async () => {
    const res = await request(makeTestApp(trainer(), '/api/settings'))
      .patch('/api/settings/biometrics-sharing')
      .send({ shareBodyMetricsWithTrainer: false });
    expect(res.status).toBe(403);
    expect(logger.audit).not.toHaveBeenCalled();
  });

  it('returns 400 for non-boolean payload and emits NO audit log', async () => {
    const res = await request(makeTestApp(disciple(), '/api/settings'))
      .patch('/api/settings/biometrics-sharing')
      .send({ shareBodyMetricsWithTrainer: 'yes' });
    expect(res.status).toBe(400);
    expect(logger.audit).not.toHaveBeenCalled();
  });

  it('emits one audit log line on a flip with previousValue captured (Disciple flips OFF)', async () => {
    // 1st query: SELECT existing -> previousValue=true
    // 2nd query: UPDATE clients (no result needed)
    spyState.queueResults([{ shareBodyMetricsWithTrainer: true }], []);

    const res = await request(makeTestApp(disciple(), '/api/settings'))
      .patch('/api/settings/biometrics-sharing')
      .send({ shareBodyMetricsWithTrainer: false });

    expect(res.status).toBe(200);
    expect(logger.audit).toHaveBeenCalledTimes(1);
    const [event, payload] = (logger.audit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(event).toBe('consent.toggled');
    expect(payload).toMatchObject({
      userId: 'user-D',
      email: 'disciple@test.com',
      flag: 'shareBodyMetricsWithTrainer',
      previousValue: true,
      value: false,
      requestId: 'test-request-id',
    });
    expect(typeof payload.ts).toBe('string');
  });

  it('captures previousValue=null when no client row exists (first toggle ever)', async () => {
    spyState.queueResults([], []); // no existing client row
    const res = await request(makeTestApp(disciple(), '/api/settings'))
      .patch('/api/settings/biometrics-sharing')
      .send({ shareBodyMetricsWithTrainer: true });

    expect(res.status).toBe(200);
    const [, payload] = (logger.audit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload.previousValue).toBeNull();
    expect(payload.value).toBe(true);
  });

  it('emits audit log even on a reaffirm (previousValue === value)', async () => {
    spyState.queueResults([{ shareBodyMetricsWithTrainer: true }], []);
    await request(makeTestApp(disciple(), '/api/settings'))
      .patch('/api/settings/biometrics-sharing')
      .send({ shareBodyMetricsWithTrainer: true });

    const [, payload] = (logger.audit as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload.previousValue).toBe(true);
    expect(payload.value).toBe(true);
  });
});

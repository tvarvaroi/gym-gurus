/**
 * Wearable Ingest BRIDGE Integration Tests — Sprint 4 Task 5a.10
 *
 * Path B end-to-end coverage: OW emits webhooks carrying `data.user_id` =
 * OW's internal UUID. We MUST translate that UUID → our internal user_id
 * via `wearable_connections.open_wearables_user_id` BEFORE any DB write
 * referencing user_id. These tests exercise the bridge step explicitly
 * by using the EXTERNAL identifier (OW's UUID) and asserting the
 * resulting INSERT contains the INTERNAL identifier (our user_id).
 *
 * Per `_brain/notes/gotchas.md` "Tests that mock at the system boundary
 * mask identity-bridge bugs" — these are the tests that catch the bridge
 * bug. The unit tests in wearableIngest.test.ts mock at the function-call
 * boundary and do NOT exercise the bridge translation; they would have
 * passed against the BATCH 5a Path-A-broken implementation. The bug
 * surfaces here.
 *
 * Coverage:
 *   1. workout.created → activity_sessions insert with user_id=GG_USER (NOT OW_UUID)
 *   2. sleep.created → sleep_sessions insert with user_id=GG_USER (NOT OW_UUID)
 *   3. body_composition.created → body_metrics insert with user_id=GG_USER (NOT OW_UUID)
 *   4. NEGATIVE: workout.created with unknown OW UUID → 200 ack, no insert,
 *      log captured at WARN level
 *
 * Strategy — smart in-memory DB simulator:
 *
 *   The repo has no test-database infrastructure. We can't spin up real
 *   Postgres in CI. Instead the simulator:
 *
 *     - Maintains an in-memory `wearable_connections` table (Map<id, row>)
 *     - The drizzle query builder for SELECT-from-wearable_connections
 *       inspects captured `eq()` clauses and returns matching rows.
 *       This is the bridge resolver path — it MUST exercise our actual
 *       `eq(wearableConnections.openWearablesUserId, owUserId)` call to
 *       work correctly.
 *     - `db.execute(sql\`...\`)` captures every SQL fragment + parameter
 *       binding into a list. Tests assert against these captures: every
 *       INSERT must contain the internal user_id, never the OW UUID.
 *
 *   The Svix verifier is NOT mocked — fixtures are signed with the real
 *   test secret, the production route runs the real `wh.verify()` call.
 *
 *   What is mocked: notification dispatch + recordSuccessfulSync (tested
 *   elsewhere). The full pipeline before that boundary runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { signEnvelope, TEST_WEBHOOK_SECRET } from '../helpers/svix-test-helper';

// ---------------------------------------------------------------------------
// In-memory DB simulator + drizzle-orm spies (vi.hoisted so mocks see them)
// ---------------------------------------------------------------------------

const { simState, makeDbWrapper, dispatchMock, recordSuccessfulSyncMock } = vi.hoisted(() => {
  // ─── Bridge state ───────────────────────────────────────────────────────
  // Rows in the `wearable_connections` table. The bridge resolver reads
  // these. Tests INSERT before signing the webhook fixture.
  interface BridgeRow {
    id: string;
    userId: string; // our internal user UUID
    provider: string;
    openWearablesUserId: string | null;
    status: string;
  }
  const bridgeRows: BridgeRow[] = [];

  // ─── Capture state ──────────────────────────────────────────────────────
  // Every SQL fragment + parameter binding from `db.execute(sql\`...\`)`
  // call. Bridge tests assert the captured user_id parameter is the
  // INTERNAL UUID, not the OW UUID.
  interface ExecuteCapture {
    /** Joined sql.raw chunks — useful for `expect(...).toContain('INSERT INTO activity_sessions')`. */
    sqlText: string;
    /** Parameter values in declaration order (drizzle's sql template tags). */
    params: unknown[];
  }
  const executeCaptures: ExecuteCapture[] = [];

  // ─── eq() interception ──────────────────────────────────────────────────
  // Vitest can't introspect drizzle's column references reliably across
  // modules, so we capture the `eq()` arg pairs as part of the SELECT
  // chain. `whereSpec` is the WHERE clause spec for the active query.
  let activeWhereSpec: Array<{ column: unknown; value: unknown }> = [];

  const simState = {
    bridgeRows,
    executeCaptures,
    activeWhereSpec,
    insertBridgeRow(row: BridgeRow) {
      bridgeRows.push(row);
    },
    reset() {
      bridgeRows.length = 0;
      executeCaptures.length = 0;
      this.activeWhereSpec = [];
      activeWhereSpec = [];
    },
    setActiveWhereSpec(spec: Array<{ column: unknown; value: unknown }>) {
      this.activeWhereSpec = spec;
      activeWhereSpec = spec;
    },
    getActiveWhereSpec() {
      return this.activeWhereSpec;
    },
  };

  // ─── Drizzle query-builder simulator ────────────────────────────────────
  function makeQueryBuilder(opType: 'select' | 'insert' | 'update' | 'delete') {
    let pendingWhereArgs: unknown[] = [];
    let pendingTable: unknown = null;

    const qb: Record<string, unknown> = {};

    qb.from = (table: unknown) => {
      pendingTable = table;
      return qb;
    };

    qb.where = (filter: unknown) => {
      // `filter` is what drizzle's eq()/and() returned. The drizzle-orm
      // mock captures the eq() arg pairs into pendingWhereArgs via the
      // global activeWhereSpec.
      pendingWhereArgs = simState.getActiveWhereSpec();
      // Clear so the next chained query starts fresh.
      simState.setActiveWhereSpec([]);
      return qb;
    };

    qb.limit = (n: number) => qb;
    qb.orderBy = (..._args: unknown[]) => qb;
    qb.values = (vals: unknown) => qb;
    qb.returning = (..._args: unknown[]) => qb;
    qb.set = (..._args: unknown[]) => qb;
    qb.onConflictDoUpdate = (..._args: unknown[]) => qb;
    qb.onConflictDoNothing = (..._args: unknown[]) => qb;

    qb.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      let result: unknown = [];
      if (opType === 'select' && pendingTable) {
        // Filter bridgeRows by the captured WHERE clause. We support a
        // single eq(openWearablesUserId, X) clause (the bridge resolver
        // path) — that's the only SELECT-from-wearable_connections that
        // hits the bridge tests in scope.
        const matching = simState.bridgeRows.filter((row) => {
          for (const { column, value } of pendingWhereArgs) {
            const colName = inferColumnName(column);
            if (colName === 'open_wearables_user_id') {
              if (row.openWearablesUserId !== value) return false;
            } else if (colName === 'user_id') {
              if (row.userId !== value) return false;
            } else if (colName === 'provider') {
              if (row.provider !== value) return false;
            } else if (colName === 'id') {
              if (row.id !== value) return false;
            }
          }
          return true;
        });
        // Map to the shape the resolver SELECTs — {userId} for the bridge
        // resolver, {id} for findConnectionId, etc. We return the full row
        // shape and let drizzle's destructure pick what it asked for. In
        // our simulator that's just returning all fields and trusting the
        // caller's destructure.
        result = matching.map((r) => ({
          id: r.id,
          userId: r.userId,
          provider: r.provider,
          openWearablesUserId: r.openWearablesUserId,
          status: r.status,
          // Common drizzle field names for findConnectionId
        }));
      }
      return Promise.resolve(result).then(resolve, reject);
    };

    return qb;
  }

  function makeDbWrapper(): Record<string, unknown> {
    const wrapper: Record<string, unknown> = {
      select: (..._args: unknown[]) => makeQueryBuilder('select'),
      insert: (..._args: unknown[]) => makeQueryBuilder('insert'),
      update: (..._args: unknown[]) => makeQueryBuilder('update'),
      delete: (..._args: unknown[]) => makeQueryBuilder('delete'),
      execute: async (chunk: unknown) => {
        // drizzle's `sql\`...\`` returns an SQL object with .queryChunks
        // (intermixed StringChunks + raw bound-param values). Capture
        // both the joined text and the param values for assertion.
        const { sqlText, params } = extractSqlChunks(chunk);
        simState.executeCaptures.push({ sqlText, params });
        // Default RETURNING shape for the UPSERT path:
        // RETURNING (xmax = 0) AS inserted
        return { rows: [{ inserted: true }] };
      },
    };
    // db.transaction passthrough (not exercised by bridge tests but
    // available so wearableConnections code paths don't blow up if called).
    wrapper.transaction = async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
      return fn(wrapper);
    };
    return wrapper;
  }

  // ─── Heuristic column-name resolver ─────────────────────────────────────
  // drizzle's column refs aren't string-comparable directly. The
  // production code calls eq(wearableConnections.openWearablesUserId, X);
  // we infer "open_wearables_user_id" by toString'ing the column ref's
  // .config or via a simple property check. drizzle-orm v0.30+ exposes
  // `column.name` on PgColumn-typed objects.
  function inferColumnName(column: unknown): string | null {
    if (!column || typeof column !== 'object') return null;
    const obj = column as { name?: string; config?: { name?: string } };
    return obj.name ?? obj.config?.name ?? null;
  }

  // ─── SQL chunk extractor ────────────────────────────────────────────────
  // FRAGILE: assumes drizzle-orm v0.30 queryChunks structure (StringChunks
  // alongside raw param values intermixed in the same array, NOT wrapped
  // in Param objects). Verified 2026-05-07 against the version in this
  // repo's package.json. Drizzle upgrades MUST re-verify this walker
  // against the new internal shape — bump drizzle-orm and run this test
  // file FIRST before assuming anything else still works. If a second
  // test file needs this pattern, extract to a shared helper and capture
  // the version-coupling in _brain/notes/gotchas.md.
  //
  // Drizzle's sql template tag produces an SQL object with internal
  // queryChunks. We walk it and split into static text + Param values.
  // Nested SQL fragments contain their own queryChunks — recurse.
  function extractSqlChunks(chunk: unknown): { sqlText: string; params: unknown[] } {
    const parts: string[] = [];
    const params: unknown[] = [];
    walk(chunk);
    return { sqlText: parts.join(''), params };

    function walk(c: unknown): void {
      // Drizzle's queryChunks structure (verified 2026-05-07 against
      // drizzle-orm v0.30 in this repo):
      //   - StringChunk { value: string[] } — static SQL text segments
      //   - Raw values intermixed: strings, numbers, null, undefined,
      //     boolean — these are bound parameter values (NOT wrapped in
      //     Param objects in this version)
      //   - Nested SQL { queryChunks: [...] } — recurse
      //
      // Old assumption (Param-wrapped values) was wrong; drizzle puts the
      // value itself directly in the queryChunks array.
      if (c === null || c === undefined) {
        // Drizzle includes literal nulls as bound params
        params.push(c);
        parts.push('?');
        return;
      }
      if (typeof c === 'string') {
        // Two cases collide here: a raw bound-param string (e.g.
        // 'gymgurus-user-1' from `${userId}`) AND a StringChunk's value
        // (raw SQL text). The disambiguating signal is "is this top-level
        // in a queryChunks array, or inside a StringChunk's value array?"
        // — context-dependent. We resolve via the caller branches below
        // (StringChunk branch flushes its .value array as text; this
        // branch handles raw queryChunk children only).
        params.push(c);
        parts.push('?');
        return;
      }
      if (typeof c !== 'object') {
        // numbers, booleans — bound params
        params.push(c);
        parts.push('?');
        return;
      }
      const obj = c as {
        queryChunks?: unknown[];
        value?: unknown;
        constructor?: { name?: string };
      };
      const ctorName = obj.constructor?.name ?? '';
      // StringChunk: static SQL text. Drizzle wraps its .value as a
      // single-element string array.
      if (ctorName === 'StringChunk' || ctorName.endsWith('StringChunk')) {
        if (typeof obj.value === 'string') {
          parts.push(obj.value);
        } else if (Array.isArray(obj.value)) {
          for (const v of obj.value) parts.push(String(v));
        }
        return;
      }
      // Nested SQL fragment
      if (Array.isArray(obj.queryChunks)) {
        for (const sub of obj.queryChunks) walk(sub);
        return;
      }
      // Drizzle's Param wrapper (kept for forward-compat; this branch
      // doesn't fire in v0.30 but might in future versions).
      if (ctorName === 'Param' || ctorName.endsWith('Param')) {
        params.push(obj.value);
        parts.push('?');
        return;
      }
      // Last-resort fallback: any { value } object — treat as Param.
      if ('value' in obj) {
        params.push(obj.value);
        parts.push('?');
      }
    }
  }

  const dispatchMock = vi.fn(async () => ({ notificationId: 'n1', outcome: 'sent' as const }));
  const recordSuccessfulSyncMock = vi.fn(async () => undefined);

  return { simState, makeDbWrapper, dispatchMock, recordSuccessfulSyncMock };
});

// ---------------------------------------------------------------------------
// Module mocks — drizzle-orm operators capture the eq() arg pairs so the
// query simulator can filter the in-memory table by the WHERE clause.
// ---------------------------------------------------------------------------

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => {
      // Append to the active WHERE spec — read by `qb.where()` when the
      // chain reaches the WHERE call.
      const current = simState.getActiveWhereSpec();
      simState.setActiveWhereSpec([...current, { column: col, value: val }]);
      return actual.eq(col as never, val as never);
    },
    and: (...filters: unknown[]) => {
      // and() is a wrapper around already-captured eq() pairs. The
      // activeWhereSpec already has them; just pass through.
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

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    audit: vi.fn(),
  },
}));
vi.mock('../../logger', () => ({
  logger: loggerMock,
  log: vi.fn(),
}));

// notificationDispatcher is mocked so the dispatch fan-out doesn't reach
// the real notification system. This is downstream of the bridge — not
// the focus of these tests.
vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: dispatchMock,
}));

// recordSuccessfulSync is similarly downstream of the bridge.
vi.mock('../../services/wearableConnections', () => ({
  recordSuccessfulSync: recordSuccessfulSyncMock,
}));

// ---------------------------------------------------------------------------
// Test app factory — uses the real webhook route + real Svix verifier
// ---------------------------------------------------------------------------

async function makeTestApp() {
  const mod = await import('../../routes/webhooks/wearables');
  mod.__resetWebhookIdempotency();
  const app = express();
  app.use('/webhooks', express.raw({ type: 'application/json' }), mod.default);
  return app;
}

// ---------------------------------------------------------------------------
// Test fixtures — distinct OW UUID vs our internal UUID for visible domain
// separation
// ---------------------------------------------------------------------------

const GG_USER = 'gymgurus-user-1'; // our internal user UUID
const OW_UUID = 'ow-uuid-abc'; // OW's internal UUID

const WORKOUT_DATA = {
  id: 'garmin-workout-bridge-1',
  user_id: OW_UUID, // OW domain — bridge MUST translate this
  type: 'running',
  start_time: '2026-05-06T07:00:00Z',
  end_time: '2026-05-06T07:45:00Z',
  duration_seconds: 2700,
  source: { provider: 'garmin' },
  calories_kcal: 420,
  distance_meters: 6800,
  avg_heart_rate_bpm: 152,
  max_heart_rate_bpm: 168,
};

const SLEEP_DATA = {
  id: 'garmin-sleep-bridge-1',
  user_id: OW_UUID,
  start_time: '2026-05-05T23:00:00Z',
  end_time: '2026-05-06T07:00:00Z',
  total_sleep_seconds: 25200,
  source: { provider: 'garmin' },
  stages: { deep_seconds: 5400, rem_seconds: 7200, light_seconds: 12600, awake_seconds: 0 },
  sleep_score: 84,
};

const BODY_COMP_DATA = {
  user_id: OW_UUID,
  provider: 'garmin',
  series_type: 'body_composition',
  samples: [{ timestamp: '2026-05-06T07:00:00Z', type: 'weight', value: 75.5, unit: 'kg' }],
};

beforeEach(() => {
  process.env.OPEN_WEARABLES_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  vi.resetModules();
  simState.reset();
  loggerMock.warn.mockClear();
  loggerMock.error.mockClear();
  loggerMock.info.mockClear();
  dispatchMock.mockClear();
  recordSuccessfulSyncMock.mockClear();
});

afterEach(() => {
  delete process.env.OPEN_WEARABLES_WEBHOOK_SECRET;
});

// ===========================================================================
// 1. workout.created — bridge translates OW UUID → our user_id
// ===========================================================================

describe('Bridge integration — workout.created (Path B)', () => {
  it('inserts activity_sessions with our user_id (NOT the OW UUID)', async () => {
    // Step 1: pre-seed the bridge row mapping OW_UUID → GG_USER
    simState.insertBridgeRow({
      id: 'wc-bridge-1',
      userId: GG_USER,
      provider: 'garmin',
      openWearablesUserId: OW_UUID,
      status: 'connected',
    });

    // Step 2: sign the webhook with OW_UUID in data.user_id
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'workout.created', data: WORKOUT_DATA });

    // Step 3: send the signed envelope
    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);

    // Step 4: assert the resulting INSERT contains GG_USER, NOT OW_UUID
    const insertCapture = simState.executeCaptures.find((c) =>
      c.sqlText.includes('INSERT INTO activity_sessions')
    );
    expect(insertCapture, 'expected an INSERT INTO activity_sessions to fire').toBeDefined();

    // The user_id parameter MUST be our internal GG_USER, NOT the OW UUID.
    // This is the load-bearing assertion: the BATCH 5a Path-A-broken
    // implementation would have written OW_UUID here and FK-violated in prod.
    expect(insertCapture!.params).toContain(GG_USER);
    expect(insertCapture!.params).not.toContain(OW_UUID);
  });
});

// ===========================================================================
// 2. sleep.created — same bridge contract
// ===========================================================================

describe('Bridge integration — sleep.created (Path B)', () => {
  it('inserts sleep_sessions with our user_id (NOT the OW UUID)', async () => {
    simState.insertBridgeRow({
      id: 'wc-bridge-2',
      userId: GG_USER,
      provider: 'garmin',
      openWearablesUserId: OW_UUID,
      status: 'connected',
    });

    const app = await makeTestApp();
    const { body, headers } = signEnvelope({ type: 'sleep.created', data: SLEEP_DATA });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);

    const insertCapture = simState.executeCaptures.find((c) =>
      c.sqlText.includes('INSERT INTO sleep_sessions')
    );
    expect(insertCapture, 'expected an INSERT INTO sleep_sessions to fire').toBeDefined();

    expect(insertCapture!.params).toContain(GG_USER);
    expect(insertCapture!.params).not.toContain(OW_UUID);
  });
});

// ===========================================================================
// 3. body_composition.created — same bridge contract
// ===========================================================================

describe('Bridge integration — body_composition.created (Path B)', () => {
  it('inserts body_metrics with our user_id (NOT the OW UUID)', async () => {
    simState.insertBridgeRow({
      id: 'wc-bridge-3',
      userId: GG_USER,
      provider: 'garmin',
      openWearablesUserId: OW_UUID,
      status: 'connected',
    });

    const app = await makeTestApp();
    const { body, headers } = signEnvelope({
      type: 'body_composition.created',
      data: BODY_COMP_DATA,
    });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    expect(res.status).toBe(200);

    const insertCapture = simState.executeCaptures.find((c) =>
      c.sqlText.includes('INSERT INTO body_metrics')
    );
    expect(insertCapture, 'expected an INSERT INTO body_metrics to fire').toBeDefined();

    expect(insertCapture!.params).toContain(GG_USER);
    expect(insertCapture!.params).not.toContain(OW_UUID);
  });
});

// ===========================================================================
// 4. NEGATIVE: unknown OW user — 200 ack, no insert, log captured at WARN
// ===========================================================================
//
// createUser response persistence is covered in
// server/test/services/wearableConnections.test.ts (step 2 tests):
// - "persists OW UUID via createUser → UPDATE inside same transaction (Path B)"
// - "throws if createUser returns no id (cannot persist OW UUID bridge)"
// Those tests assert the txn boundary + the SET argument shape directly.
// We don't duplicate them here.

describe('Bridge integration — unknown-user policy (data webhooks)', () => {
  it('workout.created with unknown OW UUID → 200 ack, no INSERT, WARN log', async () => {
    // No bridge row inserted — the bridge resolver will return null.
    const app = await makeTestApp();
    const { body, headers } = signEnvelope({
      type: 'workout.created',
      data: { ...WORKOUT_DATA, user_id: 'ow-uuid-unknown' },
    });

    const res = await request(app)
      .post('/webhooks/wearables')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);

    // 200 ack — Svix should NOT retry (retry would produce same outcome,
    // retry storm).
    expect(res.status).toBe(200);

    // No INSERT INTO activity_sessions should have happened.
    const insertCapture = simState.executeCaptures.find((c) =>
      c.sqlText.includes('INSERT INTO activity_sessions')
    );
    expect(insertCapture).toBeUndefined();

    // Log captured at WARN level with the expected fields.
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'workout.created received for unknown OW user (no bridge row)',
      expect.objectContaining({
        owUserId: 'ow-uuid-unknown',
        eventType: 'workout.created',
      })
    );
  });
});

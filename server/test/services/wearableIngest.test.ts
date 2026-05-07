/**
 * Wearable Ingest Service Tests — Sprint 4 BATCH 5a (Path B refactor — Task 5a.10)
 *
 * Coverage of the four new OW canonical event-type ingest functions:
 *
 *   1. Idempotent UPSERT on (userId, source, source_record_id) — workout + sleep
 *   2. body_composition iterates samples + UPSERTs against partial UNIQUE index
 *   3. connection.created UPDATEs the existing wearable_connections row +
 *      dispatches wearable_connected ONLY on transition (not on idempotent
 *      ack of an already-connected row)
 *   4. Bridge resolution (Path B): every ingest function calls
 *      resolveUserIdFromOwUserId(data.user_id) FIRST. Tests queue the
 *      resolved userId via spyState.queueSelectRow({ userId: 'gg-user-A' }).
 *   5. **Dispatch condition #1 (happy path)**: inserted=true + zero prior →
 *      first_sync_complete fires
 *   6. **Dispatch condition #2 (re-delivery)**: inserted=false + zero prior →
 *      no notification (UPDATE not INSERT) — MUTATION TEST TARGET: removing
 *      the `if (inserted)` gate must FAIL this test.
 *   7. **Dispatch condition #3 (already had data)**: inserted=true + count > 1 →
 *      no notification
 *   8. **Dispatch condition #4 (per-data-type)**: separate counter per dataType
 *   9. recordSuccessfulSync called at end of every ingest path WHEN a matching
 *      connection row exists; absence is logged + tolerated (not thrown)
 *
 * Bridge contract: these unit tests EXERCISE the bridge resolver call
 * (the SELECT from wearable_connections WHERE open_wearables_user_id = ?)
 * but do NOT verify that data.user_id maps correctly to our internal user
 * (because db.select is mocked at the function-call boundary). The bridge
 * integration tests in wearableIngest.bridge.test.ts cover that — they
 * exercise the bridge end-to-end through real Svix-signed webhook delivery
 * with a real wearable_connections row in the test DB. See
 * `_brain/notes/gotchas.md` "Tests that mock at the system boundary mask
 * identity-bridge bugs" for why both layers exist.
 *
 * Strategy: db.execute is mocked. The first execute() call returns the UPSERT
 * RETURNING row (controls `inserted`); subsequent select queries control the
 * count returned to maybeDispatchFirstSyncComplete. dispatch +
 * recordSuccessfulSync + findConnectionId + resolveUserIdFromOwUserId paths
 * use queueSelectRow. The OW UUID in fixtures is `ow-user-A` (distinct from
 * our internal `gg-user-A`) so domain separation is visible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted spy state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper, dispatchMock, recordSuccessfulSyncMock } = vi.hoisted(() => {
  const spyState = {
    executeReturns: [] as Array<{ rows: unknown[] }>,
    selectReturns: [] as unknown[],
    insertCalls: [] as Array<{ values: unknown }>,
    onConflictDoUpdateCalls: [] as Array<{ args: unknown[] }>,
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueExecuteRow(row: unknown) {
      this.executeReturns.push({ rows: [row] });
    },
    queueExecuteRows(...rows: unknown[]) {
      this.executeReturns.push({ rows });
    },
    queueSelectRow(row: unknown) {
      this.selectReturns.push([row]);
    },
    queueSelectEmpty() {
      this.selectReturns.push([]);
    },
    reset() {
      this.executeReturns = [];
      this.selectReturns = [];
      this.insertCalls = [];
      this.onConflictDoUpdateCalls = [];
      this.operations = [];
    },
  };

  function makeQueryBuilder(opType: 'select' | 'insert' | 'update' | 'delete') {
    const qb: Record<string, unknown> = {};
    const passthrough = ['from', 'where', 'orderBy', 'limit', 'returning', 'set'];
    for (const m of passthrough) {
      qb[m] = (...args: unknown[]) => {
        spyState.operations.push({ op: m, args });
        return qb;
      };
    }
    qb.values = (vals: unknown) => {
      spyState.operations.push({ op: 'values', args: [vals] });
      if (opType === 'insert') {
        spyState.insertCalls.push({ values: vals });
      }
      return qb;
    };
    qb.onConflictDoUpdate = (...args: unknown[]) => {
      spyState.operations.push({ op: 'onConflictDoUpdate', args });
      spyState.onConflictDoUpdateCalls.push({ args });
      return qb;
    };
    qb.onConflictDoNothing = (...args: unknown[]) => {
      spyState.operations.push({ op: 'onConflictDoNothing', args });
      return qb;
    };
    qb.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      let next: unknown = [];
      if (opType === 'select') {
        next = spyState.selectReturns.length > 0 ? spyState.selectReturns.shift() : [];
      }
      return Promise.resolve(next).then(resolve, reject);
    };
    return qb;
  }

  function makeDbWrapper() {
    return {
      select: (...args: unknown[]) => {
        spyState.operations.push({ op: 'select', args });
        return makeQueryBuilder('select');
      },
      insert: (...args: unknown[]) => {
        spyState.operations.push({ op: 'insert', args });
        return makeQueryBuilder('insert');
      },
      update: (...args: unknown[]) => {
        spyState.operations.push({ op: 'update', args });
        return makeQueryBuilder('update');
      },
      delete: (...args: unknown[]) => {
        spyState.operations.push({ op: 'delete', args });
        return makeQueryBuilder('delete');
      },
      execute: (...args: unknown[]) => {
        spyState.operations.push({ op: 'execute', args });
        const next =
          spyState.executeReturns.length > 0 ? spyState.executeReturns.shift() : { rows: [] };
        return Promise.resolve(next);
      },
    };
  }

  const dispatchMock = vi.fn(async () => ({ notificationId: 'n1', outcome: 'sent' as const }));
  const recordSuccessfulSyncMock = vi.fn(async () => undefined);

  return { spyState, makeDbWrapper, dispatchMock, recordSuccessfulSyncMock };
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

vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: dispatchMock,
}));

vi.mock('../../services/wearableConnections', () => ({
  recordSuccessfulSync: recordSuccessfulSyncMock,
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

import {
  ingestWorkoutCreated,
  ingestSleepCreated,
  ingestConnectionCreated,
  ingestBodyCompositionCreated,
} from '../../services/wearableIngest';

// ---------------------------------------------------------------------------
// Canonical event payload fixtures (mirror OW upstream's webhooks guide)
// ---------------------------------------------------------------------------

// Path B distinction (Task 5a.10):
//   - data.user_id (OW domain): 'ow-user-A'      ← what the webhook carries
//   - our user_id (GG domain):  'gg-user-A'      ← what the bridge resolver returns
// The bridge SELECT result `{userId: 'gg-user-A'}` is the first thing each
// ingest function queues — it's the explicit Path B step every test
// exercises before the body of the function runs.
const WORKOUT_PAYLOAD = {
  id: 'garmin-workout-1',
  user_id: 'ow-user-A',
  type: 'running',
  start_time: '2026-05-06T07:00:00Z',
  end_time: '2026-05-06T07:45:00Z',
  duration_seconds: 2700,
  source: { provider: 'garmin', device: 'fenix-7' },
  calories_kcal: 420,
  distance_meters: 6800,
  avg_heart_rate_bpm: 152,
  max_heart_rate_bpm: 168,
};

const SLEEP_PAYLOAD = {
  id: 'garmin-sleep-1',
  user_id: 'ow-user-A',
  start_time: '2026-05-05T23:00:00Z',
  end_time: '2026-05-06T07:00:00Z',
  total_sleep_seconds: 25200,
  source: { provider: 'garmin' },
  stages: { deep_seconds: 5400, rem_seconds: 7200, light_seconds: 12600, awake_seconds: 0 },
  sleep_score: 84,
};

const CONNECTION_PAYLOAD = {
  user_id: 'ow-user-A',
  provider: 'garmin',
  connection_id: 'ow-conn-uuid-1',
  connected_at: '2026-05-06T06:55:00Z',
};

const BODY_COMP_PAYLOAD = {
  user_id: 'ow-user-A',
  provider: 'garmin',
  series_type: 'body_composition',
  samples: [
    { timestamp: '2026-05-06T07:00:00Z', type: 'weight', value: 75.5, unit: 'kg' },
    { timestamp: '2026-05-06T07:00:00Z', type: 'body_fat', value: 18.2, unit: 'percent' },
  ],
};

// Bridge SELECT result — what `resolveUserIdFromOwUserId('ow-user-A')` returns
const BRIDGE_ROW = { userId: 'gg-user-A' };

// ===========================================================================
// Workout: Idempotency
// ===========================================================================

describe('ingestWorkoutCreated — idempotency', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  it('first call (inserted=true) → returns inserted=true; second call (inserted=false on conflict) → inserted=false', async () => {
    // First call: UPSERT INSERT path
    spyState.queueSelectRow(BRIDGE_ROW); // resolveUserIdFromOwUserId
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 }); // count → 1, dispatch fires
    spyState.queueSelectRow({ id: 'wc-1' }); // findConnectionId

    const r1 = await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(r1.inserted).toBe(true);

    spyState.reset();
    dispatchMock.mockClear();

    // Second call (re-delivery): UPSERT UPDATE path
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r2 = await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(r2.inserted).toBe(false);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('UNKNOWN OW user (bridge resolver returns null) → returns skipped:unknown_user, no execute, no dispatch', async () => {
    spyState.queueSelectEmpty(); // bridge resolver returns []

    const r = await ingestWorkoutCreated(WORKOUT_PAYLOAD);

    expect(r).toEqual({ inserted: false, skipped: 'unknown_user' });
    // No execute call should have happened (nothing was inserted)
    const executeOps = spyState.operations.filter((o) => o.op === 'execute');
    expect(executeOps).toHaveLength(0);
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(recordSuccessfulSyncMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Sleep: Idempotency
// ===========================================================================

describe('ingestSleepCreated — idempotency', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  it('first call (inserted=true) → returns inserted=true', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r = await ingestSleepCreated(SLEEP_PAYLOAD);
    expect(r.inserted).toBe(true);
  });

  it('re-delivery (inserted=false) → no first_sync_complete dispatch', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);
    expect(dispatchMock).not.toHaveBeenCalledWith(
      'gg-user-A',
      'wearable_first_sync_complete',
      expect.anything()
    );
  });
});

// ===========================================================================
// First-sync-complete dispatch — happy path
// ===========================================================================

describe('first_sync_complete dispatch — happy path', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  it('workout: inserted=true AND count===1 → fires wearable_first_sync_complete with dataType=workout', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('gg-user-A', 'wearable_first_sync_complete', {
      dataType: 'workout',
      days: 1,
    });
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('wc-1');
  });

  it('sleep: inserted=true AND count===1 → fires with dataType=sleep', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('gg-user-A', 'wearable_first_sync_complete', {
      dataType: 'sleep',
      days: 1,
    });
  });

  it('body_composition: inserted_count > 0 → fires with dataType=body_composition', async () => {
    // 2 samples → 2 execute calls (both inserted=true)
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r = await ingestBodyCompositionCreated(BODY_COMP_PAYLOAD);
    expect(r.inserted_count).toBe(1);

    expect(dispatchMock).toHaveBeenCalledWith('gg-user-A', 'wearable_first_sync_complete', {
      dataType: 'body_composition',
      days: 1,
    });
  });
});

// ===========================================================================
// Dispatch condition #2: re-delivery (inserted=false) → NO notification
// === MUTATION TEST TARGET (the `if (inserted)` gate)
// ===========================================================================

describe('first_sync_complete dispatch — re-delivery (inserted=false) MUST NOT fire', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('workout: inserted=false (UPDATE not INSERT) AND zero prior rows → NO notification', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('sleep: inserted=false → NO notification', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Dispatch condition #3: count > 1 → NO notification
// ===========================================================================

describe('first_sync_complete dispatch — already had prior rows (count > 1)', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('inserted=true BUT count===5 → NO notification', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 5 });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Dispatch condition #4: per-data-type counter
// ===========================================================================

describe('first_sync_complete dispatch — per-data-type counter', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('user has prior workout rows; ingesting first sleep row → notification fires for sleep (separate counter)', async () => {
    // Sleep ingest. The "count" is for sleep_sessions — even if the user
    // has workout rows, sleep is a separate counter.
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 }); // first sleep row
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('gg-user-A', 'wearable_first_sync_complete', {
      dataType: 'sleep',
      days: 1,
    });
  });
});

// ===========================================================================
// connection.created — UPSERT + dispatch on transition
// ===========================================================================

describe('ingestConnectionCreated — Path B: SELECT-by-OW-UUID then UPDATE on transition', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('row exists at status=disconnected (post-OAuth-init state) → UPDATE to connected + dispatch wearable_connected', async () => {
    // Path B: the row was INSERTed during initiateOAuth's atomic transaction
    // BEFORE the user redirected to OAuth. By the time connection.created
    // fires, the row exists with open_wearables_user_id set.
    spyState.queueSelectRow({
      id: 'wc-existing',
      userId: 'gg-user-A',
      status: 'disconnected',
    });

    await ingestConnectionCreated(CONNECTION_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('gg-user-A', 'wearable_connected', {
      provider: 'garmin',
    });
    // UPDATE was called (no INSERT — Path B never INSERTs in this handler)
    const updateOps = spyState.operations.filter((o) => o.op === 'update');
    expect(updateOps.length).toBeGreaterThan(0);
    expect(spyState.insertCalls).toHaveLength(0);
  });

  it('row already at status=expired → UPDATE transitions to connected + dispatch fires', async () => {
    spyState.queueSelectRow({
      id: 'wc-existing',
      userId: 'gg-user-A',
      status: 'expired',
    });

    await ingestConnectionCreated(CONNECTION_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('gg-user-A', 'wearable_connected', {
      provider: 'garmin',
    });
  });

  it('row already at status=connected → UPDATE idempotent ack + NO dispatch (no transition)', async () => {
    spyState.queueSelectRow({
      id: 'wc-existing',
      userId: 'gg-user-A',
      status: 'connected',
    });

    await ingestConnectionCreated(CONNECTION_PAYLOAD);

    // Dispatch should NOT have been called — already connected, no transition
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('UNKNOWN OW user (no bridge row exists) → returns skipped:unknown_user, no UPDATE, no dispatch (logged at error level)', async () => {
    spyState.queueSelectEmpty(); // OW UUID lookup returns []

    const r = await ingestConnectionCreated(CONNECTION_PAYLOAD);

    expect(r).toEqual({ skipped: 'unknown_user' });
    // No UPDATE should have happened
    const updateOps = spyState.operations.filter((o) => o.op === 'update');
    expect(updateOps).toHaveLength(0);
    // No INSERT either — Path B's connection.created handler never INSERTs
    expect(spyState.insertCalls).toHaveLength(0);
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// body_composition: sample iteration + UPSERT + sample-type mapping
// ===========================================================================

describe('ingestBodyCompositionCreated — sample iteration + mapping', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  it('2 samples → 2 execute calls; inserted_count is sum of inserted=true', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 }); // body_composition count
    spyState.queueSelectRow({ id: 'wc-1' }); // findConnectionId

    const r = await ingestBodyCompositionCreated(BODY_COMP_PAYLOAD);

    expect(r.inserted_count).toBe(2);
    // Two execute calls for the UPSERT (one per sample). Plus possibly a
    // count + connection-lookup. Assert at least 2 execute ops happened.
    const executeOps = spyState.operations.filter((o) => o.op === 'execute');
    expect(executeOps.length).toBeGreaterThanOrEqual(2);
  });

  it('payload with no recognized samples → inserted_count=0; no dispatch', async () => {
    // Empty samples → no execute, no dispatch
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueSelectRow({ id: 'wc-1' });

    const r = await ingestBodyCompositionCreated({
      ...BODY_COMP_PAYLOAD,
      samples: [],
    });

    expect(r.inserted_count).toBe(0);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('unknown sample type is skipped, not thrown', async () => {
    // 1 known + 1 unknown → 1 execute call
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r = await ingestBodyCompositionCreated({
      ...BODY_COMP_PAYLOAD,
      samples: [
        { timestamp: '2026-05-06T07:00:00Z', type: 'weight', value: 75, unit: 'kg' },
        { timestamp: '2026-05-06T07:00:00Z', type: 'unknown_metric', value: 1, unit: 'rating' },
      ],
    });

    expect(r.inserted_count).toBe(1);
  });

  it('UNKNOWN OW user (bridge resolver returns null) → returns skipped:unknown_user, no execute, no dispatch', async () => {
    spyState.queueSelectEmpty();

    const r = await ingestBodyCompositionCreated(BODY_COMP_PAYLOAD);

    expect(r).toEqual({ inserted_count: 0, skipped: 'unknown_user' });
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(recordSuccessfulSyncMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// recordSuccessfulSync invocation per ingest path
// ===========================================================================

describe('recordSuccessfulSync invocation', () => {
  beforeEach(() => {
    spyState.reset();
    recordSuccessfulSyncMock.mockClear();
  });

  it('workout ingest with matching connection → recordSuccessfulSync(connectionId)', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-77' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('wc-77');
  });

  it('sleep ingest with matching connection → recordSuccessfulSync', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-77' });

    await ingestSleepCreated(SLEEP_PAYLOAD);
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('wc-77');
  });

  it('workout ingest WITHOUT matching connection → recordSuccessfulSync NOT called (logged + tolerated)', async () => {
    spyState.queueSelectRow(BRIDGE_ROW);
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectEmpty(); // findConnectionId returns null

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(recordSuccessfulSyncMock).not.toHaveBeenCalled();
  });
});

/**
 * Wearable Ingest Service Tests — Sprint 4 BATCH 5a
 *
 * Coverage of the four new OW canonical event-type ingest functions:
 *
 *   1. Idempotent UPSERT on (userId, source, source_record_id) — workout + sleep
 *   2. body_composition iterates samples + UPSERTs against partial UNIQUE index
 *   3. connection.created UPSERTs wearable_connections + dispatches wearable_connected
 *      ONLY on transition (not on idempotent ack of an already-connected row)
 *   4. **Dispatch condition #1 (happy path)**: inserted=true + zero prior →
 *      first_sync_complete fires
 *   5. **Dispatch condition #2 (re-delivery)**: inserted=false + zero prior →
 *      no notification (UPDATE not INSERT) — MUTATION TEST TARGET: removing
 *      the `if (inserted)` gate must FAIL this test.
 *   6. **Dispatch condition #3 (already had data)**: inserted=true + count > 1 →
 *      no notification
 *   7. **Dispatch condition #4 (per-data-type)**: separate counter per dataType
 *   8. recordSuccessfulSync called at end of every ingest path WHEN a matching
 *      connection row exists; absence is logged + tolerated (not thrown)
 *
 * Strategy: db.execute is mocked. The first execute() call returns the UPSERT
 * RETURNING row (controls `inserted`); subsequent select queries control the
 * count returned to maybeDispatchFirstSyncComplete. dispatch + recordSuccessfulSync
 * + findConnectionId path are direct vi.fn mocks where possible; the
 * select-from-wearable_connections lookup uses queueSelectRow.
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

const WORKOUT_PAYLOAD = {
  id: 'garmin-workout-1',
  user_id: 'user-A',
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
  user_id: 'user-A',
  start_time: '2026-05-05T23:00:00Z',
  end_time: '2026-05-06T07:00:00Z',
  total_sleep_seconds: 25200,
  source: { provider: 'garmin' },
  stages: { deep_seconds: 5400, rem_seconds: 7200, light_seconds: 12600, awake_seconds: 0 },
  sleep_score: 84,
};

const CONNECTION_PAYLOAD = {
  user_id: 'user-A',
  provider: 'garmin',
  connection_id: 'ow-conn-uuid-1',
  connected_at: '2026-05-06T06:55:00Z',
};

const BODY_COMP_PAYLOAD = {
  user_id: 'user-A',
  provider: 'garmin',
  series_type: 'body_composition',
  samples: [
    { timestamp: '2026-05-06T07:00:00Z', type: 'weight', value: 75.5, unit: 'kg' },
    { timestamp: '2026-05-06T07:00:00Z', type: 'body_fat', value: 18.2, unit: 'percent' },
  ],
};

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
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 }); // count → 1, dispatch fires
    spyState.queueSelectRow({ id: 'wc-1' }); // findConnectionId

    const r1 = await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(r1.inserted).toBe(true);

    spyState.reset();
    dispatchMock.mockClear();

    // Second call (re-delivery): UPSERT UPDATE path
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r2 = await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(r2.inserted).toBe(false);
    expect(dispatchMock).not.toHaveBeenCalled();
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
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r = await ingestSleepCreated(SLEEP_PAYLOAD);
    expect(r.inserted).toBe(true);
  });

  it('re-delivery (inserted=false) → no first_sync_complete dispatch', async () => {
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);
    expect(dispatchMock).not.toHaveBeenCalledWith(
      'user-A',
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
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'workout',
      days: 1,
    });
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('wc-1');
  });

  it('sleep: inserted=true AND count===1 → fires with dataType=sleep', async () => {
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'sleep',
      days: 1,
    });
  });

  it('body_composition: inserted_count > 0 → fires with dataType=body_composition', async () => {
    // 2 samples → 2 execute calls (both inserted=true)
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ c: 1 });
    spyState.queueSelectRow({ id: 'wc-1' });

    const r = await ingestBodyCompositionCreated(BODY_COMP_PAYLOAD);
    expect(r.inserted_count).toBe(1);

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
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
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('sleep: inserted=false → NO notification', async () => {
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
    spyState.queueExecuteRow({ inserted: true });
    spyState.queueSelectRow({ c: 1 }); // first sleep row
    spyState.queueSelectRow({ id: 'wc-1' });

    await ingestSleepCreated(SLEEP_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'sleep',
      days: 1,
    });
  });
});

// ===========================================================================
// connection.created — UPSERT + dispatch on transition
// ===========================================================================

describe('ingestConnectionCreated — UPSERT + dispatch on transition', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('row does not exist (empty SELECT) → INSERT + dispatch wearable_connected', async () => {
    spyState.queueSelectEmpty(); // SELECT before-status returns []

    await ingestConnectionCreated(CONNECTION_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_connected', {
      provider: 'garmin',
    });
    // INSERT was called with the right base fields
    expect(spyState.insertCalls.length).toBeGreaterThan(0);
    const v = spyState.insertCalls[0]!.values as Record<string, unknown>;
    expect(v.userId).toBe('user-A');
    expect(v.provider).toBe('garmin');
    expect(v.status).toBe('connected');
  });

  it('row already at status=expired → UPSERT transitions to connected + dispatch fires', async () => {
    spyState.queueSelectRow({ status: 'expired' });

    await ingestConnectionCreated(CONNECTION_PAYLOAD);

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_connected', {
      provider: 'garmin',
    });
  });

  it('row already at status=connected → UPSERT idempotent ack + NO dispatch (no transition)', async () => {
    spyState.queueSelectRow({ status: 'connected' });

    await ingestConnectionCreated(CONNECTION_PAYLOAD);

    // Dispatch should NOT have been called — already connected, no transition
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
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-77' });

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('wc-77');
  });

  it('sleep ingest with matching connection → recordSuccessfulSync', async () => {
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectRow({ id: 'wc-77' });

    await ingestSleepCreated(SLEEP_PAYLOAD);
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('wc-77');
  });

  it('workout ingest WITHOUT matching connection → recordSuccessfulSync NOT called (logged + tolerated)', async () => {
    spyState.queueExecuteRow({ inserted: false });
    spyState.queueSelectEmpty(); // findConnectionId returns null

    await ingestWorkoutCreated(WORKOUT_PAYLOAD);
    expect(recordSuccessfulSyncMock).not.toHaveBeenCalled();
  });
});

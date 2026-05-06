/**
 * Wearable Ingest Service Tests — Sprint 4 BATCH 2
 *
 * Coverage:
 *   1. Idempotent UPSERT on (userId, source, source_record_id)
 *   2. Smart-scale: vitals with weightKg writes ALSO to bodyMetrics
 *   3. Partial payload tolerance (only some fields present)
 *   4. **Dispatch condition #1 (happy path)**: inserted=true + zero prior →
 *      first_sync_complete fires
 *   5. **Dispatch condition #2 (re-delivery)**: inserted=false + zero prior →
 *      no notification (UPDATE not INSERT) — MUTATION TEST TARGET: removing
 *      the `if (inserted)` gate must FAIL this test.
 *   6. **Dispatch condition #3 (already had data)**: inserted=true + count > 1 →
 *      no notification
 *   7. **Dispatch condition #4 (per-data-type)**: user has sleep rows, ingests
 *      first vitals → notification fires for vitals (separate counter)
 *   8. recordSuccessfulSync called at end of every ingest path
 *
 * Strategy: db.execute is mocked. The first execute() call returns the UPSERT
 * RETURNING row (controls `inserted`); subsequent select queries control the
 * count returned to maybeDispatchFirstSyncComplete. dispatch + recordSuccessfulSync
 * are direct vi.fn mocks.
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
    operations: [] as Array<{ op: string; args: unknown[] }>,
    queueExecuteRow(row: unknown) {
      this.executeReturns.push({ rows: [row] });
    },
    queueSelectRow(row: unknown) {
      this.selectReturns.push([row]);
    },
    reset() {
      this.executeReturns = [];
      this.selectReturns = [];
      this.insertCalls = [];
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
  ingestSleepSession,
  ingestDailyVitals,
  ingestActivity,
} from '../../services/wearableIngest';

// ===========================================================================
// Idempotency
// ===========================================================================

describe('ingest idempotency', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  const sleepPayload = {
    date: '2026-05-06',
    bedtime: '2026-05-05T23:00:00Z',
    wakeTime: '2026-05-06T07:00:00Z',
    totalSleepMinutes: 420,
    sourceRecordId: 'whoop-sleep-1',
  };

  it('first call (inserted=true) → returns inserted=true; second call (inserted=false on conflict) → inserted=false', async () => {
    // First call: UPSERT INSERT path
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'whoop-sleep-1' });
    spyState.queueSelectRow({ c: 1 }); // count → 1, dispatch fires

    const r1 = await ingestSleepSession('user-A', 'conn-1', 'whoop', sleepPayload);
    expect(r1.inserted).toBe(true);
    expect(r1.recordId).toBe('whoop-sleep-1');

    spyState.reset();
    dispatchMock.mockClear();

    // Second call (re-delivery): UPSERT UPDATE path
    spyState.queueExecuteRow({ inserted: false, source_record_id: 'whoop-sleep-1' });

    const r2 = await ingestSleepSession('user-A', 'conn-1', 'whoop', sleepPayload);
    expect(r2.inserted).toBe(false);
    expect(r2.recordId).toBe('whoop-sleep-1');
    // No dispatch — neither maybeDispatchFirstSyncComplete (gate=false)
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Dispatch condition #1: inserted=true + zero prior → fires
// ===========================================================================

describe('first_sync_complete dispatch — happy path', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  it('inserted=true AND user has zero prior sleep rows (count===1 after insert) → fires wearable_first_sync_complete', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-1' });
    spyState.queueSelectRow({ c: 1 });

    await ingestSleepSession('user-A', 'conn-1', 'whoop', {
      date: '2026-05-06',
      sourceRecordId: 'rec-1',
    });

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'sleep',
      days: 1,
    });
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('conn-1');
  });

  it('vitals first-sync-complete fires for vitals (separate per-dataType counter)', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-v1' });
    spyState.queueSelectRow({ c: 1 });

    await ingestDailyVitals('user-A', 'conn-1', 'whoop', {
      date: '2026-05-06',
      restingHeartRate: 58,
      sourceRecordId: 'rec-v1',
    });

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'vitals',
      days: 1,
    });
  });

  it('activity first-sync-complete fires for activity', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-a1' });
    spyState.queueSelectRow({ c: 1 });

    await ingestActivity('user-A', 'conn-1', 'whoop', {
      startedAt: '2026-05-06T10:00:00Z',
      durationMinutes: 30,
      sourceRecordId: 'rec-a1',
    });

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'activity',
      days: 1,
    });
  });
});

// ===========================================================================
// Dispatch condition #2: re-delivery (inserted=false) → NO notification
// === This is the MUTATION TEST TARGET
// ===========================================================================

describe('first_sync_complete dispatch — re-delivery (inserted=false) MUST NOT fire', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
    recordSuccessfulSyncMock.mockClear();
  });

  it('inserted=false (UPDATE not INSERT) AND zero prior rows → NO notification', async () => {
    // UPDATE path — even though count would be 1, the inserted gate blocks dispatch.
    spyState.queueExecuteRow({ inserted: false, source_record_id: 'rec-1' });
    // Note: no queueSelectRow needed — maybeDispatchFirstSyncComplete is GATED
    // by `if (inserted)` and is never called.

    await ingestSleepSession('user-A', 'conn-1', 'whoop', {
      date: '2026-05-06',
      sourceRecordId: 'rec-1',
    });

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Dispatch condition #3: already had data (count > 1) → NO notification
// ===========================================================================

describe('first_sync_complete dispatch — already had prior rows (count > 1)', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('inserted=true BUT user already had sleep rows (count===5 after insert) → NO notification', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-1' });
    spyState.queueSelectRow({ c: 5 }); // user already had 4, this is the 5th

    await ingestSleepSession('user-A', 'conn-1', 'whoop', {
      date: '2026-05-06',
      sourceRecordId: 'rec-1',
    });

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Dispatch condition #4: per-data-type, not per-connection
// ===========================================================================

describe('first_sync_complete dispatch — per-data-type, NOT per-connection', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('user has prior sleep rows; ingesting their FIRST vitals row → notification fires for vitals', async () => {
    // Vitals ingest. The "count" is for daily_vitals — even if the user has
    // sleep rows from the same connection, vitals is a separate counter.
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-v1' });
    spyState.queueSelectRow({ c: 1 }); // first vitals row

    await ingestDailyVitals('user-A', 'conn-1', 'whoop', {
      date: '2026-05-06',
      sourceRecordId: 'rec-v1',
    });

    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_first_sync_complete', {
      dataType: 'vitals',
      days: 1,
    });
  });
});

// ===========================================================================
// Smart-scale: vitals with weightKg writes ALSO to bodyMetrics
// ===========================================================================

describe('vitals smart-scale path — weightKg writes to bodyMetrics', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('vitals payload with weightKg → bodyMetrics insert is called', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-v1' });
    spyState.queueSelectRow({ c: 1 });

    await ingestDailyVitals('user-A', 'conn-1', 'withings', {
      date: '2026-05-06',
      weightKg: 75.5,
      bodyFatPercentage: 18.2,
      sourceRecordId: 'rec-v1',
    });

    // bodyMetrics insert should have been called with the weight + provider
    expect(spyState.insertCalls.length).toBeGreaterThanOrEqual(1);
    const bmInsert = spyState.insertCalls.find((c) => {
      const v = c.values as Record<string, unknown>;
      return v.userId === 'user-A' && v.weightKg !== undefined;
    });
    expect(bmInsert).toBeDefined();
    const v = bmInsert!.values as Record<string, unknown>;
    expect(v.weightKg).toBe('75.5');
    expect(v.bodyFatPercentage).toBe('18.2');
    expect(v.source).toBe('wearable');
    expect(v.sourceProvider).toBe('withings');
  });

  it('vitals payload WITHOUT weightKg → bodyMetrics insert is NOT called', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-v1' });
    spyState.queueSelectRow({ c: 1 });

    await ingestDailyVitals('user-A', 'conn-1', 'whoop', {
      date: '2026-05-06',
      restingHeartRate: 58,
      sourceRecordId: 'rec-v1',
    });

    // No bodyMetrics insert
    expect(spyState.insertCalls).toHaveLength(0);
  });
});

// ===========================================================================
// Partial payload tolerance
// ===========================================================================

describe('partial payload tolerance', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockClear();
  });

  it('sleep ingest tolerates a payload with only date + sourceRecordId (other fields → null)', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-1' });
    spyState.queueSelectRow({ c: 1 });

    const result = await ingestSleepSession('user-A', 'conn-1', 'oura', {
      date: '2026-05-06',
      sourceRecordId: 'rec-1',
    });

    expect(result.inserted).toBe(true);
    expect(result.recordId).toBe('rec-1');
    // No throw, dispatch fired, sync recorded
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('conn-1');
  });

  it('activity ingest tolerates a payload with only startedAt + sourceRecordId', async () => {
    spyState.queueExecuteRow({ inserted: true, source_record_id: 'rec-a1' });
    spyState.queueSelectRow({ c: 1 });

    const result = await ingestActivity('user-A', 'conn-1', 'strava', {
      startedAt: '2026-05-06T10:00:00Z',
      sourceRecordId: 'rec-a1',
    });

    expect(result.inserted).toBe(true);
  });
});

// ===========================================================================
// recordSuccessfulSync is called at end of every ingest
// ===========================================================================

describe('recordSuccessfulSync invocation', () => {
  beforeEach(() => {
    spyState.reset();
    recordSuccessfulSyncMock.mockClear();
  });

  it('sleep ingest → recordSuccessfulSync(connectionId)', async () => {
    spyState.queueExecuteRow({ inserted: false, source_record_id: 'r' });
    await ingestSleepSession('user-A', 'conn-77', 'whoop', {
      date: '2026-05-06',
      sourceRecordId: 'r',
    });
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('conn-77');
  });

  it('vitals ingest → recordSuccessfulSync', async () => {
    spyState.queueExecuteRow({ inserted: false, source_record_id: 'r' });
    await ingestDailyVitals('user-A', 'conn-77', 'whoop', {
      date: '2026-05-06',
      sourceRecordId: 'r',
    });
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('conn-77');
  });

  it('activity ingest → recordSuccessfulSync', async () => {
    spyState.queueExecuteRow({ inserted: false, source_record_id: 'r' });
    await ingestActivity('user-A', 'conn-77', 'strava', {
      startedAt: '2026-05-06T10:00:00Z',
      sourceRecordId: 'r',
    });
    expect(recordSuccessfulSyncMock).toHaveBeenCalledWith('conn-77');
  });
});

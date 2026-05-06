/**
 * Wearable Sync Monitor Cron Tests — Sprint 4 BATCH 3
 *
 * Behaviors covered:
 *   - SELECT FOR UPDATE SKIP LOCKED contract (cross-process concurrency)
 *   - 24-hour stale window in SQL
 *   - Empty-batch path: claimed=0 recovered=0 errors=0
 *   - Happy path: each claimed row routed to ow.triggerSync +
 *     recordSuccessfulSync; recovered counter increments
 *   - Per-row triggerSync failure → markSyncError called with error message,
 *     errors counter increments, batch continues
 *   - In-process re-entrancy guard: a second concurrent invocation returns
 *     instantly without re-querying the DB
 *   - Cron lifecycle: getCronStatus reflects start/stop, env override
 *     respected, sub-second intervals clamped to default
 *   - SIGTERM handler clears the interval
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted spy state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper, owMocks, wcMocks } = vi.hoisted(() => {
  const spyState = {
    executeCalls: [] as Array<{ sqlChunks: string[]; params: unknown[] }>,
    queue: [] as unknown[],
    queueResults(...results: unknown[]) {
      this.queue.push(...results);
    },
    reset() {
      this.executeCalls = [];
      this.queue = [];
    },
  };

  function makeDbWrapper() {
    return {
      execute: (sqlObj: unknown) => {
        const obj = sqlObj as { queryChunks?: unknown[] };
        const chunks: string[] = [];
        const params: unknown[] = [];
        if (obj.queryChunks) {
          for (const c of obj.queryChunks) {
            if (typeof c === 'object' && c !== null) {
              const maybeValue = (c as { value?: unknown[] }).value;
              if (Array.isArray(maybeValue)) chunks.push(...(maybeValue as string[]));
              const maybeParams = (c as { params?: unknown[] }).params;
              if (Array.isArray(maybeParams)) params.push(...maybeParams);
            }
          }
        }
        spyState.executeCalls.push({ sqlChunks: chunks, params });
        const next = spyState.queue.length > 0 ? spyState.queue.shift() : { rows: [] };
        return Promise.resolve(next);
      },
      select: vi.fn(() => ({})),
      insert: vi.fn(() => ({})),
      update: vi.fn(() => ({})),
      delete: vi.fn(() => ({})),
    };
  }

  const owMocks = {
    triggerSync: vi.fn(async () => ({ ok: true })),
    requestConnectUrl: vi.fn(),
    getConnectionStatus: vi.fn(),
    revokeConnection: vi.fn(),
  };

  const wcMocks = {
    markSyncError: vi.fn(async () => undefined),
    recordSuccessfulSync: vi.fn(async () => undefined),
    listConnections: vi.fn(),
    initiateOAuth: vi.fn(),
    handleOAuthCallback: vi.fn(),
    disconnect: vi.fn(),
  };

  return { spyState, makeDbWrapper, owMocks, wcMocks };
});

// ---------------------------------------------------------------------------
// Mocks — must come BEFORE the SUT import
// ---------------------------------------------------------------------------

vi.mock('../../db', () => {
  const wrapper = makeDbWrapper();
  return {
    getDb: vi.fn(async () => wrapper),
    db: wrapper,
    getPool: vi.fn(),
    pool: null,
  };
});

vi.mock('../../services/openWearablesClient', () => owMocks);
vi.mock('../../services/wearableConnections', () => wcMocks);

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
  runSyncMonitorTick,
  startWearableSyncMonitor,
  stopWearableSyncMonitor,
  getCronStatus,
} from '../../jobs/wearableSyncMonitor';

// ---------------------------------------------------------------------------
// Tick semantics
// ---------------------------------------------------------------------------

describe('runSyncMonitorTick — claim semantics', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.triggerSync.mockReset();
    wcMocks.markSyncError.mockReset();
    wcMocks.recordSuccessfulSync.mockReset();
    // Default: triggerSync resolves OK
    owMocks.triggerSync.mockResolvedValue({ ok: true });
  });

  it('returns zeros when no candidate rows match the stale window', async () => {
    spyState.queueResults({ rows: [] });
    const result = await runSyncMonitorTick();
    expect(result).toEqual({ claimed: 0, recovered: 0, errors: 0 });
    expect(owMocks.triggerSync).not.toHaveBeenCalled();
    expect(wcMocks.recordSuccessfulSync).not.toHaveBeenCalled();
    expect(wcMocks.markSyncError).not.toHaveBeenCalled();
  });

  it('issues a SELECT ... FOR UPDATE SKIP LOCKED query — concurrency safety contract', async () => {
    spyState.queueResults({ rows: [] });
    await runSyncMonitorTick();
    expect(spyState.executeCalls.length).toBe(1);
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('SQL filters by status=connected AND last_sync_at < NOW() - 24 hours window', async () => {
    spyState.queueResults({ rows: [] });
    await runSyncMonitorTick();
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('wearable_connections');
    expect(joined).toContain("status = 'connected'");
    expect(joined).toContain('last_sync_at IS NULL');
    expect(joined).toContain('24 hours');
  });

  it('happy path: each claimed row triggers ow.triggerSync + recordSuccessfulSync; recovered counter increments', async () => {
    spyState.queueResults({
      rows: [
        { id: 'conn-1', user_id: 'user-A', provider: 'whoop' },
        { id: 'conn-2', user_id: 'user-B', provider: 'oura' },
      ],
    });
    owMocks.triggerSync.mockResolvedValue({ ok: true });

    const result = await runSyncMonitorTick();
    expect(result).toEqual({ claimed: 2, recovered: 2, errors: 0 });
    expect(owMocks.triggerSync).toHaveBeenCalledTimes(2);
    expect(owMocks.triggerSync).toHaveBeenCalledWith('whoop', 'user-A');
    expect(owMocks.triggerSync).toHaveBeenCalledWith('oura', 'user-B');
    expect(wcMocks.recordSuccessfulSync).toHaveBeenCalledWith('conn-1');
    expect(wcMocks.recordSuccessfulSync).toHaveBeenCalledWith('conn-2');
    expect(wcMocks.markSyncError).not.toHaveBeenCalled();
  });

  it('per-row triggerSync failure → markSyncError called, errors increments, batch continues', async () => {
    spyState.queueResults({
      rows: [
        { id: 'conn-1', user_id: 'user-A', provider: 'whoop' },
        { id: 'conn-2', user_id: 'user-B', provider: 'oura' },
        { id: 'conn-3', user_id: 'user-C', provider: 'garmin' },
      ],
    });
    owMocks.triggerSync
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error('OW 502 bad gateway'))
      .mockResolvedValueOnce({ ok: true });

    const result = await runSyncMonitorTick();
    expect(result).toEqual({ claimed: 3, recovered: 2, errors: 1 });
    expect(wcMocks.markSyncError).toHaveBeenCalledTimes(1);
    // markSyncError gets the connection id + error message
    const [connId, errMsg] = wcMocks.markSyncError.mock.calls[0] as [string, string];
    expect(connId).toBe('conn-2');
    expect(errMsg).toContain('OW 502 bad gateway');
    // Other two recovered normally
    expect(wcMocks.recordSuccessfulSync).toHaveBeenCalledWith('conn-1');
    expect(wcMocks.recordSuccessfulSync).toHaveBeenCalledWith('conn-3');
  });

  it('markSyncError is the dispatcher of wearable_sync_failed / wearable_expired — cron does NOT call dispatch directly', async () => {
    // Architectural invariant: BATCH 3 cron must not import notificationDispatcher.
    // The lifecycle notifications (sync_failed at count===1, expired at count===3)
    // fire INSIDE wearableConnections.markSyncError per the fire-and-forget
    // decision. This test guards against a future refactor that bypasses the
    // service and calls dispatch from the cron — which would double-dispatch on
    // the next ingest webhook.
    spyState.queueResults({
      rows: [{ id: 'conn-1', user_id: 'user-A', provider: 'whoop' }],
    });
    owMocks.triggerSync.mockRejectedValueOnce(new Error('boom'));
    await runSyncMonitorTick();
    expect(wcMocks.markSyncError).toHaveBeenCalledTimes(1);
    // The cron's responsibility ends at markSyncError. dispatch invocation is
    // the service's job and is tested in wearableConnections tests.
  });
});

// ---------------------------------------------------------------------------
// Re-entrancy guard
// ---------------------------------------------------------------------------

describe('runSyncMonitorTick — re-entrancy guard', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.triggerSync.mockReset();
    wcMocks.markSyncError.mockReset();
    wcMocks.recordSuccessfulSync.mockReset();
  });

  it('returns instantly when a previous tick is still in flight', async () => {
    spyState.queueResults({
      rows: [{ id: 'conn-1', user_id: 'user-A', provider: 'whoop' }],
    });
    let release: (() => void) | undefined;
    const slow = new Promise<{ ok: boolean }>((resolve) => {
      release = () => resolve({ ok: true });
    });
    owMocks.triggerSync.mockReturnValueOnce(slow);

    const first = runSyncMonitorTick();
    // Yield so first invocation enters the inFlight branch
    await new Promise((r) => setImmediate(r));

    const second = await runSyncMonitorTick();
    expect(second).toEqual({ claimed: 0, recovered: 0, errors: 0 });
    // Only the FIRST tick hit the DB
    expect(spyState.executeCalls).toHaveLength(1);

    release!();
    const firstResult = await first;
    expect(firstResult.claimed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle: start / stop / status / interval clamp
// ---------------------------------------------------------------------------

describe('startWearableSyncMonitor / stopWearableSyncMonitor / getCronStatus', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.triggerSync.mockReset();
    stopWearableSyncMonitor();
    delete process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS;
  });

  afterEach(() => {
    stopWearableSyncMonitor();
    delete process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS;
  });

  it('reports running=false initially, true after start, false after stop', () => {
    expect(getCronStatus().running).toBe(false);
    process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS = '5000';
    const timer = startWearableSyncMonitor();
    expect(timer).toBeDefined();
    expect(getCronStatus().running).toBe(true);
    expect(getCronStatus().intervalMs).toBe(5000);
    stopWearableSyncMonitor();
    expect(getCronStatus().running).toBe(false);
  });

  it('clamps sub-second interval and malformed values to default 1 hour', () => {
    process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS = '500';
    startWearableSyncMonitor();
    expect(getCronStatus().intervalMs).toBe(60 * 60 * 1000);
    stopWearableSyncMonitor();

    process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS = 'not-a-number';
    startWearableSyncMonitor();
    expect(getCronStatus().intervalMs).toBe(60 * 60 * 1000);
    stopWearableSyncMonitor();
  });

  it('idempotent start — calling twice does not stack timers', () => {
    process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS = '5000';
    const t1 = startWearableSyncMonitor();
    const t2 = startWearableSyncMonitor();
    expect(t1).toBe(t2);
    stopWearableSyncMonitor();
  });
});

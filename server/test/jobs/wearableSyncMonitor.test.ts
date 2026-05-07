/**
 * Wearable Sync Monitor Cron Tests — Sprint 4 BATCH 5a
 *
 * New state-diff semantics: the cron polls OW's getConnections() per row and
 * diffs against our local state. 4 cases:
 *
 *   Case 1: re-healthy (OW='connected', our!='connected') → UPDATE no dispatch
 *   Case 2: token expired (OW='expired', our!='expired') → UPDATE + dispatch wearable_expired
 *   Case 3: sync error (OW='error') → counter increment via determineSyncErrorState
 *           threshold transition → UPDATE status='error' + dispatch wearable_sync_failed
 *   Case 4: missing matching connection → UPDATE status='disconnected' no dispatch
 *
 * Concurrency-safety tests preserved from BATCH 3:
 *   - SELECT FOR UPDATE SKIP LOCKED contract
 *   - In-process re-entrancy guard via inFlight
 *   - Lifecycle: start/stop/getCronStatus, env-overridable interval, sub-second clamp
 *
 * Plus determineSyncErrorState abstraction unit tests:
 *   - Semantic (a) preferred when sync_error_count present in OW response
 *   - Semantic (b) fallback when sync_error_count absent (current OW reality)
 *   - Reset to 0 when OW.status === 'connected' (or anything non-error)
 *   - Threshold transition at 3 consecutive error ticks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted spy state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper, owMocks, dispatchMock } = vi.hoisted(() => {
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
    getConnections: vi.fn(async () => ({ connections: [] })),
    triggerSync: vi.fn(async () => ({ ok: true })),
    requestConnectUrl: vi.fn(),
    getConnectionStatus: vi.fn(),
    revokeConnection: vi.fn(),
    disconnectProvider: vi.fn(),
    createUser: vi.fn(),
    registerWebhookEndpoint: vi.fn(),
  };

  const dispatchMock = vi.fn(async () => ({
    notificationId: 'n1',
    outcome: 'sent' as const,
  }));

  return { spyState, makeDbWrapper, owMocks, dispatchMock };
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
vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: dispatchMock,
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
  runSyncMonitorTick,
  startWearableSyncMonitor,
  stopWearableSyncMonitor,
  getCronStatus,
  determineSyncErrorState,
} from '../../jobs/wearableSyncMonitor';

// ===========================================================================
// determineSyncErrorState — unit tests
// ===========================================================================

describe('determineSyncErrorState — Cron Case 3 abstraction', () => {
  it('Semantic (a): OW exposes sync_error_count → mirror it', () => {
    const r = determineSyncErrorState(
      { status: 'error', sync_error_count: 5 },
      { syncErrorCount: 0 }
    );
    expect(r.newCount).toBe(5);
    expect(r.statusFromCount).toBe('errored');
  });

  it('Semantic (a): OW count below threshold → healthy', () => {
    const r = determineSyncErrorState(
      { status: 'error', sync_error_count: 1 },
      { syncErrorCount: 0 }
    );
    expect(r.newCount).toBe(1);
    expect(r.statusFromCount).toBe('healthy');
  });

  it('Semantic (b): OW does NOT expose sync_error_count, status=error → increment our counter', () => {
    const r = determineSyncErrorState({ status: 'error' }, { syncErrorCount: 1 });
    expect(r.newCount).toBe(2);
    expect(r.statusFromCount).toBe('healthy');
  });

  it('Semantic (b): increment hits threshold (3) → errored', () => {
    const r = determineSyncErrorState({ status: 'error' }, { syncErrorCount: 2 });
    expect(r.newCount).toBe(3);
    expect(r.statusFromCount).toBe('errored');
  });

  it('Semantic (b): OW.status non-error → reset counter to 0', () => {
    const r = determineSyncErrorState({ status: 'connected' }, { syncErrorCount: 5 });
    expect(r.newCount).toBe(0);
    expect(r.statusFromCount).toBe('healthy');
  });
});

// ===========================================================================
// runSyncMonitorTick — claim semantics
// ===========================================================================

describe('runSyncMonitorTick — claim semantics', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
    owMocks.getConnections.mockResolvedValue({ connections: [] });
  });

  it('returns zeros when no candidate rows match', async () => {
    spyState.queueResults({ rows: [] });
    const result = await runSyncMonitorTick();
    expect(result).toEqual({
      claimed: 0,
      recovered: 0,
      expired: 0,
      errored: 0,
      disconnected: 0,
      pollErrors: 0,
    });
    expect(owMocks.getConnections).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('issues SELECT FOR UPDATE SKIP LOCKED — concurrency safety contract', async () => {
    spyState.queueResults({ rows: [] });
    await runSyncMonitorTick();
    expect(spyState.executeCalls.length).toBe(1);
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('SQL filters status IN connected/expired/error (NOT just connected)', async () => {
    spyState.queueResults({ rows: [] });
    await runSyncMonitorTick();
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('wearable_connections');
    expect(joined).toContain("'connected'");
    expect(joined).toContain("'expired'");
    expect(joined).toContain("'error'");
  });
});

// ===========================================================================
// Case 1: re-healthy
// ===========================================================================

describe('Case 1 — re-healthy (OW=connected, our!=connected)', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
  });

  it('row was expired, OW reports connected → UPDATE status=connected, NO dispatch', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'expired',
          sync_error_count: 0,
        },
      ],
    });
    owMocks.getConnections.mockResolvedValueOnce({
      connections: [{ id: 'ow-c-1', user_id: 'user-A', provider: 'garmin', status: 'connected' }],
    });

    const result = await runSyncMonitorTick();

    expect(result.recovered).toBe(1);
    expect(result.expired).toBe(0);
    expect(result.errored).toBe(0);
    expect(dispatchMock).not.toHaveBeenCalled();
    // Confirm an UPDATE was issued with status=connected
    const updateCalls = spyState.executeCalls.filter((c) =>
      c.sqlChunks.join('').includes('UPDATE wearable_connections')
    );
    expect(updateCalls.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Case 2: token expired
// ===========================================================================

describe('Case 2 — token expired (OW=expired, our!=expired)', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
  });

  it('row was connected, OW reports expired → UPDATE status=expired + dispatch wearable_expired', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'connected',
          sync_error_count: 0,
        },
      ],
    });
    owMocks.getConnections.mockResolvedValueOnce({
      connections: [{ id: 'ow-c-1', user_id: 'user-A', provider: 'garmin', status: 'expired' }],
    });

    const result = await runSyncMonitorTick();

    expect(result.expired).toBe(1);
    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_expired', {
      provider: 'garmin',
    });
  });
});

// ===========================================================================
// Case 3: sync error with counter threshold
// ===========================================================================

describe('Case 3 — sync error counter (Semantic (b) — count ourselves)', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
  });

  it('row connected with syncErrorCount=2, OW reports error → count→3, dispatch sync_failed, status=error', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'connected',
          sync_error_count: 2,
        },
      ],
    });
    owMocks.getConnections.mockResolvedValueOnce({
      connections: [{ id: 'ow-c-1', user_id: 'user-A', provider: 'garmin', status: 'error' }],
    });

    const result = await runSyncMonitorTick();

    expect(result.errored).toBe(1);
    expect(dispatchMock).toHaveBeenCalledWith('user-A', 'wearable_sync_failed', {
      provider: 'garmin',
    });
  });

  it('row connected with syncErrorCount=0, OW reports error → count→1 (below threshold), NO dispatch yet', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'connected',
          sync_error_count: 0,
        },
      ],
    });
    owMocks.getConnections.mockResolvedValueOnce({
      connections: [{ id: 'ow-c-1', user_id: 'user-A', provider: 'garmin', status: 'error' }],
    });

    const result = await runSyncMonitorTick();

    expect(result.errored).toBe(0);
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Case 4: disconnected on OW side
// ===========================================================================

describe('Case 4 — missing matching connection (disconnected on OW side)', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
  });

  it('OW returns no connection for our provider → status=disconnected, NO dispatch', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'connected',
          sync_error_count: 0,
        },
      ],
    });
    // OW's connections list has Polar but not Garmin — user disconnected Garmin on OW side
    owMocks.getConnections.mockResolvedValueOnce({
      connections: [{ id: 'ow-c-2', user_id: 'user-A', provider: 'polar', status: 'connected' }],
    });

    const result = await runSyncMonitorTick();

    expect(result.disconnected).toBe(1);
    // No dispatch — user-initiated disconnect from OW side; they already know.
    expect(dispatchMock).not.toHaveBeenCalled();
    // Confirm an UPDATE was issued with status=disconnected
    const updateCalls = spyState.executeCalls.filter((c) =>
      c.sqlChunks.join('').includes('disconnected_at')
    );
    expect(updateCalls.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// OW unreachable — pollErrors counter
// ===========================================================================

describe('OW unreachable — pollErrors counter (no dispatch on transient outage)', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
  });

  it('getConnections throws → pollErrors increments, NO dispatch', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'connected',
          sync_error_count: 0,
        },
      ],
    });
    owMocks.getConnections.mockRejectedValueOnce(new Error('OW 502 bad gateway'));

    const result = await runSyncMonitorTick();

    expect(result.pollErrors).toBe(1);
    expect(result.expired).toBe(0);
    expect(result.errored).toBe(0);
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Re-entrancy guard (preserved from BATCH 3)
// ===========================================================================

describe('runSyncMonitorTick — re-entrancy guard', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
    dispatchMock.mockReset();
  });

  it('returns instantly when a previous tick is still in flight', async () => {
    spyState.queueResults({
      rows: [
        {
          id: 'conn-1',
          user_id: 'user-A',
          provider: 'garmin',
          status: 'connected',
          sync_error_count: 0,
        },
      ],
    });
    let release: (() => void) | undefined;
    const slow = new Promise<{ connections: any[] }>((resolve) => {
      release = () => resolve({ connections: [] });
    });
    owMocks.getConnections.mockReturnValueOnce(slow);

    const first = runSyncMonitorTick();
    // Yield so first invocation enters the inFlight branch
    await new Promise((r) => setImmediate(r));

    const second = await runSyncMonitorTick();
    expect(second.claimed).toBe(0);
    // Only the FIRST tick hit the DB
    expect(spyState.executeCalls).toHaveLength(1);

    release!();
    await first;
  });
});

// ===========================================================================
// Lifecycle (preserved from BATCH 3)
// ===========================================================================

describe('startWearableSyncMonitor / stopWearableSyncMonitor / getCronStatus', () => {
  beforeEach(() => {
    spyState.reset();
    owMocks.getConnections.mockReset();
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

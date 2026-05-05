/**
 * Quiet-Hours Cron Tests — Sprint 2 BATCH 7
 *
 * Behaviors covered (per BATCH 7 scope):
 *   - runQuietHoursTick claims rows via raw SQL (asserts the SQL contains
 *     `FOR UPDATE SKIP LOCKED` so cross-process concurrency safety stays
 *     in place)
 *   - empty queue: claimed=0, processed=0, errors=0
 *   - happy path: deliverPending called for each claimed row, processed
 *     count tracks settled.fulfilled
 *   - per-row deliverPending failure does not poison the batch — counted
 *     in errors, processed = settled.fulfilled
 *   - isTickInFlight re-entrancy guard: a second concurrent call returns
 *     {claimed: 0, ...} instantly without entering runTickUnsafe
 *   - getCronStatus reflects running + tickInFlight state
 *   - QUIET_HOURS_RETRY_INTERVAL_MS env override is respected (>= 1000ms,
 *     else default)
 *
 * The cron timer itself (setInterval) is not exercised here — that's
 * integration territory and the live verification step covers it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper } = vi.hoisted(() => {
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
        // sqlObj is a Drizzle SQL object; we dig out the queryChunks
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
      // Stubs so anything else hitting db doesn't throw
      select: vi.fn(() => ({})),
      insert: vi.fn(() => ({})),
      update: vi.fn(() => ({})),
      delete: vi.fn(() => ({})),
    };
  }

  return { spyState, makeDbWrapper };
});

// ---------------------------------------------------------------------------
// Mocks (must come before module under test)
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

const deliverPendingMock = vi.fn();
vi.mock('../../services/notificationDispatcher', () => ({
  deliverPending: (...args: unknown[]) => deliverPendingMock(...args),
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
  runQuietHoursTick,
  startQuietHoursCron,
  stopQuietHoursCron,
  getCronStatus,
} from '../../jobs/cleanupExpiredQuietHours';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runQuietHoursTick — claim semantics', () => {
  beforeEach(() => {
    spyState.reset();
    deliverPendingMock.mockReset();
  });

  it('returns zeros when no rows are pending', async () => {
    spyState.queueResults({ rows: [] });
    const result = await runQuietHoursTick();
    expect(result).toEqual({ claimed: 0, processed: 0, errors: 0 });
    expect(deliverPendingMock).not.toHaveBeenCalled();
  });

  it('issues a SELECT ... FOR UPDATE SKIP LOCKED query — concurrency safety contract', async () => {
    spyState.queueResults({ rows: [] });
    await runQuietHoursTick();
    expect(spyState.executeCalls.length).toBeGreaterThanOrEqual(1);
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('FOR UPDATE SKIP LOCKED');
    expect(joined).toContain('deliver_after IS NOT NULL');
    expect(joined).toContain('delivered_at IS NULL');
    expect(joined).toContain('ORDER BY deliver_after ASC');
  });

  it('processes each claimed row via deliverPending and tallies success', async () => {
    spyState.queueResults({ rows: [{ id: 'n-1' }, { id: 'n-2' }, { id: 'n-3' }] });
    deliverPendingMock.mockResolvedValue('sent');
    const result = await runQuietHoursTick();
    expect(result.claimed).toBe(3);
    expect(result.processed).toBe(3);
    expect(result.errors).toBe(0);
    expect(deliverPendingMock).toHaveBeenCalledTimes(3);
    expect(deliverPendingMock).toHaveBeenCalledWith('n-1');
    expect(deliverPendingMock).toHaveBeenCalledWith('n-2');
    expect(deliverPendingMock).toHaveBeenCalledWith('n-3');
  });

  it('counts per-row failures as errors and continues processing the batch', async () => {
    spyState.queueResults({ rows: [{ id: 'n-1' }, { id: 'n-2' }, { id: 'n-3' }] });
    deliverPendingMock
      .mockResolvedValueOnce('sent')
      .mockRejectedValueOnce(new Error('push service 500'))
      .mockResolvedValueOnce('sent');
    const result = await runQuietHoursTick();
    expect(result.claimed).toBe(3);
    expect(result.processed).toBe(2);
    expect(result.errors).toBe(1);
  });
});

describe('runQuietHoursTick — re-entrancy guard', () => {
  beforeEach(() => {
    spyState.reset();
    deliverPendingMock.mockReset();
  });

  it('returns instantly when a previous tick is still in flight (isTickInFlight=true)', async () => {
    // Make the first tick slow so the second one races against it.
    spyState.queueResults({ rows: [{ id: 'n-1' }] });
    let release: (() => void) | undefined;
    const slow = new Promise<string>((resolve) => {
      release = () => resolve('sent');
    });
    deliverPendingMock.mockReturnValueOnce(slow);

    const first = runQuietHoursTick();
    // Yield once so the first tick reaches the deliverPending await
    await new Promise((r) => setImmediate(r));

    // Second invocation should bail immediately (no DB execute)
    const second = await runQuietHoursTick();
    expect(second).toEqual({ claimed: 0, processed: 0, errors: 0 });
    // DB was only hit once (by the first tick)
    expect(spyState.executeCalls).toHaveLength(1);

    // Now release the first one and confirm it completes normally
    release!();
    const firstResult = await first;
    expect(firstResult.claimed).toBe(1);
  });
});

describe('startQuietHoursCron / stopQuietHoursCron / getCronStatus', () => {
  beforeEach(() => {
    spyState.reset();
    deliverPendingMock.mockReset();
    stopQuietHoursCron();
  });

  it('reports running=false when not started, true when started', async () => {
    expect(getCronStatus().running).toBe(false);
    process.env.QUIET_HOURS_RETRY_INTERVAL_MS = '60000';
    const timer = startQuietHoursCron();
    expect(timer).toBeDefined();
    expect(getCronStatus().running).toBe(true);
    expect(getCronStatus().intervalMs).toBe(60000);
    stopQuietHoursCron();
    expect(getCronStatus().running).toBe(false);
  });

  it('falls back to default interval when env var is malformed (e.g. negative or NaN)', async () => {
    process.env.QUIET_HOURS_RETRY_INTERVAL_MS = '-1';
    startQuietHoursCron();
    expect(getCronStatus().intervalMs).toBe(5 * 60 * 1000); // 5 min default
    stopQuietHoursCron();

    process.env.QUIET_HOURS_RETRY_INTERVAL_MS = 'not-a-number';
    startQuietHoursCron();
    expect(getCronStatus().intervalMs).toBe(5 * 60 * 1000);
    stopQuietHoursCron();
  });

  it('clamps interval to >= 1000ms (rejects sub-second timers)', async () => {
    process.env.QUIET_HOURS_RETRY_INTERVAL_MS = '500';
    startQuietHoursCron();
    expect(getCronStatus().intervalMs).toBe(5 * 60 * 1000); // back to default
    stopQuietHoursCron();
  });

  it('startQuietHoursCron is idempotent — second call returns the existing timer', async () => {
    process.env.QUIET_HOURS_RETRY_INTERVAL_MS = '60000';
    const t1 = startQuietHoursCron();
    const t2 = startQuietHoursCron();
    expect(t1).toBe(t2);
    stopQuietHoursCron();
  });
});

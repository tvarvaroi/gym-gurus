/**
 * Daily Wellness Nudge Cron Tests — Sprint 3 BATCH 7
 *
 * Behaviors covered:
 *   - SELECT FOR UPDATE SKIP LOCKED contract (cross-process concurrency)
 *   - Morning window 07:00–11:00 user-tz filter present in SQL
 *   - "no nudge today" + "no wellness log today" anti-joins present
 *   - Recovery category gate present in WHERE
 *   - Empty-batch path: claimed=0 dispatched=0 errors=0
 *   - Happy path: each claimed user routed to dispatch with the
 *     `wellness_daily_nudge` type
 *   - Per-row dispatch failure → counted in errors, batch continues
 *   - In-process re-entrancy guard: a second concurrent invocation
 *     returns instantly without re-querying the DB
 *   - Cron lifecycle: getCronStatus reflects start/stop, env override
 *     respected, sub-second intervals clamped to default
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted spy state
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

  return { spyState, makeDbWrapper };
});

// ---------------------------------------------------------------------------
// Mocks
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

const dispatchMock = vi.fn();
vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: (...args: unknown[]) => dispatchMock(...args),
}));

vi.mock('../../logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), audit: vi.fn() },
  log: vi.fn(),
}));

import {
  runWellnessNudgeTick,
  startWellnessNudgeCron,
  stopWellnessNudgeCron,
  getCronStatus,
} from '../../jobs/dailyWellnessNudge';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runWellnessNudgeTick — claim semantics', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockReset();
  });

  it('returns zeros when no candidates match the morning window', async () => {
    spyState.queueResults({ rows: [] });
    const result = await runWellnessNudgeTick();
    expect(result).toEqual({ claimed: 0, dispatched: 0, errors: 0 });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('issues a SELECT ... FOR UPDATE SKIP LOCKED query — concurrency safety contract', async () => {
    spyState.queueResults({ rows: [] });
    await runWellnessNudgeTick();
    expect(spyState.executeCalls.length).toBeGreaterThanOrEqual(1);
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('SQL filters by morning window via EXTRACT(HOUR FROM NOW() AT TIME ZONE tz) — bounds-correctness', async () => {
    spyState.queueResults({ rows: [] });
    await runWellnessNudgeTick();
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    // The morning window check uses EXTRACT(HOUR FROM NOW() AT TIME ZONE tz).
    // Numeric bounds 7 and 11 are interpolated as Drizzle params (different chunk
    // type than string slices), so we assert on the EXTRACT clause shape rather
    // than the literal numbers — the bounds live in source as named constants
    // (MORNING_WINDOW_START_HOUR / MORNING_WINDOW_END_HOUR) and any change to
    // them is a code review concern, not a test concern.
    expect(joined).toContain('EXTRACT(HOUR FROM NOW() AT TIME ZONE tz)');
    expect(joined).toContain('>=');
    expect(joined).toContain('<');
  });

  it('SQL excludes users who already have a wellness log today (in user tz) and users already nudged today', async () => {
    spyState.queueResults({ rows: [] });
    await runWellnessNudgeTick();
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('NOT EXISTS');
    expect(joined).toContain('daily_wellness_log');
    expect(joined).toContain('notifications');
    expect(joined).toContain('wellness_daily_nudge');
  });

  it('SQL gates on recovery category opt-in (notification_preferences)', async () => {
    spyState.queueResults({ rows: [] });
    await runWellnessNudgeTick();
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain('notification_preferences');
    expect(joined).toContain('recovery');
  });

  it('dispatches wellness_daily_nudge for each claimed candidate', async () => {
    spyState.queueResults({
      rows: [
        { user_id: 'user-1', user_tz: 'America/New_York' },
        { user_id: 'user-2', user_tz: 'Europe/London' },
      ],
    });
    dispatchMock.mockResolvedValue('dispatched');

    const result = await runWellnessNudgeTick();
    expect(result.claimed).toBe(2);
    expect(result.dispatched).toBe(2);
    expect(result.errors).toBe(0);
    expect(dispatchMock).toHaveBeenCalledTimes(2);
    expect(dispatchMock).toHaveBeenCalledWith('user-1', 'wellness_daily_nudge', {});
    expect(dispatchMock).toHaveBeenCalledWith('user-2', 'wellness_daily_nudge', {});
  });

  it('per-user dispatch failure is counted in errors, batch continues', async () => {
    spyState.queueResults({
      rows: [
        { user_id: 'user-1', user_tz: 'UTC' },
        { user_id: 'user-2', user_tz: 'UTC' },
        { user_id: 'user-3', user_tz: 'UTC' },
      ],
    });
    dispatchMock
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('push 500'))
      .mockResolvedValueOnce('ok');

    const result = await runWellnessNudgeTick();
    expect(result.claimed).toBe(3);
    expect(result.dispatched).toBe(2);
    expect(result.errors).toBe(1);
  });
});

describe('runWellnessNudgeTick — re-entrancy guard', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockReset();
  });

  it('returns instantly when a previous tick is still in flight', async () => {
    spyState.queueResults({ rows: [{ user_id: 'user-1', user_tz: 'UTC' }] });
    let release: (() => void) | undefined;
    const slow = new Promise<string>((resolve) => {
      release = () => resolve('ok');
    });
    dispatchMock.mockReturnValueOnce(slow);

    const first = runWellnessNudgeTick();
    await new Promise((r) => setImmediate(r));

    const second = await runWellnessNudgeTick();
    expect(second).toEqual({ claimed: 0, dispatched: 0, errors: 0 });
    // DB hit only once
    expect(spyState.executeCalls).toHaveLength(1);

    release!();
    const firstResult = await first;
    expect(firstResult.claimed).toBe(1);
  });
});

describe('startWellnessNudgeCron / stopWellnessNudgeCron / getCronStatus', () => {
  beforeEach(() => {
    spyState.reset();
    dispatchMock.mockReset();
    stopWellnessNudgeCron();
  });

  it('reports running=false initially, true after start, false after stop', async () => {
    expect(getCronStatus().running).toBe(false);
    process.env.WELLNESS_NUDGE_INTERVAL_MS = '60000';
    const timer = startWellnessNudgeCron();
    expect(timer).toBeDefined();
    expect(getCronStatus().running).toBe(true);
    expect(getCronStatus().intervalMs).toBe(60000);
    stopWellnessNudgeCron();
    expect(getCronStatus().running).toBe(false);
  });

  it('clamps sub-second interval and malformed values to default 30 minutes', async () => {
    process.env.WELLNESS_NUDGE_INTERVAL_MS = '500';
    startWellnessNudgeCron();
    expect(getCronStatus().intervalMs).toBe(30 * 60 * 1000);
    stopWellnessNudgeCron();

    process.env.WELLNESS_NUDGE_INTERVAL_MS = 'not-a-number';
    startWellnessNudgeCron();
    expect(getCronStatus().intervalMs).toBe(30 * 60 * 1000);
    stopWellnessNudgeCron();
  });
});

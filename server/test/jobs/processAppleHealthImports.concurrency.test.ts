/**
 * Apple Health Cron — Concurrency Tests — Sprint 5 BATCH 7
 *
 * Coverage targets — proves the cron's load-bearing concurrency primitives:
 *
 *   1.  Empty queue → claimed=0, no DB writes after the SELECT
 *   2.  SELECT FOR UPDATE SKIP LOCKED appears in the claim SQL
 *      (concurrency-safe contract — second concurrent invocation skips
 *      already-locked rows)
 *   3.  ORDER BY created_at ASC + LIMIT 1 — at most one import per tick
 *      (memory-pressure bound; multiple parallel imports could OOM)
 *   4.  Status state-machine: claim flips status='uploaded' → 'parsing'
 *      inside the lock window so subsequent ticks don't re-claim
 *   5.  isTickInFlight re-entrancy guard — second concurrent call returns
 *      {claimed: 0} instantly without entering the claim SQL
 *   6.  isTickInFlight resets in finally — a thrown claim still releases
 *      the guard so subsequent ticks aren't blocked
 *   7.  startAppleHealthCron is idempotent — second start call doesn't
 *      double-register the timer
 *   8.  stopAppleHealthCron clears the timer and resets running=false
 *   9.  getCronStatus reflects live running + tickInFlight state
 *  10.  Env-overridable interval respected, clamped to MIN_INTERVAL_MS
 *  11.  Env interval malformed → falls back to default
 *
 * Cron concurrency tests follow the Sprint 2 BATCH 7 cleanupExpiredQuietHours
 * + Sprint 4 BATCH 5a wearableSyncMonitor pattern: hoisted db wrapper that
 * captures executed SQL chunks, plus mocks for downstream services so the
 * tick code path runs end-to-end without touching real R2/parser/dispatch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted state
// ---------------------------------------------------------------------------

const { spyState, makeDbWrapper } = vi.hoisted(() => {
  const spyState = {
    executeCalls: [] as Array<{ sqlChunks: string[]; params: unknown[] }>,
    /**
     * `queue` holds the next results db.execute() should return. Each entry
     * is either a plain value (resolved synchronously) OR a Promise (resolves
     * when externally controlled — useful for orchestrating slow-path tests).
     */
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
        // If the queued value is a Promise, return it directly (so the caller
        // awaits its external resolver). If it's a plain value, resolve.
        return next instanceof Promise ? next : Promise.resolve(next);
      },
      // Drizzle query-builder stubs — `select(...).from(...).where(...)` is
      // used by processOneImport to fetch the import row. Returns an empty
      // array so processOneImport short-circuits to skipped_no_file (the
      // concurrency tests don't care about the per-import work; they care
      // about the tick orchestration + claim SQL).
      select: vi.fn(() => ({
        from: () => ({ where: () => Promise.resolve([]) }),
      })),
      insert: vi.fn(() => ({ values: () => ({ returning: () => Promise.resolve([]) }) })),
      update: vi.fn(() => ({
        set: () => ({ where: () => Promise.resolve() }),
      })),
      delete: vi.fn(() => ({ where: () => Promise.resolve() })),
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

vi.mock('../../services/appleHealthParser', () => ({
  parseHealthExport: vi.fn(),
}));
vi.mock('../../services/appleHealthZip', () => ({
  streamExportXml: vi.fn(),
}));
vi.mock('../../services/appleHealthSleepAggregator', () => ({
  aggregateSleepRecords: vi.fn(() => []),
}));
vi.mock('../../services/appleHealthIngest', () => ({
  ingestAppleHealthBody: vi.fn(),
  ingestAppleHealthSleep: vi.fn(),
  ingestAppleHealthVital: vi.fn(),
  ingestAppleHealthWorkout: vi.fn(),
}));
vi.mock('../../services/notificationDispatcher', () => ({
  dispatch: vi.fn(),
}));
vi.mock('../../services/fileUpload', () => ({
  isR2Configured: () => false,
}));
vi.mock('../../routes/appleHealth', () => ({
  cleanupUploadedZip: vi.fn(),
}));

// Note: processOneImport is module-internal — ES module exports cannot be
// monkey-patched via spyOn after import. We exercise the orchestration
// (claim SQL, state machine, re-entrancy guard) end-to-end by controlling
// the db.execute queue. The real processOneImport short-circuits to
// 'skipped_no_file' because db.select returns [] (we mock the per-import
// services), keeping the concurrency tests focused on tick orchestration
// rather than per-import work.

import {
  runAppleHealthTick,
  startAppleHealthCron,
  stopAppleHealthCron,
  getCronStatus,
} from '../../jobs/processAppleHealthImports';

// ===========================================================================
// 1+2+3+4. Claim SQL contract
// ===========================================================================

describe('runAppleHealthTick — claim SQL contract', () => {
  beforeEach(() => {
    spyState.reset();
  });

  it('returns claimed=0 when queue is empty (no rows)', async () => {
    spyState.queueResults({ rows: [] });
    const result = await runAppleHealthTick();
    expect(result.claimed).toBe(0);
  });

  it('issues SELECT FOR UPDATE SKIP LOCKED — concurrency-safe claim contract', async () => {
    spyState.queueResults({ rows: [] });
    await runAppleHealthTick();
    expect(spyState.executeCalls.length).toBeGreaterThanOrEqual(1);
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    // The exact two contract tokens — both required for safe concurrent claims
    expect(joined).toContain('FOR UPDATE SKIP LOCKED');
  });

  it('claim SQL filters by status=uploaded AND orders by created_at ASC AND LIMIT 1', async () => {
    spyState.queueResults({ rows: [] });
    await runAppleHealthTick();
    const joined = spyState.executeCalls[0].sqlChunks.join(' ');
    expect(joined).toContain("status = 'uploaded'");
    expect(joined).toContain('ORDER BY created_at ASC');
    expect(joined).toContain('LIMIT 1');
    // The "LIMIT 1" is load-bearing: removing it would let one tick claim
    // many imports at once and OOM the parser. Memory pressure bound.
  });

  it('flips status uploaded → parsing inside the same tick (state machine guard)', async () => {
    // Queue: [claim returns one row, UPDATE returns nothing]. processOneImport
    // then fires (real impl, short-circuits to skipped_no_file because the
    // db.select mock returns []).
    spyState.queueResults({ rows: [{ id: 'imp-1' }] });
    spyState.queueResults({ rows: [] }); // UPDATE response
    const result = await runAppleHealthTick();
    expect(result.claimed).toBe(1);
    // The second execute call is the UPDATE that flips status
    expect(spyState.executeCalls.length).toBeGreaterThanOrEqual(2);
    const updateSql = spyState.executeCalls[1].sqlChunks.join(' ');
    expect(updateSql).toContain('UPDATE apple_health_imports');
    expect(updateSql).toContain("status = 'parsing'");
    // The WHERE in the UPDATE includes status='uploaded' — so a row that
    // somehow already moved to a different status (race with cancel) is
    // safely skipped, no double-claim.
    expect(updateSql).toContain("status = 'uploaded'");
  });
});

// ===========================================================================
// 5+6. Re-entrancy guard
// ===========================================================================

describe('runAppleHealthTick — isTickInFlight re-entrancy guard', () => {
  beforeEach(() => {
    spyState.reset();
  });

  it('second concurrent invocation returns {claimed:0} instantly (does NOT re-enter claim SQL)', async () => {
    // Make the FIRST tick slow by giving it an unresolved promise as the
    // claim SQL response. The first tick will await this forever until we
    // release. While it's awaiting, fire the second tick — it should
    // short-circuit on isTickInFlight before reaching db.execute.
    let releaseClaim: ((value: { rows: Array<{ id: string }> }) => void) | undefined;
    const slowClaim = new Promise<{ rows: Array<{ id: string }> }>((resolve) => {
      releaseClaim = resolve;
    });
    spyState.queueResults(slowClaim);

    const first = runAppleHealthTick();
    // Yield to let the first tick reach `await db.execute(...)` for the claim
    await new Promise((r) => setImmediate(r));

    const executeCallsBeforeSecond = spyState.executeCalls.length;

    // Second invocation: should bail at the isTickInFlight gate.
    const second = await runAppleHealthTick();
    expect(second.claimed).toBe(0);
    // The second tick did NOT issue any new SQL — the re-entrancy guard
    // short-circuited before reaching db.execute.
    expect(spyState.executeCalls.length).toBe(executeCallsBeforeSecond);

    // Release the first tick with an empty queue, let it complete normally.
    releaseClaim!({ rows: [] });
    const firstResult = await first;
    expect(firstResult.claimed).toBe(0); // empty rows from the released claim
  });

  it('isTickInFlight resets in finally — a thrown claim still releases the guard', async () => {
    // First tick: db.execute throws (simulating a connection blip). The
    // cron's try/finally resets isTickInFlight regardless. Subsequent ticks
    // must not be blocked.
    spyState.queueResults(Promise.reject(new Error('synthetic db crash')));

    // The first tick rejects (no try/catch around db.execute in
    // runAppleHealthTick — the catch is in the setInterval wrapper).
    await expect(runAppleHealthTick()).rejects.toThrow('synthetic db crash');

    // Second tick succeeds — guard was released by the finally
    spyState.queueResults({ rows: [] });
    const second = await runAppleHealthTick();
    expect(second.claimed).toBe(0);
  });
});

// ===========================================================================
// 7+8+9. Cron lifecycle
// ===========================================================================

describe('startAppleHealthCron / stopAppleHealthCron / getCronStatus', () => {
  beforeEach(() => {
    spyState.reset();
    stopAppleHealthCron();
    delete process.env.APPLE_HEALTH_CRON_INTERVAL_MS;
  });

  it('reports running=false initially, true after start, false after stop', () => {
    expect(getCronStatus().running).toBe(false);
    process.env.APPLE_HEALTH_CRON_INTERVAL_MS = '60000';
    const timer = startAppleHealthCron();
    expect(timer).toBeDefined();
    expect(getCronStatus().running).toBe(true);
    expect(getCronStatus().intervalMs).toBe(60000);
    stopAppleHealthCron();
    expect(getCronStatus().running).toBe(false);
  });

  it('startAppleHealthCron is idempotent — second call returns the existing timer', () => {
    process.env.APPLE_HEALTH_CRON_INTERVAL_MS = '60000';
    const t1 = startAppleHealthCron();
    const t2 = startAppleHealthCron();
    expect(t1).toBe(t2);
    stopAppleHealthCron();
  });

  it('clamps interval to >= MIN_INTERVAL_MS (10s) — rejects sub-10s timers', () => {
    process.env.APPLE_HEALTH_CRON_INTERVAL_MS = '500'; // 500ms
    startAppleHealthCron();
    // Should clamp UP to 10000 (MIN_INTERVAL_MS), NOT fall back to default
    expect(getCronStatus().intervalMs).toBe(10000);
    stopAppleHealthCron();
  });

  it('falls back to default when env var is malformed (NaN)', () => {
    process.env.APPLE_HEALTH_CRON_INTERVAL_MS = 'not-a-number';
    startAppleHealthCron();
    expect(getCronStatus().intervalMs).toBe(30 * 1000); // 30s default
    stopAppleHealthCron();
  });

  it('respects valid env interval > MIN', () => {
    process.env.APPLE_HEALTH_CRON_INTERVAL_MS = '120000'; // 2 min
    startAppleHealthCron();
    expect(getCronStatus().intervalMs).toBe(120000);
    stopAppleHealthCron();
  });

  it('getCronStatus exposes tickInFlight=false when not actively running a tick', () => {
    expect(getCronStatus().tickInFlight).toBe(false);
  });
});

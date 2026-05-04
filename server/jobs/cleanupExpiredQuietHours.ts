/**
 * Quiet Hours Retry Cron — Sprint 2 BATCH 2
 *
 * Runs every QUIET_HOURS_RETRY_INTERVAL_MS (default 5 minutes). Each tick:
 *   1. Inside ONE transaction, claim a batch of pending notifications via
 *      SELECT ... FOR UPDATE SKIP LOCKED. The transaction stays open until
 *      we either finish delivering or hit the soft timeout.
 *   2. For each claimed row, call deliverPending(notificationId) which
 *      re-evaluates quiet hours (user might have widened the window),
 *      re-evaluates category gating (user might have toggled it off), and
 *      either fans out + marks delivered_at, OR re-bumps deliver_after, OR
 *      marks delivered_at because the category is now off.
 *   3. COMMIT. Other crons see the rows as released; if we crashed mid-way,
 *      the transaction rolls back and the rows return to the pending pool
 *      for the next tick.
 *
 * ─── CONCURRENCY MODEL: SELECT FOR UPDATE SKIP LOCKED ───────────────────────
 *
 * Why this and not a leadership token?
 *
 *   - Postgres-native: no extra coordination service (Redis lease, etcd)
 *     required. Fewer moving parts = fewer failure modes.
 *   - Row-level: two cron instances each see disjoint sets. No "wait for the
 *     leader" stalls when the leader crashes.
 *   - Self-healing: if a cron dies mid-batch (process kill, network drop),
 *     the transaction rolls back and rows return to the pool for the next tick.
 *   - Bounded lock duration: we batch-size at 50 and use Promise.allSettled for
 *     parallel push fan-out, so worst-case lock hold is ~30s (web-push timeout)
 *     for the slowest sub in the batch.
 *
 * Trade-off acknowledged: locks are held during HTTP push calls. With Neon's
 * pooler this is fine at v1 scale. If push throughput becomes a hotspot, the
 * pattern to switch to is "claim with a lease column": add `claimed_at`
 * to notifications, do a quick UPDATE that sets claimed_at + returns rows,
 * commit, then push outside the transaction. Sprint 13 (insights + scale)
 * is the natural place to revisit.
 *
 * Why not "drop notifications fired during quiet hours"? See migration 012
 * inline doc — losing a "you missed your workout" notification because it
 * fired at 23:50 is unacceptable UX.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { deliverPending } from '../services/notificationDispatcher';
import { logger } from '../logger';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 50;

let cronTimer: NodeJS.Timeout | null = null;
let isTickInFlight = false;

export function getCronStatus(): { running: boolean; tickInFlight: boolean; intervalMs: number } {
  return {
    running: cronTimer !== null,
    tickInFlight: isTickInFlight,
    intervalMs: getIntervalMs(),
  };
}

function getIntervalMs(): number {
  const env = process.env.QUIET_HOURS_RETRY_INTERVAL_MS;
  if (!env) return DEFAULT_INTERVAL_MS;
  const parsed = parseInt(env, 10);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_INTERVAL_MS;
}

/**
 * Single tick. Exposed for tests + manual invocation.
 *
 * Re-entrancy guard: if a previous tick is still running (e.g. a slow batch
 * holding 30s on a sub), skip this tick rather than pile up parallel work in
 * the same process. SKIP LOCKED in the SQL handles cross-process concurrency;
 * this guard handles same-process.
 */
export async function runQuietHoursTick(): Promise<{
  claimed: number;
  processed: number;
  errors: number;
}> {
  if (isTickInFlight) {
    return { claimed: 0, processed: 0, errors: 0 };
  }
  isTickInFlight = true;
  try {
    return await runTickUnsafe();
  } finally {
    isTickInFlight = false;
  }
}

async function runTickUnsafe(): Promise<{ claimed: number; processed: number; errors: number }> {
  const db = await getDb();

  // SELECT ... FOR UPDATE SKIP LOCKED — Postgres-native concurrent-safe claim.
  // Filters by the partial index we created in migration 012:
  //   WHERE deliver_after IS NOT NULL AND deliver_after <= NOW() AND delivered_at IS NULL
  // Two simultaneous crons see disjoint batches.
  //
  // We use raw SQL because Drizzle doesn't expose FOR UPDATE SKIP LOCKED on
  // its query builder. ORDER BY deliver_after ASC keeps oldest pending first
  // (FIFO fairness on delivery).
  const claimed = await db.execute<{ id: string }>(
    sql`SELECT id FROM notifications
        WHERE deliver_after IS NOT NULL
          AND deliver_after <= NOW()
          AND delivered_at IS NULL
        ORDER BY deliver_after ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED`
  );
  const rows = ((claimed as any).rows ?? claimed) as Array<{ id: string }>;

  if (rows.length === 0) {
    return { claimed: 0, processed: 0, errors: 0 };
  }

  // Fan out delivery in parallel. Each deliverPending() call re-validates
  // category + quiet hours and updates delivered_at appropriately.
  const settled = await Promise.allSettled(
    rows.map((r) =>
      deliverPending(r.id).catch((err) => {
        logger.error('[quietHoursCron] deliverPending threw', { id: r.id, err });
        throw err;
      })
    )
  );

  const errors = settled.filter((s) => s.status === 'rejected').length;
  return { claimed: rows.length, processed: settled.length - errors, errors };
}

/**
 * Start the cron. Safe to call once at server boot. Returns the timer handle
 * so the caller can clear it on graceful shutdown.
 */
export function startQuietHoursCron(): NodeJS.Timeout {
  if (cronTimer) {
    logger.warn('[quietHoursCron] startQuietHoursCron called while already running — ignoring');
    return cronTimer;
  }
  const interval = getIntervalMs();
  logger.info(`[quietHoursCron] starting, interval=${interval}ms, batch_size=${BATCH_SIZE}`);

  cronTimer = setInterval(() => {
    runQuietHoursTick()
      .then((result) => {
        if (result.claimed > 0) {
          logger.info('[quietHoursCron] tick complete', result);
        }
      })
      .catch((err) => {
        // Defensive — runQuietHoursTick already catches per-row errors. Anything
        // here is a structural fault (DB unreachable, bug). Log and continue;
        // never let the cron die.
        logger.error('[quietHoursCron] tick threw', err);
      });
  }, interval);

  // Don't keep the process alive solely for this cron — if the HTTP server
  // shuts down, the cron should not block process exit.
  cronTimer.unref();

  return cronTimer;
}

export function stopQuietHoursCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

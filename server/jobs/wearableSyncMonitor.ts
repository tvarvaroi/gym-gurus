/**
 * Wearable Sync Monitor — Sprint 4 BATCH 3
 *
 * Cron that scans `wearable_connections` every WEARABLE_SYNC_MONITOR_INTERVAL_MS
 * (default 1 hour). Each tick claims up to 50 stale rows
 * (status='connected' AND last_sync_at older than 24h) via
 * `SELECT ... FOR UPDATE SKIP LOCKED` and asks Open Wearables to trigger a
 * fresh sync. Outcomes:
 *
 *   - triggerSync resolves → recordSuccessfulSync (resets syncErrorCount,
 *     stamps lastSyncAt). The webhook fan-in arrives shortly after on the
 *     happy path; if it doesn't, the next tick rolls into "stale" again.
 *   - triggerSync throws → markSyncError (increments syncErrorCount, fires
 *     wearable_sync_failed at count===1, flips status='expired' + fires
 *     wearable_expired at count===3). Both notification dispatches happen
 *     INSIDE markSyncError per the fire-and-forget decision in
 *     `_brain/notes/decisions.md` (Sprint 4 BATCH 2). This cron does NOT
 *     call dispatch directly.
 *
 * Concurrency model:
 *   - SKIP LOCKED gives cross-process safety (multiple cron nodes claim
 *     disjoint batches without serialising).
 *   - `inFlight` boolean gives same-process re-entrancy guard (slow tick
 *     doesn't pile up parallel work).
 *
 * Lifecycle:
 *   - startWearableSyncMonitor() — idempotent, safe to call once at boot.
 *   - stopWearableSyncMonitor() — clears the interval; also wired to SIGTERM
 *     for graceful Railway-deploy shutdown.
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import * as ow from '../services/openWearablesClient';
import { markSyncError, recordSuccessfulSync } from '../services/wearableConnections';
import { logger } from '../logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const BATCH_SIZE = 50;

let cronTimer: NodeJS.Timeout | null = null;
let inFlight = false;
let sigtermBound = false;

export function getCronStatus(): { running: boolean; tickInFlight: boolean; intervalMs: number } {
  return {
    running: cronTimer !== null,
    tickInFlight: inFlight,
    intervalMs: getIntervalMs(),
  };
}

function getIntervalMs(): number {
  const env = process.env.WEARABLE_SYNC_MONITOR_INTERVAL_MS;
  if (!env) return DEFAULT_INTERVAL_MS;
  const parsed = parseInt(env, 10);
  if (!Number.isFinite(parsed) || parsed < 1000) return DEFAULT_INTERVAL_MS;
  return parsed;
}

/**
 * Single tick. Exposed for tests + manual invocation.
 *
 * Re-entrancy guard: if a previous tick is still running (long-running
 * triggerSync calls fanned out in series), return zeros and skip rather
 * than pile up parallel work. SKIP LOCKED handles cross-process; this
 * handles same-process.
 */
export async function runSyncMonitorTick(): Promise<{
  claimed: number;
  recovered: number;
  errors: number;
}> {
  if (inFlight) {
    return { claimed: 0, recovered: 0, errors: 0 };
  }
  inFlight = true;
  try {
    return await runTickUnsafe();
  } finally {
    inFlight = false;
  }
}

async function runTickUnsafe(): Promise<{
  claimed: number;
  recovered: number;
  errors: number;
}> {
  const db = await getDb();

  // SELECT ... FOR UPDATE SKIP LOCKED — Postgres-native concurrent-safe claim.
  // Lower-case aliases per gotchas.md (Postgres alias case-folding rule);
  // here we rely on snake_case columns and don't introduce aliases.
  // ORDER BY last_sync_at ASC NULLS FIRST — never-synced rows win the race
  // (their initial sync is more important than a routine refresh).
  const claimed = await db.execute<{ id: string; user_id: string; provider: string }>(
    sql`SELECT id, user_id, provider FROM wearable_connections
        WHERE status = 'connected'
          AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '24 hours')
        ORDER BY last_sync_at ASC NULLS FIRST
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED`
  );
  const rows = ((claimed as unknown as { rows?: unknown[] }).rows ?? claimed) as Array<{
    id: string;
    user_id: string;
    provider: string;
  }>;

  if (rows.length === 0) {
    return { claimed: 0, recovered: 0, errors: 0 };
  }

  let recovered = 0;
  let errors = 0;

  for (const r of rows) {
    try {
      await ow.triggerSync(r.provider, r.user_id);
      await recordSuccessfulSync(r.id);
      recovered += 1;
    } catch (err) {
      logger.warn('[wearableSyncMonitor] triggerSync failed', {
        connectionId: r.id,
        provider: r.provider,
        err: String(err),
      });
      try {
        // markSyncError increments the strike count and fires the appropriate
        // notification on count===1 (wearable_sync_failed) or count===3
        // (wearable_expired). We don't dispatch from here — that's the
        // service's responsibility per fire-and-forget pattern.
        await markSyncError(r.id, String(err));
      } catch (innerErr) {
        // Defensive: never let a markSyncError failure abort the whole batch.
        logger.error('[wearableSyncMonitor] markSyncError threw', {
          connectionId: r.id,
          err: String(innerErr),
        });
      }
      errors += 1;
    }
  }

  return { claimed: rows.length, recovered, errors };
}

/**
 * Start the cron. Safe to call once at server boot. Idempotent — calling
 * twice is a no-op.
 */
export function startWearableSyncMonitor(): NodeJS.Timeout | null {
  if (cronTimer) {
    logger.warn(
      '[wearableSyncMonitor] startWearableSyncMonitor called while already running — ignoring'
    );
    return cronTimer;
  }
  const interval = getIntervalMs();
  logger.info(`[wearableSyncMonitor] starting, interval=${interval}ms, batch_size=${BATCH_SIZE}`);

  cronTimer = setInterval(() => {
    runSyncMonitorTick()
      .then((result) => {
        if (result.claimed > 0) {
          logger.info('[wearableSyncMonitor] tick complete', result);
        }
      })
      .catch((err) => {
        // Defensive — runSyncMonitorTick already catches per-row errors.
        // Anything here is structural (DB unreachable, bug). Log + continue;
        // never let the cron die.
        logger.error('[wearableSyncMonitor] tick threw', err);
      });
  }, interval);

  // Don't block process exit just because this cron is alive.
  cronTimer.unref();

  if (!sigtermBound) {
    process.on('SIGTERM', stopWearableSyncMonitor);
    sigtermBound = true;
  }

  return cronTimer;
}

export function stopWearableSyncMonitor(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

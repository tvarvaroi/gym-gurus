/**
 * Wearable Sync Monitor — Sprint 4 BATCH 5a (rewrite — connection-list polling)
 *
 * Cron that polls `GET /api/v1/users/{ow_user_id}/connections` on Open
 * Wearables every WEARABLE_SYNC_MONITOR_INTERVAL_MS (default 1 hour) and
 * diffs OW's reported state against our local `wearable_connections` row.
 * Provider-side state changes (token expiry, OAuth revoke on OW side, sync
 * errors accumulating) flow into our notification dispatch via this cron —
 * NOT via webhooks (OW upstream emits no `connection.expired` /
 * `connection.revoked` / `connection.disconnected` events; only
 * `connection.created`).
 *
 * Replaces BATCH 3's "stale-window triggerSync nudge" semantic. The same
 * scaffolding stays — SKIP LOCKED claim, isTickInFlight re-entrancy guard,
 * SIGTERM graceful stop, env-overridable interval. Only the tick body
 * changes.
 *
 * Tick semantics (4 cases):
 *
 *   For each row in wearable_connections WHERE status IN ('connected',
 *     'expired', 'error') AND open_wearables_user_id IS NOT NULL ORDER BY
 *     last_sync_at ASC NULLS FIRST LIMIT 50 FOR UPDATE SKIP LOCKED:
 *
 *     ow_user_id = row.open_wearables_user_id  (Path B — OW's UUID, persisted
 *                                                during OAuth-init by
 *                                                wearableConnections.initiateOAuth)
 *
 *     Rows in OAuth-init intermediate state (open_wearables_user_id IS NULL)
 *     are skipped — no OW UUID = nothing to poll.
 *
 *     try {
 *       response = await openWearablesClient.getConnections(ow_user_id)
 *       matching = response.connections.find(c => c.provider === row.provider)
 *
 *       Case 1: matching && matching.status === 'connected' && row.status !== 'connected'
 *         → row was expired/error in our DB; OW says it's healthy now
 *         → UPDATE status='connected', last_sync_error=null, syncErrorCount=0
 *         → no notification (already-good state)
 *
 *       Case 2: matching && matching.status === 'expired' && row.status !== 'expired'
 *         → OW reports tokens expired
 *         → UPDATE status='expired'  (disconnectedAt stays null — token expired ≠ disconnected)
 *         → DISPATCH wearable_expired
 *
 *       Case 3: matching && matching.status === 'error'
 *         → spike-confirmed Semantic (b): count consecutive error-status ticks
 *           ourselves, since OW does NOT expose sync_error_count
 *           (UserConnectionWithCapabilities schema has only status +
 *           last_synced_at fields per OW source).
 *         → determineSyncErrorState(matching, row) returns {newCount, statusFromCount}
 *         → UPDATE syncErrorCount = newCount
 *         → if statusFromCount transitions 'healthy' → 'errored',
 *           UPDATE status='error' AND DISPATCH wearable_sync_failed (once)
 *
 *       Case 4: !matching (OW returned no connection for this provider)
 *         → user disconnected on OW side OR was deleted from OW
 *         → UPDATE status='disconnected', disconnectedAt=NOW(), tokens=null
 *         → DO NOT dispatch (user-initiated disconnect; they already know)
 *     } catch (err) {
 *       → OW unreachable; don't dispatch on transient OW outages, log + continue
 *     }
 *
 * N+1 acknowledgement: this iterates one OW API call per active connection.
 * At v1 scale (tens to low-hundreds of connections, 1-hour cadence) this is
 * trivial. Threshold to refactor: 500 active connections — see the
 * "Wearable sync monitor N+1" gotcha when first hit.
 *
 * Concurrency model (preserved from BATCH 3):
 *   - SKIP LOCKED gives cross-process safety (multiple cron nodes claim
 *     disjoint batches without serialising).
 *   - `inFlight` boolean gives same-process re-entrancy guard.
 *
 * Lifecycle (preserved from BATCH 3):
 *   - startWearableSyncMonitor() — idempotent, safe to call once at boot.
 *   - stopWearableSyncMonitor() — clears the interval; also wired to SIGTERM.
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import * as ow from '../services/openWearablesClient';
import { dispatch } from '../services/notificationDispatcher';
import { logger } from '../logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const BATCH_SIZE = 50;
const SYNC_ERROR_THRESHOLD = 3;

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

// ─── determineSyncErrorState abstraction ─────────────────────────────────────
// Spike-confirmed (2026-05-07 source inspection):
// `UserConnectionWithCapabilities` schema (the response shape of
// `GET /api/v1/users/{user_id}/connections`) exposes `status` + `last_synced_at`
// only. NO `sync_error_count` or `last_sync_error` fields. Decision lock at
// spike close: Cron Case 3 uses Semantic (b) — count consecutive error-status
// ticks ourselves.
//
// The runtime answer is locked, but we implement the count-source as a small
// abstraction so the cron stays robust against OW exposing the field later
// (or against a future OW version changing the response shape). One function
// in front of the count source. Defense-in-depth against schema drift without
// paying the abstraction cost.
//
// Exported for unit tests (the abstraction is the load-bearing surface for
// Cron Case 3 logic correctness).

interface OwConnectionLike {
  status: string;
  // Optional — defined on a future OW schema, undefined today (per spike).
  sync_error_count?: number;
  [k: string]: unknown;
}

interface OurRowLike {
  syncErrorCount: number;
}

export function determineSyncErrorState(
  matching: OwConnectionLike,
  ourRow: OurRowLike
): { newCount: number; statusFromCount: 'healthy' | 'errored' } {
  // Semantic (a) preferred if OW ever exposes it: mirror their count.
  // The schema field doesn't exist today (per OW source as of 2026-05-07);
  // optional access just returns undefined and we fall through to (b).
  // Defense-in-depth against schema changes.
  const owCount = matching.sync_error_count;
  if (typeof owCount === 'number') {
    return {
      newCount: owCount,
      statusFromCount: owCount >= SYNC_ERROR_THRESHOLD ? 'errored' : 'healthy',
    };
  }
  // Semantic (b) — the actual current path. Increment on each tick where
  // OW reports status === 'error'; reset to 0 if status flips back to 'connected'.
  if (matching.status === 'error') {
    const newCount = ourRow.syncErrorCount + 1;
    return {
      newCount,
      statusFromCount: newCount >= SYNC_ERROR_THRESHOLD ? 'errored' : 'healthy',
    };
  }
  return { newCount: 0, statusFromCount: 'healthy' };
}

/**
 * Single tick. Exposed for tests + manual invocation.
 *
 * Re-entrancy guard: if a previous tick is still running (slow OW responses
 * fanned out per-connection), return zeros and skip rather than pile up
 * parallel work. SKIP LOCKED handles cross-process; this handles same-process.
 */
export async function runSyncMonitorTick(): Promise<{
  claimed: number;
  recovered: number;
  expired: number;
  errored: number;
  disconnected: number;
  pollErrors: number;
}> {
  if (inFlight) {
    return {
      claimed: 0,
      recovered: 0,
      expired: 0,
      errored: 0,
      disconnected: 0,
      pollErrors: 0,
    };
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
  expired: number;
  errored: number;
  disconnected: number;
  pollErrors: number;
}> {
  const db = await getDb();

  // Claim a batch of rows we need to poll OW for. status filter includes
  // 'connected' (need to detect transitions to expired/error/disconnected),
  // 'expired' (need to detect re-auth → connected), 'error' (need to detect
  // recovery → connected). We exclude 'disconnected' rows (terminal until
  // a new OAuth flow creates a fresh connected row via UPSERT).
  //
  // Path B (Q2 spike close, Task 5a.10): also skip rows in OAuth-init
  // intermediate state (open_wearables_user_id IS NULL) — they have no OW
  // UUID and OW's data-fetching endpoints can't be called for them.
  //
  // ORDER BY last_sync_at ASC NULLS FIRST — never-polled rows win the race
  // (initial poll is more important than a routine re-check).
  const claimed = await db.execute<{
    id: string;
    user_id: string;
    provider: string;
    status: string;
    sync_error_count: number;
    open_wearables_user_id: string;
  }>(
    sql`SELECT id, user_id, provider, status, sync_error_count, open_wearables_user_id
        FROM wearable_connections
        WHERE status IN ('connected', 'expired', 'error')
          AND open_wearables_user_id IS NOT NULL
        ORDER BY last_sync_at ASC NULLS FIRST
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED`
  );
  const rows = ((claimed as unknown as { rows?: unknown[] }).rows ?? claimed) as Array<{
    id: string;
    user_id: string;
    provider: string;
    status: string;
    sync_error_count: number;
    open_wearables_user_id: string;
  }>;

  if (rows.length === 0) {
    return {
      claimed: 0,
      recovered: 0,
      expired: 0,
      errored: 0,
      disconnected: 0,
      pollErrors: 0,
    };
  }

  let recovered = 0;
  let expired = 0;
  let errored = 0;
  let disconnected = 0;
  let pollErrors = 0;

  for (const r of rows) {
    try {
      // Path B (Q2 spike close): OW's data-fetching endpoints require OW's
      // UUID, NOT our internal user UUID. Persisted during OAuth-init.
      // Row claim filtered to open_wearables_user_id IS NOT NULL above so
      // this is non-null by construction.
      const owUserId = r.open_wearables_user_id;
      const response = await ow.getConnections(owUserId);
      const matching = response.connections?.find((c) => c.provider === r.provider);

      // Case 4: OW returned no matching connection — disconnected on OW side.
      if (!matching) {
        await db.execute(sql`
          UPDATE wearable_connections
          SET status = 'disconnected',
              disconnected_at = NOW(),
              access_token_encrypted = NULL,
              refresh_token_encrypted = NULL
          WHERE id = ${r.id}
        `);
        // No dispatch — user-initiated disconnect from OW side; they already know.
        disconnected += 1;
        continue;
      }

      // Case 1: re-healthy from a previously expired/error state.
      if (matching.status === 'connected' && r.status !== 'connected') {
        await db.execute(sql`
          UPDATE wearable_connections
          SET status = 'connected', last_sync_error = NULL, sync_error_count = 0
          WHERE id = ${r.id}
        `);
        // No dispatch — already-good state.
        recovered += 1;
        continue;
      }

      // Case 2: provider-side token expiry.
      if (matching.status === 'expired' && r.status !== 'expired') {
        await db.execute(sql`
          UPDATE wearable_connections
          SET status = 'expired'
          WHERE id = ${r.id}
        `);
        // Notification: user needs to know — token expired ≠ disconnected.
        await dispatch(r.user_id, 'wearable_expired', { provider: r.provider });
        expired += 1;
        continue;
      }

      // Case 3: error state — count consecutive ticks (or mirror OW count if
      // exposed). Dispatch wearable_sync_failed on transition into errored
      // state (status flip from 'connected' to 'error').
      if (matching.status === 'error') {
        const { newCount, statusFromCount } = determineSyncErrorState(
          matching as unknown as OwConnectionLike,
          { syncErrorCount: r.sync_error_count ?? 0 }
        );
        const becomesErrored = statusFromCount === 'errored' && r.status !== 'error';
        await db.execute(sql`
          UPDATE wearable_connections
          SET sync_error_count = ${newCount},
              status = ${becomesErrored ? 'error' : r.status}
          WHERE id = ${r.id}
        `);
        if (becomesErrored) {
          await dispatch(r.user_id, 'wearable_sync_failed', { provider: r.provider });
          errored += 1;
        }
        continue;
      }

      // Healthy ack of an already-connected row — reset sync_error_count if
      // it had drifted up. No dispatch, no state change.
      if (matching.status === 'connected' && (r.sync_error_count ?? 0) > 0) {
        await db.execute(sql`
          UPDATE wearable_connections
          SET sync_error_count = 0, last_sync_error = NULL
          WHERE id = ${r.id}
        `);
      }
    } catch (err) {
      // OW unreachable — don't dispatch on transient OW outages.
      logger.warn('[wearableSyncMonitor] OW connection-list poll failed', {
        connectionId: r.id,
        provider: r.provider,
        err: String(err),
      });
      pollErrors += 1;
    }
  }

  return { claimed: rows.length, recovered, expired, errored, disconnected, pollErrors };
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

/**
 * Wellness Re-engagement Cron — Sprint 3 BATCH 2
 *
 * Fires every WELLNESS_REENGAGEMENT_INTERVAL_MS (default 24h, intended to land
 * shortly after 03:00 UTC — low-traffic window). Each tick:
 *   1. Inside ONE transaction, claim users via SELECT ... FOR UPDATE SKIP LOCKED
 *      where:
 *        - notification_preferences.categories.recovery = true
 *        - userGamification.last_wellness_check_in_date is exactly 7 days ago
 *          in the user's timezone
 *        - No wellness_reengagement_7day notification dispatched in last 30 days
 *          (avoid pestering)
 *   2. Dispatch wellness_reengagement_7day for each.
 *   3. COMMIT.
 *
 * Same SELECT FOR UPDATE SKIP LOCKED + isTickInFlight pattern as
 * `cleanupExpiredQuietHours.ts` and `dailyWellnessNudge.ts`.
 *
 * Why interval-driven rather than schedule-driven (no cron expression):
 * matches Sprint 2 BATCH 2 design — keeps everything in one operational
 * pattern. Tests can override the interval via env.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { dispatch } from '../services/notificationDispatcher';
import { logger } from '../logger';

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_SIZE = 200;
const ABSENCE_DAYS = 7;
const RATE_LIMIT_DAYS = 30;

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
  const env = process.env.WELLNESS_REENGAGEMENT_INTERVAL_MS;
  if (!env) return DEFAULT_INTERVAL_MS;
  const parsed = parseInt(env, 10);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_INTERVAL_MS;
}

type ReengagementCandidate = {
  user_id: string;
};

export async function runWellnessReengagementTick(): Promise<{
  claimed: number;
  dispatched: number;
  errors: number;
}> {
  if (isTickInFlight) {
    return { claimed: 0, dispatched: 0, errors: 0 };
  }
  isTickInFlight = true;
  try {
    return await runTickUnsafe();
  } finally {
    isTickInFlight = false;
  }
}

async function runTickUnsafe(): Promise<{
  claimed: number;
  dispatched: number;
  errors: number;
}> {
  const db = await getDb();

  // Find users where last_wellness_check_in_date is exactly 7 days ago in their
  // local timezone, AND who haven't been re-engagement-pinged in the last
  // 30 days. The date comparison is string-equality on YYYY-MM-DD (the column
  // shape) — no off-by-one timezone math needed because we compare the user's
  // own stored date against today-7-in-their-tz.
  const candidates = await db.execute<ReengagementCandidate>(
    sql`
      WITH user_tz AS (
        SELECT
          u.id AS user_id,
          COALESCE(u.notification_preferences->'quietHours'->>'timezone', 'UTC') AS tz
        FROM users u
        WHERE u.deleted_at IS NULL
          AND COALESCE((u.notification_preferences->'categories'->>'recovery')::boolean, true) = true
      )
      SELECT user_tz.user_id
      FROM user_tz
      JOIN user_gamification ug ON ug.user_id = user_tz.user_id
      WHERE
        ug.last_wellness_check_in_date IS NOT NULL
        AND ug.last_wellness_check_in_date = TO_CHAR(
          (NOW() AT TIME ZONE user_tz.tz - INTERVAL '${sql.raw(String(ABSENCE_DAYS))} days')::date,
          'YYYY-MM-DD'
        )
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = user_tz.user_id
            AND n.type = 'wellness_reengagement_7day'
            AND n.created_at > NOW() - INTERVAL '${sql.raw(String(RATE_LIMIT_DAYS))} days'
        )
      ORDER BY user_tz.user_id
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `
  );

  const rows = ((candidates as any).rows ?? candidates) as ReengagementCandidate[];

  if (rows.length === 0) {
    return { claimed: 0, dispatched: 0, errors: 0 };
  }

  const settled = await Promise.allSettled(
    rows.map((c) =>
      dispatch(c.user_id, 'wellness_reengagement_7day', {}).catch((err) => {
        logger.error('[wellnessReengagementCron] dispatch threw', { userId: c.user_id, err });
        throw err;
      })
    )
  );

  const errors = settled.filter((s) => s.status === 'rejected').length;
  return { claimed: rows.length, dispatched: settled.length - errors, errors };
}

export function startWellnessReengagementCron(): NodeJS.Timeout {
  if (cronTimer) {
    logger.warn(
      '[wellnessReengagementCron] startWellnessReengagementCron called while already running — ignoring'
    );
    return cronTimer;
  }
  const interval = getIntervalMs();
  logger.info(
    `[wellnessReengagementCron] starting, interval=${interval}ms, batch_size=${BATCH_SIZE}, absence=${ABSENCE_DAYS}d, rate_limit=${RATE_LIMIT_DAYS}d`
  );

  cronTimer = setInterval(() => {
    runWellnessReengagementTick()
      .then((result) => {
        if (result.claimed > 0) {
          logger.info('[wellnessReengagementCron] tick complete', result);
        }
      })
      .catch((err) => {
        logger.error('[wellnessReengagementCron] tick threw', err);
      });
  }, interval);

  cronTimer.unref();
  return cronTimer;
}

export function stopWellnessReengagementCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

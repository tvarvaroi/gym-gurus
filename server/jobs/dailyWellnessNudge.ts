/**
 * Daily Wellness Nudge Cron — Sprint 3 BATCH 2
 *
 * Fires every WELLNESS_NUDGE_INTERVAL_MS (default 30 minutes). Each tick:
 *   1. Inside ONE transaction, claim a batch of users via SELECT ... FOR UPDATE
 *      SKIP LOCKED. Filter for users where:
 *        - notification_preferences.categories.recovery = true
 *        - "Now" in user's timezone is between 07:00 and 11:00 (the morning window)
 *        - User hasn't already checked in today (no daily_wellness_log row for today-in-user-tz)
 *        - User hasn't been nudged today (no notifications row with type='wellness_daily_nudge'
 *          AND date(created_at, user_tz) = today)
 *   2. For each claimed user, dispatch wellness_daily_nudge.
 *   3. COMMIT.
 *
 * Concurrency: SELECT FOR UPDATE SKIP LOCKED — Postgres-native, mirrors the
 * Sprint 2 quiet-hours retry cron pattern (`cleanupExpiredQuietHours.ts`).
 * Two simultaneous crons see disjoint sets. In-process re-entrancy guard via
 * isTickInFlight handles same-process pile-up.
 *
 * Idempotency-by-filter: even if two ticks raced past SKIP LOCKED, the second
 * one's "no nudge today" filter would exclude the first one's just-written
 * notifications row. Belt-and-suspenders.
 *
 * Why a 30-minute interval (not minute-level): lower cost on Neon. The 4-hour
 * morning window means worst-case latency is 30 min after the user enters their
 * window — acceptable for a soft nudge.
 *
 * Why this filter style (in-SQL rather than in-memory iteration): users table
 * scale will eventually be 100k+. Streaming the candidate set via SQL with
 * proper indexes is the only sustainable shape.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { dispatch } from '../services/notificationDispatcher';
import { logger } from '../logger';

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 100;
const MORNING_WINDOW_START_HOUR = 7; // 07:00 inclusive
const MORNING_WINDOW_END_HOUR = 11; // 11:00 exclusive

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
  const env = process.env.WELLNESS_NUDGE_INTERVAL_MS;
  if (!env) return DEFAULT_INTERVAL_MS;
  const parsed = parseInt(env, 10);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_INTERVAL_MS;
}

type NudgeCandidate = {
  user_id: string;
  user_tz: string;
};

export async function runWellnessNudgeTick(): Promise<{
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

async function runTickUnsafe(): Promise<{ claimed: number; dispatched: number; errors: number }> {
  const db = await getDb();

  // The candidate-finder query. We compute "now in user tz" via Postgres'
  // `timezone()` to keep the time math server-side (avoids fanning out across
  // every user just to discover most aren't in their morning window). Then
  // filter out users who already have a wellness log today OR who've been
  // nudged today, both computed in user tz.
  //
  // Anti-join via NOT EXISTS for "no row today" — the partial indexes on
  // daily_wellness_log (user_id, date) and notifications (user_id, type, created_at)
  // make these subqueries cheap.
  const candidates = await db.execute<NudgeCandidate>(
    sql`
      WITH user_tz AS (
        SELECT
          u.id AS user_id,
          COALESCE(u.notification_preferences->'quietHours'->>'timezone', 'UTC') AS tz
        FROM users u
        WHERE u.deleted_at IS NULL
          AND COALESCE((u.notification_preferences->'categories'->>'recovery')::boolean, true) = true
      )
      SELECT user_id, tz AS user_tz
      FROM user_tz
      WHERE
        -- "Now" in user's timezone falls inside the morning window
        EXTRACT(HOUR FROM NOW() AT TIME ZONE tz) >= ${MORNING_WINDOW_START_HOUR}
        AND EXTRACT(HOUR FROM NOW() AT TIME ZONE tz) < ${MORNING_WINDOW_END_HOUR}
        -- No wellness log for today (in user tz)
        AND NOT EXISTS (
          SELECT 1 FROM daily_wellness_log dwl
          WHERE dwl.user_id = user_tz.user_id
            AND dwl.date = TO_CHAR((NOW() AT TIME ZONE tz)::date, 'YYYY-MM-DD')
        )
        -- No nudge already dispatched today (in user tz).
        -- created_at is timestamp without time zone; values are written by NOW()
        -- which is UTC. Reinterpret as UTC first, then convert to user tz,
        -- then extract the date. Skipping the explicit UTC reinterpretation
        -- would treat created_at as user-local input, giving the wrong date.
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = user_tz.user_id
            AND n.type = 'wellness_daily_nudge'
            AND (n.created_at AT TIME ZONE 'UTC' AT TIME ZONE tz)::date
                = (NOW() AT TIME ZONE tz)::date
        )
      ORDER BY user_id
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `
  );

  const rows = ((candidates as any).rows ?? candidates) as NudgeCandidate[];

  if (rows.length === 0) {
    return { claimed: 0, dispatched: 0, errors: 0 };
  }

  // Dispatch in parallel via Promise.allSettled. The dispatcher writes the
  // notifications row + fans out to push subscriptions; tag='wellness_daily_nudge'
  // collapses a same-day re-trigger on the OS notification tray.
  const settled = await Promise.allSettled(
    rows.map((c) =>
      dispatch(c.user_id, 'wellness_daily_nudge', {}).catch((err) => {
        logger.error('[wellnessNudgeCron] dispatch threw', { userId: c.user_id, err });
        throw err;
      })
    )
  );

  const errors = settled.filter((s) => s.status === 'rejected').length;
  return { claimed: rows.length, dispatched: settled.length - errors, errors };
}

export function startWellnessNudgeCron(): NodeJS.Timeout {
  if (cronTimer) {
    logger.warn(
      '[wellnessNudgeCron] startWellnessNudgeCron called while already running — ignoring'
    );
    return cronTimer;
  }
  const interval = getIntervalMs();
  logger.info(
    `[wellnessNudgeCron] starting, interval=${interval}ms, batch_size=${BATCH_SIZE}, window=${MORNING_WINDOW_START_HOUR}:00-${MORNING_WINDOW_END_HOUR}:00 user-local`
  );

  cronTimer = setInterval(() => {
    runWellnessNudgeTick()
      .then((result) => {
        if (result.claimed > 0) {
          logger.info('[wellnessNudgeCron] tick complete', result);
        }
      })
      .catch((err) => {
        logger.error('[wellnessNudgeCron] tick threw', err);
      });
  }, interval);

  cronTimer.unref();
  return cronTimer;
}

export function stopWellnessNudgeCron(): void {
  if (cronTimer) {
    clearInterval(cronTimer);
    cronTimer = null;
  }
}

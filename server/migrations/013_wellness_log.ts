// Migration 013 — Daily Wellness Log (Sprint 3, Phase B Sensor Web)
//
// Two pieces:
//   1. New table `daily_wellness_log` — keystone subjective + behavior + computed
//      readiness store. ONE row per user per date (UNIQUE). All slider fields
//      enforced 1-10 via CHECK constraints; readiness_score 0-100 via CHECK.
//   2. Three new columns on user_gamification — wellness streak parallel to
//      the existing workout streak. New columns default to 0/NULL so existing
//      rows are valid post-migration.
//
// Idempotency: every DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS. Safe
// to re-run.
//
// down() — Sprint-1.5 BATCH 2 + Sprint 2 BATCH 1 pattern: refuse to roll back
// if any daily_wellness_log rows exist. Dropping the table would silently
// destroy data; force operator to manually reconcile (export, NULL out, etc.)
// before re-running down().
//
// CLI:    npx tsx server/migrations/013_wellness_log.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 013_wellness_log

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();

  // ─── 1. daily_wellness_log table ─────────────────────────────────────────
  // CHECK constraints are named so Postgres returns the constraint name in the
  // error message — wellnessService can detect range violations specifically
  // (e.g. for friendlier error responses) instead of a generic "check constraint
  // violated" string.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_wellness_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      energy_level INTEGER,
      mood_score INTEGER,
      stress_level INTEGER,
      sleep_quality_subjective INTEGER,
      motivation_level INTEGER,
      soreness_overall INTEGER,
      hydration_goal_met BOOLEAN,
      stepped_outside BOOLEAN,
      meditation_completed BOOLEAN,
      notes TEXT,
      readiness_score INTEGER,
      readiness_score_factors JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT daily_wellness_energy_range
        CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10)),
      CONSTRAINT daily_wellness_mood_range
        CHECK (mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10)),
      CONSTRAINT daily_wellness_stress_range
        CHECK (stress_level IS NULL OR (stress_level >= 1 AND stress_level <= 10)),
      CONSTRAINT daily_wellness_sleep_range
        CHECK (sleep_quality_subjective IS NULL OR (sleep_quality_subjective >= 1 AND sleep_quality_subjective <= 10)),
      CONSTRAINT daily_wellness_motivation_range
        CHECK (motivation_level IS NULL OR (motivation_level >= 1 AND motivation_level <= 10)),
      CONSTRAINT daily_wellness_soreness_range
        CHECK (soreness_overall IS NULL OR (soreness_overall >= 1 AND soreness_overall <= 10)),
      CONSTRAINT daily_wellness_score_range
        CHECK (readiness_score IS NULL OR (readiness_score >= 0 AND readiness_score <= 100))
    )
  `);

  // UNIQUE (user_id, date) enforces "one row per user per date" — wellnessService.upsertTodayEntry
  // relies on this index name for ON CONFLICT (user_id, date) DO UPDATE.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_wellness_user_date
      ON daily_wellness_log (user_id, date)
  `);

  // Covers "recent wellness" history queries (DESC date scan, LIMIT N).
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_daily_wellness_user_recent
      ON daily_wellness_log (user_id, date DESC)
  `);

  // ─── 2. user_gamification wellness streak columns ───────────────────────
  // Parallel to existing workout streak (current_streak_days, longest_streak_days,
  // last_workout_date). Defaults make existing rows valid post-migration with
  // no backfill needed.
  await db.execute(sql`
    ALTER TABLE user_gamification
      ADD COLUMN IF NOT EXISTS current_wellness_streak_days INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS longest_wellness_streak_days INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_wellness_check_in_date VARCHAR(10)
  `);

  console.warn(
    '[Migration 013] up() complete: daily_wellness_log table + user_gamification wellness streak columns'
  );
}

export async function down() {
  const db = await getDb();

  // ─── Safety assertion: refuse if data exists ─────────────────────────────
  // Mirrors Sprint 1.5 BATCH 2 + migration 012's down() pattern — turning a
  // silent data-loss footgun into an explicit operator decision point.
  const r: any = await db.execute(
    sql`SELECT COUNT(*)::text AS count FROM daily_wellness_log`
  );
  const countStr = (r as any).rows?.[0]?.count ?? (r as any)[0]?.count ?? '0';
  const count = parseInt(countStr, 10);
  if (count > 0) {
    throw new Error(
      `[Migration 013 down] BLOCKED: ${count} daily_wellness_log rows exist. ` +
        `Dropping the table would destroy every wellness check-in on record. ` +
        `Reconcile manually (export, archive, OR truncate explicitly) before re-running down().`
    );
  }

  // Drop in reverse of creation order (indexes → table → user_gamification cols).
  await db.execute(sql`DROP INDEX IF EXISTS idx_daily_wellness_user_recent`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_daily_wellness_user_date`);
  await db.execute(sql`DROP TABLE IF EXISTS daily_wellness_log`);

  await db.execute(
    sql`ALTER TABLE user_gamification DROP COLUMN IF EXISTS last_wellness_check_in_date`
  );
  await db.execute(
    sql`ALTER TABLE user_gamification DROP COLUMN IF EXISTS longest_wellness_streak_days`
  );
  await db.execute(
    sql`ALTER TABLE user_gamification DROP COLUMN IF EXISTS current_wellness_streak_days`
  );

  console.warn(`[Migration 013 down] reverted: ${count} rows existed (zero, safe)`);
}

// CLI invocation (compatible with scripts/run-prod-migration.ts dynamic import).
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 013] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 013] ${direction}() failed:`, err);
      process.exit(1);
    });
}

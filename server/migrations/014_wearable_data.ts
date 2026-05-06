// Migration 014 — Wearable Integration (Sprint 4)
//
// Atomic migration combining four pieces:
//   1. 4 new tables: wearable_connections, sleep_sessions, daily_vitals,
//      activity_sessions. Sleep + activity have UNIQUE on (user_id, source,
//      source_record_id) for idempotent UPSERT. Daily vitals UNIQUE on
//      (user_id, date, source). Connections UNIQUE on (user_id, provider).
//   2. clients.user_id FK column with email-based backfill — closes the
//      long-deferred Sprint 1 gotcha (clients.id was never linked to users.id).
//   3. clients: 4 sibling consent flags (sleep / hrv / activity default true;
//      progress photos default false — opt-IN per locked decision).
//   4. users.preferred_wearable_id FK column.
//
// Idempotency: every DDL uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
// The backfill UPDATE is naturally idempotent — only updates rows where
// user_id IS NULL, so re-running is a no-op.
//
// down() — refuses if any wearable_connections rows exist OR if any of the
// 3 default-on consent flags (sleep / hrv / activity) have been flipped to
// false. Photos opt-IN flag is excluded from the safety check (operators may
// have intentionally toggled it; default-false → user-true direction is fine).
//
// CLI:    npx tsx server/migrations/014_wearable_data.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 014_wearable_data

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();

  // ─── 1. wearable_connections ─────────────────────────────────────────────
  // CHECK constraints are named so error messages identify violations
  // unambiguously when an unexpected provider/status string surfaces from a
  // botched webhook. Default sync_preferences JSONB literal must match the
  // schema.ts DEFAULT_WEARABLE_SYNC_PREFERENCES interface byte-for-byte.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wearable_connections (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(32) NOT NULL,
      provider_user_id VARCHAR(255),
      access_token_encrypted TEXT,
      refresh_token_encrypted TEXT,
      token_expires_at TIMESTAMP,
      status VARCHAR(32) NOT NULL DEFAULT 'disconnected',
      last_sync_at TIMESTAMP,
      sync_error_count INTEGER NOT NULL DEFAULT 0,
      last_sync_error TEXT,
      capabilities JSONB DEFAULT '[]'::jsonb,
      sync_preferences JSONB NOT NULL DEFAULT '{"sleep":true,"hrv":true,"workouts":true,"body":true,"activity":true}'::jsonb,
      connected_at TIMESTAMP,
      disconnected_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT wearable_connections_provider_check
        CHECK (provider IN ('whoop','oura','garmin','strava','withings')),
      CONSTRAINT wearable_connections_status_check
        CHECK (status IN ('connected','disconnected','expired','revoked'))
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_wearable_connections_user_provider
      ON wearable_connections (user_id, provider)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_wearable_connections_status_sync
      ON wearable_connections (status, last_sync_at)
  `);

  // ─── 2. sleep_sessions ───────────────────────────────────────────────────
  // CHECK enforces sleep_score 0-100 (provider scores are normalized to this
  // range during ingest). UNIQUE (user_id, source, source_record_id) makes
  // repeat webhooks UPSERT-safe.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sleep_sessions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      bedtime TIMESTAMP,
      wake_time TIMESTAMP,
      total_sleep_minutes INTEGER,
      deep_minutes INTEGER,
      rem_minutes INTEGER,
      light_minutes INTEGER,
      awake_minutes INTEGER,
      avg_heart_rate INTEGER,
      min_heart_rate INTEGER,
      hrv_overnight_ms NUMERIC(6,2),
      respiratory_rate NUMERIC(4,1),
      blood_oxygen_min NUMERIC(4,1),
      body_temperature_deviation NUMERIC(3,2),
      sleep_score INTEGER,
      source VARCHAR(32) NOT NULL,
      source_record_id VARCHAR(255) NOT NULL,
      raw_payload JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT sleep_sessions_score_range
        CHECK (sleep_score IS NULL OR (sleep_score >= 0 AND sleep_score <= 100))
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_date
      ON sleep_sessions (user_id, date)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sleep_sessions_user_source_record
      ON sleep_sessions (user_id, source, source_record_id)
  `);

  // ─── 3. daily_vitals ─────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_vitals (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      resting_heart_rate INTEGER,
      morning_hrv_rmssd NUMERIC(6,2),
      vo2max NUMERIC(4,1),
      blood_pressure_systolic INTEGER,
      blood_pressure_diastolic INTEGER,
      blood_oxygen_avg NUMERIC(4,1),
      body_temperature NUMERIC(4,2),
      source VARCHAR(32) NOT NULL,
      source_record_id VARCHAR(255) NOT NULL,
      raw_payload JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_vitals_user_date_source
      ON daily_vitals (user_id, date, source)
  `);

  // ─── 4. activity_sessions ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activity_sessions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at TIMESTAMP NOT NULL,
      duration_minutes INTEGER,
      activity_type VARCHAR(64),
      distance_meters INTEGER,
      calories INTEGER,
      avg_heart_rate INTEGER,
      max_heart_rate INTEGER,
      steps INTEGER,
      elevation_gain_meters INTEGER,
      strain_score NUMERIC(4,1),
      training_load_score NUMERIC(5,1),
      route_polyline TEXT,
      source VARCHAR(32) NOT NULL,
      source_record_id VARCHAR(255) NOT NULL,
      raw_payload JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_started
      ON activity_sessions (user_id, started_at)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_sessions_user_source_record
      ON activity_sessions (user_id, source, source_record_id)
  `);

  // ─── 5. clients consent expansion + user_id FK ───────────────────────────
  // ADD COLUMN IF NOT EXISTS makes this idempotent. ON DELETE SET NULL on
  // user_id because client roster rows survive Disciple account deletion
  // (trainer's data, not user's).
  await db.execute(sql`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS share_sleep_with_trainer BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS share_hrv_with_trainer BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS share_activity_with_trainer BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS share_progress_photos_with_trainer BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients (user_id)
  `);

  // ─── 6. clients.user_id email-based backfill ─────────────────────────────
  // The long-deferred Sprint 1 gotcha fix. Match clients.email → users.email
  // (case-insensitive — emails could be mixed case in either table) AND
  // users.role = 'client' (prevents matching a Disciple-side client row
  // against a trainer/solo who happens to share an email). Filter
  // deleted_at IS NULL on both tables so soft-deleted rows are excluded.
  //
  // Idempotent: only updates rows where c.user_id IS NULL, so re-running is
  // a no-op once a client has been linked. Adding new (clients, users) pairs
  // by re-running the backfill is supported.
  await db.execute(sql`
    UPDATE clients c
       SET user_id = u.id
      FROM users u
     WHERE c.user_id IS NULL
       AND LOWER(c.email) = LOWER(u.email)
       AND u.role = 'client'
       AND u.deleted_at IS NULL
       AND c.deleted_at IS NULL
  `);

  // Diagnostic: count of unmatched clients (no users link). These are
  // prospects who haven't registered as Disciples yet — expected, NOT
  // a failure. Log so the operator sees the magnitude post-run.
  const unmatched: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM clients
     WHERE user_id IS NULL AND deleted_at IS NULL
  `);
  const unmatchedCount = parseInt(
    unmatched.rows?.[0]?.c ?? unmatched[0]?.c ?? '0',
    10
  );
  console.warn(
    `[Migration 014] clients.user_id backfill: ${unmatchedCount} clients still NULL ` +
      `(prospects who haven't registered as Disciples — expected, NOT a failure).`
  );

  // ─── 7. users.preferred_wearable_id ──────────────────────────────────────
  // FK to wearable_connections.id. ON DELETE SET NULL because connections
  // are user-revocable; user keeps their identity if they disconnect.
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS preferred_wearable_id VARCHAR
        REFERENCES wearable_connections(id) ON DELETE SET NULL
  `);

  console.warn(
    '[Migration 014] up() complete: 4 tables + clients.user_id FK + 4 consent flags + users.preferred_wearable_id'
  );
}

export async function down() {
  const db = await getDb();

  // ─── Safety assertion 1: refuse if any wearable_connections rows exist ──
  // Mirrors Sprint 1.5 BATCH 2 + 012 + 013 down() pattern — turning a silent
  // data-loss footgun into an explicit operator decision point.
  const wcCount: any = await db.execute(
    sql`SELECT COUNT(*)::text AS c FROM wearable_connections`
  );
  const wc = parseInt(wcCount.rows?.[0]?.c ?? wcCount[0]?.c ?? '0', 10);
  if (wc > 0) {
    throw new Error(
      `[Migration 014 down] BLOCKED: ${wc} wearable_connections rows exist. ` +
        `Dropping would destroy connection state and disconnect users without notice. ` +
        `Disconnect users via UI first OR truncate explicitly before re-running down().`
    );
  }

  // ─── Safety assertion 2: refuse if any default-on consent flag flipped ──
  // Photos default false (opt-IN) so excluded — flipping that to true is
  // intentional consent grant, no risk on rollback. The 3 default-on flags
  // (sleep / hrv / activity) carry data-sharing consent; flipping back to
  // default would silently auto-re-share if user had explicitly opted out.
  const flipped: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM clients
     WHERE deleted_at IS NULL
       AND (share_sleep_with_trainer = FALSE
            OR share_hrv_with_trainer = FALSE
            OR share_activity_with_trainer = FALSE)
  `);
  const fc = parseInt(flipped.rows?.[0]?.c ?? flipped[0]?.c ?? '0', 10);
  if (fc > 0) {
    throw new Error(
      `[Migration 014 down] BLOCKED: ${fc} clients have flipped a sleep/hrv/activity ` +
        `consent flag to false. Dropping the column would silently auto-re-share ` +
        `their data on the next migration. Reconcile manually before re-running down().`
    );
  }

  // ─── Reverse-order drops ─────────────────────────────────────────────────
  // users.preferred_wearable_id has a FK to wearable_connections.id, so it
  // must drop BEFORE wearable_connections. clients.user_id has FK to users
  // but users isn't being dropped — order doesn't matter relative to that.
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS preferred_wearable_id`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_clients_user_id`);
  await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS user_id`);
  await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_progress_photos_with_trainer`);
  await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_activity_with_trainer`);
  await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_hrv_with_trainer`);
  await db.execute(sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_sleep_with_trainer`);

  await db.execute(sql`DROP INDEX IF EXISTS idx_activity_sessions_user_source_record`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_activity_sessions_user_started`);
  await db.execute(sql`DROP TABLE IF EXISTS activity_sessions`);

  await db.execute(sql`DROP INDEX IF EXISTS idx_daily_vitals_user_date_source`);
  await db.execute(sql`DROP TABLE IF EXISTS daily_vitals`);

  await db.execute(sql`DROP INDEX IF EXISTS idx_sleep_sessions_user_source_record`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_sleep_sessions_user_date`);
  await db.execute(sql`DROP TABLE IF EXISTS sleep_sessions`);

  await db.execute(sql`DROP INDEX IF EXISTS idx_wearable_connections_status_sync`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_wearable_connections_user_provider`);
  await db.execute(sql`DROP TABLE IF EXISTS wearable_connections`);

  console.warn(
    `[Migration 014 down] reverted: ${wc} wearable_connections rows, ${fc} flipped consent flags (zero, safe)`
  );
}

// CLI invocation (compatible with scripts/run-prod-migration.ts dynamic import).
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 014] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 014] ${direction}() failed:`, err);
      process.exit(1);
    });
}

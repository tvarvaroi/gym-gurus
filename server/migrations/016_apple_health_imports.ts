// Migration 016 — Apple Health Imports (Sprint 5 BATCH 1)
//
// Creates apple_health_imports tracking table. One row per upload
// operation; the actual imported records (workouts/sleep/body/vitals)
// live in the existing wearable schema (sleep_sessions, daily_vitals,
// activity_sessions, body_metrics) with source='apple_health'.
//
// Status state machine:
//   uploaded → parsing → completed | failed | cancelled
//
// IDEMPOTENCY: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
// Re-running is a no-op.
//
// down() — refuses if any apple_health_imports rows currently exist.
// Mirrors 012/013/014/014.5 down() pattern: silent data-loss footgun
// turned into an explicit operator decision. Dropping the table while
// imports exist would orphan in-flight operations and lose audit history.
//
// Sprint 5 reuses Sprint 4's wearable schema for the actual imported
// records (sleep_sessions / daily_vitals / activity_sessions / body_metrics).
// Migrations 014 + 014.5 are unblocked by this sprint and run on prod
// alongside 016. Migration 015 (open_wearables_user_id) stays gated on
// Sprint 4 resumption.
//
// CLI:    npx tsx server/migrations/016_apple_health_imports.ts [up|down]
// Prod:   railway run -- npx tsx scripts/run-prod-migration.ts up 016_apple_health_imports

import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export const NAME = '016_apple_health_imports';

export async function up() {
  const db = await getDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS apple_health_imports (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_size_bytes BIGINT NOT NULL,
      file_r2_key VARCHAR(512),
      status VARCHAR(16) NOT NULL DEFAULT 'uploaded',
      records_parsed INTEGER NOT NULL DEFAULT 0,
      records_ingested_workout INTEGER NOT NULL DEFAULT 0,
      records_ingested_sleep INTEGER NOT NULL DEFAULT 0,
      records_ingested_vitals INTEGER NOT NULL DEFAULT 0,
      records_ingested_body INTEGER NOT NULL DEFAULT 0,
      records_skipped_duplicate INTEGER NOT NULL DEFAULT 0,
      records_skipped_unparseable INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      date_range_start VARCHAR(10),
      date_range_end VARCHAR(10),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      CONSTRAINT apple_health_imports_status_check
        CHECK (status IN ('uploaded','parsing','completed','failed','cancelled'))
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_apple_health_imports_user_status
      ON apple_health_imports (user_id, status);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_apple_health_imports_user_recent
      ON apple_health_imports (user_id, created_at DESC);
  `);

  console.warn(
    '[Migration 016] up() complete: apple_health_imports table + 2 indexes + status CHECK created'
  );
}

export async function down() {
  const db = await getDb();

  // Safety gate — refuse if any imports exist. Dropping the table would
  // orphan in-flight imports + lose user-visible audit history. Operator
  // must explicitly clear the table first if a rollback is genuinely
  // required.
  const result: any = await db.execute(sql`
    SELECT COUNT(*)::text AS c FROM apple_health_imports
  `);
  const count = parseInt(result.rows?.[0]?.c ?? result[0]?.c ?? '0', 10);
  if (count > 0) {
    throw new Error(
      `[Migration 016 down] BLOCKED: ${count} apple_health_imports rows exist. ` +
        `Dropping the table would orphan in-flight import operations. ` +
        `Verify these rows are not load-bearing before forcing rollback.`
    );
  }

  await db.execute(sql`DROP INDEX IF EXISTS idx_apple_health_imports_user_recent;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_apple_health_imports_user_status;`);
  await db.execute(sql`DROP TABLE IF EXISTS apple_health_imports;`);
  console.warn(`[Migration 016 down] reverted: ${count} rows (zero, safe)`);
}

// CLI invocation (compatible with scripts/run-prod-migration.ts dynamic import).
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 016] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 016] ${direction}() failed:`, err);
      process.exit(1);
    });
}

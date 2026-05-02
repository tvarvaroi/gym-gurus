import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();

  // body_metrics — polymorphic time-series body measurements for ALL roles
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS body_metrics (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
      weight_kg NUMERIC(6,2),
      body_fat_percentage NUMERIC(4,2),
      neck_cm NUMERIC(5,2),
      chest_cm NUMERIC(5,2),
      waist_cm NUMERIC(5,2),
      hips_cm NUMERIC(5,2),
      bicep_left_cm NUMERIC(5,2),
      bicep_right_cm NUMERIC(5,2),
      thigh_left_cm NUMERIC(5,2),
      thigh_right_cm NUMERIC(5,2),
      calf_left_cm NUMERIC(5,2),
      calf_right_cm NUMERIC(5,2),
      muscle_mass_kg NUMERIC(5,2),
      visceral_fat_rating INTEGER,
      bone_mass_kg NUMERIC(4,2),
      body_water_percentage NUMERIC(4,2),
      source VARCHAR(30) NOT NULL DEFAULT 'manual',
      source_provider VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_body_metrics_user_id ON body_metrics(user_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_body_metrics_user_recorded_at ON body_metrics(user_id, recorded_at DESC)`
  );

  // progress_photos — sequenced photo timeline with self-FK for compare links
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      taken_at TIMESTAMP NOT NULL DEFAULT NOW(),
      image_url VARCHAR(500) NOT NULL,
      thumbnail_url VARCHAR(500),
      pose VARCHAR(20) NOT NULL,
      weight_at_photo_kg NUMERIC(5,2),
      body_fat_at_photo NUMERIC(4,2),
      is_private BOOLEAN NOT NULL DEFAULT TRUE,
      compares_photo_id VARCHAR REFERENCES progress_photos(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_progress_photos_user_taken_at ON progress_photos(user_id, taken_at DESC)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_progress_photos_user_pose_taken_at ON progress_photos(user_id, pose, taken_at DESC)`
  );

  // progress_entries — refactor to polymorphic (user OR client). XOR enforced via CHECK.
  // Existing rows keep client_id; new Ronin/solo rows write user_id.
  await db.execute(sql`ALTER TABLE progress_entries ALTER COLUMN client_id DROP NOT NULL`);
  await db.execute(
    sql`ALTER TABLE progress_entries ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE`
  );
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'progress_entries_user_or_client_check'
      ) THEN
        ALTER TABLE progress_entries
          ADD CONSTRAINT progress_entries_user_or_client_check
          CHECK (
            (user_id IS NOT NULL AND client_id IS NULL)
            OR (user_id IS NULL AND client_id IS NOT NULL)
          );
      END IF;
    END
    $$;
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_progress_entries_user_id ON progress_entries(user_id) WHERE user_id IS NOT NULL`
  );

  // clients — Disciple consent flag (default-on per locked roadmap decision).
  // Named share_body_metrics_with_trainer (not share_biometrics) so Sprint 4 can
  // add share_sleep_with_trainer / share_hrv_with_trainer / share_activity_with_trainer
  // as siblings without renaming.
  await db.execute(sql`
    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS share_body_metrics_with_trainer BOOLEAN NOT NULL DEFAULT TRUE
  `);

  console.warn(
    '[Migration 011] Biometrics foundation: body_metrics + progress_photos created, progress_entries polymorphic, clients.share_body_metrics_with_trainer added'
  );
}

export async function down() {
  const db = await getDb();

  await db.execute(
    sql`ALTER TABLE clients DROP COLUMN IF EXISTS share_body_metrics_with_trainer`
  );

  await db.execute(sql`DROP INDEX IF EXISTS idx_progress_entries_user_id`);
  await db.execute(
    sql`ALTER TABLE progress_entries DROP CONSTRAINT IF EXISTS progress_entries_user_or_client_check`
  );
  await db.execute(sql`ALTER TABLE progress_entries DROP COLUMN IF EXISTS user_id`);
  // Intentionally NOT re-applying NOT NULL on client_id — if any rows were inserted
  // with user_id only, that would fail. A real rollback would inspect data first.

  await db.execute(sql`DROP TABLE IF EXISTS progress_photos`);
  await db.execute(sql`DROP TABLE IF EXISTS body_metrics`);

  console.warn(
    '[Migration 011 down] Reverted body_metrics + progress_photos + indexes; left progress_entries.client_id nullable for safety'
  );
}

// CLI invocation: npx tsx server/migrations/011_biometrics_foundation.ts [up|down]
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const fn = direction === 'down' ? down : up;
  fn()
    .then(() => {
      console.warn(`[Migration 011] ${direction}() complete`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Migration 011] ${direction}() failed:`, err);
      process.exit(1);
    });
}

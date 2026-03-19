// Migration 009: Add primaryMuscles and secondaryMuscles columns to exercises table
// These separate the "driving" muscles from "assisting" muscles for anatomy display.
// muscleGroups is preserved for backward compat (recovery pipeline reads it).

import { getDb } from '../db';

export async function up() {
  const db = await getDb();
  await db.execute(`
    ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS primary_muscles TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] NOT NULL DEFAULT '{}';

    -- GIN indexes for array containment queries (@> operator)
    CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles
      ON exercises USING GIN (primary_muscles);
    CREATE INDEX IF NOT EXISTS idx_exercises_secondary_muscles
      ON exercises USING GIN (secondary_muscles);
  `);
  console.warn('Migration 009 UP: Added primary_muscles and secondary_muscles columns with GIN indexes');
}

export async function down() {
  const db = await getDb();
  await db.execute(`
    DROP INDEX IF EXISTS idx_exercises_secondary_muscles;
    DROP INDEX IF EXISTS idx_exercises_primary_muscles;
    ALTER TABLE exercises
      DROP COLUMN IF EXISTS secondary_muscles,
      DROP COLUMN IF EXISTS primary_muscles;
  `);
  console.warn('Migration 009 DOWN: Removed primary_muscles and secondary_muscles columns');
}

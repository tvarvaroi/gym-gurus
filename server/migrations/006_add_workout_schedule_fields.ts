import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration: Add workout schedule fields to workout_assignments table
 *
 * This migration adds fields to support weekly workout scheduling:
 * - scheduledDate: The specific date for the workout (YYYY-MM-DD)
 * - dayOfWeek: Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * - weekNumber: ISO week number for grouping
 * - weekYear: Year for the week number
 *
 * All fields are nullable to maintain backward compatibility with existing assignments.
 */
export async function up() {
  console.log("Adding workout schedule fields to workout_assignments table...");

  const db = await getDb();

  // Add new columns to workout_assignments table
  await db.execute(sql`
    ALTER TABLE workout_assignments
    ADD COLUMN IF NOT EXISTS scheduled_date TEXT;
  `);

  await db.execute(sql`
    ALTER TABLE workout_assignments
    ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
  `);

  await db.execute(sql`
    ALTER TABLE workout_assignments
    ADD COLUMN IF NOT EXISTS week_number INTEGER;
  `);

  await db.execute(sql`
    ALTER TABLE workout_assignments
    ADD COLUMN IF NOT EXISTS week_year INTEGER;
  `);

  console.log("✅ Workout schedule fields added successfully");

  // Create indexes for performance
  console.log("Creating indexes for workout schedule queries...");

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_workout_assignments_scheduled_date
    ON workout_assignments(scheduled_date);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_date
    ON workout_assignments(client_id, scheduled_date);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_workout_assignments_week
    ON workout_assignments(week_year, week_number, client_id);
  `);

  console.log("✅ Indexes created successfully");
}

export async function down() {
  console.log("Removing workout schedule fields from workout_assignments table...");

  const db = await getDb();

  // Drop indexes first
  await db.execute(sql`DROP INDEX IF EXISTS idx_workout_assignments_scheduled_date;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_workout_assignments_client_date;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_workout_assignments_week;`);

  console.log("✅ Indexes dropped successfully");

  // Drop columns
  await db.execute(sql`
    ALTER TABLE workout_assignments
    DROP COLUMN IF EXISTS scheduled_date;
  `);

  await db.execute(sql`
    ALTER TABLE workout_assignments
    DROP COLUMN IF EXISTS day_of_week;
  `);

  await db.execute(sql`
    ALTER TABLE workout_assignments
    DROP COLUMN IF EXISTS week_number;
  `);

  await db.execute(sql`
    ALTER TABLE workout_assignments
    DROP COLUMN IF EXISTS week_year;
  `);

  console.log("✅ Workout schedule fields removed successfully");
}

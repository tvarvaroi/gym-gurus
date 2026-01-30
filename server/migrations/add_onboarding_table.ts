import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration: Add user_onboarding_progress table
 *
 * This migration adds a table to track user onboarding progress,
 * including welcome modal completion, goal selection, and milestone achievements.
 */
export async function up() {
  console.log("Creating user_onboarding_progress table...");

  const db = await getDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_onboarding_progress (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      welcome_modal_completed BOOLEAN NOT NULL DEFAULT false,
      selected_goal TEXT,
      added_first_client BOOLEAN NOT NULL DEFAULT false,
      created_first_workout BOOLEAN NOT NULL DEFAULT false,
      assigned_first_workout BOOLEAN NOT NULL DEFAULT false,
      scheduled_first_session BOOLEAN NOT NULL DEFAULT false,
      logged_first_progress BOOLEAN NOT NULL DEFAULT false,
      sent_first_message BOOLEAN NOT NULL DEFAULT false,
      completed_product_tour BOOLEAN NOT NULL DEFAULT false,
      dismissed_feature_prompts TEXT[] DEFAULT ARRAY[]::TEXT[],
      onboarding_completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id
    ON user_onboarding_progress(user_id);
  `);

  console.log("✅ user_onboarding_progress table created successfully");
}

export async function down() {
  console.log("Dropping user_onboarding_progress table...");

  const db = await getDb();

  await db.execute(sql`DROP INDEX IF EXISTS idx_user_onboarding_user_id;`);
  await db.execute(sql`DROP TABLE IF EXISTS user_onboarding_progress;`);

  console.log("✅ user_onboarding_progress table dropped successfully");
}

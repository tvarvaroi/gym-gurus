import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration: Add role and trainerId fields to users table
 *
 * This migration enables the dual-sided app architecture by adding:
 * - role: 'trainer' or 'client' to differentiate user types
 * - trainerId: for clients to link to their trainer
 */
export async function up() {
  console.log("⬆️  Adding role and trainerId fields to users table...");

  const db = await getDb();

  // Add role column with default 'trainer' for existing users
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'trainer',
    ADD COLUMN IF NOT EXISTS trainer_id VARCHAR;
  `);

  // Add check constraint for role enum
  await db.execute(sql`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  await db.execute(sql`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('trainer', 'client'));
  `);

  // Add foreign key constraint for trainer_id (self-referencing)
  await db.execute(sql`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_trainer_id_fkey;
  `);

  await db.execute(sql`
    ALTER TABLE users
    ADD CONSTRAINT users_trainer_id_fkey
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE;
  `);

  // Create indexes for better query performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_users_trainer_id ON users(trainer_id);
  `);

  console.log("✅ User roles and trainer relationship added successfully");
}

export async function down() {
  console.log("⬇️  Removing role and trainerId fields from users table...");

  const db = await getDb();

  // Drop indexes
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_users_role;
  `);

  await db.execute(sql`
    DROP INDEX IF EXISTS idx_users_trainer_id;
  `);

  // Drop foreign key constraint
  await db.execute(sql`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_trainer_id_fkey;
  `);

  // Drop check constraint
  await db.execute(sql`
    ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  // Drop columns
  await db.execute(sql`
    ALTER TABLE users
    DROP COLUMN IF EXISTS trainer_id,
    DROP COLUMN IF EXISTS role;
  `);

  console.log("✅ User roles and trainer relationship removed successfully");
}

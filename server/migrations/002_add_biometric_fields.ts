import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function up(db: PostgresJsDatabase) {
  console.log("⬆️  Adding biometric fields to clients table...");

  await db.execute(sql`
    ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS height NUMERIC,
    ADD COLUMN IF NOT EXISTS weight NUMERIC,
    ADD COLUMN IF NOT EXISTS activity_level TEXT,
    ADD COLUMN IF NOT EXISTS neck_circumference NUMERIC,
    ADD COLUMN IF NOT EXISTS waist_circumference NUMERIC,
    ADD COLUMN IF NOT EXISTS hip_circumference NUMERIC;
  `);

  console.log("✅ Biometric fields added successfully");
}

export async function down(db: PostgresJsDatabase) {
  console.log("⬇️  Removing biometric fields from clients table...");

  await db.execute(sql`
    ALTER TABLE clients
    DROP COLUMN IF EXISTS age,
    DROP COLUMN IF EXISTS gender,
    DROP COLUMN IF EXISTS height,
    DROP COLUMN IF EXISTS weight,
    DROP COLUMN IF EXISTS activity_level,
    DROP COLUMN IF EXISTS neck_circumference,
    DROP COLUMN IF EXISTS waist_circumference,
    DROP COLUMN IF EXISTS hip_circumference;
  `);

  console.log("✅ Biometric fields removed successfully");
}

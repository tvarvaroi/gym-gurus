import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Migration: Add appointments table
 *
 * This migration adds a table to manage appointments between trainers and clients,
 * including training sessions, consultations, and check-ins.
 */
export async function up() {
  console.log("Creating appointments table...");

  const db = await getDb();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      type TEXT NOT NULL DEFAULT 'training',
      status TEXT NOT NULL DEFAULT 'scheduled',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_appointments_trainer_id
    ON appointments(trainer_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_appointments_client_id
    ON appointments(client_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_appointments_date
    ON appointments(date);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON appointments(status);
  `);

  console.log("✅ appointments table created successfully");
}

export async function down() {
  console.log("Dropping appointments table...");

  const db = await getDb();

  await db.execute(sql`DROP INDEX IF EXISTS idx_appointments_trainer_id;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_appointments_client_id;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_appointments_date;`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_appointments_status;`);
  await db.execute(sql`DROP TABLE IF EXISTS appointments;`);

  console.log("✅ appointments table dropped successfully");
}

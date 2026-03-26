import { sql } from 'drizzle-orm';
import { getDb } from '../db';

export async function up() {
  const db = await getDb();

  // Programs table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS programs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      goal VARCHAR(50) NOT NULL,
      experience_level VARCHAR(20) NOT NULL,
      duration_weeks INTEGER NOT NULL,
      days_per_week INTEGER NOT NULL,
      is_template BOOLEAN NOT NULL DEFAULT false,
      is_public BOOLEAN NOT NULL DEFAULT false,
      source VARCHAR(20) NOT NULL DEFAULT 'manual',
      tags JSONB DEFAULT '[]'::jsonb,
      cover_image VARCHAR,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP
    )
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_programs_creator_id ON programs(creator_id)`
  );
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_programs_goal ON programs(goal)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_programs_public ON programs(is_public)`);

  // Program Weeks table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS program_weeks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      program_id VARCHAR NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      label VARCHAR(100),
      notes TEXT,
      days JSONB NOT NULL
    )
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON program_weeks(program_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_program_weeks_order ON program_weeks(program_id, week_number)`
  );

  // Program Enrollments table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS program_enrollments (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      program_id VARCHAR NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      current_week INTEGER NOT NULL DEFAULT 1,
      current_day INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      started_at TIMESTAMP DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON program_enrollments(user_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_enrollments_program_id ON program_enrollments(program_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_enrollments_status ON program_enrollments(status)`
  );

  // Program Day Completions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS program_day_completions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      enrollment_id VARCHAR NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      completed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      workout_log_id VARCHAR
    )
  `);

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_day_completions_enrollment_id ON program_day_completions(enrollment_id)`
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_day_completions_enrollment_week ON program_day_completions(enrollment_id, week_number)`
  );

  console.log('[Migration 010] Program Builder tables created');
}

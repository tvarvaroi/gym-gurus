import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function up(db: PostgresJsDatabase) {
  console.log('⬆️  Converting workout_sessions.total_volume_kg from varchar to double precision...');

  await db.execute(sql`
    ALTER TABLE workout_sessions
    ALTER COLUMN total_volume_kg TYPE DOUBLE PRECISION
    USING COALESCE(total_volume_kg::double precision, 0);
  `);

  console.log('✅ workout_sessions.total_volume_kg is now double precision');
}

export async function down(db: PostgresJsDatabase) {
  console.log('⬇️  Reverting workout_sessions.total_volume_kg to varchar...');

  await db.execute(sql`
    ALTER TABLE workout_sessions
    ALTER COLUMN total_volume_kg TYPE VARCHAR
    USING total_volume_kg::text;
  `);

  console.log('✅ workout_sessions.total_volume_kg reverted to varchar');
}

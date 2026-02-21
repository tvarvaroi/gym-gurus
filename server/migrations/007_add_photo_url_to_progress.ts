import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function up(db: PostgresJsDatabase) {
  console.log('⬆️  Adding photo_url to progress_entries table...');

  await db.execute(sql`
    ALTER TABLE progress_entries
    ADD COLUMN IF NOT EXISTS photo_url TEXT;
  `);

  console.log('✅ photo_url column added successfully');
}

export async function down(db: PostgresJsDatabase) {
  console.log('⬇️  Removing photo_url from progress_entries table...');

  await db.execute(sql`
    ALTER TABLE progress_entries
    DROP COLUMN IF EXISTS photo_url;
  `);

  console.log('✅ photo_url column removed');
}

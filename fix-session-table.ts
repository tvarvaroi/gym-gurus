// Script to drop and recreate session table
import { neon } from '@neondatabase/serverless';

const DATABASE_URL =
  'postgresql://neondb_owner:npg_DxU1TrnZRS2k@ep-odd-base-agn1udbg-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixSessionTable() {
  console.log('Dropping existing session table and index...');

  try {
    // Drop index first if it exists
    await sql`DROP INDEX IF EXISTS "IDX_session_expire"`;
    console.log('✓ Dropped index IDX_session_expire');

    // Drop table if it exists
    await sql`DROP TABLE IF EXISTS "session"`;
    console.log('✓ Dropped table session');

    console.log('\n✅ Session table cleanup complete!');
    console.log('The table will be automatically recreated when the server starts.');
  } catch (error) {
    console.error('Error:', error);
  }

  process.exit(0);
}

fixSessionTable();

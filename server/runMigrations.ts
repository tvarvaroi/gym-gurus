import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db';
import { sql } from 'drizzle-orm';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Simple migration runner for SQL files
 * Runs all .sql files in the migrations directory in order
 */

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const db = await getDb();
  const migrationsDir = join(__dirname, 'migrations');

  try {
    // Get all SQL files in migrations directory
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical order (001_, 002_, 003_)

    console.log(`Found ${files.length} migration files:\n`);

    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);

      const filePath = join(migrationsDir, file);
      const migrationSQL = readFileSync(filePath, 'utf-8');

      // Execute the migration
      await db.execute(sql.raw(migrationSQL));

      console.log(`✅ Completed: ${file}\n`);
    }

    console.log('🎉 All migrations completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n⚠️  Database may be in an inconsistent state!');
    console.error('Please review the error and fix manually or restore from backup.\n');
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

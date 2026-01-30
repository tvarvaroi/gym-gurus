/**
 * Simple migration runner for GymGurus
 *
 * Usage:
 *   npm run migrate:up    - Run the migration
 *   npm run migrate:down  - Rollback the migration
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env file manually BEFORE importing anything else
try {
  const envPath = join(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  const envVars = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));

  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value) {
      process.env[key.trim()] = value;
    }
  });

  console.log('✅ Loaded environment variables from .env file');
} catch (error) {
  console.warn('⚠️ Could not load .env file:', (error as Error).message);
}

const command = process.argv[2];

async function runMigration() {
  try {
    // Get migration file from command line argument or use latest
    const migrationFile = process.argv[3] || "003_add_user_roles";

    console.log(`📁 Loading migration: ${migrationFile}`);

    // Dynamically import migrations AFTER environment variables are loaded
    const { up, down } = await import(`./migrations/${migrationFile}.js`);

    if (command === "up") {
      console.log("Running migration UP...");
      await up();
      console.log("✅ Migration completed successfully");
    } else if (command === "down") {
      console.log("Running migration DOWN...");
      await down();
      console.log("✅ Rollback completed successfully");
    } else {
      console.error("❌ Invalid command. Use 'up' or 'down'");
      console.log("Usage: npm run migrate:up [migration-file]");
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();

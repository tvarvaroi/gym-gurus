// Load .env file before anything else
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  const envVars = envFile.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

  envVars.forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  // .env file is optional
}

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { logger } from './logger';

function getRawConnectionString(): string {
  if (process.env.DATABASE_URL) {
    logger.info('Using DATABASE_URL for database connection');
    return process.env.DATABASE_URL;
  }

  // Construct from PG* variables if available
  if (
    process.env.PGHOST &&
    process.env.PGUSER &&
    process.env.PGPASSWORD &&
    process.env.PGDATABASE
  ) {
    const host = process.env.PGHOST;
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    const database = process.env.PGDATABASE;
    const port = process.env.PGPORT || '5432';

    logger.info('Constructing database URL from PG* environment variables');
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  throw new Error(
    'No database connection string found. Please set DATABASE_URL or PG* environment variables.'
  );
}

async function tryConnect(connectionString: string, ssl: any, label: string): Promise<Pool | null> {
  const maskedUrl = connectionString.replace(/:[^@]+@/, ':****@');
  console.log(`[DB DEBUG] Attempt: ${label}`);
  console.log(`[DB DEBUG] Connecting to: ${maskedUrl}`);
  console.log(`[DB DEBUG] SSL config: ${JSON.stringify(ssl)}`);

  const pgPool = new Pool({
    connectionString,
    ssl,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 60000,
    max: 20,
    min: 2,
    statement_timeout: 30000,
    application_name: 'gymgurus',
  });

  try {
    await pgPool.query('SELECT 1');
    console.log(`[DB DEBUG] SUCCESS with: ${label}`);
    return pgPool;
  } catch (err: any) {
    console.log(`[DB DEBUG] FAILED with: ${label} — ${err.message}`);
    await pgPool.end().catch(() => {});
    return null;
  }
}

let pool: Pool;
let db: ReturnType<typeof drizzle>;

async function initializeDatabase(): Promise<boolean> {
  logger.info('Attempting database connection...');

  const rawUrl = getRawConnectionString();

  // Attempt 1: SSL enabled (rejectUnauthorized: false), no sslmode in URL
  let pgPool = await tryConnect(
    rawUrl,
    { rejectUnauthorized: false },
    'ssl=true, no sslmode in URL'
  );

  // Attempt 2: No SSL at all
  if (!pgPool) {
    pgPool = await tryConnect(rawUrl, false, 'ssl=false');
  }

  if (!pgPool) {
    logger.error('All connection attempts failed.');
    logger.error('The application will continue running, but database operations will fail.');
    return false;
  }

  pool = pgPool;
  db = drizzle(pool, { schema });

  pool.on('error', (err) => {
    logger.error('PostgreSQL pool error:', err);
  });

  logger.info('Connected using standard PostgreSQL driver');
  return true;
}

// Initialize database connection
let connectionEstablished = false;
let connectionPromise: Promise<boolean> | null = null;

async function ensureConnection() {
  if (!connectionPromise) {
    connectionPromise = initializeDatabase().then((result) => {
      connectionEstablished = result;
      if (!connectionEstablished) {
        logger.error('Could not establish database connection');
      }
      return result;
    });
  }
  return await connectionPromise;
}

// Test connection on startup and log table info
async function testConnection() {
  try {
    const connected = await ensureConnection();
    if (!connected) return;

    logger.info('Database connection established successfully');

    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      LIMIT 10
    `);

    if (tablesResult.rows.length === 0) {
      logger.warn('No tables found. Run: npm run db:push');
    } else {
      logger.info('Found tables:', {
        tables: tablesResult.rows.map((r: any) => r.table_name).join(', '),
      });
    }
  } catch (error: any) {
    logger.error('Database connection test failed:', error);
  }
}

// Test connection on startup but don't block the app
testConnection().catch((err) => logger.error('Test connection failed:', err));

export async function getDb() {
  await ensureConnection();
  if (!db) {
    throw new Error('Database not initialized. Connection may have failed.');
  }
  return db;
}

export async function getPool() {
  await ensureConnection();
  if (!pool) {
    throw new Error('Database pool not initialized. Connection may have failed.');
  }
  return pool;
}

export { db, pool };

// Load .env file before anything else
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  const envVars = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));

  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  });
} catch (error) {
  // .env file is optional
}

import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import { logger } from './logger';

// Configure Neon
neonConfig.webSocketConstructor = ws;

// Construct DATABASE_URL from available sources
function getConnectionString(): string {
  // First, check for REPLIT_DB_URL (new Replit database) - but only if it's a PostgreSQL URL
  if (process.env.REPLIT_DB_URL && process.env.REPLIT_DB_URL.startsWith('postgresql://')) {
    logger.info('Using REPLIT_DB_URL for database connection');
    return process.env.REPLIT_DB_URL;
  }

  // Then, check for DATABASE_URL
  if (process.env.DATABASE_URL) {
    logger.info('Using DATABASE_URL for database connection');
    return process.env.DATABASE_URL;
  }
  
  // Construct from PG* variables if available
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const host = process.env.PGHOST;
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    const database = process.env.PGDATABASE;
    const port = process.env.PGPORT || '5432';
    
    // Check if it's a Neon host
    const isNeon = host.includes('neon.tech');
    const sslMode = isNeon ? '?sslmode=require' : '';

    logger.info('Constructing database URL from PG* environment variables');
    return `postgresql://${user}:${password}@${host}:${port}/${database}${sslMode}`;
  }
  
  throw new Error(
    "No database connection string found. Please set REPLIT_DB_URL, DATABASE_URL, or PG* environment variables.",
  );
}

// Determine if we should use Neon or standard pg based on connection success
let isNeonEnabled = true;
let pool: NeonPool | PgPool;
let db: any;

// Try to connect with Neon first
async function initializeDatabase() {
  logger.info('Attempting database connection...');

  const connectionString = getConnectionString();
  logger.debug('Connection string:', connectionString.replace(/:[^@]+@/, ':***@')); // Log URL with masked password
  
  // Check if this is a Neon URL
  const isNeonUrl = connectionString.includes('neon.tech');
  
  // First, try Neon if it's a Neon URL
  if (isNeonUrl) {
    // Try with multiple attempts to wake up the endpoint
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug(`Neon connection attempt ${attempt}/${maxAttempts}...`);
        const neonPool = new NeonPool({
          connectionString,
          connectionTimeoutMillis: 10000 * attempt, // Increase timeout with each attempt
          idleTimeoutMillis: 60000,  // 60s idle before reclaim
          max: 20,
          min: 2,                    // Keep warm connections
          application_name: 'gymgurus',
        });

        // Test Neon connection
        await neonPool.query('SELECT 1');
        logger.info('Connected using Neon driver');
        pool = neonPool;
        db = drizzle({ client: pool, schema });
        isNeonEnabled = true;

        // Set up error handler for Neon pool
        neonPool.on('error', (err) => {
          logger.error('Neon pool error:', err);
          if (err.message.includes('endpoint has been disabled')) {
            logger.warn('Switching to standard PostgreSQL driver...');
            fallbackToStandardPg();
          }
        });

        return true;
      } catch (neonError: any) {
        logger.warn(`Neon connection attempt ${attempt} failed:`, neonError);
        if (attempt < maxAttempts) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
      }
    }
  }
  
  // Fall back to standard PostgreSQL driver
  return fallbackToStandardPg();
}

// Fallback to standard PostgreSQL driver
async function fallbackToStandardPg() {
  try {
    logger.info('Attempting connection with standard PostgreSQL driver...');

    // Get connection string
    const connectionString = getConnectionString();

    const pgPool = new PgPool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') ? {
        rejectUnauthorized: false
      } : undefined,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,     // 60s idle before reclaim
      max: 20,
      min: 2,                       // Keep warm connections
      statement_timeout: 30000,     // 30s query timeout prevents runaway queries
      application_name: 'gymgurus',
    });

    // Test standard pg connection
    await pgPool.query('SELECT 1');
    logger.info('Connected using standard PostgreSQL driver');

    pool = pgPool;
    db = pgDrizzle(pool, { schema });
    isNeonEnabled = false;

    // Set up error handler for pg pool
    pgPool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    return true;
  } catch (pgError: any) {
    logger.error('Standard PostgreSQL connection also failed', pgError);
    logger.error('The application will continue running, but database operations will fail.');
    logger.error('Please check your database configuration and ensure the database is accessible.');
    return false;
  }
}

// Initialize database connection
let connectionEstablished = false;
let connectionPromise: Promise<boolean> | null = null;

async function ensureConnection() {
  if (!connectionPromise) {
    connectionPromise = initializeDatabase().then(result => {
      connectionEstablished = result;
      if (!connectionEstablished) {
        logger.error('Could not establish database connection');
      }
      return result;
    });
  }
  return await connectionPromise;
}

// Test database connection and check tables
async function testConnection() {
  try {
    const connected = await ensureConnection();

    if (!connected) {
      logger.error('Could not establish database connection');
      return;
    }

    logger.info('Database connection established successfully');
    logger.info(`Using driver: ${isNeonEnabled ? 'Neon' : 'Standard PostgreSQL'}`);

    // Try to check if tables exist
    try {
      const tablesResult = await (pool as any).query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        LIMIT 10
      `);

      if (tablesResult.rows.length === 0) {
        logger.warn('No tables found. Database migration needed.');
        logger.info('Run: npm run db:push --force');
      } else {
        logger.info('Found tables:', { tables: tablesResult.rows.map((r: any) => r.table_name).join(', ') });
      }
    } catch (tableError: any) {
      logger.error('Could not query tables:', tableError);
    }
  } catch (error: any) {
    logger.error('Database connection test failed:', error);
  }
}

// Test connection on startup but don't block the app
testConnection().catch((err) => logger.error('Test connection failed:', err));

// Export a function to get the database instance
export async function getDb() {
  await ensureConnection();
  if (!db) {
    throw new Error('Database not initialized. Connection may have failed.');
  }
  return db;
}

// Export pool for direct queries if needed
export async function getPool() {
  await ensureConnection();
  if (!pool) {
    throw new Error('Database pool not initialized. Connection may have failed.');
  }
  return pool;
}

// Export db for backward compatibility (will be initialized after first connection)
export { db, pool };
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon
neonConfig.webSocketConstructor = ws;

// Construct DATABASE_URL from available sources
function getConnectionString(): string {
  // First, check for REPLIT_DB_URL (new Replit database) - but only if it's a PostgreSQL URL
  if (process.env.REPLIT_DB_URL && process.env.REPLIT_DB_URL.startsWith('postgresql://')) {
    console.log('📌 Using REPLIT_DB_URL for database connection');
    return process.env.REPLIT_DB_URL;
  }
  
  // Then, check for DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('📌 Using DATABASE_URL for database connection');
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
    
    console.log('📌 Constructing database URL from PG* environment variables');
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
  console.log('🔍 Attempting database connection...');
  
  const connectionString = getConnectionString();
  console.log('📝 Connection string:', connectionString.replace(/:[^@]+@/, ':***@')); // Log URL with masked password
  
  // Check if this is a Neon URL
  const isNeonUrl = connectionString.includes('neon.tech');
  
  // First, try Neon if it's a Neon URL
  if (isNeonUrl) {
    // Try with multiple attempts to wake up the endpoint
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Neon connection attempt ${attempt}/${maxAttempts}...`);
        const neonPool = new NeonPool({ 
          connectionString,
          connectionTimeoutMillis: 10000 * attempt, // Increase timeout with each attempt
          idleTimeoutMillis: 30000,
          max: 20,
        });
    
        // Test Neon connection
        await neonPool.query('SELECT 1');
        console.log('✅ Connected using Neon driver');
        pool = neonPool;
        db = drizzle({ client: pool, schema });
        isNeonEnabled = true;
        
        // Set up error handler for Neon pool
        neonPool.on('error', (err) => {
          console.error('Neon pool error:', err.message);
          if (err.message.includes('endpoint has been disabled')) {
            console.error('⚠️  Switching to standard PostgreSQL driver...');
            fallbackToStandardPg();
          }
        });
        
        return true;
      } catch (neonError: any) {
        console.log(`⚠️  Neon connection attempt ${attempt} failed:`, neonError.message);
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
    console.log('🔄 Attempting connection with standard PostgreSQL driver...');
    
    // Get connection string
    const connectionString = getConnectionString();
    
    const pgPool = new PgPool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') ? {
        rejectUnauthorized: false
      } : undefined,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 20,
    });
    
    // Test standard pg connection
    await pgPool.query('SELECT 1');
    console.log('✅ Connected using standard PostgreSQL driver');
    
    pool = pgPool;
    db = pgDrizzle(pool, { schema });
    isNeonEnabled = false;
    
    // Set up error handler for pg pool
    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
    
    return true;
  } catch (pgError: any) {
    console.error('❌ Standard PostgreSQL connection also failed:', pgError.message);
    console.error('⚠️  The application will continue running, but database operations will fail.');
    console.error('⚠️  Please check your database configuration and ensure the database is accessible.');
    return false;
  }
}

// Initialize database connection
let connectionEstablished = false;

async function ensureConnection() {
  if (!connectionEstablished) {
    connectionEstablished = await initializeDatabase();
  }
  return connectionEstablished;
}

// Test database connection and check tables
async function testConnection() {
  try {
    const connected = await ensureConnection();
    
    if (!connected) {
      console.error('❌ Could not establish database connection');
      return;
    }
    
    console.log('✅ Database connection established successfully');
    console.log(`📊 Using driver: ${isNeonEnabled ? 'Neon' : 'Standard PostgreSQL'}`);
    
    // Try to check if tables exist
    try {
      const tablesResult = await (pool as any).query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        LIMIT 10
      `);
      
      if (tablesResult.rows.length === 0) {
        console.log('📋 No tables found. Database migration needed.');
        console.log('💡 Run: npm run db:push --force');
      } else {
        console.log('📋 Found tables:', tablesResult.rows.map((r: any) => r.table_name).join(', '));
      }
    } catch (tableError: any) {
      console.error('⚠️  Could not query tables:', tableError.message);
    }
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error.message);
  }
}

// Test connection on startup but don't block the app
testConnection().catch(console.error);

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
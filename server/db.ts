import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with connection timeout and retry settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Add error handler for pool
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
  if (err.message.includes('endpoint has been disabled')) {
    console.error('⚠️  Neon database endpoint is disabled. The database needs to be awakened from the Neon dashboard.');
    console.error('⚠️  The app will continue to run but database operations will fail until the endpoint is re-enabled.');
  }
});

export const db = drizzle({ client: pool, schema });

// Test database connection on startup
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection established successfully');
    
    // Try to check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 5
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('📋 No tables found. Database migration may be needed.');
    } else {
      console.log('📋 Found tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    }
  } catch (error: any) {
    console.error('❌ Initial database connection failed:', error.message);
    if (error.message.includes('endpoint has been disabled')) {
      console.error('⚠️  The Neon database endpoint is currently disabled.');
      console.error('⚠️  Please wake up the database from the Neon dashboard at https://console.neon.tech');
      console.error('⚠️  The application will continue running, but database operations will fail.');
    }
  }
}

// Test connection on startup but don't block the app
testConnection().catch(console.error);

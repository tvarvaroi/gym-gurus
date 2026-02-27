// Load .env file before any other imports
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
      console.log(`[ENV] Loaded ${key.trim()} from .env file`);
    }
  });
  console.log('[ENV] Successfully loaded .env file');
} catch (error) {
  // .env file is optional, only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[ENV] No .env file found, using system environment variables');
  }
}

import { fileURLToPath } from 'url';
import express, { type Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { env, isDevelopment, isProduction } from './env';
import { initSentry } from './sentry';
import { csrfCookieSetter, csrfProtection } from './middleware/csrf';
import { sanitizeInput } from './middleware/sanitize';
import { globalErrorHandler } from './middleware/errors';
import webhookRoutes from './routes/webhooks';

// Initialize Sentry error monitoring (production only)
initSentry();

const app = express();

// Trust Railway's reverse proxy so req.secure, req.ip, and cookies work correctly
app.set('trust proxy', 1);

// Skip middleware for WebSocket connections (Vite HMR)
const skipForWebSocket = (middleware: any) => (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.upgrade === 'websocket') return next();
  return middleware(req, res, next);
};

// Security headers with Helmet (skip for WebSocket connections)
app.use(
  skipForWebSocket(
    helmet({
      contentSecurityPolicy: isDevelopment
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          },
      crossOriginEmbedderPolicy: !isDevelopment,
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  )
);

// Add compression middleware for all responses
app.use(
  compression({
    filter: (req, res) => {
      // Don't compress responses that are already compressed
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use default filter function
      return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9, higher = more compression)
    threshold: 1024, // Only compress responses larger than 1KB
  })
);

// Stripe webhooks need raw body for signature verification — mount BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session management with PostgreSQL store
const PgSession = connectPgSimple(session);
const sessionPool = new pg.Pool({
  connectionString: env.DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Railway PostgreSQL
});

app.use(
  skipForWebSocket(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: false, // We create the table ourselves in startup (see below)
        pruneSessionInterval: 60, // Prune expired sessions every 60 seconds
      }),
      secret: env.SESSION_SECRET || process.env.SESSION_SECRET || 'fallback-secret-for-dev',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction, // HTTPS only in production
        httpOnly: true, // Prevent XSS access to cookie
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax', // CSRF protection
      },
      name: 'gymgurus.sid', // Custom cookie name
    })
  )
);

// Server-side input sanitization — strips XSS payloads from all request bodies
app.use(skipForWebSocket(sanitizeInput));

// CSRF protection — Double Submit Cookie pattern
// Set CSRF cookie on every response
app.use(skipForWebSocket(csrfCookieSetter));
// Validate CSRF token on state-changing requests (exclude Stripe webhooks)
app.use(
  '/api',
  skipForWebSocket(
    csrfProtection(['/api/webhooks/stripe', '/api/callback', '/api/analytics/web-vitals'])
  )
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure the session table and index exist before any requests are handled.
  // We do this ourselves (instead of createTableIfMissing) because connect-pg-simple
  // uses CREATE INDEX without IF NOT EXISTS, which throws error 42P07 if the index
  // already exists — crashing every request with "Internal Server Error".
  try {
    await sessionPool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      )
    `);
    await sessionPool.query(
      `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`
    );
    log('Session table ready');
  } catch (err) {
    console.error('[Session] Failed to ensure session table exists:', err);
  }

  // Seed: ensure test account has Ronin AI subscription for QA testing
  try {
    const seedResult = await sessionPool.query(
      `UPDATE users
       SET subscription_tier = 'solo_ai',
           subscription_status = 'active'
       WHERE email = 'test@test.com'
         AND (subscription_tier IS DISTINCT FROM 'solo_ai'
              OR subscription_status IS DISTINCT FROM 'active')
       RETURNING id`
    );
    if (seedResult.rowCount && seedResult.rowCount > 0) {
      log('Seed: test@test.com upgraded to Ronin AI (solo_ai/active)');
    }
  } catch (err) {
    // Non-fatal — table may not exist yet
    console.error('[Seed] Failed to update test account subscription:', err);
  }

  // Run startup migrations to ensure schema is in sync
  try {
    const { getPool } = await import('./db');
    const pool = await getPool();
    const migrations = [
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS workout_name varchar',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS workout_type varchar',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS planned_duration_minutes integer',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS actual_duration_minutes integer',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS total_sets integer',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS total_reps integer',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS total_volume_kg varchar',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS perceived_exertion integer',
      'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS notes text',
      `CREATE TABLE IF NOT EXISTS saved_meal_plans (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        target_calories integer,
        plan_data jsonb NOT NULL,
        source varchar NOT NULL DEFAULT 'generator',
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_saved_meal_plans_user_id ON saved_meal_plans(user_id)',
    ];
    for (const stmt of migrations) {
      await pool.query(stmt);
    }
    console.log('[Migration] Startup schema sync complete');
  } catch (err) {
    console.error('[Migration] Startup migration failed (non-fatal):', err);
  }

  const server = await registerRoutes(app);

  // Global error handler — structured error responses, DB error handling, env-aware
  app.use(globalErrorHandler);

  // Serve static files from client/public in development too
  // This needs to be before setupVite to avoid catch-all route interference
  if (isDevelopment) {
    const path = await import('path');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.resolve(__dirname, '..', 'client', 'public')));
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = env.PORT;
  const listenOptions: any = {
    port,
    host: '0.0.0.0',
  };

  // reusePort is not supported on Windows
  if (process.platform !== 'win32') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();

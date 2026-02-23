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
});

app.use(
  skipForWebSocket(
    session({
      store: new PgSession({
        pool: sessionPool,
        tableName: 'session', // Default table name
        createTableIfMissing: true, // Auto-create on first run
        pruneSessionInterval: false, // Disable automatic cleanup to avoid index conflicts
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

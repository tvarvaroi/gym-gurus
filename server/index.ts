// Load .env file before any other imports
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

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { env, isDevelopment, isProduction } from "./env";
import { initSentry } from "./sentry";
import { csrfCookieSetter, csrfProtection } from "./middleware/csrf";
import { sanitizeInput } from "./middleware/sanitize";

// Initialize Sentry error monitoring (production only)
initSentry();

const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: !isDevelopment,
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
}));

// Add compression middleware for all responses
app.use(compression({
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
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Server-side input sanitization — strips XSS payloads from all request bodies
app.use(sanitizeInput);

// CSRF protection — Double Submit Cookie pattern
// Set CSRF cookie on every response
app.use(csrfCookieSetter);
// Validate CSRF token on state-changing requests (exclude Stripe webhooks)
app.use('/api', csrfProtection(['/api/webhooks/stripe', '/api/callback']));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static files from client/public in development too
  // This needs to be before setupVite to avoid catch-all route interference
  if (isDevelopment) {
    const path = await import("path");
    app.use(express.static(path.resolve(import.meta.dirname, "..", "client", "public")));
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
    host: "0.0.0.0",
  };

  // reusePort is not supported on Windows
  if (process.platform !== 'win32') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();

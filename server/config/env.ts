import { z } from 'zod';

// =============================================================================
// GymGurus — Environment Variable Validator
// =============================================================================
// Validates all environment variables on startup and exports a typed config
// object. The app fails fast with clear error messages if required vars are
// missing. Optional vars produce warnings so operators know which features
// are disabled.
// =============================================================================

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const requiredEnvSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number).pipe(z.number().min(1).max(65535)),

  // Database — at least DATABASE_URL or PG* vars must be present
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGPORT: z.string().default('5432').transform(Number).pipe(z.number().min(1).max(65535)),
  REPLIT_DB_URL: z.string().optional(),

  // Session
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
});

const optionalEnvSchema = z.object({
  // Application
  APP_URL: z.string().optional(),

  // Email Service (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // OAuth (Google)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // AI (Anthropic Claude)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Stripe Payments
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Analytics (client-side, exposed via Vite)
  VITE_GA_MEASUREMENT_ID: z.string().optional(),

  // Media Generation
  FAL_KEY: z.string().optional(),

  // Error Monitoring
  SENTRY_DSN: z.string().optional(),

  // Redis session store
  REDIS_URL: z.string().optional(),

  // Replit platform (auto-populated)
  REPL_ID: z.string().optional(),
  REPLIT_DOMAINS: z.string().optional(),
  ISSUER_URL: z.string().optional(),
});

const envSchema = requiredEnvSchema.merge(optionalEnvSchema);

export type EnvConfig = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Feature flags derived from optional vars
// ---------------------------------------------------------------------------

export interface FeatureFlags {
  ai: boolean;
  payments: boolean;
  analytics: boolean;
  mediaGeneration: boolean;
  errorMonitoring: boolean;
  redisSession: boolean;
  replitAuth: boolean;
}

function deriveFeatureFlags(config: EnvConfig): FeatureFlags {
  return {
    ai: !!config.ANTHROPIC_API_KEY,
    payments: !!config.STRIPE_SECRET_KEY,
    analytics: !!config.VITE_GA_MEASUREMENT_ID,
    mediaGeneration: !!config.FAL_KEY,
    errorMonitoring: !!config.SENTRY_DSN,
    redisSession: !!config.REDIS_URL,
    replitAuth: !!(config.REPL_ID && config.ISSUER_URL && config.REPLIT_DOMAINS),
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function printBanner(title: string): void {
  const line = '='.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

function validateDatabaseConfig(config: EnvConfig): void {
  const hasConnectionString = !!config.DATABASE_URL || !!config.REPLIT_DB_URL;
  const hasPgVars = !!(config.PGHOST && config.PGUSER && config.PGPASSWORD && config.PGDATABASE);

  if (!hasConnectionString && !hasPgVars) {
    if (config.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL is required in production. ' +
          'Set DATABASE_URL, REPLIT_DB_URL, or individual PG* variables.'
      );
    }
    console.warn(
      '  [WARN] No database connection configured. ' +
        'Set DATABASE_URL or individual PG* variables.'
    );
  }
}

function validateSessionSecret(config: EnvConfig): void {
  const defaultSecret = 'dev-secret-key-change-in-production-min-32-chars';
  if (config.NODE_ENV === 'production' && config.SESSION_SECRET === defaultSecret) {
    throw new Error(
      'SESSION_SECRET must not use the default dev value in production. ' +
        'Generate a secure secret: openssl rand -base64 48'
    );
  }
}

function warnOptionalVars(config: EnvConfig): void {
  const optionalWarnings: Array<{ key: string; feature: string; set: boolean }> = [
    {
      key: 'ANTHROPIC_API_KEY',
      feature: 'AI coaching & workout suggestions',
      set: !!config.ANTHROPIC_API_KEY,
    },
    {
      key: 'STRIPE_SECRET_KEY',
      feature: 'Payment processing',
      set: !!config.STRIPE_SECRET_KEY,
    },
    {
      key: 'STRIPE_WEBHOOK_SECRET',
      feature: 'Stripe webhook verification',
      set: !!config.STRIPE_WEBHOOK_SECRET,
    },
    {
      key: 'VITE_GA_MEASUREMENT_ID',
      feature: 'Google Analytics',
      set: !!config.VITE_GA_MEASUREMENT_ID,
    },
    {
      key: 'FAL_KEY',
      feature: 'AI media generation',
      set: !!config.FAL_KEY,
    },
    {
      key: 'SENTRY_DSN',
      feature: 'Error monitoring (Sentry)',
      set: !!config.SENTRY_DSN,
    },
    {
      key: 'REDIS_URL',
      feature: 'Redis session store',
      set: !!config.REDIS_URL,
    },
  ];

  const missing = optionalWarnings.filter((w) => !w.set);
  if (missing.length > 0) {
    console.log('  Optional environment variables not set:');
    for (const w of missing) {
      console.log(`    - ${w.key}: ${w.feature} (disabled)`);
    }
    console.log('');
  }

  const present = optionalWarnings.filter((w) => w.set);
  if (present.length > 0) {
    console.log('  Enabled features:');
    for (const w of present) {
      console.log(`    + ${w.key}: ${w.feature}`);
    }
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

function validateEnv(): { config: EnvConfig; features: FeatureFlags } {
  printBanner('GymGurus — Environment Configuration');

  // Parse with zod
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('  FATAL: Environment validation failed.\n');
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      console.error(`    [ERROR] ${path}: ${issue.message}`);
    }
    console.error('\n  Hint: Copy .env.example to .env and fill in required values.\n');
    process.exit(1);
  }

  const config = result.data;

  // Additional cross-field validations
  try {
    validateDatabaseConfig(config);
    validateSessionSecret(config);
  } catch (err) {
    console.error(`  FATAL: ${(err as Error).message}\n`);
    process.exit(1);
  }

  // Log environment
  console.log(`  Environment : ${config.NODE_ENV}`);
  console.log(`  Port        : ${config.PORT}`);
  console.log(
    `  Database    : ${config.DATABASE_URL ? 'CONNECTION STRING' : config.PGHOST ? 'PG VARS' : config.REPLIT_DB_URL ? 'REPLIT DB' : 'NOT SET'}`
  );
  console.log('');

  // Warn about optional vars
  warnOptionalVars(config);

  const features = deriveFeatureFlags(config);

  printBanner('Environment OK — Starting server');

  return { config, features };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const validated = validateEnv();

/**
 * Typed, validated environment configuration.
 * Use this instead of raw `process.env` for type safety.
 */
export const envConfig = validated.config;

/**
 * Feature flags derived from which optional env vars are set.
 * Use these to conditionally enable functionality.
 *
 * @example
 * if (features.ai) {
 *   // register AI routes
 * }
 */
export const features = validated.features;

/**
 * Convenience helpers
 */
export const isDev = envConfig.NODE_ENV === 'development';
export const isProd = envConfig.NODE_ENV === 'production';
export const isTest = envConfig.NODE_ENV === 'test';

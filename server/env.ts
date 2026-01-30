import { z } from 'zod';

/**
 * Environment variable schema with validation and defaults
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number).pipe(z.number().min(1).max(65535)),

  // Database Configuration (at least one method must be provided)
  DATABASE_URL: z.string().url().optional(),
  REPLIT_DB_URL: z.string().url().optional(),
  PGHOST: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGPORT: z.string().default('5432').transform(Number).pipe(z.number().min(1).max(65535)),

  // Replit Configuration
  REPL_ID: z.string().optional(),

  // Session Configuration
  SESSION_SECRET: z.string().min(32).default('dev-secret-key-change-in-production-min-32-chars'),
}).refine(
  (data) => {
    // In production, SESSION_SECRET must not be the default dev secret
    if (data.NODE_ENV === 'production' && data.SESSION_SECRET === 'dev-secret-key-change-in-production-min-32-chars') {
      return false;
    }
    return true;
  },
  {
    message: 'SESSION_SECRET must be set to a secure value in production (not the default dev secret)',
    path: ['SESSION_SECRET'],
  }
).refine(
  (data) => {
    // At least one database connection method must be provided
    const hasDatabase = !!(
      data.DATABASE_URL ||
      data.REPLIT_DB_URL ||
      (data.PGHOST && data.PGUSER && data.PGPASSWORD && data.PGDATABASE)
    );

    if (data.NODE_ENV === 'production' && !hasDatabase) {
      return false;
    }

    return true;
  },
  {
    message: 'At least one database connection method must be configured (DATABASE_URL, REPLIT_DB_URL, or PG* variables)',
    path: ['DATABASE_URL'],
  }
);

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and parses environment variables
 * Throws an error if validation fails with detailed error messages
 */
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => {
        const path = err.path.join('.');
        return `  ❌ ${path}: ${err.message}`;
      });

      console.error('❌ Environment validation failed:\n');
      console.error(errorMessages.join('\n'));
      console.error('\n💡 Please check your .env file or environment variables.\n');

      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();

/**
 * Helper to check if running in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if running in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

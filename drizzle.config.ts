import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL, ensure the database is provisioned');
}

export default defineConfig({
  out: './migrations',
  schema: './shared/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Railway Postgres requires SSL but uses a private CA.
    // Passing ssl object directly is more reliable than URL sslmode params.
    ssl: { rejectUnauthorized: false },
  },
});

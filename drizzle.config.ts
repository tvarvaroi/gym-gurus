import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL, ensure the database is provisioned');
}

// Railway Postgres requires SSL. Force sslmode=require if not already in the URL.
// The runtime db pools use ssl: { rejectUnauthorized: false } individually.
const rawUrl = process.env.DATABASE_URL;
const dbUrl =
  rawUrl.includes('sslmode') || rawUrl.includes('ssl=')
    ? rawUrl
    : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'sslmode=require';

export default defineConfig({
  out: './migrations',
  schema: './shared/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});

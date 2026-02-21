import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL, ensure the database is provisioned');
}

// Railway Postgres requires SSL. Append sslmode if not already in the URL.
const rawUrl = process.env.DATABASE_URL;
const dbUrl =
  rawUrl.includes('sslmode') || rawUrl.includes('ssl=')
    ? rawUrl
    : rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'sslmode=no-verify';

export default defineConfig({
  out: './migrations',
  schema: './shared/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});

# Stack — Backend

Self-contained reference for every backend library in use.

## Web Framework

- **Express.js** `^4.21.2` — HTTP server. Entry point: `server/index.ts`.
- Middleware order in `server/index.ts` is critical — especially for Stripe webhooks (raw body must come before JSON parser).

## Database

- **Drizzle ORM** `^0.39.1` — always use Drizzle, never raw SQL.
  - Schema: `shared/schema.ts` — **do not touch without a migration**
  - Migrations: `server/migrations/` (NOT `drizzle/migrations/`)
  - Generate migration: `npx drizzle-kit generate`
  - Apply migration: `npx drizzle-kit migrate`
  - `drizzle-kit` `^0.30.4`
- **PostgreSQL** via **@neondatabase/serverless** `^0.10.4` — Neon serverless driver.
  - Connection string from `DATABASE_URL` env var.
- **pg** `^8.16.3` — also present for session store.

## Payments

- **Stripe** `^18.5.0` — subscriptions and webhooks.
  - Webhook route: `server/routes/webhooks.ts` — **do not touch middleware order**
  - Always verify Stripe signature before processing.
  - `STRIPE_WEBHOOK_SECRET` must be set in Railway env.

## File / Image Processing

- **multer** `^2.0.2` — multipart form handling. `memoryStorage()` only — no disk writes.
- **@imgly/background-removal-node** `^1.4.5` — server-side BG removal. Model cached after first call (~30s).
  - Pass raw `req.file.buffer` directly — **zero pre-processing before this step**
- **sharp** `^0.34.5` — image processing after BG removal.
  - After BG removal: `.trim().png().toBuffer()` strips transparent edges.
  - Then `uploadImage()` resizes to 1024px and converts to WebP.
- **@aws-sdk/client-s3** `^3.995.0` — Cloudflare R2 (S3-compatible) uploads.

## AI

- **Anthropic Claude API** — via `server/services/aiService.ts`.
  - `ANTHROPIC_API_KEY` — server-side only, never expose to client.

## Related Notes

- [[file-upload-pipeline]]
- [[stack-infrastructure]]

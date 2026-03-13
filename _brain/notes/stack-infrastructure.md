# Stack — Infrastructure

## Hosting

- **Railway** — auto-deploys from `main` branch via GitHub integration.
  - Build: Nixpacks (detects Node.js automatically)
  - Deploy time: ~12 minutes from push to live
  - **Gotcha**: Small commits can sometimes serve stale builds. A trivial follow-up push forces a clean Nixpacks rebuild.
  - Health check: `GET /api/health` — returns `{ status: 'ok' }`
  - Rollback: Railway dashboard → previous deploy → Redeploy

## Database

- **Neon PostgreSQL** — serverless Postgres. Connection via `DATABASE_URL`.
  - Pooled connection string for production. Unpooled for migrations.

## Storage — Cloudflare R2

- S3-compatible object storage. Used for profile images.
- Bucket structure: `profiles/`, `progress/`, `exercises/`
- Files stored as WebP (after sharp conversion), 1024px max width.
- Public URL pattern: `${CLOUDFLARE_R2_PUBLIC_URL}/profiles/<uuid>.webp`
- When R2 is not configured: falls back to base64 data URLs (dev/testing only).
- Required env vars:
  - `CLOUDFLARE_R2_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET`
  - `CLOUDFLARE_R2_PUBLIC_URL`

## Environment Variables

| Variable                  | Required | Notes                           |
| ------------------------- | -------- | ------------------------------- |
| `DATABASE_URL`            | ✅       | Neon pooled connection string   |
| `NODE_ENV`                | ✅       | `production` on Railway         |
| `SESSION_SECRET`          | ✅       | Rotate if leaked                |
| `APP_URL`                 | ✅       | Full public URL                 |
| `ANTHROPIC_API_KEY`       | ✅       | Server-side only                |
| `STRIPE_SECRET_KEY`       | ✅       |                                 |
| `STRIPE_WEBHOOK_SECRET`   | ✅       | Silently fails if unset         |
| `CLOUDFLARE_R2_*`         | ⬜       | Falls back to base64 without it |
| `GOOGLE_CLIENT_ID/SECRET` | ⬜       | OAuth login                     |

## CI/CD

- No pipeline beyond Railway auto-deploy from `main`.
- Pre-commit hooks: husky + lint-staged → ESLint fix + Prettier write on every commit.
- `console.log` blocked in client files by ESLint — use `console.warn` / `console.error`.

## Related Notes

- [[stack-backend]]

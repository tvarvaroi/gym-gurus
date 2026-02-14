# GymGurus Deployment Guide

Complete guide for deploying GymGurus in local, Docker, Vercel, and Railway environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Database Setup & Migrations](#database-setup--migrations)
5. [Docker Deployment](#docker-deployment)
6. [Vercel Deployment](#vercel-deployment)
7. [Railway Deployment](#railway-deployment)
8. [Monitoring & Observability](#monitoring--observability)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool       | Minimum Version  | Check Command      |
| ---------- | ---------------- | ------------------ |
| Node.js    | 20.x LTS         | `node --version`   |
| npm        | 10.x             | `npm --version`    |
| PostgreSQL | 16.x             | `psql --version`   |
| Docker     | 24.x (optional)  | `docker --version` |
| Git        | 2.40+ (optional) | `git --version`    |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url> gymgurus
cd gymgurus
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

- `DATABASE_URL` — your PostgreSQL connection string
- `SESSION_SECRET` — a random string of at least 32 characters

Generate a secure session secret:

```bash
# macOS / Linux
openssl rand -base64 48

# Windows PowerShell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

### 4. Set up the database

Create the PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# In the psql shell:
CREATE DATABASE gymgurus;
CREATE USER gymgurus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE gymgurus TO gymgurus_user;
\q
```

Push the schema to the database:

```bash
npm run db:push
```

### 5. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

### 6. Verify it works

```bash
curl http://localhost:5000/api/health
```

---

## Environment Variables Reference

### Required Variables

| Variable         | Description                           | Example                                          |
| ---------------- | ------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`   | PostgreSQL connection string          | `postgresql://user:pass@localhost:5432/gymgurus` |
| `SESSION_SECRET` | Session encryption key (min 32 chars) | `openssl rand -base64 48`                        |

> **Note:** In development, `SESSION_SECRET` falls back to a built-in default. In production it is strictly required.

### Database Configuration (alternatives to DATABASE_URL)

| Variable        | Description              | Example      |
| --------------- | ------------------------ | ------------ |
| `PGHOST`        | PostgreSQL host          | `localhost`  |
| `PGUSER`        | PostgreSQL user          | `gymgurus`   |
| `PGPASSWORD`    | PostgreSQL password      | `secret`     |
| `PGDATABASE`    | PostgreSQL database name | `gymgurus`   |
| `PGPORT`        | PostgreSQL port          | `5432`       |
| `REPLIT_DB_URL` | Replit-managed DB URL    | _(auto-set)_ |

### Optional Feature Variables

| Variable                 | Feature                      | Default Behavior When Missing        |
| ------------------------ | ---------------------------- | ------------------------------------ |
| `ANTHROPIC_API_KEY`      | AI coaching (Claude)         | Falls back to template responses     |
| `STRIPE_SECRET_KEY`      | Payment processing           | Payments disabled                    |
| `STRIPE_WEBHOOK_SECRET`  | Stripe webhook verification  | Webhooks unverified (warning logged) |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics             | No analytics tracking                |
| `FAL_KEY`                | AI image generation (fal.ai) | Media generation disabled            |
| `SENTRY_DSN`             | Error monitoring (Sentry)    | No remote error reporting            |
| `REDIS_URL`              | Redis session store          | Sessions stored in PostgreSQL        |

### Server Configuration

| Variable   | Description         | Default       |
| ---------- | ------------------- | ------------- |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT`     | Server listen port  | `5000`        |

---

## Database Setup & Migrations

GymGurus uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL. The schema is defined in `shared/schema.ts`.

### Push schema (development)

This command applies the current schema directly to the database. It is the fastest way to sync during development:

```bash
npm run db:push
```

### Generate migrations (production)

For production deployments, generate migration files and apply them:

```bash
# Generate SQL migration files from schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```

Migration files are stored in the `migrations/` directory.

### Inspect the database

```bash
# Open Drizzle Studio (GUI)
npx drizzle-kit studio

# Or connect directly via psql
psql $DATABASE_URL
```

### Backup and restore

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql $DATABASE_URL < backup_20240101_120000.sql
```

---

## Docker Deployment

### Quick start with Docker Compose

This spins up both the app and a PostgreSQL database:

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set SESSION_SECRET

# 2. Start all services
docker compose up -d

# 3. Push database schema
docker compose exec app npx drizzle-kit push

# 4. Check logs
docker compose logs -f app

# 5. Verify health
curl http://localhost:5000/api/health
```

### Build and run manually

```bash
# Build the image
docker build -t gymgurus:latest .

# Run with an external database
docker run -d \
  --name gymgurus \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/gymgurus" \
  -e SESSION_SECRET="$(openssl rand -base64 48)" \
  -e NODE_ENV=production \
  gymgurus:latest
```

### Docker Compose services

| Service | Image              | Port | Purpose              |
| ------- | ------------------ | ---- | -------------------- |
| `app`   | Built from `./`    | 5000 | GymGurus application |
| `db`    | postgres:16-alpine | 5432 | PostgreSQL database  |

### Enable optional services

To add Redis for session storage, uncomment the `redis` service block in `docker-compose.yml` and set `REDIS_URL=redis://redis:6379` in the app environment.

### Production considerations

- Replace the default database credentials in `docker-compose.yml`
- Use Docker secrets or an external secret manager for sensitive values
- Mount a named volume for database persistence (already configured)
- Set up log rotation: `docker compose logs` can grow unbounded
- Consider using a reverse proxy (nginx, Traefik) for TLS termination

---

## Vercel Deployment

GymGurus is a full-stack app (Express + Vite React). Deploying to Vercel requires adapting the Express server to Vercel's serverless model.

### 1. Install the Vercel CLI

```bash
npm install -g vercel
```

### 2. Create `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> **Important:** Vercel is optimized for serverless. You will need to wrap the Express app for Vercel's serverless functions, or deploy only the frontend to Vercel and host the API separately.

### 3. Set environment variables

In the Vercel dashboard under **Settings > Environment Variables**, add:

- `DATABASE_URL` (use a hosted PostgreSQL like Neon, Supabase, or Vercel Postgres)
- `SESSION_SECRET`
- Any optional vars you need (ANTHROPIC_API_KEY, STRIPE keys, etc.)

### 4. Connect your repository

```bash
vercel link
vercel --prod
```

### 5. Database connection

For Vercel deployments, use a serverless-compatible PostgreSQL provider:

- **Neon** (recommended — already in dependencies via `@neondatabase/serverless`)
- **Vercel Postgres**
- **Supabase**

The `@neondatabase/serverless` driver is already included in the project and will be used automatically when `DATABASE_URL` points to a Neon instance.

---

## Railway Deployment

Railway is well-suited for full-stack Node.js apps with PostgreSQL.

### 1. Install the Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 2. Initialize the project

```bash
railway init
```

### 3. Add a PostgreSQL database

```bash
railway add --plugin postgresql
```

Railway automatically sets `DATABASE_URL` in the environment.

### 4. Set environment variables

```bash
railway variables set SESSION_SECRET="$(openssl rand -base64 48)"
railway variables set NODE_ENV=production

# Optional
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set STRIPE_SECRET_KEY="sk_live_..."
```

### 5. Deploy

```bash
railway up
```

Railway detects the `package.json` build script and runs `npm run build`, then starts the app with `npm run start`.

### 6. Run database migrations

```bash
railway run npx drizzle-kit push
```

### 7. Custom domain

```bash
railway domain
```

Follow the prompts to configure a custom domain with automatic TLS.

### Railway configuration tips

- Railway auto-detects Node.js and runs `npm run build` then `npm run start`
- The `PORT` environment variable is set automatically by Railway
- Health checks: Railway monitors the process; add `/api/health` as a custom health check in the dashboard
- Set the **Start Command** to `node dist/index.js` for a faster start (skips npm overhead)

---

## Monitoring & Observability

### Health check endpoint

The app exposes `GET /api/health` which returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

Use this endpoint for:

- Docker HEALTHCHECK (configured in Dockerfile)
- Load balancer health probes
- Uptime monitoring services (UptimeRobot, Pingdom, etc.)

### Sentry error monitoring

1. Create a project at [sentry.io](https://sentry.io)
2. Set `SENTRY_DSN` in your environment
3. Errors are automatically captured in production via `@sentry/node`

### Google Analytics

1. Create a property at [analytics.google.com](https://analytics.google.com)
2. Set `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
3. Client-side page views and events are tracked automatically

### Logging

The app logs structured output to stdout:

```
[log] GET /api/health 200 in 2ms
[log] POST /api/auth/login 200 in 45ms
```

In Docker, collect logs with:

```bash
docker compose logs -f app
```

For production log aggregation, pipe stdout to your preferred service (Datadog, Logtail, CloudWatch, etc.).

### Recommended monitoring stack

| Layer          | Tool Options                        |
| -------------- | ----------------------------------- |
| Error tracking | Sentry                              |
| Uptime         | UptimeRobot, Better Uptime, Pingdom |
| Logs           | Datadog, Logtail, CloudWatch        |
| Metrics        | Railway Metrics, Vercel Analytics   |
| Analytics      | Google Analytics, Plausible         |

---

## Troubleshooting

### App fails to start with "Environment validation failed"

The environment validator (`server/config/env.ts`) checks all required variables on startup. Read the error output carefully -- it tells you exactly which variable is missing or invalid.

Common fixes:

- Copy `.env.example` to `.env` and fill in values
- Ensure `SESSION_SECRET` is at least 32 characters
- Ensure `DATABASE_URL` is a valid PostgreSQL connection string

### "DATABASE_URL is required" but it is set

Check for:

- Trailing whitespace in the `.env` file
- Quotation marks around the value (remove them)
- The `.env` file is in the project root directory

```bash
# Verify the variable is loaded
node -e "require('fs').readFileSync('.env','utf8').split('\n').filter(l=>l.includes('DATABASE')).forEach(l=>console.log(l))"
```

### Connection refused to PostgreSQL

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Docker: check the DB container
docker compose ps
docker compose logs db
```

Possible causes:

- PostgreSQL is not running
- Wrong host/port in `DATABASE_URL`
- Firewall blocking port 5432
- Docker networking: use `db` as hostname (not `localhost`) inside Docker Compose

### Docker build fails on native modules

Some dependencies (like `bcryptjs`) need build tools:

```bash
# The Dockerfile already includes this, but if building locally:
apk add python3 make g++
```

### Port 5000 is already in use

```bash
# Find what is using the port
# Linux/macOS
lsof -i :5000

# Windows
netstat -ano | findstr :5000

# Change the port
PORT=3000 npm run dev
```

### Drizzle schema push fails

```bash
# Ensure DATABASE_URL is set and the database exists
echo $DATABASE_URL
psql $DATABASE_URL -c "SELECT 1"

# If the database does not exist
createdb gymgurus

# Retry
npm run db:push
```

### Stripe webhooks not working

1. Ensure `STRIPE_WEBHOOK_SECRET` is set (starts with `whsec_`)
2. For local development, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

3. In production, configure the webhook endpoint in the Stripe dashboard to point to `https://yourdomain.com/api/webhooks/stripe`

### AI features returning template responses

If AI-powered features (workout suggestions, coaching) return generic templates instead of personalized responses:

1. Verify `ANTHROPIC_API_KEY` is set and starts with `sk-ant-`
2. Check the API key is valid and has available credits
3. Look for errors in the server logs related to the Anthropic API

### Docker Compose: app exits immediately

```bash
# Check the exit code and logs
docker compose ps -a
docker compose logs app

# Common cause: DATABASE_URL not resolvable
# Inside Docker Compose, use the service name 'db' as hostname
# DATABASE_URL=postgresql://gymgurus:gymgurus_secret@db:5432/gymgurus
```

### Windows-specific issues

- The `reusePort` socket option is not supported on Windows. The app handles this automatically.
- Use PowerShell or Git Bash for running commands. CMD may have issues with environment variable syntax.
- If `npm run dev` fails with EACCES, try running the terminal as Administrator.

### Memory issues in production

If the app runs out of memory:

```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=512" node dist/index.js

# Docker: set memory limits
docker run --memory=512m --memory-swap=1g gymgurus:latest
```

---

## Build Commands Reference

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server with hot reload |
| `npm run build`      | Build client and server for production   |
| `npm run start`      | Start production server                  |
| `npm run check`      | TypeScript type checking                 |
| `npm run db:push`    | Push schema to database                  |
| `npm run test`       | Run test suite                           |
| `npm run test:watch` | Run tests in watch mode                  |

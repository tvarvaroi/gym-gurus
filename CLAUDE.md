# GymGurus v2

## Architecture

- **Stack:** TypeScript, Node.js, Express, React, Vite, TailwindCSS
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** Anthropic Claude API for fitness coaching
- **Deployment:** Railway (auto-deploy from main branch)
- **Auth:** Passport.js with session-based auth

## Project Structure

- `client/` - React frontend (Vite + TailwindCSS + shadcn/ui)
- `server/` - Express backend (API routes, auth, AI service)
- `shared/` - Shared types and Drizzle schema
- `drizzle.config.ts` - Database migration config

## Key Files

- `shared/schema.ts` - Drizzle schema (all tables, relations)
- `server/routes.ts` - All API endpoints
- `server/services/aiService.ts` - Claude AI integration
- `client/src/App.tsx` - React router and layout

## Role System

- **Ronin** - Solo user (tracks own workouts, measurements, AI chat)
- **Sensei** - Trainer (manages clients, creates programs)
- **Shihan** - Admin (full system access)

## Database

- Use Drizzle ORM for all queries, never raw SQL
- Migrations via `npx drizzle-kit push`
- Railway Postgres: public URL with ssl rejectUnauthorized false

## Conventions

- Zod validation on all API inputs
- React Query for data fetching
- shadcn/ui components with Tailwind styling
- Fonts: Playfair Display (headings), Inter (body), Cormorant Garamond (accents)

## Known Issues

- CSP blocks Google Fonts (style-src needs fonts.googleapis.com)
- /api/analytics/web-vitals returns 403
- Deprecated apple-mobile-web-app-capable meta tag

## Deployment

- Railway: https://gym-gurus-production.up.railway.app
- Push to main = Railway auto-deploys
- Env vars: DATABASE_URL, NODE_ENV, SESSION_SECRET, APP_URL, ANTHROPIC_API_KEY

# Sprint 3: Database & Backend Rebuild

**Status:** NOT STARTED
**Estimated Time:** 4–6 hours
**Skills Used:** postgresql-table-design, database-migration, nodejs-backend-patterns, api-design-principles, error-handling-patterns, stripe-integration, architecture-patterns

## Tasks

- [ ] **Task 3.1** — Schema Audit & Optimization
  - Review shared/schema.ts for missing indexes, FKs, constraints
  - Add RLS policies, connection pooling config

- [ ] **Task 3.2** — Fix 503 Database Errors
  - Diagnose connection pool exhaustion
  - Implement proper pool config, health checks, retry logic

- [ ] **Task 3.3** — Routes Refactor
  - Split routes.ts (1,585 lines) into domain modules
  - Implement proper Express middleware ordering

- [ ] **Task 3.4** — Schema Split
  - Split schema.ts (1,486 lines) into domain files
  - Maintain Drizzle ORM compatibility

- [ ] **Task 3.5** — Stripe Webhook Handler
  - Create webhook endpoint with raw body parser
  - Add signature verification, event routing, idempotency

- [ ] **Task 3.6** — Database Migrations
  - Set up Drizzle migration system
  - Create initial migration from current schema

- [ ] **Task 3.7** — Error Handling Overhaul
  - Custom error classes, global error handler
  - Structured error responses, retry with backoff

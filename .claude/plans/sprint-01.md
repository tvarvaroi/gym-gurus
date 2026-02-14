# Sprint 1: Security Deep Audit & Hardening

**Status:** COMPLETE
**Commit:** 910443a
**Skills Used:** code-review-security, security-review, auth-implementation-patterns, nodejs-backend-patterns, gdpr-data-handling, better-auth, api-design-principles

## Tasks

- [x] **Task 1.1** — OWASP Top 10 Full Scan
  - Scanned all server/ files for OWASP A01–A10 vulnerabilities
  - Found and fixed 10 IDOR issues, verified CSRF, XSS, auth gaps

- [x] **Task 1.2** — Fix All IDOR Routes (10 total, not 7)
  - Fixed 7 original + 3 additional IDOR routes
  - All trainer-scoped routes now derive trainerId from session
  - Added requireClientOwnership to client-scoped routes

- [x] **Task 1.3** — GDPR Data Classification & Protection
  - Classified all 41 tables and 100+ fields
  - Created docs/data-classification.md with encryption tiers, consent gaps, delete cascades

- [x] **Task 1.4** — Auth Architecture Modernization
  - Created ADR 001: Auth migration plan (Replit Auth -> better-auth)
  - Fixed dev logout redirect bug in replitAuth.ts

- [x] **Task 1.5** — CSRF Protection
  - Created server/middleware/csrf.ts (Double Submit Cookie pattern)
  - Updated client queryClient.ts to send x-csrf-token header
  - Exempted Stripe webhooks and OAuth callback

- [x] **Task 1.6** — Input Sanitization
  - Created server/middleware/sanitize.ts
  - Strips HTML tags, script tags, event handlers, dangerous protocols
  - Applied globally before Zod validation

- [x] **Task 1.7** — Rate Limiting Expansion
  - Added aiRateLimit (10/min) and writeRateLimit (30/min)
  - Applied tiered limits: AI strict, payments strict, API moderate, calculators general
  - Added authRateLimit to login/callback routes

- [x] **Task 1.8** — Security Review Gate
  - Final pass verified all 30+ security controls
  - Helmet with CSP + HSTS already configured (pre-existing)
  - No critical gaps found

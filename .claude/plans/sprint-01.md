# Sprint 1: Security Deep Audit & Hardening

**Status:** NOT STARTED
**Estimated Time:** 4–6 hours
**Skills Used:** code-review-security, security-review, auth-implementation-patterns, nodejs-backend-patterns, gdpr-data-handling, better-auth, api-design-principles

## Tasks

- [ ] **Task 1.1** — OWASP Top 10 Full Scan
  - Scan all server/ files for OWASP A01–A10 vulnerabilities
  - Document findings with file, line, severity, exploit scenario, fix

- [ ] **Task 1.2** — Fix All 7 IDOR Routes
  - Add secureAuth middleware to 7 unauthenticated routes
  - Derive trainerId from session, add ownership validation

- [ ] **Task 1.3** — GDPR Data Classification & Protection
  - Classify every field in schema.ts (Public/Internal/PII/Sensitive Health)
  - Create docs/data-classification.md

- [ ] **Task 1.4** — Auth Architecture Modernization
  - Audit replitAuth.ts, create ADR for auth migration decision
  - Session security audit, rate limiting, account lockout design

- [ ] **Task 1.5** — CSRF Protection
  - Add CSRF tokens to all state-changing routes
  - Implement double-submit cookie pattern

- [ ] **Task 1.6** — Input Sanitization
  - Wire up DOMPurify (imported but never called)
  - Server-side validation on all user inputs

- [ ] **Task 1.7** — Rate Limiting
  - Add express-rate-limit to all 70+ routes
  - Tiered limits: auth (strict), API (moderate), static (relaxed)

- [ ] **Task 1.8** — Security Headers
  - Add helmet.js, CSP, HSTS, X-Frame-Options
  - Remove server fingerprinting headers

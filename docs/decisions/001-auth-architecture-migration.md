# ADR-001: Auth Architecture — Migrate from Replit Auth to better-auth

**Status:** Proposed
**Date:** 2026-02-14
**Sprint:** 1 (Security Deep Audit & Hardening)
**Decision Makers:** Engineering Team

## Context

GymGurus currently uses Replit OAuth as its sole authentication mechanism. This creates several problems:

1. **Platform Lock-in**: The app only works on Replit-hosted domains. Deploying to Vercel, Railway, or any other host breaks authentication entirely.
2. **No Password-Based Auth**: Users must have a Replit account to use GymGurus — a non-starter for fitness trainers.
3. **No Email Verification**: Users can sign up without verifying their email.
4. **No Password Reset**: No flow exists for forgotten credentials.
5. **No Social Login**: No Google, GitHub, or Apple login options.
6. **No 2FA**: Trainers handle client health data (GDPR Article 9) but have no second factor.
7. **Session Security**: Cookie configuration looks reasonable (`httpOnly: true`, `secure` in production, `sameSite: 'lax'`) but the session secret source is unclear.
8. **Dev Mode Issues**: Development authentication uses hardcoded demo users, and the dev logout route returns JSON instead of redirecting (line 399).

### Current Auth Flow
```
User → /api/login?role=trainer|client|solo
     → Replit OIDC provider
     → /api/callback
     → passport.serializeUser (stores entire user object in session)
     → redirect to /dashboard
```

### Session Configuration (replitAuth.ts:59-71)
- Cookie: `httpOnly: true`, `secure: isProduction`, `sameSite: 'lax'`
- TTL: 7 days
- Store: PostgreSQL in production, MemoryStore in development
- Secret: `env.SESSION_SECRET` (from env config)

## Decision Drivers

- **Deployment flexibility**: Must work outside Replit (Vercel, Railway, AWS)
- **User experience**: Trainers expect email/password login, not Replit OAuth
- **Security compliance**: Health data requires strong auth (GDPR Article 9)
- **Development velocity**: Auth should be a solved problem, not hand-rolled
- **Migration risk**: Must not break existing user sessions during transition

## Considered Options

### Option A: Migrate to better-auth
- Full-featured auth library with email/password, social login, 2FA
- Built for modern TypeScript stacks (Express, Next.js, etc.)
- Session management, RBAC, email verification, password reset
- **Pros:** Feature-complete, TypeScript-native, active maintenance, supports Drizzle ORM
- **Cons:** Migration effort (~2-3 days), need to handle existing Replit sessions
- **Estimated effort:** 2-3 days

### Option B: Migrate to NextAuth.js / Auth.js
- Very popular, well-documented
- Strong social login support
- **Pros:** Large community, many adapters
- **Cons:** Primarily designed for Next.js (we use Express), heavier migration
- **Estimated effort:** 3-4 days

### Option C: Build Custom Auth on Passport.js
- Already using Passport — extend with local strategy
- Add email/password, social strategies one by one
- **Pros:** Incremental, already familiar codebase
- **Cons:** Hand-rolling auth is error-prone, slow, maintenance burden
- **Estimated effort:** 4-5 days + ongoing maintenance

### Option D: Keep Replit Auth + Add Email/Password
- Keep existing Replit OAuth as one provider
- Add email/password alongside it
- **Pros:** No breaking changes for existing users
- **Cons:** Maintaining two auth systems, Replit lock-in persists for existing users
- **Estimated effort:** 3-4 days

## Decision

**Proposed: Option A — Migrate to better-auth**

better-auth provides everything we need out of the box:
- Email/password with verification
- Social login (Google, GitHub)
- 2FA (TOTP) for trainer accounts
- Session management with configurable storage
- RBAC for trainer/client/solo roles
- Drizzle ORM adapter
- TypeScript-native

### Migration Plan
1. Install better-auth alongside existing Replit auth
2. Set up better-auth with Drizzle adapter pointing to existing PostgreSQL
3. Create migration script to convert existing Replit OAuth users to better-auth accounts
4. Run both auth systems in parallel during transition (2 weeks)
5. After confirming all users are migrated, remove Replit auth
6. Keep Replit OAuth as one social provider option (for users who prefer it)

## Consequences

### Positive
- Platform-independent deployment
- Professional auth flow trainers expect
- 2FA for accounts handling health data
- Email verification reduces fake accounts
- Password reset flow

### Negative
- Migration requires careful handling of existing sessions
- Need to send password-set emails to existing OAuth-only users
- Temporary complexity of running two auth systems during transition

### Risks
- Existing Replit OAuth sessions could break during migration → Mitigation: parallel auth systems during transition
- Users may be confused by password-set emails → Mitigation: clear onboarding communication

## Implementation Notes

### Immediate Fixes (Sprint 1 — before migration)
1. Fix dev logout to redirect instead of returning JSON (replitAuth.ts:399)
2. Verify `SESSION_SECRET` is properly randomized (not a default)
3. Add rate limiting to `/api/login` (5 attempts/minute)
4. Add account lockout after 5 failed attempts (15-minute lockout)
5. Ensure passport doesn't serialize sensitive data (tokens) to session

### Files Affected
- `server/replitAuth.ts` → Replace with `server/auth.ts` (better-auth config)
- `server/middleware/auth.ts` → Update to use better-auth session
- `server/routes.ts` → Update auth route registration
- `shared/schema.ts` → Add better-auth tables (users, sessions, accounts)
- `client/src/` → Update login/signup forms
- `package.json` → Add better-auth dependency

### Timeline
- Sprint 1: Immediate security fixes (this sprint)
- Sprint 3: better-auth migration (database/backend sprint)

## Related Decisions

- GDPR data classification (Sprint 1, Task 1.3) — auth changes affect PII handling
- Database schema refactor (Sprint 3) — better-auth tables need to be added

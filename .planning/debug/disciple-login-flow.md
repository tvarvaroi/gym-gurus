---
status: fixing
trigger: 'Fix the broken Disciple login flow in GymGurus. Disciples cannot complete access code authentication.'
created: 2026-03-15T00:00:00Z
updated: 2026-03-15T00:00:00Z
---

## Current Focus

hypothesis: Two root causes confirmed — (1) client_access_codes unique constraint on clientId prevents regeneration, making codes go inactive permanently; (2) DiscipleLoginPage does not invalidate/refetch after setQueryData which may cause stale session on dashboard
test: Fixed — applying minimal fixes
expecting: Disciple login flow completes end-to-end
next_action: Fix createAccessCodeForClient to use UPDATE instead of INSERT; fix client login to invalidateQueries

## Symptoms

expected: Disciple enters GG-XXXX-XXXX code → POST /api/auth/disciple-login → session set → redirect to /dashboard → sees dashboard
actual: Disciples cannot complete authentication
errors: Unknown — likely "Invalid or expired access code" OR silent 500 from unique constraint violation on regeneration
reproduction: Navigate to /disciple-login, enter any access code
started: Unknown — possibly since regeneration feature was added

## Eliminated

- hypothesis: Triple isPublicPage pattern causing the page to not render
  evidence: routeConfig.ts has '/disciple-login' in isPublicRoute(). AppShell renders public pages without AuthGuard. RouterConfig.tsx has Route for /disciple-login.
  timestamp: 2026-03-15

- hypothesis: Auth route not mounted
  evidence: server/routes.ts line 122: app.use('/api/auth', authRoutes) — disciple-login is inside authRoutes
  timestamp: 2026-03-15

- hypothesis: validateAccessCode returns wrong format
  evidence: Returns typeof users.$inferSelect which has all required fields. session.userId = user.id set correctly.
  timestamp: 2026-03-15

## Evidence

- timestamp: 2026-03-15
  checked: shared/schema.ts clientAccessCodes table
  found: clientId column has .unique() constraint — CONSTRAINT "client_access_codes_client_id_unique" UNIQUE("client_id") confirmed in 0000_burly_yellow_claw.sql
  implication: Only ONE row can exist per client in client_access_codes. The deactivate-then-insert regeneration pattern ALWAYS fails on second call with unique constraint violation.

- timestamp: 2026-03-15
  checked: server/services/accessCode.ts createAccessCodeForClient
  found: UPDATE existing row to isActive=false, then INSERT new row for same clientId — violates unique constraint
  implication: Any trainer who clicked "regenerate" for a client has left that client with an inactive code and no active code. POST /api/auth/disciple-login returns 401.

- timestamp: 2026-03-15
  checked: DiscipleLoginPage.tsx handleSubmit post-login flow
  found: calls queryClient.setQueryData(['/api/auth/user'], result.user) then setLocation('/dashboard'). Does NOT call queryClient.invalidateQueries.
  implication: If stale data exists in cache (from prior session), setQueryData should override it. This is likely fine, but if AuthGuard's query is already settled as 401, the setQueryData may not trigger a re-render.

- timestamp: 2026-03-15
  checked: UserContext.tsx query key
  found: queryKey: ['/api/auth/user'] with enabled: !isPublicPage — on /disciple-login (public), query is disabled
  implication: setQueryData(['/api/auth/user'], result.user) correctly populates cache. AuthGuard on /dashboard re-reads same key. Should work.

- timestamp: 2026-03-15
  checked: AuthGuard.tsx
  found: Uses useQuery({ queryKey: ['/api/auth/user'] }) WITHOUT enabled flag — always runs. With refetchOnMount: false, staleTime 5 min — uses cache if available.
  implication: After setQueryData, AuthGuard should read cached user on first render of /dashboard. This is probably fine.

## Resolution

root_cause: |
PRIMARY: client_access_codes.clientId has UNIQUE constraint in the database.
createAccessCodeForClient() deactivates existing codes then tries INSERT — unique constraint violation on any second call.
Result: After any regeneration, client has inactive code only → validateAccessCode returns null → 401 "Invalid or expired access code".

SECONDARY: DiscipleLoginPage should also invalidateQueries after setQueryData to ensure all subscribers see fresh data.

fix: |

1. Fix createAccessCodeForClient to use UPDATE (upsert pattern) instead of INSERT when a row already exists for clientId.
   Use INSERT ... ON CONFLICT (client_id) DO UPDATE or check-then-update.
2. Add queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] }) after setQueryData in DiscipleLoginPage.

verification: ""
files_changed:

- server/services/accessCode.ts
- client/src/pages/DiscipleLoginPage.tsx

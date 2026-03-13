# Auth System

## Single Source of Truth — routeConfig.ts

All public/private route classification lives in **one file**:
`client/src/lib/routeConfig.ts`

Three previous independent `isPublicPage` lists (in AppLayout, UserContext, queryClient.ts) were consolidated here. When adding a new public route, add it **only** to `routeConfig.ts`.

Functions exported:

- `isPublicRoute(path)` — true for landing, login, register, disciple-login, etc.
- `isKnownAuthRoute(path)` — true for all valid app routes. Unknown paths → 404, not redirect.

## Auth Flow

1. `UserContext` calls `GET /api/auth/user` on mount (skipped for public routes).
2. `AuthGuard` component wraps protected pages — redirects to `/auth/login` if unauthenticated.
3. On login: `user.role` persisted to `localStorage` key `gg_role`.
4. On logout: `gg_role` cleared.

## Role Flash Fix

A blocking inline `<script nonce="{{NONCE}}">` in `client/index.html` reads `localStorage.getItem('gg_role')` and applies the role class to `<html>` **before React hydrates** — eliminating the gold→purple flash for Ronin users.

Nonce is injected server-side:

- `server/index.ts` generates `crypto.randomBytes(16).toString('base64')` per request → `res.locals.cspNonce`
- Both dev (Vite) and prod (static serve) replace `{{NONCE}}` placeholder in index.html.

## Role Classes

Applied to `<html>` element:

- `.role-guru` — gold accent
- `.role-ronin` — purple accent
- `.role-disciple` — teal accent

## Disciple Login

Disciples (clients) log in at `/disciple-login` — separate from the main `/auth/login`.
Uses an access code flow, not email/password.
This route must be in `isPublicRoute()` and NOT trigger auth API calls.

## Session

- Express session via `connect-pg-simple` (PostgreSQL session store).
- `req.isAuthenticated()` — always check before protected routes.
- `req.user` — typed as the full user row from DB.

## Related Notes

- [[role-system]]
- [[notes/gotchas]]

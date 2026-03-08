# Design: App.tsx God Component Split — § FE-1

**Date:** 2026-03-08
**Status:** Approved — pending implementation
**Approach:** Approach B (extract + `lazyRoute` helper)
**CLAUDE.md refs:** § FE-1, § FE-2

---

## Problem

`client/src/App.tsx` is 1,115 lines containing five unrelated concerns:

1. **40+ lazy page imports** — import declarations only
2. **Page wrapper components** — `memo()` functions that add `<Suspense>/<PageTransition>` around each lazy page (26 copy-pastes, § FE-2)
3. **`Router` function** — 486 lines of `<Switch>/<Route>` declarations
4. **`AuthWrapper`** — auth state check, loading screen, error screen, redirect logic, video cycling, dark theme enforcement, role CSS class application
5. **`AppLayout`** — public/auth/known-route detection, sidebar setup

`code-reviewer` flags any file over 500 lines. At 1,115 lines this is the highest-interest tech debt item in the frontend.

---

## Solution: Four-Step Sequential Extraction

Three PRs. Each leaves `App.tsx` in a working, deployable state. The prerequisite extraction (LoadingFallback) happens inside PR 1.

```
PR 1: LoadingFallback.tsx  →  AuthGuard.tsx
PR 2: AppShell.tsx
PR 3: RouterConfig.tsx  (+ lazyRoute helper, resolves § FE-2)
```

---

## Step 0 — Prerequisite (inside PR 1): Extract `LoadingFallback`

**File:** `client/src/components/LoadingFallback.tsx`

The current inline `LoadingFallback` component (App.tsx lines 131–175) must be extracted before any other step. All three subsequent files (`AuthGuard`, `AppShell`, `RouterConfig`) will import it. Extracting it first prevents circular imports.

`LoadingFallback` is a pure presentational component — no props, no side effects. Move it verbatim; do not change its implementation.

---

## Step 1 — PR 1: Extract `AuthGuard`

**File:** `client/src/components/AuthGuard.tsx`

Replaces `AuthWrapper` in App.tsx. Does exactly two things:

1. **Auth check + redirect** — reads `{ user, isLoading, error }` from `useQuery('/api/auth/user')`, renders loading screen, error screen, or redirects unauthenticated users to `/`
2. **Role CSS class side effect** — applies `role-guru` / `role-disciple` / `role-ronin` to `document.documentElement` via `useEffect([user])`. This is a DOM side effect that requires the user object; it belongs here, not in AppShell.

**Does NOT contain:**
- Video cycling logic (moves to `LandingPage.tsx`)
- Any JSX beyond the loading/error screens and `{children}` pass-through

**Video cycling move:** The `CATEGORY_ORDER`, `activeCategory` state, `handleCategoryClick`, and two `useEffect`s that drive the background video cycle on the landing page are moved to `client/src/pages/LandingPage.tsx`. `AuthWrapper` currently holds them because the landing page is rendered inside `AuthWrapper` — after the split, `LandingPage` will own its own animation state.

**Dark theme enforcement:** The `document.documentElement.classList.add('dark')` effect moves to `AppShell` (PR 2), not `AuthGuard`. It is a presentation/layout side effect, not an auth concern. `AuthGuard` has no access to this effect.

**Interface:**
```ts
export function AuthGuard({ children }: { children: React.ReactNode }) { ... }
```

**After PR 1, App.tsx change:** Replace `function AuthWrapper(...)` with `import { AuthGuard } from '@/components/AuthGuard'`. Everything else unchanged.

---

## Step 2 — PR 2: Extract `AppShell`

**File:** `client/src/components/AppShell.tsx`

Replaces `AppLayout` in App.tsx. Contains:

- Sidebar state from cookie (`getSidebarState`, `defaultOpen`)
- `isPublicPage` check (public pages skip the sidebar)
- `isKnownAuthRoute` check (unknown paths render `<NotFound>` directly)
- `SidebarProvider` + skip-nav link + `<AppSidebar>` + `<AppHeaderComponent>` + `<TrialBanner>` + `<MobileBottomNav>` layout tree
- `initAnalytics()` call on mount

**Interface:**
```ts
export function AppShell() { ... }
```

`AppShell` renders `<Router />` internally (still imported from App.tsx at this stage). The `<Router>` extraction happens in PR 3.

**After PR 2, App.tsx change:** Replace `function AppLayout()` body with `import { AppShell } from '@/components/AppShell'`. The `export default function App()` just renders providers + `<AppShell />`.

---

## Step 3 — PR 3: Extract `RouterConfig` + introduce `lazyRoute`

**File:** `client/src/components/RouterConfig.tsx`

All `<Route>` declarations move here. The `lazyRoute` and `protectedRoute` factory functions are defined at the top of this file and used throughout.

### `lazyRoute` factory

```ts
/**
 * Wraps a lazy component in the standard Suspense + PageTransition shell.
 * Use for all public and authenticated routes that don't require role guards.
 */
function lazyRoute(C: React.LazyExoticComponent<any>) {
  return () => (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <C />
      </PageTransition>
    </Suspense>
  );
}
```

### `protectedRoute` factory

```ts
/**
 * Like lazyRoute, but wraps in ProtectedRoute for role-gated pages.
 * role is optional — omit for "any authenticated user" guard.
 */
function protectedRoute(C: React.LazyExoticComponent<any>, role?: string) {
  return () => (
    <ProtectedRoute requiredRole={role}>
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <C />
        </PageTransition>
      </Suspense>
    </ProtectedRoute>
  );
}
```

### Usage — before vs after

**Before (8 lines per route):**
```tsx
<Route path="/solo/coach">
  {() => (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <AICoach />
      </PageTransition>
    </Suspense>
  )}
</Route>
```

**After (1 line per route):**
```tsx
<Route path="/solo/coach" component={lazyRoute(AICoach)} />
```

**Protected route — before (11 lines):**
```tsx
<Route path="/clients">
  {() => (
    <ProtectedRoute requiredRole="trainer">
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <ClientsPageContent />
        </PageTransition>
      </Suspense>
    </ProtectedRoute>
  )}
</Route>
```

**Protected route — after (1 line):**
```tsx
<Route path="/clients" component={protectedRoute(ClientsPageContent, 'trainer')} />
```

### Page wrapper `memo()` functions eliminated

The ~10 memo'd wrapper functions (`HomePage`, `WorkoutsPage`, `SchedulePage`, etc.) are inline boilerplate that exists only because each wraps a lazy component. With `lazyRoute` they become unnecessary — routes use the factory directly.

**Exception:** `HomePage` has role-switching logic (solo → `SoloDashboard`, trainer → `Dashboard`). It survives as a named function in `RouterConfig.tsx`, not a memo'd wrapper.

### Estimated RouterConfig size

| Section | Lines (before) | Lines (after) |
|---|---|---|
| Lazy imports | 40 | 40 (unchanged) |
| Factory functions | — | 20 |
| Route declarations | ~430 | ~60 |
| **Total** | **~480** | **~120** |

§ FE-2 (26 copy-pasted Suspense wrappers) is resolved as a by-product.

**Interface:**
```ts
export function RouterConfig() { ... }
```

`AppShell` imports `RouterConfig` and renders it in place of the inline `Router`.

---

## Final State of `App.tsx` (~30 lines)

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UserProvider } from '@/contexts/UserContext';
import { Toaster } from '@/components/ui/toaster';
import { queryClient } from './lib/queryClient';
import { AppShell } from '@/components/AppShell';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <AppShell />
          <Toaster />
        </TooltipProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
```

**What stays in App.tsx:** providers (`QueryClientProvider`, `UserProvider`, `TooltipProvider`), `<Toaster>`, and nothing else. No routing, no auth, no layout, no lazy imports.

---

## What Moves Where — Summary

| Concern | Current location | New location |
|---|---|---|
| `LoadingFallback` component | App.tsx (inline) | `components/LoadingFallback.tsx` |
| Auth check + redirect | `AuthWrapper` in App.tsx | `components/AuthGuard.tsx` |
| Role CSS class side effect | `AuthWrapper` in App.tsx | `components/AuthGuard.tsx` |
| Dark theme enforcement | `AuthWrapper` in App.tsx | `components/AppShell.tsx` |
| Video cycling (landing bg) | `AuthWrapper` in App.tsx | `pages/LandingPage.tsx` |
| Sidebar layout + skip nav | `AppLayout` in App.tsx | `components/AppShell.tsx` |
| Public/known-route detection | `AppLayout` in App.tsx | `components/AppShell.tsx` |
| Analytics init | `AppLayout` in App.tsx | `components/AppShell.tsx` |
| All `<Route>` declarations | `Router` in App.tsx | `components/RouterConfig.tsx` |
| `lazyRoute` / `protectedRoute` | (does not exist) | `components/RouterConfig.tsx` |
| Providers + `<Toaster>` | `App()` in App.tsx | `App.tsx` (stays) |

---

## Constraints

- Each PR merges independently and leaves the app deployable
- No changes to route paths, component behavior, or auth logic
- `ProtectedRoute`, `AppSidebar`, `AppHeaderComponent`, `MobileBottomNav`, `Footer`, `TrialBanner` are not touched
- `shared/schema.ts`, `server/middleware/auth.ts`, `server/routes/webhooks.ts` are not touched
- `wouter` `<Switch>` semantics (first-match) are preserved exactly
- DEV-only route guards (`import.meta.env.DEV &&`) are preserved in RouterConfig

---

## Testing

After each PR:
1. Navigate to `/`, `/auth/login`, `/disciple-login` — no sidebar should appear
2. Navigate to `/dashboard` unauthenticated — should redirect to `/`
3. Navigate to `/unknown-path` — should render 404 directly, not redirect to landing
4. Log in as Ronin — `role-ronin` class should be on `<html>`
5. Log in as Guru — `role-guru` class should be on `<html>`
6. Navigate to `/solo/coach` — page loads, no flash
7. Navigate to `/calculators/bmi` — public page, no auth required

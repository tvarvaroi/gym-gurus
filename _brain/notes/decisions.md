# Decisions

Key architectural decisions made during the audit and refactor. Each entry explains the decision and the rejected alternatives.

---

## Single `isPublicRoute` source → `routeConfig.ts`

**Decided**: Consolidate all three `isPublicPage` checks into `client/src/lib/routeConfig.ts`.
**Rejected**: Keeping three separate lists in AppLayout, UserContext, queryClient.ts.
**Why**: Three-way sync was a recurring bug source. Every new public route required updating three files. One miss caused `/disciple-login` and `/login2` auth API calls firing on public pages.

---

## `App.tsx` split into focused components

**Decided**: Extract `LoadingFallback`, `AuthGuard`, `AppShell`, `RouterConfig` from the 1,105-line God component.
**Rejected**: Keep everything in App.tsx.
**Why**: Mixed concerns (routing + auth + video + CSS injection + layout) made changes risky. Lazyroute factory (`lazyRoute()`) and `protectedRoute()` eliminated 26 copy-pasted Suspense wrappers.

---

## Soft deletes via `deleted_at` columns

**Decided**: Add `deletedAt: timestamp` to `users` and `clients` tables. Filter with `isNull(x.deletedAt)` in all queries.
**Rejected**: Hard deletes (physically remove rows).
**Why**: Foreign key constraints on related tables (workouts, sessions, etc.) would cascade or orphan records. Soft delete preserves referential integrity while hiding deleted records from queries.

---

## Profile photo: CSS `object-contain` over backend canvas math

**Decided**: Frontend uses `object-contain object-center` on the img tag. Backend only does `.trim().png()` after BG removal.
**Rejected alternatives tried (in order)**:

1. `sharp resize(600,900) contain south-east` → head cut off on tall subjects
2. `absolute right-0 bottom-0 h-full w-auto` → right-edge bleed on wide photos
3. `canvas composite with center-Y lock at 52%` → overfitted to specific photo proportions
   **Why final choice**: `object-contain` is CSS-native, handles any aspect ratio, requires no backend math. The photo zone dimensions (`w-[42%]`) control the layout. Backend stays simple.

---

## Carousel → scrollable landing page (§UX-1)

**Decided**: Replace JS `AnimatePresence` carousel with 6 vertically-stacked sections.
**Rejected**: Fix the carousel navigation.
**Why**: Carousel hid login from browser nav, killed SEO (sections not crawler-visible), and removed browser back/forward. Scrollable sections get all three for free.

---

## Nonce-based CSP (§SEC-3, §SEC-5)

**Decided**: Per-request nonce via `crypto.randomBytes(16).toString('base64')` → `res.locals.cspNonce`. `{{NONCE}}` placeholder replaced in index.html at serve time.
**Rejected**: `unsafe-inline` in scriptSrc.
**Why**: `unsafe-inline` negates XSS protection entirely. The only inline script is the role-flash IIFE in index.html — nonce covers it cleanly.

---

## Related Notes

- [[gotchas]]
- [[auth-system]]
- [[file-upload-pipeline]]

# Gotchas

Hard-won lessons. Check this before touching anything.

---

## Layout

**`overflow-y: auto` on main clips `position: absolute` children with translate transforms.**
If a dropdown, tooltip, or floating element disappears at the scroll container boundary, the culprit is `overflow-y: auto` on a parent. Move the element outside the scroll container or use a portal.

**`w-auto` images inside `absolute` containers overflow their parent.**
Always pair `w-auto` with `max-w-[...]` or use a fixed-width wrapper with `overflow-hidden`.

**`flex justify-between` with dynamic text overflows on narrow cards.**
Multi-word labels (e.g. muscle names from DB) will overflow. Use `flex flex-wrap gap-1` + `flex-1 min-w-0` on the label + `flex-shrink-0` on badges.

**Fixed heights `h-[Npx]` clip dynamic content.**
Use `min-h-[Npx]` for content containers. Only use fixed `h-[Npx]` on chart containers (recharts requires it), skeletons, and decorative elements.

**Empty state conditions must check ALL data states.**
If a component has both `completed` and `planned` data, the empty state condition must be `!hasCompleted && !hasPlanned` — not just `!hasCompleted`.

---

## Access Codes

**`client_access_codes.clientId` has a UNIQUE constraint — one row per client ever.**
The DB constraint (`CONSTRAINT client_access_codes_client_id_unique UNIQUE("client_id")`) allows only ONE row per client. The original `createAccessCodeForClient()` tried to deactivate the old row then INSERT a new one — unique-constraint violation on any second call. Fixed by switching to `INSERT ... ON CONFLICT (client_id) DO UPDATE` upsert (2026-03-15).

**Never use deactivate-then-insert for access-code regeneration.**
Because of the unique constraint above, any "soft-delete and re-insert" pattern for `client_access_codes` will break after the first regeneration. Always use upsert.

---

## API / Routes

**Never pass user ID as a path segment to list endpoints.**
`fetch('/api/clients/${user?.id}')` hit the SPA catch-all and returned HTML, causing `JSON.parse` to throw `"Unexpected token '<'"`. Use `fetch('/api/clients')` — auth middleware identifies the user. Fixed in §BE-7.

**Triple isPublicRoute pattern → now single source in routeConfig.ts.**
Previously three independent `isPublicPage` lists (AppLayout, UserContext, queryClient.ts) had to stay in sync. Now: one file, `client/src/lib/routeConfig.ts`. Add new public routes only there.

**Express matches routes in declaration order — static paths must come before parameterised ones.**
Pattern that breaks: `GET /:id` declared before `GET /photos` → "photos" matches as `:id`, wrong handler runs, returns 404 or wrong data. Rule: in any router, declare the most specific routes first. `/photos`, `/photos/:photoId`, `/client/:clientId` all come BEFORE `/:id`. First hit in `server/routes/biometrics.ts` (Sprint 1, BATCH 4, 2026-05-03) — `GET /:id` body-metrics route was matching "photos" as an ID. Fixed by reordering all `/photos*` routes above `/:id`.

---

## Build / Deploy

**Railway Nixpacks can serve stale builds after small commits.**
A trivial whitespace-only follow-up push forces a clean rebuild. If a deploy looks wrong despite the code being correct, push again.

**`console.log` blocked by ESLint in client files.**
Use `console.warn` or `console.error`. The pre-commit hook will reject commits with `console.log`.

---

## Styling

**`bg-primary` is role-aware — never hardcode colour overrides on role-specific components.**
`bg-primary` reads from `--primary` CSS var which changes per role (gold/purple/teal). Hardcoding `bg-[#c9a84c]` or `bg-violet-500` breaks the role colour system. Use `bg-primary text-primary-foreground` always.

**Semantic greens are intentional — don't replace them in brand audits.**
Green is correctly used for: success/completion states (workout set done, achievement unlocked), health indicators (BMI healthy range, heart rate Zone 3, recovery ≥80%), validation pass (password strength, form consent), and data series differentiation (muscle groups: legs=green, back=blue, bicep=purple). Only replace green when it's used as a UI accent/decoration unrelated to meaning. See Sprint 2 audit in `design-upgrade-plan.md` for the full categorization.

---

## Image Processing

**`@imgly` background removal: pass raw buffer only.**
Any pre-processing (normalize, CLAHE, modulate, linear, sharpen) before `removeBackground()` confuses the ML model and produces grainy artifacts. The model is trained on natural photos. Pass `req.file.buffer` directly.

**`sharp .trim()` strips transparent edges after background removal.**
After `removeBackground()` returns a PNG with transparent background, `.trim()` removes the transparent padding so the subject fills its natural bounding box. Do this before storing.

---

## CSP / Security

**`chart.tsx` uses `dangerouslySetInnerHTML` for a `<style>` tag — handled with nonce.**
`ChartStyle` reads the per-request nonce from `<meta name="csp-nonce">` (injected by the server via `{{NONCE}}` replacement) and passes `nonce={nonce}` to the `<style>` element. Both `scriptSrc` and `styleSrc` now use nonces only — neither has `unsafe-inline`.
`styleSrcAttr: ["'unsafe-inline'"]` is a separate directive covering React's `style=""` attributes on DOM elements. This is safe — style attributes cannot execute JavaScript.

**`unsafe-inline` must stay in `styleSrcAttr` (not `styleSrc`).**
React and recharts render `style={{ ... }}` as inline `style=""` attributes. These need `styleSrcAttr: ["'unsafe-inline'"]`. Removing it breaks rendering across the whole app. It's safe to leave because style attributes have no code execution path.

---

## Database

**Migrations path is `server/migrations/` not `drizzle/migrations/`.**
The Drizzle config points to `server/migrations/`. Do not create files in `drizzle/migrations/`.

**20 DB tables have no Drizzle schema definition (§DB-5).**
`shared/schema.ts` only defines 13 of 33+ tables. Running `drizzle-kit generate` without fixing this will produce DROP TABLE diffs for the unmanaged tables. See §DB-5 in CLAUDE.md for the full list.

**`clients.id` is NOT a FK to `users.id` — Disciple linkage is by email match.**
Trainers add clients to their roster by email; the Disciple registers separately as a `users` row with `role='client'`. The two tables are NOT joined by a FK column. To find a Disciple's `users.id` from a `clients.id`, look up by email + role:

```ts
const [u] = await db
  .select({ id: users.id })
  .from(users)
  .where(and(eq(users.email, client.email), eq(users.role, 'client'), isNull(users.deletedAt)));
```

If no match returns, the client row is for a non-registered prospect — handle as empty data, not 404. Pattern helpers: `resolveDiscipleUserId(db, email)` and `getClientUserIdForTrainer(req, res)` (first written in `server/routes/biometrics.ts`, Sprint 1, 2026-05-02). Sprint 4 will add `clients.user_id` as a proper FK alongside the granular consent flags.

---

---

## Magic UI / Third-Party UI Components

**`npx shadcn@latest add magicui/...` does NOT work — 404.**
The shadcn CLI registry does not host Magic UI components. Fetch source directly from GitHub:

```
gh api repos/magicuidesign/magicui/contents/apps/www/registry/magicui/<component>.tsx --jq '.download_url' | xargs curl -s
```

Then manually write to `client/src/components/ui/`.

**Magic UI components are written for Next.js (App Router) + Tailwind v4 + `motion/react`.**
GymGurus uses Vite + Tailwind v3 + `framer-motion` v11. Required adaptations for every component:

1. Remove `"use client"` directive at the top (not needed in Vite)
2. Change all `import ... from "motion/react"` → `import ... from "framer-motion"`
3. Tailwind v4 utilities that need replacing:
   - `bg-linear-to-l` → `bg-gradient-to-l`
   - `border-(length:--border-beam-width)` → inline CSS `style={{ borderWidth: ... }}`
   - `mask-[...]`, `mask-intersect`, `[mask-clip:...]` → inline CSS (these are v4-only)
4. The `useInView` `margin` option has a type mismatch in framer-motion v11 — cast as `any`: `useInView(ref, { once: true, margin: "0px" } as any)`

**`BorderBeam` uses CSS `offsetPath` for the traveling dot animation.**
The `offsetPath: rect(0 auto auto 0 round ${size}px)` syntax requires browser support for CSS Motion Path. Supported in all modern browsers (Chrome 116+, Firefox 116+, Safari 17+). The parent card MUST have `position: relative` + `overflow: hidden` + `rounded-[inherit]` for the beam to clip correctly.

**`NumberTicker` only accepts `number`, not `string`.**
`formatVolume(kg)` returns a string (e.g. `"1.2k"` for large values). Do NOT pass formatted strings to NumberTicker. For volume stats, either: (a) pass the raw `kg` number and show `kg` as a suffix span, or (b) keep the string value and render it as plain text alongside other NumberTicker stats.
Implementation pattern used in QuickStats and MobileHero:

```tsx
{ numericValue: workoutsThisWeek, displayValue: null }  // → NumberTicker
{ numericValue: null, displayValue: formatVolume(vol) }  // → plain span
```

**`AnimatedCircularProgressBar` renders its own percentage text by default.**
The component renders `{currentPercent}` inside a centered span. When using it as a visual ring with custom inner content, wrap the component in `relative` and overlay an `absolute inset-0` div for custom label content. Hide the built-in span by overlapping it — or modify the component to accept `children`.

**`BlurFade` wraps children in a `motion.div` — watch for flex/grid layout interference.**
`BlurFade` renders a `<div>` wrapper around children. If you apply `BlurFade` to a grid child or flex item, the outer div becomes the grid/flex item. Use `className` prop on `BlurFade` to pass `flex-1`, `col-span-*`, etc. through to the wrapper div.

---

## Charts / Data Visualization

**`react-body-highlighter` is CJS-only — Vite handles it via dependency optimizer.**
The package has `main: "dist/index.js"` (CJS with `process.env.NODE_ENV` check) and no `module`/`exports` field. Vite's dep optimizer pre-bundles it fine. No special config needed. The SVG body model data lives in `dist/assets/` and gets inlined into the chunk (~29kB in Recovery bundle).

**`ZoneBandChart` SVG: zone band rects must render before the data path.**
SVG renders in document order (no z-index). Zone band `<rect>` elements must appear before the `<path>` in the SVG markup, otherwise the colored bands will cover the data line.

**Catmull-Rom spline needs ≥2 data points to render a curve.**
The `ZoneBandChart` component handles single-point datasets by rendering a standalone dot instead of attempting a path. Check `data.length < 2` before calling the spline interpolation function.

---

## Exercise / Workout Data

**`workoutSetLogs` has no `userId` column — join through `workoutSessions`.**
To query a user's set logs for a specific exercise, you must `INNER JOIN workoutSessions` on `workoutSetLogs.sessionId = workoutSessions.id` and filter by `workoutSessions.userId`. Direct `WHERE userId = ?` on `workoutSetLogs` will fail.

**All IDs in `exercises`, `workoutSessions`, `workoutSetLogs` are `varchar` (UUIDs), not integers.**
Don't `parseInt()` exercise or session IDs from URL params. Use them as strings directly with `eq(exercises.id, exerciseId)`.

**`/exercises` page is trainer-only — solo users get "Access Denied".**
Solo exercise history is accessed via `/solo/exercises/:id/history` route, not the `/exercises` page. Links from `ExercisesPage.tsx` exercise cards go to the solo route.

---

## Routes Architecture (Sprint 5, 2026-03-15)

**Route files are mounted at `/api` with full sub-paths, not at specific prefixes.**
The Sprint 5 extracted routers (clients, dashboard, onboarding, assignments, progress) are mounted at `/api` and define full paths like `/clients`, `/dashboard/stats`, etc. inside the router. This is because routes under the same domain span multiple prefixes (e.g., `/api/clients/:id/workouts` vs `/api/client/workouts/weekly`). Clean-prefix routers (exercises at `/api/exercises`, workouts at `/api/workouts`, appointments at `/api/appointments`) use relative paths.

**`secureAuth` is applied at the mount point for Sprint 5 routers.**
Rate limiting middleware (apiRateLimit, strictRateLimit, writeRateLimit) is applied per-route inside each router. Don't double-apply `secureAuth` in route handlers.

**`server/types/express.d.ts` augments Express Request with `user: User` and `session`.**
After Sprint 5, use `req.user!.id` (non-null assertion — `secureAuth` guarantees it exists) instead of `(req.user as any).id`. The `session` type includes `userId`, `destroy()`, and `Record<string, unknown>`.

---

## Middleware Registration Order (Sprint 6, 2026-03-16)

**`notFoundHandler` must be mounted at `/api` only, not at `/`.**
Mounting `notFoundHandler` at `/` would catch the SPA catch-all route (`res.sendFile('index.html')`) and return JSON 404s for client-side routes. Use `app.use('/api', notFoundHandler)` so only unmatched API routes get the JSON 404 — client-side routes still fall through to the SPA handler.

**`errorHandler` must be registered AFTER all routes AND after `notFoundHandler`.**
Express error handlers (4-arg middleware) must be the last `app.use()` call. The order is: routes → `notFoundHandler` → `errorHandler` → static/SPA serving.

**`requestLogger` generates a UUID per request and sets `X-Request-Id` header.**
The request ID is stored in a `WeakMap` keyed by the request object. Use `getRequestId(req)` from `./middleware/requestLogger` to retrieve it in any downstream handler. The error handler uses this automatically for Sentry context.

---

## Visual Quality / UI

**Loading screen is in AuthGuard.tsx, not a standalone component.**
The auth loading state (shown on every page load) is rendered inside `AuthGuard.tsx` (lines 78-120), not in `LoadingFallback.tsx`. `LoadingFallback` is only for Suspense/lazy-load chunk fetching. To change the branded loading screen, edit AuthGuard.

**`AnimatedCircularProgressBar` color is set via SVG `linearGradient` stops, not a prop.**
The component in `animated-circular-progress-bar.tsx` uses an inline SVG gradient. To make the ring color dynamic, modify the gradient stop colors in the consuming component's render, not via a `gaugePrimaryColor` prop (which doesn't exist). Recovery.tsx passes dynamic `ringColor` into the gradient stops.

**ZoneBandChart Y-axis needs a "nice numbers" algorithm for single data points.**
When min≈max, the default tick range produces identical Y-axis labels. The fix (Sprint 7) uses magnitude-based rounding to generate clean tick steps (multiples of 1, 2, 5, 10). Minimum 3 distinct ticks always. Falls back to [0, 100, 200] when all values are zero.

**Mobile tab bars must use `overflow-x-auto` with `w-max` inner container.**
At 390px, 4+ tab buttons clip at the viewport edge. Pattern: outer `overflow-x-auto scrollbar-hide`, inner `flex gap-2 w-max`, plus a right-side fade gradient (`bg-gradient-to-l from-background`) to indicate scrollability. Applied to Achievements tabs and AI Coach topic chips.

**`formatVolume()` already includes unit suffix — never append "kg" separately.**
`formatVolume()` returns "45.1k" for large values (includes the "k"). Adding "kg" after creates "45.1kkg". Pattern: `{formatVolume(value)}` alone. Use `volumeHasAbbreviation()` to check if the formatted string already has a suffix.

**Recovery vs Training Readiness — two different metrics.**
Training Readiness = ACWR training load score (28-day rolling window from `/api/solo/readiness`). Muscle Recovery = per-muscle-group recovery status from `react-body-highlighter`. These must be clearly labeled separately. Showing one score for both concepts confuses users (50% readiness with 16/16 recovered muscles looks contradictory but isn't).

**All loading states need brand presence — never show a blank screen.**
Dark purple spinner on near-black background is effectively invisible. The auth loading screen (AuthGuard.tsx) uses a branded "GG" logo with pulsing ring. Page-level loading should use skeleton loaders matching the page layout shape. Users think the app crashed if they see blank.

---

## Muscle Anatomy (added 2026-03-19)

**`memoryStorage.ts` must be updated whenever new columns are added to exercises.**
When `primaryMuscles`/`secondaryMuscles` were added to the exercises table, the mock
exercise objects in `memoryStorage.ts` also needed updating. Any new exercise columns
must be reflected there too or dev/staging environments that fall back to memory storage
will return incomplete data.

**Both workout API routes were returning no muscle data.**
`GET /api/workouts/detail/:id` was fetching only `muscleGroups[1]` (SQL array index —
first element only). `GET /api/workout-assignments/:id` was referencing
`ex.exercises?.muscleGroup` (singular — column doesn't exist). Always use
`muscleGroups?.[0]` for the legacy single field, and explicitly select
`primaryMuscles`/`secondaryMuscles` in any join that feeds WorkoutExecution.

**POST /api/exercises had no trainer role guard.**
`secureAuth` is any authenticated user. Trainer-only routes need an explicit inline
check: `if (req.user!.role !== 'trainer') return res.status(403).json({...})`.
No `requireRole` middleware exists — use the inline pattern.

---

## Notifications

**Don't manually add CSRF headers in client code — `client/src/main.tsx` has a global `window.fetch` interceptor that auto-injects `x-csrf-token` on every `/api/*` POST/PUT/PATCH/DELETE.**

Manually adding a CSRF header creates a duplicate. If the manual header uses different casing (`'X-CSRF-Token'`) the JS object literal stores it as a separate key from the interceptor's `'x-csrf-token'`, both spreads survive, and when the browser serializes the Headers object it joins them comma-separated — server sees a `~130-char` doubled token, fails the `length !== 64` cookie compare in `server/middleware/csrf.ts:73`'s `crypto.timingSafeEqual`, throws `RangeError: Input buffers must have the same byte length`, returns 500. First hit during Sprint 2 BATCH 2 real-Chrome verification: my Playwright fetch added `'X-CSRF-Token': token` thinking it was missing → debug pulled the rug.

**Rule for new client code:** rely on the main.tsx interceptor. If you need to set a CSRF header explicitly (e.g. multipart upload via `apiRequest`), use lowercase `'x-csrf-token'` to match the interceptor's key — the spread will dedupe correctly.

The middleware itself also has a small defensive gap: `crypto.timingSafeEqual` requires equal-length buffers, but the middleware doesn't pre-check lengths. Any mismatched length crashes with RangeError → 500. The defensive fix is `if (cookieToken.length !== headerToken.length) return 403` before `timingSafeEqual`. Captured as a tooling-sprint cleanup ticket — the fix is one line but tangential to Sprint 2.

---

**`PushSubscription` is a browser DOM global type (Notifications API).**
The server-side type for our database row is named `PushSubscriptionRecord`. Don't import or alias them as the same name in any file that runs in both environments — the server-side type and the DOM type have different shapes. The DB row has `id`, `userId`, `createdAt`, `failureCount`, `active`, etc. The DOM type has `endpoint`, `expirationTime`, `getKey()`, `toJSON()`, etc. Watch for this in service worker code, push subscription helpers, and any shared `lib/` code that touches both. First captured: Sprint 2 BATCH 1 (2026-05-05) — `shared/schema.ts` exports `PushSubscriptionRecord` (typeof pushSubscriptions.$inferSelect) deliberately, not `PushSubscription`.

---

## Local dev / tooling

**Disposable verifier scripts go in `.git/` not the tracked tree.**
Sprint 3 BATCH 1 used `.git/verify-013-dev.ts` and `.git/test-013-down-block.ts` for one-shot dev verification, then deleted them after running. Putting them in `.git/` (which is `.gitignore`d by definition) prevents accidental commits AND keeps them locally inspectable until manually cleaned. If you need a permanent verifier, put it in `scripts/` instead — `scripts/verify-prod-migrations.ts` is the durable companion. Pattern first used: Sprint 3 BATCH 1 (2026-05-06).

**Dev server dies between Playwright + Bash interleaving on Windows.**
Don't issue Bash calls between Playwright actions if the same `npm run dev` process needs to stay alive. Either batch all Playwright actions before any Bash, or accept that you'll restart the dev server. Sprint 1 BATCH 3.5 hit this twice during the screenshot session — `npm run dev` (run via `run_in_background`) exits when the harness kills the parent shell mid-session.

**Dev server runs `tsx` not `tsx watch` — file edits don't auto-reload.**
After backend changes (server/routes/_, server/services/_, server/middleware/\_, shared/schema.ts), the running dev server keeps the OLD code. Symptom: a route you just deleted still responds, or a Zod schema you just tightened still accepts old input. Diagnostic: hit a "shouldn't exist anymore" endpoint — if it returns the OLD code's response shape (e.g. a custom error string from a deleted handler) instead of the global `notFoundHandler`'s `{code: 'NOT_FOUND'}` response, you're seeing cached code. Fix per restart: `netstat -ano | grep :5000` → `taskkill //F //PID <pid>` → `npm run dev`. First hit during Sprint 1.5 BATCH 1 (2026-05-03). Future fix: `package.json` `"dev"` script → `"tsx watch server/index.ts"`. Deferred to a tooling sprint to avoid scope creep.

---

## CI / Build (added 2026-03-20)

**Pre-existing lint failures block CI — not from recent work.**
`npx eslint .` in CI fails on 3 files not touched in recent sprints:
`AchievementBadge.tsx` (double quotes, formatting), `sw.js` (`clients` undefined, formatting),
`_brain/scripts/fetch-resource.ts` (`console.log`). These were failing before Phase 4.
Local `npx eslint --quiet` on changed files passes fine. Clean up in a dedicated
lint-fix commit before next major release. Do not block feature work on these.

---

## framer-motion bundle chain (2026-03-20)

After removing framer-motion from AuthGuard and AppSidebar, vendor-motion chunk
still appears in modulepreload because AppHeader.tsx imports from framer-motion.
AppHeader is in the eager-load chain (App.tsx → AppShell → AppHeader).
Next target to fully eliminate framer-motion from the initial bundle.

Also: shoppingLists, shoppingListItems, groceryStores tables still exist in
shared/schema.ts as orphaned definitions — shopping.ts was deleted but schema
wasn't touched (schema changes require migrations). Note for future cleanup.

---

## ProtectedRoute is in the eager-load chain

ProtectedRoute.tsx is imported by RouterConfig.tsx which is imported by
AppShell.tsx — making it part of the initial bundle. Any framer-motion or
heavy dependency added to ProtectedRoute will eagerly load for every user
on every page. Keep ProtectedRoute dependency-light.

---

## Landing Page Architecture (2026-03-26)

**Hero + Choose Your Path are ONE merged section — not separate.**
`HeroChoosePathSection.tsx` replaces both `HeroPage.tsx` and `ChooseYourPathSection.tsx`.
`HeroPage.tsx` still exists as dead code but is not imported anywhere.
`ChooseYourPathSection.tsx` was deleted.

**Header Login button goes to `/auth/login`, NOT `#hero`.**
Home nav item scrolls to `#hero`. Login button navigates to the standalone login page.
Returning users want direct login access; new users discover roles by scrolling.

**Mobile swipeable cards: only adjacent card peeks.**
The card positioning uses `isNext`/`isPrev`/offscreen logic with `xPercent` calculations.
Non-adjacent cards get `translateX: 200%` (fully offscreen). Only ±1 index peeks.

**Mobile card zone needs fixed height, not flex-1.**
`flex-1` on the card container creates a massive empty gap below cards.
Use `height: 420px` (or similar fixed value) with `flex-shrink-0`.

**Mobile header clearance is 88px (80px header + 8px breathing room).**
All mobile landing sections that render below the fixed header need `paddingTop: 88`.
The mobile HeroChoosePathSection removes the duplicate logo — the fixed header already shows GYM GURUS.

**CTA zone must have fixed height to prevent "Disciple earthquake".**
Disciple renders 1 button; Guru/Ronin render 3 elements. Switching causes layout shift.
Fix: fixed height (160px mobile, 140px desktop) + `AnimatePresence mode="wait"` inside.

**RoleCardContent has `isMobile` prop for layout variant.**
Desktop: horizontal top row (circle left, checkmark right) with features below.
Mobile: centered vertical layout (circle → name → tagline → divider → features).
Without `isMobile`, the circle is invisible on mobile due to flex row layout.

**Landing section order (2026-03-26):**
`#hero` (HeroChoosePathSection) → `#how-it-works` → `#features` → `#about` → `#pricing` → `#faq` (FAQSection) → `#contact`

---

## Program Builder (2026-03-26)

**4 new DB tables:** `programs`, `program_weeks`, `program_enrollments`, `program_day_completions`.
Migration: `010_program_builder.ts`. Schema in `shared/schema.ts` at bottom.
API: `/api/programs` with CRUD + enroll + complete-day + active-enrollments.
AI generation: `POST /api/ai/generate-program` with fallback.
Frontend: 4 pages in `client/src/pages/programs/` + `Layers` icon in sidebar for all 3 roles.

**Program tables don't exist in production yet.**
Migration ran on Neon dev DB only. Production Railway DB needs the migration run before the program feature works there.

---

## Dev/Prod Database Sync (2026-03-26)

**Dev DB (Neon) and Prod DB (Railway) are completely separate.**
Local `.env` DATABASE_URL points to Neon. Prod uses Railway's internal Postgres.
Use `getDb()` / `getPool()` from `server/db.ts` for dev connections — direct `pg.Pool` with `process.env.DATABASE_URL` fails because `db.ts` reads `.env` manually.

**Array columns need native arrays, not JSON strings, when inserting via `pg.Pool.query()`.**
The pg driver handles PostgreSQL arrays natively. JSON.stringify on array columns causes `malformed array literal` errors.

**JSONB columns from prod may arrive as already-parsed objects.**
When copying JSONB data between databases, check if the value is already an object (pass as-is to JSON.stringify) or a string (pass as-is without double-stringifying).

**`workout_exercises.sets_configuration` has NOT NULL in dev but NULLs in prod.**
Had to `ALTER TABLE ... DROP NOT NULL` before syncing. Schema drift between dev and prod.

**Push subscription rotation: old subscription stays `active=true` until the next push attempt.**
The `pushsubscriptionchange` SW handler POSTs the new subscription but does not DELETE the old one — endpoints are opaque secrets the SW does not retain across rotations, and the `/subscriptions` list endpoint deliberately omits raw endpoint URLs (server-side secret). The 410 Gone response on the next push attempt naturally marks the old sub inactive via `pushService.applySubscriptionResult`.

Window: bounded by push frequency (most users get pushed at least daily). Cost: ~0 — inactive subs aren't queried for delivery, and stale active rows don't accumulate forever because the dispatcher's natural failure path cleans them up.

Sprint 12 (native shell) plan: extend `/api/notifications/subscriptions` with a redacted endpoint hash so the SW-rotation handler can explicit-match-and-delete the old row instead of waiting for the 410. Until then, this is a documented v1 trade-off.

First captured: Sprint 2 BATCH 3 (2026-05-05).

---

## Related Notes

- [[decisions]]
- [[file-upload-pipeline]]
- [[auth-system]]

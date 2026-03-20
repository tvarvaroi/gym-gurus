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

## Nonce-based CSP (§SEC-3, §SEC-5) — fully resolved 2026-03-15

**Decided**: Per-request nonce via `crypto.randomBytes(16).toString('base64')` → `res.locals.cspNonce`. `{{NONCE}}` placeholder replaced in index.html at serve time for both the role-flash `<script>` and a `<meta name="csp-nonce">` tag.
**Rejected**: `unsafe-inline` in scriptSrc or styleSrc.
**Why**: `unsafe-inline` negates XSS protection entirely. The role-flash IIFE uses `nonce` on the `<script>` tag. The `chart.tsx` ChartStyle reads the nonce from the meta tag and applies `nonce={nonce}` to its `<style>` element. React inline `style=""` attributes are covered by `styleSrcAttr: ["'unsafe-inline'"]` — a separate directive with no code-execution path.

---

## Stripe Checkout: meta + webhook pattern (2026-03-15)

**Decided**: Use `session.metadata.userId + tier` in `checkout.session.completed` for eager status update; rely on `customer.subscription.updated` for full sync.
**Rejected**: Updating subscription only on checkout — misses renewals, plan changes, and cancellations.
**Why**: Stripe's subscription lifecycle events (`updated`, `deleted`, `invoice.*`) are the authoritative source of truth. Checkout is just the entry point. Both are handled idempotently.

---

## Disciple login: upsert over deactivate+insert for access codes (2026-03-15)

**Decided**: `INSERT INTO client_access_codes ... ON CONFLICT (client_id) DO UPDATE` for all access code writes.
**Rejected**: Deactivate (UPDATE isActive=false) then INSERT new row.
**Why**: `client_access_codes.clientId` has a UNIQUE constraint. Deactivate+insert fails on the second code generation with a constraint violation. Upsert atomically handles both first-time and regeneration cases. See gotchas.md.

---

## Custom SVG charts over Recharts for solo progress (Sprint 3, 2026-03-15)

**Decided**: Replace Recharts `BarChart`/`AreaChart` in ProgressPage (solo view) with custom `ZoneBandChart` SVG component using Catmull-Rom spline interpolation.
**Rejected**: Keep Recharts for all charts.
**Why**: Zone bands (Optimal/Moderate/Detraining) require background `<rect>` elements behind the data line — Recharts `ReferenceArea` doesn't support the visual treatment needed (gradient fills, labeled zones). Custom SVG also enables the glowing endpoint, dashed average line, and period toggle (7D/4W/6M/1Y) without fighting Recharts' API. Recharts kept for trainer/client progress charts (different data model, adequate for bar charts).

---

## react-body-highlighter for muscle anatomy (Sprint 3, 2026-03-15)

**Decided**: Use `react-body-highlighter` npm package (2.0.5) for client-side SVG muscle diagram on Recovery page.
**Rejected**: Deploy custom musclegroup-image-generator as separate Railway service.
**Why**: npm package renders anterior/posterior SVG body models entirely client-side — no extra service to host, no API latency, no CORS, ~29kB in Recovery chunk. Maps API muscle group names to highlighter slugs via `MUSCLE_MAP` record. Color-codes muscles by recovery status using the `highlightedColors` array (green=recovered, amber=recovering, red=fatigued). The CJS-only package (`main: "dist/index.js"`, no ESM entry) works fine via Vite's dependency optimizer.

---

## Sprint 5 routes.ts monolith split (2026-03-15)

**Decided**: Extract 8 sub-routers from routes.ts (2,280 → 306 lines). New files: `onboarding.ts`, `dashboard.ts`, `clients.ts`, `exercises.ts`, `workoutsRouter.ts`, `assignments.ts`, `progress.ts`, `schedule.ts`.
**Rejected**: Single-file monolith; also rejected extracting WebSocket to a separate module (it needs `httpServer` creation).
**Why**: 2,252-line file mixing auth, workouts, exercises, clients, nutrition, gamification, recovery, AI, calculators, and notifications. Impossible to review, high change-collision risk between features. WebSocket stays because it needs `createServer(app)` return value.

---

## totalVolumeKg varchar → doublePrecision (Sprint 5, 2026-03-15)

**Decided**: Change `workoutSessions.totalVolumeKg` from `varchar` to `doublePrecision()`. Migration `008_volume_varchar_to_double.ts`.
**Rejected**: Keep as varchar with parseFloat/Number wrappers everywhere.
**Why**: 20+ call sites wrapped the value in `Number()`, `parseFloat(String(...))`, or `String(...)`. doublePrecision eliminates all conversion code. `userMuscleVolume.totalVolumeKg` stays as `decimal`.

---

## Express type augmentation (Sprint 5, 2026-03-15)

**Decided**: `server/types/express.d.ts` augments `req.user: User` and `req.session`. Use `req.user!.id` instead of `(req.user as any).id`.
**Rejected**: Keep `as any` casts.
**Why**: 40+ `as any` casts existed solely because Express.Request.user was untyped.

---

## Comprehensive errorHandler over simple globalErrorHandler (Sprint 6, 2026-03-16)

**Decided**: Wire `errorHandler` from `./middleware/errorHandler.ts` (with Sentry integration, structured logging, request context) instead of `globalErrorHandler` from `./middleware/errors.ts`.
**Rejected**: Keep using the simple `globalErrorHandler`.
**Why**: The simple handler only logged to `console.error` and returned basic JSON. The comprehensive one builds a Sentry-ready error context (request ID, user ID, path, status code), captures 5xx errors in Sentry in production, includes Zod validation details, and logs at appropriate levels (error for 5xx, warn for 4xx). Both coexist — the error classes from `errors.ts` (AppError, NotFoundError, ValidationError, etc.) are still used throughout the codebase; only the handler function was swapped.

---

## Structured requestLogger over inline monkey-patch (Sprint 6, 2026-03-16)

**Decided**: Replace the inline `res.json` monkey-patch logger in `index.ts` with the proper `requestLogger` middleware from `./middleware/requestLogger.ts`.
**Rejected**: Keep the inline logger that truncated at 80 chars and captured JSON response bodies.
**Why**: The inline logger monkey-patched `res.json`, captured response bodies (potential memory/security issue with large responses), and truncated logs at 80 chars making them unreadable. The proper middleware uses `crypto.randomUUID()` for request IDs, `process.hrtime.bigint()` for nanosecond timing precision, sets `X-Request-Id` headers for client correlation, skips health checks and static assets, and uses structured JSON logging in production.

---

## memoryStorage hard exit in production (Sprint 6, 2026-03-16)

**Decided**: `process.exit(1)` on startup if database is unreachable in production. MemoryStorage constructor throws in production.
**Rejected**: Silent fallback to in-memory storage.
**Why**: In-memory fallback causes invisible data loss — sessions, workouts, and payments processed during a DB outage are lost on restart with no trace. Failing loud ensures Railway auto-restarts the service and alerts are triggered. The `getStorage()` proxy already threw in production (Sprint 5), but the server continued running and accepting requests to non-storage endpoints. Now it refuses to start entirely.

---

## Recovery page data separation (2026-03-18)

**Decided**: Renamed hero score from "Recovery" to "Training Readiness" with subtitle "Based on your 28-day training load". Muscle diagram section labeled separately as "Muscle Recovery Status".
**Rejected**: Keep single "Recovery" label for both metrics.
**Why**: 50% readiness score with 16/16 recovered muscles is not contradictory — they measure different things. The ACWR score measures training load stress. The muscle diagram measures per-muscle fatigue. Both are valid and useful. They must be visually and semantically distinct.

---

## Dynamic ring color on recovery metrics (2026-03-18)

**Decided**: `AnimatedCircularProgressBar` ring color matches status: optimal (>=75%) green `#22c55e`, moderate (50-74%) amber `#f59e0b`, low (<50%) red `#ef4444`.
**Rejected**: Always use role accent color (purple for Ronin).
**Why**: Ring and badge showing different colors (purple ring vs amber badge) breaks the status signal. The ring IS the status indicator — it must match the severity level, not the role.

---

## Muscle anatomy primary/secondary split (2026-03-19)

**Decided:** Add `primaryMuscles` + `secondaryMuscles` TEXT[] columns to exercises table
alongside the existing flat `muscleGroups` array.
**Why kept separate:** `muscleGroups` is read by the recovery pipeline
(`userMuscleFatigue`, `userMuscleVolume`). Keeping it intact means zero risk to
recovery tracking. New columns are always set as the union of both arrays on
create/update.
**Migration:** 009_add_primary_secondary_muscles.ts — GIN indexes on both columns.
**Backfill:** server/scripts/backfill-muscle-split.ts — idempotent, uses
COMPOUND_EXERCISE_MUSCLES map, skips exercises with no matching key.

---

## ExerciseMuscleDisplay component (2026-03-19)

**Decided:** New component separate from MuscleAnatomyDiagram.
**MuscleAnatomyDiagram** — recovery/fatigue context only (Recovery page). Color-coded
by recovery status (green/amber/red).
**ExerciseMuscleDisplay** — exercise and workout contexts. Color-coded by role accent
(primary/secondary opacity). Two modes: display (read-only) and interactive (chip
picker). Three sizes: sm (card thumbnail), md (modal), lg (completion screen).
Both components use react-body-highlighter. Keep both — different purposes.

---

## DashboardHero combined version (2026-03-20)

Combined the premium aesthetic from the original hero (gradient card, blur orbs,
Playfair title, accent lines, Elite Trainer badge) with the Phase 2 data stats
(3 NumberTicker stats: Active Clients / Sessions This Week / Upcoming Today).
Hardcoded rgba(201,168,85) gold replaced with hsl(var(--primary)) — fully
role-aware. Corner SVGs and noise texture removed. whileHover scale on outer
card removed. Single entrance animation on content block only.

---

## Disciple visual pass (2026-03-20)

ClientDashboard full rewrite — compact premium hero matching Guru aesthetic
(gradient card, entrance-only blur orbs, Playfair title, 3 NumberTicker stats:
Assigned Workouts / Completed / Streak). All 50+ hardcoded cyan-500/teal-500
replaced with hsl(var(--primary)). framer-motion 20+ → 3 entrance-only.
Cross-page: 31 isClient cyan ternaries removed from ProgressPage + SchedulePage.
UX fixes: Coach tab hidden for Disciple, Access Denied shows "Disciple" not "client",
Settings Plan tab shows trainer-managed copy, Body Stats references trainer not AI Coach,
login link neutral colour, Cormorant Garamond → Playfair Display.

---

## Phase 3C Progress page cleanup (2026-03-20)

Removed 106 framer-motion usages from ProgressPage — all motion.div entrance
fades, whileHover, whileTap, repeat:Infinity → CSS animate-in, hover:-translate-y-1,
animate-pulse. BlurFade wrappers removed (3 instances). useReducedMotion removed.
Added "vs prev week" and "vs prev session" labels to delta badges on Volume charts.
Preserved: ZoneBandChart zones, Training Load Ratio ACWR card, heatmap, PRs table,
semantic stat card colours (purple/teal/amber/blue — intentional differentiation).

---

## Phase 4 execution upgrades (2026-03-20)

WayToGoCard: new full-screen post-set celebration overlay. Role-aware gradient,
Playfair Display italic title, auto-dismisses after 1.2s or tap. Rest timer
starts AFTER card dismisses — rest duration captured at set-complete time and
passed to dismiss handler via ref (no stale closure). Skipped on last set of
last exercise (CompletionSheet is the celebration there). z-[80] — above
RestTimerOverlay z-[60], below exit dialog z-[100].

RestTimerOverlay "Up Next" upgraded from dim plain text to bordered card with
ChevronRight icon + rest duration of next exercise. `restSeconds` added to
`nextExerciseInfo` interface.

framer-motion removed from RestTimerOverlay (1 motion.div wrapper) and
CompletionSheet (8 motion.div → staggered CSS animate-in with animationDelay
300–800ms + animationFillMode: backwards). AnimatePresence wrapper removed
from WorkoutExecution.tsx around RestTimerOverlay.

Confetti and shimmer/pulse-primary CSS animations always run — accessibility
handled by `@media (prefers-reduced-motion: reduce)` at CSS level instead of
JS `useReducedMotion` hook. framer-motion still used in WorkoutExecution for
exercise content slide transitions and exercise list bottom sheet (not in scope).

---

## Related Notes

- [[gotchas]]
- [[auth-system]]
- [[file-upload-pipeline]]

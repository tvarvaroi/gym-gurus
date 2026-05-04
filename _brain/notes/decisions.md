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

## Phase 5 PR sunburst badges (2026-03-20)

PRSunburstBadge: pure SVG, zero deps, memoized. Gold (rank 1) 8 rays + radial
gradient + white highlight ring + drop shadow. Silver (rank 2) 6 rays muted.
Bronze (rank 3) 6 rays warm brown. Props: rank 1|2|3, size (default 48).
Wired into ProgressPage PRs table (rank column, badges rows 1-3, plain numbers 4+).
Added Top Personal Records section to Achievements page between StreakCalendar
and Category Tabs. Conditional on personalRecords.length > 0. Uses same
queryKey as ProgressPage — TanStack deduplicates.
Achievements framer-motion: 27 → 3. Kept AnimatePresence mode=popLayout +
motion.div layout for filter transitions. Removed BlurFade ×4, entrance fades ×6,
repeat:Infinity glow → animate-pulse.

---

## Cleanup sprint (2026-03-20)

VA-4: SettingsPage local TIER_NAMES replaced with getPlanDisplayName from @/lib/roles.
BE-4: server/config/env.ts deleted — email.ts migrated to server/env.ts.
BE-5: 6 debug scripts moved from server/ to scripts/ with production guard.
BE-6: server/routes/shopping.ts deleted (890 lines) — was never mounted.
FE-7: framer-motion removed from AuthGuard (5 motion.div → CSS animate-pulse/animate-in)
and AppSidebar (21 motion elements → CSS hover: transitions, group-hover:, max-h transitions).
vendor-motion chunk still appears in modulepreload via AppHeader.tsx — next target.
ESLint: client/public/** and \_brain/** added to ignores. AchievementBadge fixed.

---

## §FE-7 complete — framer-motion out of initial bundle (2026-03-20)

Removed framer-motion from AppHeader (26), NotificationCenter (3), and
ProtectedRoute (11) — 40 total usages. vendor-motion chunk (115.92 kB /
38.36 kB gzip) no longer in modulepreload. First page load no longer
downloads framer-motion at all.

Full eager-load chain now framer-motion free:
App.tsx → AppShell.tsx → AuthGuard + AppSidebar + AppHeader +
NotificationCenter + ProtectedRoute

framer-motion still loads lazily for pages that use it directly:
Achievements, Dashboard, WorkoutExecution, etc.

Key pattern: rotating gradient ring → CSS animate-spin with animationDuration
override. DropdownMenuContent asChild + motion.div → Radix data-[state] CSS.

---

## Hero + Choose Your Path merge (2026-03-26)

**Decided:** Merge HeroPage and ChooseYourPathSection into a single above-fold
`HeroChoosePathSection.tsx`. Desktop: 40/60 split (branding left, 3-card bento
right). Mobile: swipeable card stack with pagination dots + CTA zone.
**Rejected:** Keeping ChooseYourPath as a separate section after Pricing (6 sections
before any conversion action).
**Why:** CRO research — 80% of time is spent above the fold. Every scroll = dropout
risk. Role selection IS the conversion action and must be the first thing seen.
Cards navigate to `/auth/login?role=` — no inline auth form on landing.

---

## Header Login vs Home distinction (2026-03-26)

**Decided:** Home nav item scrolls to `#hero`. Login button navigates to `/auth/login`.
**Rejected:** Both pointing to `#hero` (which we had briefly).
**Why:** Different user intents. New visitors discover roles via the hero section.
Returning users who already know their role want direct access to the login form.

---

## Landing page FAQ section (2026-03-26)

**Decided:** Dedicated `FAQSection.tsx` with 20 questions in 4 groups, using shadcn
Accordion. Placed between `#pricing` and `#contact`.
**Rejected:** Inline FAQ within PricingPage (was 4 questions only).
**Why:** 20 codebase-accurate questions serve both SEO (FAQ schema) and user trust.
Group structure (Getting Started / Guru / Ronin / Platform) matches user journeys.
Removed the small 4-question FAQ from PricingPage to avoid duplication.

---

## Program Builder architecture (2026-03-26)

**Decided:** Programs are multi-week containers with `programWeeks` (JSONB days array
per week). Enrollments track user progress (currentWeek/currentDay).
DayCompletions record individual day finishes.
**Rejected:** Extending the existing workouts table with a "program" flag.
**Why:** Programs and workouts are different abstractions. A program contains multiple
workouts across weeks. Keeping them separate avoids schema overload on the workouts
table and allows independent program lifecycle (enroll, pause, complete, abandon).

---

## Open Wearables for unified wearable integration (2026-04, Q2-Q3 roadmap, Sprint 4)

**Decided:** Self-hosted Open Wearables (MIT, free, Railway-deployed) for all wearable
integrations — Whoop, Oura, Garmin, Strava, Withings, Fitbit, Polar, Suunto.
**Rejected:** Terra API ($0.50–$2/user/month, $60k–$240k/year at 10k users). Building
6+ separate OAuth integrations.
**Why:** Zero per-user fees, data sovereignty (never leaves our infra), MCP server for
direct AI Coach integration, MIT license = customizable. Trade-off: more dev work to
host vs Terra's drop-in, accepted because infrastructure quality > shipping speed for
Q2-Q3 horizon. Source: `docs/plans/2026-05-02-q2-q3-master-roadmap.md`.

---

## Capacitor for native iOS+Android shell (2026-04, Q3 roadmap, Sprint 12)

**Decided:** Wrap existing React app with Capacitor. Native code only for HealthKit /
Health Connect / FCM bridges.
**Rejected:** React Native (full rewrite cost), separate native apps in Swift+Kotlin
(sync nightmare).
**Why:** ~95% code reuse, web app and native app stay in sync, native APIs accessible
where needed. Apple Health and Google Health Connect both require native SDK — no web
alternative exists. Web push converts at ~16% on iOS PWA vs 40-70% native, so the
notification ROI also justifies the shell. Source:
`docs/plans/2026-05-02-q2-q3-master-roadmap.md`.

---

## Daily wellness check-in: optional with nudges (2026-04, Sprint 3)

**Decided:** Daily wellness check-in is optional. Gentle nudge after 24h skip. After 7
consecutive skipped days → "are you still using GymGurus?" re-engagement check.
**Rejected:** Required (friction risk, churn driver). Pure-optional with no nudges
(habit never forms).
**Why:** Habit formation needs gentle pressure but not coercion. The 7-day
re-engagement is for genuine churn detection, not a punishment. Source:
`docs/plans/2026-05-02-q2-q3-master-roadmap.md`.

---

## Disciple → Guru wearable data sharing default-on (2026-04, Sprint 4)

**Decided:** Disciples share wearable + biometric data with their Guru by default.
Explicit consent shown at Disciple onboarding. Granular per-data-type opt-out in
settings.
**Rejected:** Default-off opt-in.
**Why:** The entire value prop of having a Guru is they coach based on your data.
Default-off creates a lifeless coach experience. Consent is informed and reversible.
Source: `docs/plans/2026-05-02-q2-q3-master-roadmap.md`.

---

## Wearable features bundled into existing pricing tiers (2026-04, Sprint 4 + Sprint 8)

**Decided:** Bundle wearable features into existing tiers. 1 wearable connection on
Ronin/Guru. Unlimited connections + AI context-aware coaching + Adaptive Programming
on Ronin AI / Pro Guru.
**Rejected:** New SKU for wearables.
**Why:** Avoid SKU sprawl. Use the wearable count + AI features as the upsell lever to
push power users from Ronin → Ronin AI and Guru → Pro Guru. Source:
`docs/plans/2026-05-02-q2-q3-master-roadmap.md`.

---

## `progressEntries` polymorphic refactor (Sprint 1, 2026-05-02)

**Decided:** Refactor `progressEntries` to be polymorphic — `clientId` becomes nullable, `userId` added (also nullable), with a CHECK constraint enforcing exactly one is set (XOR). Migration `011_biometrics_foundation.ts`.

**Rejected:**

1. Add a parallel `userProgressEntries` table for self-tracking users.
2. Keep `clientId` mandatory and force Ronin/Guru to be their own "client".

**Why:** Sprint 1 had to unblock Ronin (and Guru-as-self-tracker) to log body progress. Today the table is `clientId NOT NULL`, which means only Disciples have any progress history. Parallel-table option doubled the surface area for every later feature (charts, exports, AI context). Self-as-client option corrupts the trainer/client semantics throughout the app.

The XOR CHECK constraint (`(user_id IS NOT NULL AND client_id IS NULL) OR (user_id IS NULL AND client_id IS NOT NULL)`) keeps the database honest — every row is either user-owned or client-owned, never both, never neither. Application code branches on which column is set.

---

## `share_body_metrics_with_trainer` default-on, single boolean for v1 (Sprint 1, 2026-05-02)

**Decided:** Single boolean column on `clients`, defaults to `true`. Disciple can toggle off in Settings → Privacy. Photos are NEVER trainer-visible regardless of the flag in v1.

**Rejected:**

1. Per-data-stream consent (separate flags for weight, body fat, photos, sleep, etc.)
2. Per-photo consent.
3. Default-off until Disciple opts in.

**Why:** The Q2-Q3 roadmap locked "Disciple → Guru data sharing: default-on with granular consent + opt-out" as a master decision. Sprint 1 ships the bare minimum that aligns with that direction — one boolean, body-metric scope only. Photos are intentionally carved out because they're the highest-sensitivity biometric data and deserve granular per-photo consent (Sprint 4).

Default-off would have made the trainer view useless on day 1 for the 90%+ of Disciples who'd never discover the toggle. Default-on with a clearly explained opt-out toggle (and copy that says "your trainer is told it's a privacy choice, not an error") delivers data parity for trainers without removing Disciple agency.

The single-boolean simplicity is a deliberate Sprint 1 constraint. Sprint 4 will replace this with granular siblings (`share_sleep_with_trainer`, `share_hrv_with_trainer`, etc.) AND `clients.user_id` as a proper FK. Don't grow the boolean strategy — replace it.

---

## Single-point chart fallback uses recharts native dot, not ZoneBandChart (Sprint 1 BATCH 5, 2026-05-02)

**Decided:** When a Trends chart has exactly one data point, render it as a recharts `<Line>` with a larger `dot={r:8}` and a "Log another to see the line." caption absolutely-positioned inside the chart area (italic, muted-foreground, translate-y-8 to sit just below the dot).

**Rejected:**

1. Import `ZoneBandChart` (used elsewhere for Recovery and Progress charts) which already has single-point fallback logic.
2. Show no chart at all when entries < 2 — just a placeholder card.
3. Show the chart with a default flat line at the value.

**Why:** ZoneBandChart is purpose-built for ACWR/training-load with colored zone bands (red/amber/green). Body metrics have no zones — there's no "good range" for weight or body fat that applies universally. Importing it would force one of: (a) fake zone bands that don't mean anything, or (b) a stripped-down variant that's effectively a different component.

Recharts' `<Line>` with `dot=true` natively renders a visible dot when there's only one point. The `padSinglePoint()` helper adds a ghost null point 7 days before to give the chart a visible domain (otherwise the dot sits awkwardly at the right edge with no breathing room). Caption inside the chart frames the lone dot as "your data, more is coming" rather than as a placeholder above an empty box.

This pattern generalizes — any future chart with sparse early-stage data can adopt the same `padSinglePoint` + `r:8` + inline caption recipe. Domain-specific charts (recovery, training load) keep using ZoneBandChart.

---

## Unit preference via localStorage `gg_units` flag for v1 (Sprint 1, 2026-05-02)

**Decided:** User toggles `kg·cm` / `lb·in` via the BiometricsPage `UnitsToggle`. Selection persists in `localStorage` under key `gg_units`. All inputs convert to canonical (kg, cm) before POST. All displays read the flag at render time.

**Rejected:**

1. Add `preferredUnits` column to `users` table now.
2. Add `preferredUnits` column to a new `userFitnessProfile` table now.
3. Auto-detect from browser locale (`Intl.Locale.weekInfo` + country).

**Why:** Sprint 1 doesn't need server-side persistence yet because (a) the unit choice is per-device anyway (you don't suddenly want metric on your laptop and imperial on your phone), and (b) the proper home for it is the eventual `userFitnessProfile` table that arrives Sprint 4 alongside granular consent flags. Adding it now would mean migrating it later, and Sprint 4 has a more comprehensive plan for fitness preferences.

Auto-detect from locale was rejected because users frequently want imperial despite living in metric countries (and vice versa). User-explicit > inferred.

The `client/src/lib/units.ts` helpers (`getUnits`, `setUnits`, `displayWeight`, `displayPercent`, `displayLength`, `toCanonicalWeight`, `toCanonicalLength`, `weightUnitLabel`) abstract away the storage path — when Sprint 4 migrates to `userFitnessProfile.preferredUnits`, only these helpers change. Call sites stay untouched. The TODO is documented inline in `units.ts`.

---

---

## web-push MPL-2.0 dependency accepted (2026-05-05, Sprint 2 BATCH 1)

**Decided:** `web-push@3.6.7` (MPL-2.0) accepted as a Sprint 2 dependency.

**Rejected:**

1. `node-pushnotifications` — transitively depends on web-push, inherits the same license obligations with extra abstraction overhead.
2. Rolling our own RFC 8291 implementation — multi-week distraction with real cryptographic risk for zero gain.

**Why:** MPL-2.0 file-level weak copyleft permits unmodified dependency use in a closed-source commercial product. We don't modify the package source. Consistent with existing accepted licenses in the stack (Apache-2.0 via `@aws-sdk/*`, ISC, BSD). web-push is the de-facto standard for Node.js web push (3.6M weekly downloads, Mozilla's official reference implementation).

**Constraint:** if we ever need to modify web-push internals, the modified files must be released under MPL-2.0. We won't.

---

## Related Notes

- [[gotchas]]
- [[auth-system]]
- [[file-upload-pipeline]]

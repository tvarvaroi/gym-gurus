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

## Privacy/forensic deletion: audit-first ordering (2026-05-05, Sprint 2 BATCH 2)

**Pattern:** Audit logs for account deletion / data anonymization fire BEFORE any mutation. Original PII (email, names, third-party IDs) is captured in the audit log first; only then does the destructive operation begin.

**Why:** After anonymization the audit log is the only surviving record of who the user was. If audit fires after, an in-flight failure leaves no forensic trail. Privacy regulators (GDPR Article 30, CCPA) require deletion logs.

**Rule for future flows:** any helper that anonymizes/deletes user data must audit first, mutate second. Captured concretely in `server/services/userDeletion.ts` — Step 1 logs, Steps 2-5 mutate.

---

## web-push MPL-2.0 dependency accepted (2026-05-05, Sprint 2 BATCH 1)

**Decided:** `web-push@3.6.7` (MPL-2.0) accepted as a Sprint 2 dependency.

**Rejected:**

1. `node-pushnotifications` — transitively depends on web-push, inherits the same license obligations with extra abstraction overhead.
2. Rolling our own RFC 8291 implementation — multi-week distraction with real cryptographic risk for zero gain.

**Why:** MPL-2.0 file-level weak copyleft permits unmodified dependency use in a closed-source commercial product. We don't modify the package source. Consistent with existing accepted licenses in the stack (Apache-2.0 via `@aws-sdk/*`, ISC, BSD). web-push is the de-facto standard for Node.js web push (3.6M weekly downloads, Mozilla's official reference implementation).

**Constraint:** if we ever need to modify web-push internals, the modified files must be released under MPL-2.0. We won't.

---

## Push permission prompt: appointment-confirmation trigger (deferred from Sprint 2 BATCH 5)

**Status:** Deferred from Sprint 2 BATCH 5 (2026-05-05).

**Reason:** Disciple-side appointment-confirmation flow does not exist yet. The `appointments` table has `status` column with values `scheduled / completed / cancelled` only — no `confirmed` state, and no Disciple-side endpoint to confirm an appointment a Guru has scheduled. Adding the trigger today would mean dead code waiting for a feature.

**Action when feature lands:** Add a post-action trigger inside the Disciple-side appointment-confirm mutation `onSuccess`, gated by:

1. `user.role === 'client'` — only Disciples. Guru-created appointments do NOT trigger the prompt; the Guru wasn't part of that interaction.
2. First confirmed appointment ever — same `localStorage.getItem('gg_push_prompt_seen')` gate the body-metric trigger uses.

Pattern reference: `client/src/components/biometrics/LogBodyMetricsSheet.tsx` (search for `shouldShowPushPrompt()`). It is the cleanest example of "first action of this kind" gating because it also handles the editing/non-first case (`!editing && shouldShowPushPrompt()`).

**Why care:** Disciples who never log body metrics or interact with AI Coach get no push prompt today. The workout-completion trigger catches some — but only after their trainer assigns a workout and they actually execute it via WorkoutExecution.tsx. Appointment confirmation would catch them earlier in their lifecycle, right at the moment they're committing to a session.

**Cross-references:**

- Sprint 2 BATCH 4 brainstorm Q1 amendment (where this trigger was approved).
- Sprint 2 BATCH 5 commit (where it was deferred with rationale).
- Q2-Q3 master roadmap: appointment-confirm flow is not currently on the locked sprint list. When it appears, this trigger is part of that work.

---

## localStorage -> server migration pattern (2026-05-05, Sprint 2 BATCH 6)

**Pattern:** When migrating a client preference from `localStorage` to a server-backed column, both shapes coexist during the deploy window. Stale builds read the old `localStorage` path until they refresh.

**Worst case:** brief flip back to default on one device while another device runs the new build.

**Bounded by:** deploy completion. Affects display layer only — no data corruption.

**Self-heal:** migration shim runs on next refresh, reads legacy `localStorage`, PATCHes server, clears `localStorage`. Idempotent — once cleared, the shim is a no-op forever after.

**First applied:** Sprint 2 BATCH 6 (`gg_units` preference -> `users.preferred_units`). Future reuse: any localStorage flag that needs cross-device consistency. Reference implementation: `client/src/hooks/useUnits.ts` migration `useEffect`.

---

## Notification fanout: one row + many push subscriptions (2026-05-06, Sprint 2 BATCH 2)

**Decided:** A single `notifications` row represents the user-facing event. Push delivery is a many-fan-out across `push_subscriptions` rows belonging to that user. The notification row carries `deliver_after` / `delivered_at` semantics; per-subscription state lives on the subscription row (`active`, `last_used_at`, `failure_count`).

**Rejected alternatives:**

1. One row per (user, device) — duplicates the user-facing event. The unread-count and inbox queries would have to dedupe.
2. Notifications carry an array of subscription IDs — fragile when subscriptions are revoked mid-flight; couples write-time to fan-out time.

**Why:** The notification row is the source-of-truth for "what the user saw." Push delivery is best-effort transport. Separating them lets each evolve independently — for example, the cron retry job manipulates push state without ever rewriting the notification row.

**deliver_after / delivered_at semantic:**

- `deliver_after IS NOT NULL AND delivered_at IS NULL` → cron-claimable
- `delivered_at IS NOT NULL` → settled (whether push succeeded, expired, or fell through to email/no_destination)
- The partial index on `deliver_after WHERE deliver_after IS NOT NULL AND delivered_at IS NULL` keeps the cron's claim query O(1) regardless of historical row count.

**Reference:** `server/services/notificationDispatcher.ts` (dispatch, deliverPending), `server/migrations/012_notification_engine.ts`.

---

## Quiet hours: per-user JSON config + cron retry + SELECT FOR UPDATE SKIP LOCKED (2026-05-06, Sprint 2 BATCH 2)

**Decided:** Quiet hours stored inline in `users.notification_preferences` as `{enabled, start, end, timezone}`. `computeDeliverAfter()` uses `Intl.DateTimeFormat` with the user's IANA timezone to compute the next window-end instant. Cron job (`server/jobs/cleanupExpiredQuietHours.ts`) claims expired rows via `SELECT FOR UPDATE SKIP LOCKED` and fires `deliverPending(notificationId)` per claimed row. Re-entrancy guarded by `isTickInFlight` boolean.

**Rejected:**

1. Separate `quiet_hours` table — unnecessary indirection for what is intrinsically a user setting.
2. Single global cron lock — `SELECT FOR UPDATE SKIP LOCKED` is the documented Postgres idiom for fan-out workers and lets us scale beyond one cron node later. Today only one node runs, but the pattern means we don't have to revisit when we add a second.
3. moment-timezone — Intl.DateTimeFormat is sufficient for "what hour is it in user's TZ" + delta-based computation.

**Why:** Quiet hours are user-scoped, low-cardinality (one row per user), and rarely changed — co-locating with the rest of the prefs keeps the read path (single SELECT users) simple. The cron pattern matches Sprint 1.5's biometric upload-quota design and is worth standardizing across the codebase.

**Re-entrancy guard:** `isTickInFlight` is a process-local boolean. If two ticks fire faster than one completes (manual interval test at 100ms), the second tick exits early. The guard is documented inline; tests verify it.

**Interval clamping:** `Math.max(1000, parseInt(...))` rejects values <1s, NaN, negative. Falls back to 5min default.

**Reference:** `server/jobs/cleanupExpiredQuietHours.ts`, `server/services/notificationDispatcher.ts:computeDeliverAfter`.

---

## Email fallback default-on with high-priority allowlist (2026-05-06, Sprint 2 BATCH 2)

**Decided:** `users.notification_preferences.channels.email` defaults to `true` for users who had legacy `email: true` in pre-Sprint-2 prefs (preserved by migration 012 backfill via `COALESCE`); `false` for new users. Email fires ONLY when push delivers to zero subscriptions AND the notification type is in `EMAIL_FALLBACK_HIGH_PRIORITY_TYPES` (a compile-time exhaustive constant).

**Rejected:**

1. Email mirrors every push — duplicate-channel noise, user backlash. The whole reason we added email fallback is "what if push fails for billing/payment alert."
2. Email fires when push fails ANY device — overly aggressive; one offline device shouldn't trigger duplicate channel.
3. Email always-on for everything — dilutes "email = important" signal.

**Why:** The high-priority allowlist (currently `payment_received`, `workout_assigned`, `appointment_reminder`) encodes the actual user contract: "you'll get an email if a critical alert can't reach your devices." Anything not on the list (achievements, social, marketing-style notifications) stays push-only, no-fallback.

**Compile-time exhaustive constant:** `EMAIL_FALLBACK_HIGH_PRIORITY_TYPES` is typed as `readonly NotificationType[]` with `satisfies` so adding a new notification type forces a decision: either add it to the allowlist or explicitly leave it out. No silent drift.

**Reference:** `server/services/notificationTemplates.ts:EMAIL_FALLBACK_HIGH_PRIORITY_TYPES`, `server/services/notificationDispatcher.ts:isEmailFallbackEligible`.

---

## EMAIL_FALLBACK_HIGH_PRIORITY_TYPES as compile-time exhaustive constant (2026-05-06, Sprint 2 BATCH 2)

**Decided:** Use TypeScript `satisfies` operator on the allowlist constant so the compiler verifies every entry is a valid `NotificationType` and unrecognized strings break the build.

```ts
export const EMAIL_FALLBACK_HIGH_PRIORITY_TYPES = [
  'payment_received',
  'workout_assigned',
  'appointment_reminder',
] as const satisfies readonly NotificationType[];
```

**Rejected:**

1. Plain `string[]` — typo-prone; "payment_recieved" would silently never match.
2. `Record<NotificationType, boolean>` — forces every type to declare in/out, inflates the constant when most types aren't email-eligible.
3. Runtime allowlist Zod schema — adds a runtime check for what is intrinsically a static list. The compile-time check is faster and stronger.

**Why:** This constant is small (3 entries today, maybe 10 long-term) and load-bearing for "which alerts wake the user via email when push is silent." `satisfies` is the right tool — narrow inferred type for runtime use (literal tuple), checked against the wider `readonly NotificationType[]` constraint at compile time.

**Future-proofing:** When a new notification type is added in `notificationTemplates.ts`, the dev decides at code-write time whether it's email-eligible. The constant is the single place to look. No sprawling switch statements.

**Reference:** `server/services/notificationTemplates.ts`.

---

## "Today" definition: `users.notification_preferences.quietHours.timezone` (2026-05-06, Sprint 3 BATCH 1)

**Decided:** All "today" / "this morning" / "yesterday" semantics across the platform read from `users.notification_preferences.quietHours.timezone` (the IANA timezone the user configured for quiet hours). Browser timezone is NEVER consulted for date-bucketing decisions.

**Rejected:**

1. **Browser timezone** — would cause "today" to flip when user travels. A user who logged a wellness check-in at 23:55 in Bucharest, then flew to NYC and opened the app at 22:00 EST, would see two "today" rows on the same calendar day from their perspective, AND lose their streak when the cron evaluated "did they check in today?" using EST.
2. **Server UTC** — forces every user to do timezone math in their head ("it's 1am here so my streak should still be safe, right?"). Server-UTC date bucketing is correct for analytics, wrong for user-facing date semantics.
3. **Separate `users.timezone` column** — stores the same value twice (it's already in `users.notification_preferences.quietHours.timezone`). A new column would drift from the prefs value any time one was updated without the other.

**Why:** Single source of truth. The user explicitly chose this timezone in Settings — using it for date bucketing matches their mental model. Travelers don't get spurious streak-break events at midnight UTC while still in their morning. Eventually-consistent: when the user updates their timezone in Settings, every date-bucketing decision flips together because they all read from the same column.

**Rule for future sprints:** Any backend logic that computes "today" or buckets data by date must accept a `tz` parameter (defaulting to the user's stored timezone). Frontend MUST use the same timezone via the `useUserTimezone()` hook (Sprint 3, `client/src/hooks/useUserTimezone.ts`). Never use `new Date().toISOString().slice(0,10)` or `Intl.DateTimeFormat()` without an explicit `timeZone` option for any persisted date.

**First applied:** Sprint 3 BATCH 1 (wellness check-in). Shared by:

- `wellnessService.todayInTimezone(tz)` — server-side
- `wellnessService.upsertTodayEntry(userId, tz, partial)` — uses tz for the date column
- `dailyWellnessNudge.ts` cron — filters by user-local 07:00–11:00 window
- `wellnessReengagement.ts` cron — checks 7-day-ago in user-local time
- `useUserTimezone()` frontend hook — reads from prefs query
- `wellnessTime.ts` helpers — `todayInUserTimezone()`, `dateMatchesUserToday()`

**Future inheritors:** Sprint 4 wearables (when did the user wake up?), Sprint 6 Recovery Engine v2 (what's the comparison window?), Sprint 9 habits (did they hit the streak today?), Sprint 13 insights (which day to bucket data into?).

---

## Migration retry-cron pattern: explicitly mark historical rows as settled (2026-05-06, Sprint 2 BATCH 2 / migration 012 prod run)

**Pattern:** When a migration adds `trigger_at` / `processed_at` columns (or any pair where a non-NULL trigger column makes the row claimable by a cron) onto an existing table, the migration must explicitly mark every pre-existing row as settled — don't rely on the columns starting NULL.

**For migration 012:** lines 92–97 explicitly UPDATE every pre-existing notifications row to `delivered_at = created_at` while leaving `deliver_after IS NULL`. Result: pre-existing rows have BOTH gates closed against the cron's claim query (`WHERE deliver_after IS NOT NULL AND deliver_after <= NOW() AND delivered_at IS NULL`):

- `deliver_after IS NULL` → fails the first predicate
- `delivered_at IS NOT NULL` → fails the third predicate

**Why belt-and-suspenders matters:** If a future bug somehow populates `deliver_after` on a historical row (e.g. a careless backfill, an incorrect dispatch path), the second gate (`delivered_at IS NOT NULL`) still protects against re-delivery. Relying on a single NULL invariant is fragile because any column-population bug breaks it. Marking rows explicitly settled is durable.

**Rejected alternatives:**

1. Leave both columns NULL on pre-existing rows — relies on `deliver_after IS NULL` alone to keep cron away. One bug populating `deliver_after` and the cron would claim historical rows for re-delivery.
2. Add a separate `migrated_pre_cron BOOLEAN` flag — extra column, extra schema complexity, no semantic benefit over `delivered_at = created_at`.

**Why:** The original spec for migration 012 didn't explicitly require the backfill — `deliver_after IS NULL` would have been "enough" given the cron query. The implementation was deliberately stricter. The Sprint 2 prod-migration audit (post-012 verifier assertion h) caught this and confirmed the safer-than-spec behavior.

**Future migrations that introduce retry-cron columns inherit this pattern.** Apply to any sprint that adds `next_retry_at` / `last_attempted_at` / `processed_at` semantics: backfill historical rows to the "settled" state explicitly, never rely on default-NULL alone.

---

## Profile photo background removal — feature paused due to AGPL dependency removal (2026-05-06, Sprint 2.5)

**Status:** Paused, not abandoned. Restore when an MIT-licensed alternative is evaluated and adopted.

**What was paused:** Server-side automatic background removal on profile-image upload (`server/routes/settings.ts` profile-image-upload handler). The original implementation called `@imgly/background-removal-node` to produce a transparent-background PNG, then `sharp().trim().png()` to clamp the bounding box to the subject. Result was a profile photo where the subject is "cut out" cleanly against the role-themed UI background.

**Why paused:** `@imgly/background-removal-node@1.4.5` is **AGPL-3.0** licensed. AGPL's network-use clause requires source disclosure to any user interacting with the software over a network. GymGurus is closed-source SaaS — incompatible. Sprint 2 BATCH 8 license audit caught it; Sprint 2.5 removes it.

**What still works:** Profile photos still upload, resize, and convert to WebP via `sharp` inside `uploadImage()` (`server/services/fileUpload.ts:49,51`). The only thing missing is the auto-cutout against the original photo's background.

**Why this matters to product (preserved for restoration):** The user explicitly values the premium aesthetic of background-removed profile photos cut out to the body silhouette — it's part of GymGurus's distinct visual language, not arbitrary polish. When restoring, prioritize visual quality of the cutout (clean edges, no halo, handles hair/limbs cleanly) over runtime cost. Cheaper-and-worse cutouts will look like the generic "AI background remover" web tools and undermine the premium positioning.

**Candidate MIT-licensed alternatives to evaluate when feature is restored:**

1. **rembg** (Python, MIT) — high-quality U-2-Net / SAM / BiRefNet models. Would require a Python microservice (separate Railway deploy) or a serverless function (Modal / RunPod). Adds operational cost + cold-start latency. Best visual quality among open-source options.
2. **@huggingface/transformers** (JavaScript, Apache-2.0) — ONNX-runtime in Node, runs in-process. No extra service. Bundle/cold-start cost: model weights are 50-150 MB depending on the picked model (briaai/RMBG-1.4 is the standard choice for portrait BG removal). Reasonable visual quality.
3. **Cloudflare Workers AI background removal** — paid, ~$0.10 per 1k requests. Zero ops, but creates Cloudflare infrastructure dependency. Predictable per-call cost. Quality depends on which model CF exposes (changes over time).
4. **Self-hosted U-2-Net or BiRefNet via onnxruntime-node** (MIT) — DIY route. Highest visual ceiling (BiRefNet is research-quality), highest implementation cost. Worth considering only if the feature ends up being load-bearing for the product narrative.

**Decision when feature is restored:** Evaluate cost vs quality tradeoff at that time. Recommended starting point: try `@huggingface/transformers` with `briaai/RMBG-1.4` first because it stays in-process (no microservice ops), runs Node-native, and the model is well-suited to portrait cutouts. Fall back to a microservice (option 1) only if RMBG-1.4 visual quality doesn't meet the premium bar.

**Restoration insertion point:** The original try/catch wrapper at `server/routes/settings.ts:174` was removed in Sprint 2.5. The natural restoration site is the same handler — re-introduce a try/catch around the new call, preserving the "fall through to original buffer on failure" calling pattern so the upload path stays robust. Keep `processedBuffer = req.file.buffer` and `mimeType = req.file.mimetype` as the safe defaults so any future replacement that fails to load doesn't break uploads.

**Anti-pattern to avoid on restoration:** Don't pre-process the input image (no normalize / CLAHE / modulate / linear / sharpen) before passing to the BG-removal model. The Sprint-1 gotcha (`_brain/notes/gotchas.md`) about @imgly's behavior generalizes: every BG-removal model is trained on natural photos and pre-processing introduces artifacts. Pass `req.file.buffer` directly. Apply `.trim()` after the cutout to clamp the bounding box.

---

## Wellness icon: HeartPulse, not Heart (2026-05-06, Sprint 3 BATCH 6)

**Decided:** The Wellness sidebar entry uses lucide-react `HeartPulse`. Recovery uses `Heart`. They are intentionally different glyphs.

**Why:** Both nav items live in adjacency in the Ronin self-tracking cluster (Recovery + Wellness). Two near-identical heart glyphs back-to-back in the same menu reads as a duplicate/bug to careful users and a minor nuisance to the rest. `HeartPulse` keeps the glyphs visually distinct AND carries better semantic for a daily readiness ritual ("wellness as vital sign") than the generic `Heart`.

**Rule for future maintainers:** Do NOT "harmonize" these icons in a future visual cleanup pass. They are intentionally different. The `WellnessHintCard.tsx` component header documents the role-shape rationale for the dashboard hint card; the AppSidebar entry comment documents the icon-distinction rationale.

**Discovery context:** During BATCH 6 the user initially said "use Heart" — the implementation noticed the collision in the existing Recovery entry before shipping and chose `HeartPulse` per the original locked design doc spec. Pre-emptive collision check before icon adoption is now a standard step.

---

## Related Notes

- [[gotchas]]
- [[auth-system]]
- [[file-upload-pipeline]]

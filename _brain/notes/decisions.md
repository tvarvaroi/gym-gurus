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

## v0 readiness algorithm with labeled-factors output shape (2026-05-06, Sprint 3 BATCH 1+2)

**Decided:** The wellness readiness score (`daily_wellness_log.readiness_score` 0–100) is computed by `computeReadinessScoreV0` over three components: subjective sliders (40% weight), training load via ACWR (30%), and muscle recovery via inverted fatigue (30%). The accompanying `readiness_score_factors` JSONB column carries the _labeled_ breakdown: `factors[]` for present components (label/score/weight/contribution) and `missingInputs[]` for absent ones, plus `algorithm: "v0"` and `computedAt` timestamp.

**Why labeled, not raw:** the BATCH 5 UI (FactorCard) reads `factors[].label` directly. If the algorithm changes how it bundles components, the UI doesn't break — it just shows whatever labels the new algorithm emits. This insulates the UI from algorithm internals and gives Sprint 6 (Recovery Engine v2) a clean migration path: compute v2 alongside v0, switch the `algorithm` tag, and historical v0 entries stay queryable / explainable by their `algorithm: "v0"` provenance.

**Rule:** Don't store raw component scores in separate columns "for queryability". The labeled-factors JSONB shape is the contract. Sprint 6 v2 should add fields without breaking v0 readers — bump the `algorithm` tag, expand `factors[]` shape if needed, never silently rewrite v0 rows.

**See also:** `server/services/wellnessService.ts` `computeReadinessScoreV0` + `client/src/components/wellness/FactorCard.tsx`. Test coverage in `server/test/services/wellnessService.test.ts` exercises all 8 missing-input permutations and the inversion correctness on stress/soreness.

---

## XP idempotency: INSERT only, not UPDATE (2026-05-06, Sprint 3 BATCH 2)

**Decided:** `grantWellnessXpIfFirstCheckInToday(userId, isNewInsert)` awards 10 XP only when `isNewInsert=true`. Same-day re-saves (the user edits their wellness entry and resubmits) return zero XP.

**Why:** without this gate, a user could grind XP by re-submitting the same day's wellness entry repeatedly. The streak system already provides daily-cadence reinforcement; XP-on-edit would compound it into a farm.

**How to apply:** any future "earn-on-action" wellness rewards should follow the same pattern — gate on `isNewInsert` from the upsert path, never on the route call alone. The schema-level UNIQUE (user_id, date) makes this guarantee load-bearing: only the FIRST POST per user per day produces an INSERT.

**Test:** the BATCH 2 smoke confirmed `xp_transactions WHERE reason='wellness_check_in'` count = 1 after 2 POSTs same day. BATCH 7 mutation test would catch a regression that removes the `isNewInsert` gate.

---

## Streak-aware animation timing — first-time vs returning (2026-05-06, Sprint 3 BATCH 5)

**Decided:** ReadinessHero reveal animation has TWO timing tiers, chosen by `streak.current` from the POST `/api/wellness/log` response:

- `streakCurrent <= 1` → first-time tier: 1200ms total reveal (200ms form fade + 1000ms arc/count-up + 700ms headline at 70% overlap)
- `streakCurrent > 1` → returning tier: 600ms total (100ms / 500ms / 350ms)
- `prefers-reduced-motion: reduce` → instant, no count-up, no animation

**Why two tiers:** a 1.5s reveal is delight on day 1 and friction on day 30. A returning streaker who's already seen the choreography ten times finds the slow version annoying. The fast tier preserves the visual identity (count-up, arc fill, headline fade) at half the duration so it still feels considered, not abrupt.

**Rule (LOCKED):** DO NOT "harmonize" these timing tables in a future cleanup pass. They are intentionally different. The component header carries a `DO NOT harmonize` comment and the constants block is named `TIMING` with explicit `firstTime` and `returning` keys. Detect via `streak.current` from the POST response, not from a separate streak query (cuts a network round-trip).

**See also:** `client/src/components/wellness/ReadinessHero.tsx` `TIMING` constants. The `DO NOT [refactor X as Y]` comment pattern (separate gotchas entry) was first established here.

---

## IDOR mutation testing pattern as architectural invariant (established 2026-05-06)

**Pattern:** Every sprint that ships new resource-owning routes must include:

1. `expectOwnershipClause` helper assertions on every IDOR-relevant route in the per-route test file
2. Mutation testing — deliberately remove the ownership clause from one route, run the matching test, confirm failure with the column-aware diagnostic, revert
3. Document the mutation evidence in the BATCH commit message + an `audit/mutation-test.log` file

**Established at:**

- Sprint 1.5 BATCH 4 — biometrics routes
- Sprint 2 BATCH 7 — notifications routes
- Sprint 3 BATCH 7 — wellness routes (sprint3-batch7/mutation-test.log)

**Why mandatory going forward:** Three sprints of evidence shows the pattern catches real IDOR drift. The column-aware variant of `expectOwnershipClause(table.userId, expectedValue)` matters because it distinguishes "any `eq()` on userId" from "the load-bearing `eq()` on the data table being read" — a route can pass a generic "userId mentioned in WHERE" test while still missing IDOR on the resource itself. The Sprint 3 mutation test directly demonstrated this: 5 of 6 surviving `eq("user-A")` calls landed on `userGamification.userId` and `users.id`, leaving the regression on `dailyWellnessLog.userId` that the column-aware helper detected.

**Rule:** Sprint 4 wearables, Sprint 5 program imports, and every future resource-owning sprint MUST include this gate. The pattern is now first-class architectural invariant rather than per-sprint reinvention. The pattern slot-in cost is near-zero — copy the vi.hoisted spy block from `server/test/routes/wellness.test.ts`, swap the column references, write the assertions.

**See also:** `expectOwnershipClause` helper definition in `server/test/routes/biometrics.test.ts` (original site), `server/test/routes/notifications.test.ts` (Sprint 2), `server/test/routes/wellness.test.ts` (Sprint 3).

---

## Wellness icon: HeartPulse, not Heart (2026-05-06, Sprint 3 BATCH 6)

**Decided:** The Wellness sidebar entry uses lucide-react `HeartPulse`. Recovery uses `Heart`. They are intentionally different glyphs.

**Why:** Both nav items live in adjacency in the Ronin self-tracking cluster (Recovery + Wellness). Two near-identical heart glyphs back-to-back in the same menu reads as a duplicate/bug to careful users and a minor nuisance to the rest. `HeartPulse` keeps the glyphs visually distinct AND carries better semantic for a daily readiness ritual ("wellness as vital sign") than the generic `Heart`.

**Rule for future maintainers:** Do NOT "harmonize" these icons in a future visual cleanup pass. They are intentionally different. The `WellnessHintCard.tsx` component header documents the role-shape rationale for the dashboard hint card; the AppSidebar entry comment documents the icon-distinction rationale.

**Discovery context:** During BATCH 6 the user initially said "use Heart" — the implementation noticed the collision in the existing Recovery entry before shipping and chose `HeartPulse` per the original locked design doc spec. Pre-emptive collision check before icon adoption is now a standard step.

---

## Webhook → notification dispatch: fire-and-forget pattern (Sprint 4 BATCH 2)

**Decided:** Webhook handlers MUST fire downstream notifications as fire-and-forget side effects, not in the webhook's load-bearing try/catch path.

**Pattern:**

```ts
// After the load-bearing DB update succeeds (inside the route's try/catch),
// the webhook returns 200. Notifications fire AFTER, attached via .catch().
dispatch(userId, 'event_type', payload).catch((err) =>
  logger.warn('dispatch failed', { err: String(err) })
);
res.status(200).json({ ok: true });
```

**Why:** A webhook's load-bearing job is acknowledging the source-of-truth state change (the DB row update). Notification failures must NOT 500 the webhook — provider retries would cause delivery storms against an already-applied DB update, wasting provider quota and our compute, and the idempotency layer would just dedupe each retry into a no-op anyway. Notifications are downstream consumers; the DB row is the contract. If a notification fails to deliver, log the warning and move on; the user will discover the state change via the UI on next visit.

**Rejected — dispatch inside the route's main try/catch:** Couples webhook ack semantics to notification infrastructure failures. A transient dispatcher problem (push subscription DB down, web-push service rate-limited, etc.) becomes a 500 → provider retries → repeat. Wrong tradeoff: notification failure is a courtesy gap; webhook 5xx is a delivery storm.

**Rejected — throwing-and-letting-it-bubble:** Same problem as above, plus it produces noisy 500s in logs that hide real DB-update failures.

**Scope:** Every Sprint 4+ webhook → notification path uses this pattern. The notification dispatcher (`server/services/notificationDispatcher.ts`) itself can throw freely; only the call sites in webhook handlers need the fire-and-forget wrapper. User-facing routes (POST /api/wearables/connect, etc.) can still await dispatch normally — those have HTTP semantics tied to user action, not provider retry semantics.

**First applied:** Sprint 4 BATCH 2 amend, `wearable_expired` on connection-status webhook with `status='expired'` or `status='revoked'` ([server/routes/webhooks/wearables.ts](server/routes/webhooks/wearables.ts)). Regression net: [server/test/routes/webhooks/wearables.test.ts](server/test/routes/webhooks/wearables.test.ts) — `'dispatch rejects → webhook still 200, warning logged'` test mocks dispatch to reject, asserts response is 200, asserts warning was logged.

**Rule for future maintainers:** Do NOT refactor the dispatch call back into the route's main try/catch in a future "tidy the error handling" pass. The orphan `.catch()` looks unusual; the regression test exists specifically to catch that refactor. If a future reviewer flags the pattern as "weird", point them here.

---

## Sprint 4 BATCH 4 D1 — Provider rollout: 2+3 stage (2026-05-07)

**Decided:** Sprint 4 ships Whoop + Oura. Sprint 4.5 ships Garmin + Strava + Withings. Garmin developer portal application submitted on Sprint 4 BATCH 5 day 1 (non-coding deliverable) so the manual approval queue runs in parallel — landing during Sprint 4.5 BATCH 1 if approved on time, no-block if not (Sprint 4.5 has Strava + Withings to occupy early batches).

**Rejected:**

- All 5 in Sprint 4 — Garmin manual approval (3-7 days) blocks sprint close on a 3rd-party queue we can't control
- Whoop-only — single provider can pass tests by accident if test fixtures match its payload shape; can't prove the abstraction layer works

**Why:** The recovery cluster (Whoop + Oura) covers ~90% of data-shape variety — both ship sleep + HRV + readiness, and exercising the `wearableIngest` normalization layer with TWO providers proves the abstraction works (one provider could pass tests by accident because the fixtures match its shape). Strava-only-activity adds zero new shape. Withings adds smart-scale → bodyMetrics, already coded in BATCH 2 but unverified end-to-end. Diminishing returns past 2 providers.

**Provider time costs:** Whoop ~1-2d, Oura ~1-2d, Garmin ~3-7d (incl. manual approval wait), Strava ~1-2d, Withings ~2-3d.

**Garmin parallel-track rationale:** application submission is a non-coding BATCH 5 deliverable. If approval lands during Sprint 4.5 BATCH 1 — perfect. Earlier — Sprint 4.5 starts faster. Later — not blocked because Sprint 4.5 has Strava + Withings to occupy early batches.

**First applied:** Sprint 4 BATCH 5 (Whoop POC), BATCH 6 (Oura). Sprint 4.5 picks up Garmin/Strava/Withings.

---

## Sprint 4 BATCH 4 D2 — Open Wearables: separate Railway project (2026-05-07)

**Decided:** Open Wearables runs as a separate Railway project (`open-wearables` workspace), distinct from the `gym-gurus` project. Separate Postgres instance for OW's OAuth state + token storage.

**Rejected:**

- Sidecar in existing GymGurus Railway project — couples deploy lifecycles
- Different platform (Fly.io, Render, self-hosted VPS) — diverges from all-Railway architecture for one service

**Why (LOAD-BEARING — decoupled deploy lifecycles):** GymGurus deploys 5x/day during active development. Bouncing OW on every GymGurus deploy would drop in-flight webhooks (OW retries, but adds noise) and break in-flight OAuth state (user mid-flow gets a connection failure). Independent projects = independent deploy cadence. This is **continuous degradation**, not a one-time issue.

**Why (secondary):** Independent scaling (OW load is webhook-driven, GymGurus load is user-traffic-driven); blast-radius isolation (OW outage doesn't bounce GymGurus health checks, vice versa); operational clarity (separate logs, separate metrics, separate deploy history).

**Cost:** ~5 minutes admin to provision + one extra Postgres instance. Trivial vs ops clarity benefit.

**Coupling between services:** Two env vars only — `OPEN_WEARABLES_INTERNAL_TOKEN` (auth bearer) + `OPEN_WEARABLES_WEBHOOK_SECRET` (HMAC). NO shared Postgres.

**Rule for future maintainers:** Do NOT consolidate OW and GymGurus into the same Railway project as an "infrastructure simplification" later. The deploy-cadence argument is the load-bearing rationale — consolidation would re-introduce the in-flight-webhook-drop and OAuth-state-break problem on every GymGurus deploy. If future Claude proposes consolidation citing infra simplicity, point them here.

---

## Sprint 4 BATCH 4 D3 — OAuth callback URLs: path-based both legs (2026-05-07)

**Decided:** Path-based OAuth callbacks on both legs of the OAuth flow.

- **Provider → Open Wearables:** `https://<ow-prod-host>/oauth/callback/<provider>` (5 distinct URLs registered with each provider's developer portal, separate dev + prod = 10 total over Sprint 4 + 4.5)
- **Open Wearables → GymGurus:** `https://gym-gurus-production.up.railway.app/api/wearables/oauth-callback?provider=<x>` (single route handler, provider in query parameter)

**Provider Zod-enum validation REQUIRED on the GymGurus side.** The `oauth-callback` handler MUST validate the `provider` query parameter against `z.enum(WEARABLE_PROVIDERS)` at the top of the handler and reject (400) on mismatch. Without that validation, an attacker could craft a URL with `?provider=evil` and reach the handler with malformed input. Not a critical security issue (handler would lookup connection, not find it, return error) but it's defense-in-depth — single-line Zod parse, free correctness.

**Rejected:**

- Per-provider subdomain (`whoop.oauth.gymgurus.app`) — DNS + per-provider TLS overhead with no benefit (no cookie/CORS scope difference between providers)
- Single callback with HMAC-signed state-encoded provider — adds load-bearing security primitive (state forgery prevention) only to solve a problem path-based already solves structurally

**Why:** Standard ecosystem pattern (Plaid, Stripe Connect, Auth0 all use path-based). Provider portal UX matches expectations — registering "5 callback URLs, one per provider" is what every developer portal expects. State-encoded option's HMAC-signing requirement is a security primitive we'd have to test, document, and rotate; path-based avoids it entirely (provider identity is structural in the URL).

**Dev/prod separation:** each provider's OAuth app is environment-specific anyway — most providers let you register multiple callback URLs per app, OR you register dev as one app + prod as another (Whoop the latter, Oura allows multiple URLs per app). Path-based handles both shapes naturally.

**First applied:** Sprint 4 BATCH 5 (Whoop dev + prod), BATCH 6 (Oura dev + prod).

---

## Sprint 4 BATCH 4 D4 — Token encryption: env var + rotation script (2026-05-07)

**Decided:** AES-256-GCM token encryption key lives in env var `WEARABLE_TOKEN_ENCRYPTION_KEY` on the GymGurus Railway service. Ciphertext envelope upgraded to embed key version (`v1:<iv>:<authTag>:<ct>`) so rotation can identify which rows still need re-encryption. Rotation via manual idempotent + resumable script with probe-decrypt-verify pre-rotation step.

**Rejected:**

- Managed KMS (AWS KMS / Cloudflare Workers KMS / GCP KMS) — over-engineering for v1 threat model + scale
- Per-row envelope encryption with master key — flexibility we don't need yet; complexity at v1 launch

**Why (threat model):** Sprint 4 v1 protects against database leak. Attacker dumps `wearable_connections` → gets ciphertexts but no key (key in Railway env vars, not in DB). Single env var on Railway is sufficient — Railway env var storage is encrypted at rest and access-controlled via project membership.

**NOT protecting against:** compromised application server. If app server is compromised, attacker has both DB access AND env var. Encryption doesn't help — that requires HSM/hardware-isolated keys, a different control entirely. KMS alone wouldn't save you in that scenario either.

**Why (operational):** Sprint 4 v1 = ~1000 tokens (hundreds of users × 2-5 connections). Re-encryption script processes ~1000 rows in ~30 seconds. Doesn't need automated rotation yet. Manual rotation 2-4x/year is fine.

**Why (migration path stays open):** `getKey()` reads from env. Swapping in KMS-backed implementation is changing one function, not refactoring the whole module. We're not painting into a corner.

**Critical operational requirements (BATCH 5 deliverables):**

1. **Versioned ciphertext envelope.** Format: `v1:<iv-hex>:<authTag-hex>:<ct-hex>` (current version is `v1`). Rotation iterates rows whose envelope version differs from current; legacy rows without a version prefix (none currently in prod, but defensive) treated as `v1`. Crashes mid-batch are recoverable: re-running iterates only the non-current-version rows and continues.

2. **Idempotent + resumable rotation script.** `scripts/rotate-wearable-tokens.ts`. Pattern: read all rows with non-current envelope version → decrypt with old key → encrypt with new key → write back. Each row processed atomically. Mid-batch crash leaves some rows on old version + some on new — re-running iterates only the still-old rows. Without idempotency a crash creates ambiguous state where you can't tell which rows used which key.

3. **Probe-decrypt-verify pre-rotation step.** Generate new key, set as `WEARABLE_TOKEN_ENCRYPTION_KEY_NEW` (don't replace yet), encrypt one specific test row with the new key, decrypt it back, confirm plaintext matches expected — THEN start bulk rotation. Catches "I generated a malformed key" or "the encryption module has a bug with the new key" before destroying data. Probe row is a synthetic dummy connection inserted + deleted within the script run; never touches a real user row.

4. **Document in `docs/runbooks/open-wearables-deployment.md`** with both the rotation procedure AND the recovery procedure (if rotation crashes mid-flight, what state is the DB in, how to inspect, how to resume).

**Rotation cadence:** every 6 months OR on suspected compromise.

**First applied:** Sprint 4 BATCH 5 — `tokenEncryption.ts` envelope upgraded to versioned `v1:<iv>:<tag>:<ct>` format; `scripts/rotate-wearable-tokens.ts` + runbook ship in BATCH 5 alongside Whoop POC.

---

## Sprint 4 v1: pivot to README-Available providers (Option α) (2026-05-07)

**Amends:** D1 from Sprint 4 BATCH 4 brainstorm (provider rollout strategy). Supersedes "Sprint 4 v1 ships Whoop + Oura" with "Sprint 4 v1 ships Garmin + Polar + Suunto."

**Decided:** Sprint 4 v1 ships **Garmin + Polar + Suunto** (Open Wearables README "Available" list). Whoop + Oura + Strava + Fitbit deferred to Sprint 4.5+ pending upstream stability. Withings is not in OW upstream — Sprint 4.5 substitutes Fitbit for Withings (smart-scale path covered by Fitbit Aria when upstream stabilizes Fitbit).

**Why:** Open Wearables upstream has open critical bugs blocking the original v1 providers — both deterministic, both unfixed for 2-3 weeks at scan time, both unassigned with zero comments:

- [#930](https://github.com/the-momentum/open-wearables/issues/930) — Whoop historical sync crashes with `InvalidRequestError: This session is in 'committed' state` on `db.commit()` in `app/services/providers/whoop/workouts.py:381` whenever sync pulls workouts with `strain_scores`. Cascading failure: workouts step blocks `data_type=all`, so sleep + recovery + activity + body are also never fetched. Workaround `data_type=247` skips workouts entirely.
- [#948](https://github.com/the-momentum/open-wearables/issues/948) — Oura sync fails with the same SQLAlchemy session-state error on first `db.commit()` after fetching fresh data. Cascades through every subsequent data_type. No documented workaround.

Stacked operational issues compound the risk: [#933](https://github.com/the-momentum/open-wearables/issues/933) (no auto-renewal of Oura/Fitbit webhook subscriptions — connections silently lapse on TTL expiry), [#1009](https://github.com/the-momentum/open-wearables/issues/1009) (Whoop emits duplicate sleep scores per session), [#461](https://github.com/the-momentum/open-wearables/issues/461) (Whoop is poll-based today with up to 1h latency, not webhook-driven), [#720](https://github.com/the-momentum/open-wearables/issues/720) (multi-provider sleep merging silently drops sessions), [#856](https://github.com/the-momentum/open-wearables/issues/856) (Oura missing/incorrect sleep — maintainer comment "TBC if still happens — I think fixed").

Garmin/Polar/Suunto scanned for analogous bugs at the same scan time:

- Cross-provider search for `session committed` returned ONLY #930 + #948 — confirms the bug class is provider-specific to Whoop and Oura sync code paths, not a base-class bug affecting α providers.
- Garmin: minor timeseries field-mapping bugs in `respiratory_rate` ([#760](https://github.com/the-momentum/open-wearables/issues/760)) and `body_battery` ([#758](https://github.com/the-momentum/open-wearables/issues/758)) — both **outside v1 scope** (v1 subscribes to session events + `body_composition.created` only). Backfill edge case [#644](https://github.com/the-momentum/open-wearables/issues/644) — intermittent (1/4 cycles), historical date range limit, workaround = retry with shorter range.
- Polar: [#113](https://github.com/the-momentum/open-wearables/issues/113) "second-user OAuth fails after first" — reporter himself notes "not critical, in practice won't occur" (developer-only edge case with sequential users in same browser). Historical sleep/activity/body backfill features open ([#610](https://github.com/the-momentum/open-wearables/issues/610) / [#611](https://github.com/the-momentum/open-wearables/issues/611) / [#612](https://github.com/the-momentum/open-wearables/issues/612)) — non-blocker for v1 (we ingest forward, not backwards).
- Suunto: no functional bugs found, only docs gaps.

**Rejected:**

- **Ship Whoop + Oura with bugs (β):** promising users data we can't reliably deliver. The cascading nature of #930/#948 means even sleep ingestion is non-functional during fresh-data sync runs.
- **Upstream contribution path (Option C):** investigating + fixing #930/#948 + sending PRs to Momentum was technically tractable (~1 day investigation + 1 day fix per bug, FastAPI/SQLAlchemy/Celery stack). Rejected because it would couple Sprint 4's close date to Momentum's PR review queue (days-to-weeks, not under our control) and would establish a precedent of provider-bug-fixing-by-upstream-contribution that becomes load-bearing for every future sprint touching OW. Sprints 1-3 closed on our own schedule with our own quality gates against our own production deploys; Sprint 4 must close the same way. Drive-by contributions during normal Sprint 4+ work are fine; sprint-blocking contributions are a pattern we won't establish.
- **Pause Sprint 4 entirely:** unnecessary — α providers are demonstrably workable substrate per the bug scan, and v1 ships sooner with α than waiting on β fixes that have no announced ETA.

**Brand positioning consideration:** the original β framing held that Whoop + Oura were "load-bearing for the brand positioning" (recovery-tracker halo). On reflection, GymGurus is a fitness coaching platform with strength-training and personal-coaching DNA — not a recovery-optimization product. Garmin's user base among serious athletes is meaningfully larger than Whoop's; Polar has deep cycling/triathlon penetration; Suunto has multisport/outdoor legitimacy. α is **different positioning, not weaker positioning.**

**Validation plan:** 1-day Garmin spike against OW master HEAD (`34df8a5` at scan time). Goal: confirm Garmin OAuth + sync flow + `workout.created` + `sleep.created` webhook delivery work cleanly end-to-end, with svix npm SDK signature verification. If Garmin has structural issues comparable to Whoop/Oura, STOP-AND-SURFACE — at that point we'd re-evaluate D2 (separate Open Wearables project deployment topology).

**Withings substitution:** Withings (originally chosen for the smart-scale → bodyMetrics path) is **not** in OW upstream — no `WITHINGS_*` env vars in `backend/config/.env.example`, no provider implementation in `backend/app/services/providers/`, no GitHub label. Sprint 4.5 substitutes Fitbit (Aria scales) when upstream Fitbit is stable. If a customer specifically requests Withings, evaluate at that time (could be PR upstream, could be add our own integration if volume justifies).

**Future:** monitor #930 + #948 passively. When upstream merges fixes, evaluate adding Whoop + Oura in a focused mini-sprint. **No pre-commitment** — the "stick with α" path is a complete product on its own.

**First applied:** Sprint 4 BATCH 5a (provider-agnostic code adaptation: Svix SDK + 4-routes-to-1 + JWT/API-key auth + ingest refactor + connection-polling cron) proceeds in parallel with Garmin developer portal application (3-7 day async wait). BATCH 5b (deploy + register Garmin/Polar/Suunto OAuth apps + E2E) starts after spike validates α and BATCH 5a completes.

---

## Sprint 4 BATCH 5 spike findings (IN FLIGHT — early source-level answers captured 2026-05-07; full close after live-OW verification)

**Status:** in flight. Source-level inspection of `the-momentum/open-wearables` master HEAD (commit `34df8a5` at scan time) answered Q1, Q3, Q5, and Q6.5 below without needing the live docker-compose spin-up. Q2, Q4, Q6 (live request/response confirmation) and Q7 (provider portal approval timing) still await live-OW work and Garmin/Polar/Suunto OAuth credentials. The four answered findings are folded back into the BATCH 5a plan (commit landing alongside this entry).

### Early findings (source-level inspection, 2026-05-07)

**Q1 reconfirmation — RECONFIRMED.** `gh issue list --repo the-momentum/open-wearables --search "session committed in:title,body" --state open` at 2026-05-07 returned **only #930 (Whoop) and #948 (Oura)** — same scan result as α-pivot decision day. No new `session committed` issues against Garmin / Polar / Suunto. The bug class is provider-specific to Whoop/Oura sync code paths; α substrate stays solid. Re-run this scan at full spike close (live-OW phase) for final reconfirmation.

**Q3 — LOCKED: `OPEN_WEARABLES_AUTH_MODE=api_key` with custom header `X-Open-Wearables-API-Key`.** Source inspection confirms:

- `backend/app/services/api_key_service.py` — `_generate_key_value` returns `sk-<32 hex>`. Generated via OW Credentials tab in the developer portal.
- `backend/app/api/routes/v1/connections.py` (and ~all v1 routes) — auth dependency injection is `_api_key: ApiKeyDep` on every endpoint we need (e.g., `get_connections_endpoint`, `disconnect_provider_endpoint`).
- OW docs pattern (per `docs/providers/coverage.mdx`, `docs/api-reference/guides/provider-setup.mdx`, multiple provider integration guides): `curl -H "X-Open-Wearables-API-Key: YOUR_API_KEY"`.
- **NOT `Authorization: Bearer`.** The plan's original Task 5a.5 sketch used `Authorization: Bearer ${apiKey}` which would be rejected by OW. Plan amended pre-dispatch to use the correct custom header.

JWT path (POST /api/v1/auth/login → bearer token) is preserved in code as a fallback for any runtime route NOT covered by ApiKeyDep that we discover later, but it's NOT the production path. Set `OPEN_WEARABLES_AUTH_MODE=api_key` on GymGurus production in BATCH 5b Task 5b.0.

**Q5 — `SUUNTO_SUBSCRIPTION_KEY` is required at every Suunto API call (runtime).** Source confirms:

- `backend/app/services/providers/suunto/workouts.py` and `data_247.py` both define `_get_suunto_headers` which reads `self.oauth.credentials.subscription_key` and sets `Ocp-Apim-Subscription-Key: <key>` on every outbound request to `https://cloudapi.suunto.com`.
- Tests in `backend/tests/integrations/test_suunto_import.py` and `backend/tests/providers/suunto/test_suunto_workouts.py` confirm this header is required for every workout import / 247-data fetch.
- **Operational implication:** rotating `SUUNTO_SUBSCRIPTION_KEY` env var requires restarting OW's `app` + `celery-worker` + `celery-beat` services to pick up the new value. Capture in BATCH 5b runbook section "Secrets rotation — provider subscription keys" alongside the SECRET_KEY ↔ SVIX_JWT_SECRET pattern.

**Q6.5 — LOCKED: Cron Case 3 uses Semantic (b) (count consecutive error-status ticks ourselves).** Source confirms:

- `backend/app/schemas/model_crud/user_management/user_connection.py` — `UserConnectionWithCapabilities` schema fields: `id, user_id, provider, provider_user_id, provider_username, scope, status, last_synced_at, created_at, updated_at, max_historical_days, rest_pull, webhook_stream, webhook_ping, webhook_callback, live_sync_mode`.
- **NO `sync_error_count` field. NO `last_sync_error` field.** Only `status` (enum) and `last_synced_at` (timestamp) are useful for our Case 3 detection.
- BATCH 5a Task 5a.6 implementation note `determineSyncErrorState` abstraction handles both semantics at runtime. Optional-chained access to `(matching as any).sync_error_count` returns undefined under current OW schema → falls through to Semantic (b). If OW adds the field in a future version, the abstraction starts returning Semantic (a) automatically. Defense-in-depth against schema drift without paying the abstraction cost.

**Provider implementations confirmed in OW source** (`backend/app/services/providers/`): `apple, fitbit, garmin, google, oura, polar, samsung, strava, suunto, ultrahuman` (plus `templates`). **No `withings` directory** — confirms the Withings → Fitbit substitution captured in α pivot. Fitbit / Strava / Ultrahuman are scaffolded in source even though the README marks them less prominently than Garmin / Polar / Suunto; readiness for Sprint 4.5 expansion is partial-source-confirmed.

**Q2 — LOCKED: Path B is the required production path. Migration 015 ships. Path A is a deprecated debug-convenience only, not a real lookup bypass.** Source confirms (2026-05-07 inspection of OW master HEAD `34df8a5`):

- The User model has a field — but it's named **`external_user_id`**, NOT `external_id`. The plan's Task 5a.5 description (and the BATCH 5a subagent's `createUser` implementation at `e64d1db`) use the wrong field name. **Follow-up needed:** rename `external_id` → `external_user_id` in `server/services/openWearablesClient.ts:createUser` + tests.
- The field IS deprecated. Source: `backend/app/schemas/model_crud/user_management/user.py` defines `_EXTERNAL_USER_ID_DEPRECATION` and applies it via Pydantic's `deprecated=True` flag on UserCreate / UserRead / UserUpdate / UserQueryParams. The deprecation message reads verbatim: _"Deprecated: no data-fetching endpoint (timeseries, workouts, sleep, summaries, health-scores, etc.) accepts external_user_id - they all require the Open Wearables UUID. This field was added early in the project but never wired into those endpoints, so it only works as a filter on GET /users. Store the UUID returned by POST /users in your own system instead."_
- OW's official integration guide (`docs/dev-guides/integration-guide.mdx`) reinforces: _"The legacy `external_user_id` column does still carry a DB-level unique constraint, so sending a duplicate value there will fail with an integrity error. **The field is deprecated** and no data-fetching endpoint accepts it — do not rely on it for deduplication. Use the pattern above (store the Open Wearables UUID on your side) instead."_
- The OW iOS / Flutter SDK integration guides explicitly warn: _"The `userId` parameter is the **Open Wearables User ID** (UUID) — the `id` returned by the [Create User] endpoint. Do **not** pass your own `external_user_id` here."_

**Architectural implication:** every data-fetching call we make to OW (timeseries, workouts, sleep, summaries, connections-list) requires OW's internal user UUID, not our `external_user_id`. We MUST store the OW UUID in our DB. Path B's `wearable_connections.open_wearables_user_id` column is required.

**Path A residual value:** setting `external_user_id` on user creation is still useful as a **debug-convenience** (the OW operator can find a Disciple in the OW portal by our internal user UUID), but it's NOT a runtime lookup mechanism. The plan's framing of "Path A = no schema change needed" was wrong; there's no way to avoid storing OW's UUID once we want to fetch data.

**Two BATCH 5a follow-ups required before BATCH 5b:**

1. **Migration 015** — single-column add to `wearable_connections`: `open_wearables_user_id varchar(36)` (UUID), nullable (existing rows pre-OW have no OW user yet), no UNIQUE on this column alone (multiple connections per OW user is the design). Add an index `idx_wearable_connections_ow_user_id ON (open_wearables_user_id)` for the polling cron's lookups. ~30-line migration in the Sprint 4 BATCH 1 / 014.5 pattern. Down-migration safety: refuse if any non-NULL `open_wearables_user_id` rows exist.
2. **`openWearablesClient.ts` adjust:**
   - Rename field on `createUser`: `external_id` → `external_user_id` in body + return type
   - `createUser` returns `{id, external_user_id?}` — caller must persist `id` to `wearable_connections.open_wearables_user_id` (this row already exists in our DB from the OAuth-init flow; the wearable_connections row was inserted before we knew OW's user UUID, so we UPDATE it with `open_wearables_user_id` after `createUser` returns)
   - All other client methods (`getConnections`, `triggerSync`, `disconnectProvider`) take `owUserId` as their input — already correct in subagent's `e64d1db` implementation

**Decision lock:** Q2 → **Path B**. Migration 015 ships as a Task 5a.10 follow-up commit. The `external_user_id` field is set on user creation as a portal-debug convenience but is not load-bearing; if a future plan author wants to drop it, that's fine.

### Still in flight (require live-OW spike with running docker-compose)

**Spike target:** Garmin OAuth + sync + webhook delivery against `the-momentum/open-wearables` master HEAD (commit captured at spike start). Polar substitutes if Garmin developer portal approval lags.

**Verification targets remaining:**

1. **Cross-provider issue scan reconfirmation** — re-run `gh issue list --search "session committed in:title,body"` against OW upstream at spike start. Confirm the bug class is still provider-specific to Whoop/Oura sync code paths (not surfacing in Garmin/Polar/Suunto). If a new `session committed` issue lands against α providers between α-pivot decision (2026-05-07) and spike start, STOP and re-evaluate the α substrate choice.

2. **OW user identity bridge** — does OW support `external_id` lookup on user creation? Test sequence: (a) `POST /api/v1/users` with `{external_id: <our user UUID>}` — does OW accept the `external_id` field at all, or reject the request? (b) If accepted, what's the lookup endpoint pattern? Try `GET /api/v1/users/by-external-id/<our user UUID>` first; if 404, check OW source for the actual route — likely candidates: `GET /api/v1/users?external_id=<id>` query-param OR `GET /api/v1/users/external/<id>` OR a different convention entirely. Document the actual OW source location of the lookup route in the spike findings. If yes (Path A): no schema change needed. If no (Path B): migration 015 ships at end of BATCH 5a adding `wearable_connections.open_wearables_user_id` column.

3. **Auth approach for runtime API** — does OW's Credentials tab generate long-lived API keys usable for runtime API calls? OR is API key generation only for the `replay_raw_payloads.py` operator script? Test: generate API key via Credentials tab, attempt `GET /api/v1/users` with `Authorization: Bearer <api-key>`. If 200: Path A (API key) — set `OPEN_WEARABLES_AUTH_MODE=api_key`. If 401/403: Path B (JWT) — set `OPEN_WEARABLES_AUTH_MODE=jwt`, document refresh-on-expiry logic.

4. **`workout.created` payload shape** — does OW emit summary HR/calories/distance INLINE in the workout.created event payload, or are those only available via separate `heart_rate.created` / `calories.created` timeseries events? Test: trigger a Garmin workout sync, capture the actual webhook payload, inspect for `avg_heart_rate_bpm`, `max_heart_rate_bpm`, `calories_kcal`, `distance_meters` fields. If inline: BATCH 5a's ingest layer is sufficient as-planned. If separate: add `heart_rate.created` + `calories.created` to the subscribed `filter_types` and expand ingestWorkoutCreated logic to merge timeseries summaries into the activity_sessions row.

5. **Suunto subscription key runtime usage** — does OW require `SUUNTO_SUBSCRIPTION_KEY` only at OAuth registration time, or does it reach back into Suunto's API on every sync request (in which case the subscription key needs to be present and rotatable on the OW backend env)? Confirm OW source uses the env var consistently in `backend/app/services/providers/suunto/`.

6. **Connection-list polling endpoint** — does `GET /api/v1/users/{ow_user_id}/connections` return per-connection `status` (`connected` / `expired` / `error`) AND a `last_sync_error` field, or just the connection existence? Connection-polling cron design assumes both fields available; if not, either polling logic adapts to the available signal OR we file an upstream feature request.

6.5. **Connection-list response shape — sync_error_count semantic for cron Case 3** (BATCH 5a Task 5a.6 unresolved at plan-write time): does the response include a per-connection `sync_error_count` field that mirrors OW's internal sync error counter? Two semantics for our cron's Case 3 (matching && status === 'error') depend on the answer:

- **Semantic (a) — OW is authoritative:** If response includes `sync_error_count` (e.g., `{"provider": "garmin", "status": "error", "sync_error_count": 3, ...}`), MIRROR the count to our `wearable_connections.syncErrorCount` column on each tick (treating OW's value as truth). Threshold check: `ow_count >= 3` → DISPATCH `wearable_sync_failed`. Cleanest: OW already tracks the actual sync attempt count.
- **Semantic (b) — we count consecutive error ticks:** If response only exposes `status` (no count), INCREMENT our column on each tick where `status === 'error'`. Threshold: 3 consecutive error-status ticks → DISPATCH. Different metric (consecutive cron observations vs. OW sync attempts), but works without OW exposing the count.
- **Decision lock:** capture which semantic applies in this entry's "Decision lock at spike completion" section. Update the BATCH 5a Task 5a.6 cron Case 3 logic to match. If OW's response shape changes between v1 and a future version, revisit at that time.

7. **OW developer portal approval timing** — Garmin (3-7 days expected per BATCH 4 D1), Polar (1-2 days expected), Suunto (variable). Capture actual approval timestamps to inform Sprint 4.5 timing.

**Decision lock at spike completion:**

- `OPEN_WEARABLES_AUTH_MODE` value (api_key OR jwt) — sets BATCH 5b Task 5b.0 decision lock
- **Migration 015 — LOCKED YES (Path B, Q2 spike close 2026-05-07).** Shipped as Task 5a.10 (`server/migrations/015_wearable_connections_ow_user_id.ts`): adds `wearable_connections.open_wearables_user_id varchar(36)` + partial index `WHERE open_wearables_user_id IS NOT NULL`. Bridge resolver `resolveUserIdFromOwUserId` in `server/services/wearableIngest.ts` is the runtime translation point.
- Subscribed event types (`["workout.created", "sleep.created", "connection.created", "body_composition.created"]` OR expanded to include `heart_rate.created` / `calories.created` if needed for workout summary)
- Cross-provider scan reconfirmation result (locked α stays, OR re-evaluation triggered)
- **Cron Case 3 semantic** — (a) mirror OW's `sync_error_count` OR (b) count consecutive error-status ticks (per Q6.5 above). Update BATCH 5a Task 5a.6 cron implementation to match the spike-confirmed available signal.
- **External_id lookup endpoint pattern — N/A under Path B.** OW's `external_user_id` field is deprecated and not a runtime lookup mechanism. The runtime bridge is our local SELECT on `wearable_connections.open_wearables_user_id` (no OW route involved at lookup time). The portal-debug convenience of setting `external_user_id` on `createUser` remains, but it's not load-bearing.

**Spike artifacts to capture:**

- `git rev-parse HEAD` of `the-momentum/open-wearables` clone at spike start
- Captured `workout.created` payload from real Garmin sync
- Captured `sleep.created` payload (if test user has Garmin sleep tracking)
- Screen recording of OAuth flow + first webhook delivery
- OW Credentials tab screenshot (with API key value redacted) showing what the portal exposes
- Cross-provider issue scan output at spike start (json output of the gh CLI command)

---

## Sprint 4 PAUSED (demand-driven resumption) (2026-05-07)

**Decided**: Pause Sprint 4 (Wearable Integration via Open Wearables) before BATCH 5b deploy. Resume when documented user demand justifies the spend.

**Status at pause**: BATCH 5a complete + Task 5a.10 complete + Phase A (token encryption with versioned envelope + rotation script) complete. Last commit on `main`: `d3f97e8` (FRAGILE comment on bridge-test SQL walker). Migrations 014 (4 wearable tables + clients.user_id FK + 4 consent flags), 014.5 (body_metrics partial UNIQUE), and 015 (wearable_connections.open_wearables_user_id) applied to dev only — NOT prod-applied. Spike findings (Q1, Q2, Q3, Q5, Q6.5) locked in this file's "Sprint 4 BATCH 5 spike findings" entry. Bridge tests + mutation evidence prove Path B correctness.

**Trigger to resume**: documented user demand for wearable integration. Specifically any of:

1. ≥3 distinct production users requesting wearable support in feedback
2. A paying-tier upgrade gated on wearable support (e.g., a new "Athlete" tier that requires wearable data)
3. A strategic decision to lead with wearable-tracker brand positioning (e.g., a marketing pivot toward "data-driven training" requiring proof-of-integration)

**Decision point to re-litigate when resumed**: Open Wearables vs Terra. Cost analysis snapshot at pause:

- **Open Wearables on Railway**: ~$30-80/month base infrastructure (postgres + redis + app + celery-worker + celery-beat + flower + svix-server + frontend, multi-container per locked decision D2). Scales sub-linearly with users — adding wearable users does not proportionally increase infra cost until the celery-worker concurrency tier needs bumping.
- **Terra**: $399-499/month minimum subscription, includes 100k credits, scales with usage above. Includes Whoop/Oura/Apple Health/Garmin/Polar/Suunto/Strava/Fitbit etc. as a unified API surface, no self-hosting.
- **Crossover for cost**: Terra wins only if user count drives Open Wearables infrastructure beyond ~$500/month (estimated at thousands of active wearable users), which is far beyond current scale.
- **Crossover for value**: Terra wins if Whoop/Oura/Apple Health support generates sufficient user conversion / upgrade to offset the $5K/year premium AND the engineering time saved on operating OW (postgres backups, celery monitoring, svix-server uptime, OAuth app maintenance per provider) is non-trivial. Whoop/Oura were originally Sprint 4 v1 targets but blocked by upstream OW bugs ([#930](https://github.com/the-momentum/open-wearables/issues/930), [#948](https://github.com/the-momentum/open-wearables/issues/948)) — Terra would unblock those without needing upstream fixes.

Numbers may shift over time. Refresh the cost analysis at resumption — Railway pricing, Terra pricing, OW upstream bug status, and competitor landscape (Vital, Spike, Wearipedia API gateways) all evolve. Don't trust the snapshot blindly.

**What is preserved on origin/main** (continues to compile, lint clean, all 485 tests pass):

- `shared/schema.ts` — wearable_connections, activity_sessions, sleep_sessions, wearable_sync_failures tables + clients.user_id FK + 4 consent flags + clients.body_metrics_share_with_trainer + body_metrics partial UNIQUE
- `server/migrations/014_wearable_integration.ts`, `014.5_body_metrics_partial_unique.ts`, `015_wearable_connections_ow_user_id.ts` — dev-applied, prod-pending
- `server/services/tokenEncryption.ts` — provider-agnostic AES-256-GCM with versioned envelope. Useful for any future encrypted-at-rest token storage regardless of which integration approach future-Sprint-4 takes.
- `scripts/rotate-wearable-tokens.ts` — provider-agnostic token rotation with probe-decrypt-verify safety gate. Reusable.
- `server/middleware/verifyWearableSignature.ts` — hand-rolled HMAC primitive for any non-Svix webhook source.
- `server/services/openWearablesClient.ts`, `wearableConnections.ts`, `wearableIngest.ts`, `server/jobs/wearableSyncMonitor.ts`, `server/routes/webhooks.ts` — written against Open Wearables / Svix today; the architecture (Zod schemas at boundary, fire-and-forget dispatch, IDOR-safe routes, Path B identity bridge, mutation-tested) translates to Terra or any other webhook source with **adaptation work, not rewrite**.
- `server/test/services/wearableIngest.bridge.test.ts` — proves Path B identity bridge prevents Path-A FK violations. Stays useful regardless of provider stack.
- All spike findings in this file's "Sprint 4 BATCH 5 spike findings" entry.

**What is NOT done**:

- BATCH 5b (Open Wearables Railway deployment, OAuth app registration with providers, OAuth-init E2E test, prod webhook subscription registration)
- BATCH 5c (full E2E flow with at least one real provider sync)
- BATCH 6 was REMOVED from the plan during BATCH 5 split (was redundant under α). Do not resurrect.
- BATCH 7-12 (consent UI expansion from one toggle to five sibling toggles, IntegrationsTab UI for connect/disconnect, pre-delivery audits, prod migration runs)

**Provider portal applications**: not submitted. Garmin / Polar / Suunto remain available for future application when sprint resumes. No abandoned credentials, no leaked intent.

**Critical pre-resumption gate**: Before any Sprint 4 code path goes to prod, migrations 014 + 014.5 + 015 must run on prod via `scripts/run-prod-migration.ts`. The wearable_connections table does not exist on prod yet; deploying BATCH 5a code without those migrations would 500 on every webhook.

**Rejected**: Continuing through BATCH 5b on the assumption "we already started, may as well finish."
**Why**: That's a sunk-cost argument. The work shipped is reusable; the work remaining (provider portal applications, Railway multi-container deploy, prod migration execution, OAuth E2E debugging) is non-trivial AND becomes wasted infrastructure if user demand stays at zero. Better to pause cleanly with intact resumption criteria than to ship infrastructure for users who haven't asked.

---

## Related Notes

- [[gotchas]]
- [[auth-system]]
- [[file-upload-pipeline]]

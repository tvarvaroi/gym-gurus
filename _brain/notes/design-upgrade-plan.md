# GymGurus — Design Upgrade Plan

## Deep Research + Page-by-Page Upgrade Roadmap

---

## PART 1 — THE FULL DESIGN TOOLING ECOSYSTEM

### What We Currently Use

- shadcn/ui — headless Radix primitives, unstyled
- Tailwind CSS — utility styling
- framer-motion (now `motion/react`) — animations, already installed
- Recharts — charts
- Playfair Display — display font (recently added)

### Tier 1 — Install Immediately (free, copy-paste, zero risk)

**Magic UI** — magicui.design
Install: `pnpm dlx shadcn@latest add @magicui/<component>`
Components for GymGurus:

- `NumberTicker` — animated count-up on every stat number in the app
- `AnimatedCircularProgressBar` — animated ring, replaces flat Recharts pies
- `BentoGrid` — asymmetric dashboard stat cards
- `BlurFade` — staggered entrance animations on page load
- `BorderBeam` — animated glowing border on active cards
- `MagicCard` — spotlight/glow follows mouse cursor on hover
- `OrbitingCircles` — achievement/XP visualization
- `AnimatedList` — staggered list entrance for workout history
- `ShimmerButton` — premium CTA button with light sweep
- `Confetti` — achievement unlock celebration
- `SparklesText` — gold sparkle on achievement rank names
- `NeonGradientCard` — glowing card border for premium features
- `TypingAnimation` — AI Coach typewriter effect

**Aceternity UI** — ui.aceternity.com
Install: copy component code from site into `client/src/components/ui/`
Components for GymGurus:

- `CardSpotlight` — dramatic spotlight on hover
- `BackgroundBeams` — animated beam background for landing/hero
- `WobbleCard` — 3D tilt on hover for stat and feature cards
- `AnimatedTooltip` — premium tooltips with avatars for client lists
- `MovingBorders` — animated border gradient for active state cards
- `LampEffect` — dramatic light cone for hero sections and empty states
- `SparklesCore` — particle sparkle for achievements
- `TracingBeam` — scroll-based line that traces through landing content
- `GlowingStarsBackgroundCard` — dark card with star field
- `Timeline` — animated vertical timeline for workout history
- `HoverBorderGradient` — animated gradient border on hover

**21st.dev** — 21st.dev/community/components
Community copy-paste components. Key categories:

- Cards (79), Buttons (130), Badges (25), Avatars (17)
- Calendars (34), Tables (30), Sliders (45), Tabs (38)
- Empty States — build premium empty states for all roles

### Tier 2 — Targeted Use

**React Three Fiber + framer-motion-3d**

- Achievements page — 3D rotating trophy/medal on unlock
- Landing page — subtle 3D geometric hero object
- One or two high-impact moments only, not overused

**GSAP**

- Workout execution — set completion animations, rest timer
- Progress page — chart data entrance sequences
- Achievement unlock sequence

**Recharts → Tremor or custom Motion SVG**

- Tremor charts have premium dark-mode defaults
- Custom SVG paths with Motion for fully unique look

### Tier 3 — Design Tools (feed into Claude Code)

- **Google Stitch** — AI UI generator, use for design references
- **v0.dev** — AI component generator, use for first drafts
- **Figma** — layout planning before implementation
- **Framer** — landing page prototyping

---

## PART 2 — PAGE-BY-PAGE UPGRADE PLAN

### RONIN DASHBOARD — 7/10 → 9.5/10

- Stats numbers → `NumberTicker` count-up on load
- Card border → `BorderBeam` on active card
- Button → `ShimmerButton`
- Page entrance → `BlurFade` stagger (greeting → name → stats → button)
- Hero card bg → subtle `Meteors` at very low opacity
- ActionZone card → `WobbleCard` 3D tilt
- Week strip active day → `BorderBeam` border
- Stat cards below fold → `MagicCard` + `NumberTicker` + `AnimatedCircularProgressBar`

### RONIN WORKOUT PLANS — 5/10 → 9/10

- Plan cards → 21st.dev Display Cards (Codehagen/display-cards pattern)
- Hover: card lifts, reveals first 3 exercises
- Active/selected → `BorderBeam`
- Empty state → `LampEffect` + dramatic CTA
- Difficulty badges → animated gradient fill
- Filter tabs → Motion animated underline indicator

### RONIN WORKOUT EXECUTION — 6/10 → 9.5/10

- Set completion → GSAP checkmark draws itself + `NumberTicker`
- Rest timer → `AnimatedCircularProgressBar` pulsing ring
- Progress bar → animated fill with `BorderBeam` at leading edge
- Exercise transitions → `BlurFade` slide between exercises
- Workout complete → full `Confetti` + `SparklesText` on "WORKOUT COMPLETE"

### RONIN PROGRESS — 5.5/10 → 9/10

- Charts → Motion-animated SVG paths (line draws on load) or Tremor
- Stat cards → `BentoGrid` asymmetric layout + `MagicCard` + `NumberTicker`
- Period selector → Motion animated pill indicator
- Personal records → Aceternity `Timeline`

### RONIN ACHIEVEMENTS — 4/10 → 9.5/10

- Unlocked achievement cards → `SparklesText` + `Confetti` on first view
- Locked → `NeonGradientCard` dim glass with lock icon
- XP progress → large `AnimatedCircularProgressBar` ring
- Rank name → `SparklesCore` particles
- Skill visualization → `OrbitingCircles` around center avatar
- All numbers → `NumberTicker` + `BlurFade` entrance

### RONIN SCHEDULE — 5/10 → 8.5/10

- Calendar active day → Motion hover scale + glow
- Event pills → animated entrance
- Upcoming events → `AnimatedList` stagger
- Empty week → better empty state with suggested workout CTA

### RONIN AI COACH — 6/10 → 9/10

- Message entrance → `BlurFade` each bubble
- AI typing → `TypingAnimation` while generating
- AI avatar → pulsing `BorderBeam` ring while active
- Empty state → `BackgroundBeams` + dramatic CTA

### RONIN NUTRITION PLANNER — 6/10 → 8.5/10

- Macro rings → `AnimatedCircularProgressBar`
- Daily total → `NumberTicker`
- Meal cards → `MagicCard` spotlight
- Calorie bar → animated fill on load

### RONIN RECOVERY — 5/10 → 8/10

- Recovery % per muscle → `AnimatedCircularProgressBar`
- Body map → custom SVG human figure with color-coded regions
- Status numbers → `NumberTicker`
- Color coding: recovered=green, fatigued=amber, overloaded=red

### RONIN CALCULATORS HUB — 7/10 → 9/10

- Hub cards → `WobbleCard` 3D tilt
- Active calculator → `BorderBeam`
- Results → `NumberTicker` animated reveal
- Key result → `NeonGradientCard`

### LANDING PAGE — 6.5/10 → 9.5/10

- Hero → `LampEffect` or `BackgroundBeams`
- Heading → `BlurFade` word-by-word reveal
- Role cards → `WobbleCard` + `BorderBeam` on hover
- Feature sections → `TracingBeam` scroll line
- Stats → `NumberTicker` on scroll-into-view
- Testimonials → Motion infinite horizontal marquee
- CTAs → `ShimmerButton`
- Section backgrounds → `Meteors`, `AnimatedGridPattern`, `RetroGrid`

### LOGIN PAGE — 7/10 → 9/10

- Role selector → `MagicCard` spotlight
- Active role → `BorderBeam`
- Submit → `ShimmerButton`
- Background → subtle `Particles` or `FlickeringGrid`

### PRICING PAGE — 5/10 → 9/10

- Recommended plan → `NeonGradientCard`
- Featured plan → `BorderBeam`
- Price on billing toggle → `NumberTicker`
- Feature list → Motion stagger entrance
- CTA → `ShimmerButton`
- Background → `RetroGrid` or `AnimatedGridPattern`

### GURU DASHBOARD — 4.5/10 → 8.5/10

- Stats → `NumberTicker` + `BentoGrid` + `MagicCard`
- Recent clients → `AnimatedList`
- Revenue chart → Motion-animated SVG line
- Empty states → `LampEffect` + "Add your first client" CTA

### GURU CLIENTS — 5/10 → 8.5/10

- Client avatars → `AnimatedTooltip` mini profile on hover
- Cards → `WobbleCard`
- Active client → `BorderBeam`
- Table rows → Motion entrance stagger

### DISCIPLE DASHBOARD — 7/10 → 8.5/10

- Next session card → `BorderBeam`
- Stats → `NumberTicker`
- Trainer card → `MagicCard`
- Session history → `AnimatedList`

---

## PART 3 — IMPLEMENTATION PHASES

---

## PART 5 — SECURITY & FEATURE SPRINTS (Post-Audit Dev Work)

### Sprint 1 ✅ COMPLETED 2026-03-15 (commits b2f13eb, f779cf3)

**§VA-1 — Disciple login fixed (3 root causes)**

| File                                     | Fix                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/contexts/UserContext.tsx`    | Added `/disciple-login` to `isPublicPage` list — auth query was firing on public page                                                         |
| `server/services/accessCode.ts`          | Switched from deactivate+INSERT to `INSERT ... ON CONFLICT DO UPDATE` — UNIQUE constraint on `clientId` blocked second access code per client |
| `client/src/pages/DiscipleLoginPage.tsx` | Added `queryClient.invalidateQueries(['/api/auth/user'])` after login success                                                                 |

**Stripe Checkout subscription flow built (commit b2f13eb)**

| What                                         | Details                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/payments/create-checkout-session` | Creates Stripe Checkout for solo/solo*ai/trainer/pro tiers — STRIPE_PRICE_ID*\* env vars |
| `POST /api/payments/create-portal-session`   | Opens Stripe Customer Portal for billing management                                      |
| `client/src/pages/PaymentSuccess.tsx`        | Gold checkmark, "You're in.", plan name from `?tier=` param, invalidates auth cache      |
| `client/src/pages/PaymentCancelled.tsx`      | "No worries. Nothing was charged.", CTA back to pricing                                  |
| `client/src/lib/routeConfig.ts`              | `/payment-success` + `/payment-cancelled` added as public routes                         |
| `client/src/pages/SettingsPage.tsx`          | CSRF bug fixed — portal call changed from raw `fetch()` to `apiRequest()`                |
| `server/routes/webhooks.ts`                  | `solo_ai` added to `extractTierFromSubscription` (was missing — would store null tier)   |
| `server/config/env.ts`                       | 4 `STRIPE_PRICE_ID_*` vars added to schema with startup warnings                         |

> ⚠️ **Operator action required:** Set `STRIPE_PRICE_ID_SOLO`, `STRIPE_PRICE_ID_SOLO_AI`, `STRIPE_PRICE_ID_TRAINER`, `STRIPE_PRICE_ID_PRO` in Railway → Variables before live Checkout sessions can be created.

**§SEC-3 — CSP unsafe-inline removed from styleSrc (commit f779cf3)**

| What                                 | Details                                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `client/index.html`                  | Added `<meta name="csp-nonce" content="{{NONCE}}" />` — exposes per-request nonce to client JS                               |
| `client/src/components/ui/chart.tsx` | `ChartStyle` reads nonce from meta tag, passes `nonce={nonce}` to `<style>` element                                          |
| `server/index.ts`                    | `styleSrc` now uses nonce fn (no `unsafe-inline`); `styleSrcAttr: ["'unsafe-inline'"]` added for React `style=""` attributes |

---

### Sprint 2 ✅ COMPLETED 2026-03-15 — Design System Consistency

Three visual fixes to bring the app interior in line with the brand language.

**Fix 1 — Nutrition Planner green removed (§DS-1 continuation)**

| File                                         | Line | Old                                     | New               |
| -------------------------------------------- | ---- | --------------------------------------- | ----------------- |
| `client/src/pages/solo/NutritionPlanner.tsx` | 553  | `text-green-400` (loading spinner icon) | `text-primary`    |
| `client/src/pages/solo/NutritionPlanner.tsx` | 755  | `bg-green-500/10` (empty state circle)  | `bg-primary/10`   |
| `client/src/pages/solo/NutritionPlanner.tsx` | 756  | `text-green-400/50` (empty state icon)  | `text-primary/50` |

**Fix 2 — Playfair Display inside app pages (§DS-2)**

PageHeader component (`client/src/components/ui/premium/PageHeader.tsx`) already uses `font-['Playfair_Display']` — covers 10 pages. Added `font-['Playfair_Display']` to 4 pages with custom h1 elements:

| File                                     | Element                                                   |
| ---------------------------------------- | --------------------------------------------------------- |
| `client/src/pages/ClientsPage.tsx`       | 2 h1 elements (loading + data state) — "My Clients"       |
| `client/src/pages/PaymentsPage.tsx`      | h1 "Payments"                                             |
| `client/src/pages/ExercisesPage.tsx`     | 2 h1 elements (loading + data state) — "Exercise Library" |
| `client/src/pages/ClientDetailsPage.tsx` | Client name h1                                            |

Not applied to: data labels, stat numbers, body copy, nav items, buttons, text < 20px.

**Fix 3 — Brand color audit**

| File                                                        | Old                                         | New                       | Rationale                                             |
| ----------------------------------------------------------- | ------------------------------------------- | ------------------------- | ----------------------------------------------------- |
| `client/src/components/dashboard/DashboardQuickActions.tsx` | `emerald-500/10`, `emerald-600`             | `primary/10`, `primary`   | "Performance Insight" card — decorative, not semantic |
| `client/src/pages/WorkoutPlans.tsx:889-895`                 | `isSolo ? 'purple-500' : 'primary'` ternary | `primary` (both branches) | Redundant — `primary` IS purple for Ronin             |
| `client/src/pages/WorkoutPlans.tsx:732`                     | `from-purple-500 to-indigo-500` gradient    | `bg-primary`              | Header "Generate with AI" CTA                         |
| `client/src/pages/WorkoutPlans.tsx:917`                     | `from-purple-500 to-indigo-500` gradient    | `bg-primary`              | Empty state "Generate a Workout" CTA                  |

**Preserved as semantic (correctly kept):**

- Macro data colors: red-400=protein, yellow-400=carbs, blue-400=fat (data series differentiation)
- Health indicator greens: BMI healthy range, heart rate Zone 3, recovery >= 80%, IdealWeight in-range
- Success/completion greens: workout set complete, achievement unlocked, form validation pass, streak active
- Muscle group data series: back=blue, bicep=purple, legs=green, chest=red (per-muscle color coding)
- Calendar event types: completed=green, scheduled=blue (status differentiation)
- Calculator category gradients: nutrition=green, body metrics=purple, strength=red (per-calculator identity)
- WidgetScroller nav icons: each category has unique color (purple/amber/blue/green/teal/orange)
- QuickActions prompt chips: each topic has unique color (purple/green/blue/amber)

---

### Phase 1 — Foundation ✅ COMPLETED 2026-03-14 (commit 413d760)

**Components installed** (all in `client/src/components/ui/`):

- `number-ticker.tsx` — spring-animated count-up, triggers on scroll-into-view
- `blur-fade.tsx` — blur+fade entrance with configurable direction/delay
- `animated-circular-progress-bar.tsx` — CSS-animated SVG ring, no extra deps
- `border-beam.tsx` — framer-motion `offsetPath` traveling gradient border

**Applied:**

| Component                     | Files changed       | What                                                                      |
| ----------------------------- | ------------------- | ------------------------------------------------------------------------- |
| `NumberTicker`                | `QuickStats.tsx`    | 3 of 4 stats (workouts, streak, PRs) — volume stays string (formatVolume) |
| `NumberTicker`                | `MobileHero.tsx`    | 2 desktop stats (totalWorkouts, streak) — volume & rank stay string       |
| `NumberTicker`                | `ProgressPage.tsx`  | Total Workouts, Total Volume, Total Sets                                  |
| `NumberTicker`                | `Achievements.tsx`  | XP Earned counter                                                         |
| `BlurFade`                    | `SoloDashboard.tsx` | 8 sections, delays 0.05–0.40s                                             |
| `AnimatedCircularProgressBar` | `Achievements.tsx`  | Header unlock % ring (replaces plain text ratio)                          |
| `BorderBeam`                  | `MobileHero.tsx`    | Desktop hero card — **REVERTED** (wrong domain pattern)                   |
| `BorderBeam`                  | `ActionZone.tsx`    | Today's workout card — **REVERTED** (wrong domain pattern)                |

**NOT yet done (still todo for Phase 1 scope):**

- NumberTicker on Guru dashboard stats
- NumberTicker on Disciple dashboard stats
- BlurFade on non-dashboard pages (Workouts, Recovery, Achievements, AI Coach)
- AnimatedCircularProgressBar on Nutrition macros, Recovery muscle groups
- BorderBeam reverted from hero + ActionZone — see design-language.md for correct patterns

> ⚠️ **DESIGN LANGUAGE GATE**: Phases 2–4 below were written before `_brain/notes/design-language.md` was completed. Re-evaluate every component against that document before implementing. The following are explicitly flagged as **SaaS-landing patterns — do not implement in the app**:
>
> - `Confetti` — celebration overkill for a performance/discipline domain
> - `SparklesText` — decorative noise, not earned signal
> - `WobbleCard` — playful 3D tilt conflicts with serious training context
> - `ShimmerButton` — SaaS-marketing CTA, not appropriate for in-app actions
> - `BorderBeam` — too decorative for functional UI cards (hero, workout card)

### Sprint 3 ✅ COMPLETED 2026-03-15 — Visual Language Upgrades

Four visual language upgrades implementing the premium dark fitness aesthetic.

**Item 1 — Workout Execution full-bleed redesign**

Full-bleed dark layout for `WorkoutExecution.tsx`. Removed card chrome, expanded exercise content to fill viewport. Dark gradient backgrounds with role-accent highlights on active sets.

**Item 2 — Custom SVG zone-band charts (replacing Recharts)**

| File                                                      | What                                                                                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/redesign/charts/ZoneBandChart.tsx` | NEW — reusable SVG chart with Catmull-Rom spline interpolation, zone bands (Optimal/Moderate/Detraining as colored `<rect>` elements), glowing endpoint, dashed average line, hover tooltips |
| `client/src/pages/ProgressPage.tsx`                       | Replaced solo Weekly Volume `BarChart` + Volume Trend `AreaChart` with `ZoneBandChart` + `PeriodToggle` (7D/4W/6M/1Y) + `NumberTicker` hero numbers + trend indicators                       |
| `client/src/pages/ProgressPage.tsx`                       | NEW Training Load Ratio (ACWR) card — visual ratio bar with status labels (Detraining/Sweet Spot/Overreaching)                                                                               |

Recharts kept for trainer/client progress charts (different data model). Exports: `ZoneBandChart`, `PeriodToggle`, `Period` type.

**Item 3 — Status-driven hero color theming**

Recovery readiness score computed from `/api/recovery/fatigue` data: `score = avg(100 - fatigueLevel)`.

| File                                                      | What                                                                                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client/src/components/redesign/dashboard/MobileHero.tsx` | Desktop hero: green/amber/red gradient tint via inline `background`, 3px status stripe at top (`bg-gradient-to-r from-green-500 to-emerald-400`), readiness badge with Shield icon ("100% — Ready to Train") |
| `client/src/pages/solo/Recovery.tsx`                      | Overall Recovery Score card: status-driven border color, gradient background tint, 3px colored stripe, recovery % text colored by status with label (Ready/Moderate/Fatigued)                                |

Thresholds: ≥75% = green/Ready, 50-74% = amber/Moderate, <50% = red/Needs Rest. React Query deduplication — same `/api/recovery/fatigue` queryKey as `useSoloDashboardData`, no extra fetch.

**Item 4 — Muscle anatomy diagram via react-body-highlighter**

| File                                                             | What                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client/src/components/redesign/charts/MuscleAnatomyDiagram.tsx` | NEW — wrapper around `react-body-highlighter` `Model` component. Maps 16 API muscle group names to SVG body highlighter slugs via `MUSCLE_MAP` Record. Front/back view toggle. Color-coded by recovery status: green=recovered, amber=recovering, red=fatigued (via `highlightedColors` array indexed by `frequency`). Legend with colored dots. |
| `client/src/pages/solo/Recovery.tsx`                             | Added "Muscle Map" card between Overall Recovery Score and Muscle Group Recovery grid                                                                                                                                                                                                                                                            |
| `package.json`                                                   | Added `react-body-highlighter@2.0.5` dependency                                                                                                                                                                                                                                                                                                  |

Client-side SVG rendering — no backend service needed. CJS-only package handled by Vite's dependency optimizer (see gotchas.md). SVG zone bands render before data path (SVG document order = paint order, no z-index).

---

### Sprint 4 ✅ COMPLETED 2026-03-15 — Core Feature Additions

Four new features adding real data-driven functionality to the Ronin experience.

**Item 1 — ACWR Training Load Score (`GET /api/solo/readiness`)**

Real training load readiness replaces the Sprint 3 fatigue-proxy calculation. Backend computes Acute:Chronic Workload Ratio from a 28-day rolling window of `workoutSessions.totalVolumeKg`:

- **Acute Load (ATL):** Sum of volume (kg) from last 7 days
- **Chronic Load (CTL):** Average weekly volume over last 28 days (weeks with data only)
- **Training Load Ratio (TLR):** ATL / CTL
- **Readiness score** derived from TLR zones:
  - 0.8–1.3 → `optimal` (score 75–100) — "Sweet Spot"
  - 1.3–1.5 → `moderate` (score 50–74) — "Overreach risk"
  - \>1.5 → `low` (score 25–49) — "Needs recovery"
  - <0.8 → `moderate` (score 50–74) — "Detraining risk"
  - No data → score 50, status moderate
- **Recommendation:** WHOOP-style contextual copy per status

| File                                                      | What                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/routes/solo.ts`                                   | NEW `GET /api/solo/readiness` — returns `{ score, status, acuteLoad, chronicLoad, ratio, recommendation }`                                                                                                                                      |
| `client/src/components/redesign/dashboard/MobileHero.tsx` | Replaced `useQuery(['/api/recovery/fatigue'])` + `useMemo` fatigue-proxy with `useQuery(['/api/solo/readiness'])`. Badge shows real score: "50% — Moderate Recovery" with amber stripe (detraining zone)                                        |
| `client/src/pages/solo/Recovery.tsx`                      | `overallRecovery` falls through: ACWR readiness → fatigue-proxy → 100. Added `useQuery(['/api/solo/readiness'])`                                                                                                                                |
| `client/src/pages/ProgressPage.tsx`                       | Training Load card rewired from client-side `weeklyData` ratio to `readinessData` API. Added `NumberTicker` on ratio (2 decimal places), readiness % in top-right, 3 stat cards (Acute 7d / Chronic 28d avg / Ratio), recommendation text below |

**Item 2 — Equipment Selector SVG Chips (`EquipmentSelector.tsx`)**

Multi-select equipment grid with 8 SVG line illustrations — technical diagram aesthetic (1.5px stroke, 64×64 viewBox).

Equipment types: Barbell, Dumbbells, Kettlebell, Resistance Bands, Pull-up Bar, Bench, Cable Machine, Bodyweight (no equipment).

- **Resting state:** dark card (`bg-white/[0.03]`), white/gray SVG stroke
- **Selected state:** role accent tint (`bg-primary/10 border-primary/40`), accent-colored SVG stroke via CSS var `--equipment-active: hsl(var(--primary))`
- **Layout:** 4 per row desktop (`md:grid-cols-4`), 2 per row mobile (`grid-cols-2`)
- **Toggle:** tap to select/deselect, multiple simultaneous selections

| File                                              | What                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/ui/equipment-selector.tsx` | NEW — `EquipmentSelector({ selected: string[], onChange })` component. 8 inline SVG components (`BarbellSvg`, `DumbbellsSvg`, etc.) with `active` prop for accent coloring                                                                                            |
| `client/src/pages/solo/WorkoutGenerator.tsx`      | Equipment state changed from `useState('full_gym')` (string) to `useState<string[]>(['barbell', 'dumbbells', 'bench'])` (array). Old `equipmentMap` lookup replaced with `equipmentIdToApi` per-item mapping. `<Select>` dropdown replaced with `<EquipmentSelector>` |

**Item 3 — Exercise Performance Tracking (`ExerciseDetailPage.tsx`)**

Per-movement drill-down accessible from exercise library. Backend joins `workoutSetLogs` through `workoutSessions` (set logs have no `userId` — see gotchas.md).

- **1RM calculation:** Epley formula: `weight × (1 + reps / 30)`
- **PR detection:** highest estimated 1RM across all sessions
- **History grouping:** best set per session (highest e1RM), sorted most-recent-first

| File                                           | What                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/routes/solo.ts`                        | NEW `GET /api/solo/exercises/:exerciseId/history` — `INNER JOIN workoutSessions` for user ownership. Returns `{ exercise: {name, muscleGroups, equipment}, history: [{date, weight, reps, rpe, estimatedOneRepMax}], personalRecord: {weight, reps, date, estimatedOneRepMax}, oneRepMaxTrend: [{date, value}] }` |
| `client/src/pages/solo/ExerciseDetailPage.tsx` | NEW — `PageHeader` with Playfair Display exercise name. Gold PR badge (`border-[#c9a84c]/30`). Last vs Best comparison stat cards. `ZoneBandChart` for 1RM trend (zones: Below Average / Average / PR Zone). Session history list with gold highlight on PR row, RPE badges. `PeriodToggle` (7D/4W/6M/1Y)         |
| `client/src/components/RouterConfig.tsx`       | Added lazy route: `/solo/exercises/:exerciseId/history` → `ExerciseDetailPage`. Covered by existing `isKnownAuthRoute` prefix match on `/solo`                                                                                                                                                                    |
| `client/src/pages/ExercisesPage.tsx`           | Added `Link` import from wouter + `TrendingUp` icon. Split "View Details" button into `Details` + `History` side-by-side. History links to `/solo/exercises/${exercise.id}/history`                                                                                                                               |

**Item 4 — Streak Calendar (`StreakCalendar.tsx`)**

GitHub contribution graph pattern — 12 weeks × 7 days grid of small squares.

- **Data source:** `GET /api/solo/workout-sessions?weeks=12` — returns `[{id, workoutName, date, totalVolumeKg, workoutType}]`
- **Volume-intensity coloring:** 4 levels mapped from volume relative to max (`bg-primary/20`, `/40`, `/65`, `/90`). Empty days = `bg-white/[0.04]`
- **Today:** outlined with `ring-1 ring-primary/60`
- **Tooltips:** native `title` attribute with date + workout name + volume
- **Legend:** Less → More color ramp
- **Streak calculation:** client-side — consecutive days from today backwards (allows yesterday as streak start). Best streak scanned across all history ascending
- **Stats:** 3 cards below grid — Workouts (12w), Current Streak (d), Best Streak (d) — all `NumberTicker` animated

| File                                           | What                                                                                                                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/routes/solo.ts`                        | NEW `GET /api/solo/workout-sessions` — accepts `?weeks=N` (default 12). Queries completed `workoutSessions` with `gte(startedAt, cutoff)`. Returns `[{id, workoutName, date, totalVolumeKg, workoutType}]`       |
| `client/src/components/ui/streak-calendar.tsx` | NEW — `StreakCalendar({ weeks?, hideStats?, className? })`. Uses `useMemo` for grid construction + streak calculation. Map iteration via `.forEach()` (no `--downlevelIteration`). Set spread via `Array.from()` |
| `client/src/pages/solo/SoloDashboard.tsx`      | Added "Training Consistency" `Card` with `StreakCalendar` between `WeeklyOverview` and `RecoveryBodyStatus` (BlurFade delay 0.22)                                                                                |
| `client/src/pages/solo/Achievements.tsx`       | Added `StreakCalendar` card between header stats and category tabs (motion delay 0.08)                                                                                                                           |

---

### Sprint 5 ✅ COMPLETED 2026-03-16 — Architecture Debt

Pure structural sprint — no new features, no visual changes. Codebase sustainability focus.

**Item 1 — routes.ts monolith split (§BE-3)**

`server/routes.ts` reduced from 2,280 lines → 306 lines (87% reduction). 10 new sub-routers extracted:

| File                              | Routes extracted | Domain                                    |
| --------------------------------- | ---------------- | ----------------------------------------- |
| `server/routes/onboarding.ts`     | 5                | Intake form CRUD, completion              |
| `server/routes/dashboard.ts`      | 4                | Dashboard stats, solo dashboard data      |
| `server/routes/clients.ts`        | 12               | Guru client CRUD, biometrics, search      |
| `server/routes/exercises.ts`      | 2                | Exercise library CRUD                     |
| `server/routes/workoutsRouter.ts` | 10               | Workout plan CRUD, generation             |
| `server/routes/assignments.ts`    | 9                | Workout assignments, client workout views |
| `server/routes/progress.ts`       | 5                | Progress tracking, personal records       |
| `server/routes/schedule.ts`       | 5                | Appointment CRUD                          |
| `server/routes/ai.ts`             | (existed)        | AI coach, AI usage                        |
| `server/routes/calculators.ts`    | (existed)        | Calculator endpoints                      |
| `server/routes/gamification.ts`   | (existed)        | XP, achievements, streaks                 |
| `server/routes/intake.ts`         | (existed)        | Intake form                               |
| `server/routes/notifications.ts`  | (existed)        | Notification endpoints                    |
| `server/routes/solo.ts`           | (existed)        | Solo/Ronin-specific endpoints             |

All middleware (auth checks, validation, ownership guards) preserved exactly. Zero route path changes. Remaining 306 lines in `routes.ts` are imports + `app.use()` mounts.

**Item 2 — framer-motion cleanup**

94 → 72 files importing framer-motion (22 files cleaned). Replacements used Tailwind CSS transitions (`animate-in`, `fade-in`, `transition-transform`, `hover:scale-*`).

Files cleaned include: `AnimationComponents.tsx`, `PaymentSuccess/Cancelled.tsx`, `ForgotPassword/ResetPassword.tsx`, `ExerciseDetailPage.tsx`, `CTAButton.tsx`, `empty-state.tsx`, `PremiumCard.tsx`, `StatCard.tsx`, 5 redesign dashboard components, 4 solo-dashboard components.

72 remaining files kept framer-motion for valid reasons: AnimatePresence exit animations (19), SVG path animations (5), drag gestures (1), complex spring physics (6), deeply integrated multi-element animations (~20), UI library internals (3).

**Item 3 — totalVolumeKg varchar → doublePrecision**

| File                                                | Change                                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `server/migrations/008_volume_varchar_to_double.ts` | NEW — `ALTER COLUMN total_volume_kg TYPE DOUBLE PRECISION USING total_volume_kg::double precision` |
| `shared/schema.ts`                                  | `totalVolumeKg` column type changed from `varchar` to `doublePrecision`                            |
| 20 server files                                     | Removed `parseFloat()` wrappers around `totalVolumeKg` reads                                       |

**Item 4 — 20 unmanaged tables → Drizzle schema**

Confirmed resolved in prior sprints. All tables now have Drizzle schema definitions in `shared/schema.ts`.

**Item 5 — TypeScript `as any` cleanup**

40+ `as any` casts removed across 12 server files via Express type augmentation:

| File                             | Change                                                         |
| -------------------------------- | -------------------------------------------------------------- |
| `server/types/express.d.ts`      | NEW — `Express.User` interface with all fields from `req.user` |
| 12 server route/middleware files | `(req as any).user` → `req.user` with proper typing            |

**Verification results:**

- `tsc --noEmit`: 135 errors (all pre-existing, zero new)
- Tests: 160/175 passing (15 pre-existing `aiService.test.ts` failures)
- Build: passes clean in 12.67s
- No route paths, middleware, or logic changed

---

### Sprint 6 ✅ COMPLETED 2026-03-16 — Platform Reliability

Production-readiness sprint — no new features, no visual changes. Everything about making the app trustworthy at scale.

**Item 1 — CI/CD pipeline**

| File                             | What                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `.github/workflows/security.yml` | NEW — weekly security scan (Monday 9am UTC): `npm audit --audit-level=high` + TruffleHog secret detection |
| `.github/workflows/ci.yml`       | ENHANCED — added bundle size reporting to build job (`du -sh dist/` → GitHub Step Summary)                |

Pre-existing: `ci.yml` already had lint/test/e2e/build jobs. `deploy.yml` already had Railway/Vercel deploy with rollback. ESLint flat config with TypeScript, React, Prettier already configured.

**Item 2 — memoryStorage 503 fix (§SEC-2)**

| File                      | What                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| `server/storage.ts`       | Startup DB check now calls `process.exit(1)` if database unreachable in production (was logging only) |
| `server/memoryStorage.ts` | Constructor throws `Error` if instantiated in production                                              |
| `server/routes.ts`        | Health check response changed `status: 'ok'` → `status: 'healthy'` + added `version` field            |

Pre-existing guards already in place: `getStorage()` already threw in production on DB failure, `checkDatabaseAvailability()` already ran on startup. Sprint 6 added the hard `process.exit(1)` to prevent the server from accepting requests without a database.

**Item 3 — Error monitoring middleware wired up**

| File              | What                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/index.ts` | Replaced inline 80-char-truncated request logger with structured `requestLogger` middleware (request IDs, timing, slow detection)                                   |
| `server/index.ts` | Replaced simple `globalErrorHandler` with comprehensive `errorHandler` (Sentry integration, Zod/PG error mapping, request context) + `notFoundHandler` for API 404s |

Pre-existing: `errorHandler.ts`, `requestLogger.ts`, `errors.ts`, `logger.ts`, `sentry.ts` all existed — they just weren't wired into `index.ts`. The inline logger monkey-patched `res.json` and truncated at 80 chars.

**Item 4 — SLOs + performance monitoring**

| File                                      | What                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/slos.md`                            | NEW — availability (99.5%), latency (P95 < 500ms), error rate (< 1% 5xx/24h), recovery time (< 15min), per-journey targets |
| `server/middleware/performanceMonitor.ts` | NEW — tracks per-endpoint request counts + capped slow request history (>1s, last 100)                                     |
| `server/index.ts`                         | Registered `performanceMonitor` middleware + `/api/admin/performance` endpoint (dev/staging only)                          |

**Item 5 — Stripe webhook reliability**

| File                        | What                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `server/routes/webhooks.ts` | Added structured JSON logging for every webhook event received (`console.warn` for log aggregator parsing)             |
| `server/routes/webhooks.ts` | Duplicate webhook events now log before returning early                                                                |
| `server/routes/webhooks.ts` | `handleCheckoutCompleted` plan activation wrapped in try/catch — DB failures bubble up to return 500 so Stripe retries |
| `server/routes/webhooks.ts` | Success/failure logging with event ID for correlation                                                                  |

Pre-existing: DB-based idempotency check (queries `payments` table for existing event ID) was already in place. Stripe signature verification already worked.

**Verification results:**

- `tsc --noEmit`: 130 errors (all pre-existing, zero new — 5 fewer than Sprint 5 due to import cleanup)
- Tests: 160/175 passing (15 pre-existing `aiService.test.ts` failures)
- Build: passes clean in 13.06s
- No route paths or business logic changed

---

### Phase 2 — Showcase moments (RE-EVALUATE against design-language.md before starting)

5. ~~Workout execution: set completion + rest timer ring~~ (execution redesigned in Sprint 3)
6. Achievement unlock: motion treatment TBD (Confetti/SparklesText flagged — do not use)
7. Landing hero: LampEffect or BackgroundBeams (landing only, not app interior)
8. Workout Plans: Display Cards

### Phase 3 — Polish (RE-EVALUATE against design-language.md before starting)

9. MagicCard on all major cards
10. WobbleCard — FLAGGED, do not implement
11. ShimmerButton — FLAGGED, do not implement
12. ~~Chart replacements~~ (done in Sprint 3 Item 2 — custom SVG zone-band charts)

### Phase 4 — Premium / 3D (RE-EVALUATE against design-language.md before starting)

13. Achievement 3D badge (R3F + framer-motion-3d)
14. ~~Body map SVG for Recovery page~~ (done in Sprint 3 Item 4 — react-body-highlighter)
15. TracingBeam on landing scroll
16. OrbitingCircles for achievement visualization

---

## PART 4 — RESOURCES

- [[resources/magicui-components]] — full Magic UI component list
- [[resources/aceternity-components]] — full Aceternity component list
- [[resources/motion-react-docs]] — Motion v12 React docs
- https://21st.dev/community/components — browse live
- https://v0.dev — generate component first drafts
- https://stitch.withgoogle.com — AI UI design references

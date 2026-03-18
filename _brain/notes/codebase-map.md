# GymGurus — Codebase Map

> Comprehensive read-only audit. Accuracy-first. Written for future Claude Code sessions.
> Last updated: 2026-03-15

## Repository

- **GitHub:** https://github.com/tvarvaroi/gym-gurus
- **Live:** https://gym-gurus-production.up.railway.app

---

## PAGES — By Role

### Shared / Public Pages

| File                                           | Route                    | Purpose                                                                                              |
| ---------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `client/src/pages/LandingPage.tsx`             | `/`                      | Scrollable landing with 6 lazy-loaded sections (Hero, HowItWorks, Features, About, Contact, Pricing) |
| `client/src/pages/PricingPage.tsx`             | `/pricing`               | Plan pricing display with billing toggle                                                             |
| `client/src/pages/PrivacyPage.tsx`             | `/privacy`               | Static privacy policy                                                                                |
| `client/src/pages/TermsPage.tsx`               | `/terms`                 | Static terms of service                                                                              |
| `client/src/pages/not-found.tsx`               | `*`                      | 404 page                                                                                             |
| `client/src/pages/auth/LoginPage.tsx`          | `/auth/login`            | Role-based login (Guru/Ronin/Disciple cards)                                                         |
| `client/src/pages/auth/RegisterPage.tsx`       | `/register`              | Registration with role selection                                                                     |
| `client/src/pages/auth/ForgotPasswordPage.tsx` | `/forgot-password`       | Password reset request                                                                               |
| `client/src/pages/auth/ResetPasswordPage.tsx`  | `/reset-password`        | Password reset form                                                                                  |
| `client/src/pages/DiscipleLoginPage.tsx`       | `/disciple-login`        | Disciple (client) login via access code                                                              |
| `client/src/pages/auth/TestAuthLogin.tsx`      | `/test-login` (DEV only) | Debug login                                                                                          |
| `client/src/pages/auth/TestMinimalLogin.tsx`   | `/login2` (DEV only)     | Debug login 2                                                                                        |
| `client/src/pages/PaymentSuccess.tsx`          | `/payment-success`       | Stripe post-checkout success — reads `?tier=` param, invalidates auth cache, shows plan name         |
| `client/src/pages/PaymentCancelled.tsx`        | `/payment-cancelled`     | Stripe post-checkout cancel — "No worries. Nothing was charged." + back-to-pricing CTA               |

**Public calculators** (no auth required, routes mounted under `/calculators`):

`CalculatorsHub.tsx`, `BMICalc.tsx`, `BodyFatCalc.tsx`, `CaloriesBurnedCalc.tsx`, `HeartRateZonesCalc.tsx`, `IdealWeightCalc.tsx`, `MacroCalc.tsx`, `OneRepMaxCalc.tsx`, `PlatesCalc.tsx`, `StrengthStandardsCalc.tsx`, `TDEECalc.tsx`, `VO2MaxCalc.tsx`, `WaterIntakeCalc.tsx`

**Premium calculators** (auth required, routes under `/premium-calculators`):

`PremiumCalculatorsHub.tsx` + mirror versions of all above prefixed `Premium`.

---

### Ronin (Solo) Pages — role: `solo`

| File                                           | Route                         | Purpose                                                                                                                                                       |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/pages/solo/SoloDashboard.tsx`      | `/solo/dashboard`             | Main dashboard (MobileHero, ActionZone, QuickStats, WeekStrip, WeeklyOverview, RecoveryBodyStatus, BodyIntelligencePanel, WidgetScroller, RecentActivityFeed) |
| `client/src/pages/solo/SoloOnboarding.tsx`     | `/solo/onboarding`            | Fitness profile setup wizard                                                                                                                                  |
| `client/src/pages/solo/AICoach.tsx`            | `/solo/coach`                 | Full AI chat interface with workout/meal plan extraction                                                                                                      |
| `client/src/pages/solo/NutritionPlanner.tsx`   | `/solo/nutrition`             | AI meal plan generation + history                                                                                                                             |
| `client/src/pages/solo/WorkoutGenerator.tsx`   | `/solo/generate`              | AI workout generation with focus/goal/style options                                                                                                           |
| `client/src/pages/solo/Achievements.tsx`       | `/solo/achievements`          | XP, rank, achievement cards with animated ring                                                                                                                |
| `client/src/pages/solo/Recovery.tsx`           | `/solo/recovery`              | Muscle fatigue tracking + ACWR readiness + recovery recommendations                                                                                           |
| `client/src/pages/solo/ExerciseDetailPage.tsx` | `/solo/exercises/:id/history` | Per-exercise performance: 1RM trend chart, PR badge, session history, Epley formula                                                                           |
| `client/src/pages/WorkoutPlans.tsx`            | `/solo/workouts`              | Saved workout plans (Ronin view)                                                                                                                              |
| `client/src/pages/WorkoutExecution.tsx`        | `/workout/:id`                | Active workout session with set logging, rest timer                                                                                                           |
| `client/src/pages/WorkoutBuilder.tsx`          | `/solo/workout-builder`       | Custom workout builder                                                                                                                                        |
| `client/src/pages/ProgressPage.tsx`            | `/progress`                   | Recharts-based progress charts (multi-role)                                                                                                                   |
| `client/src/pages/SchedulePage.tsx`            | `/schedule`                   | Calendar + event list (multi-role)                                                                                                                            |
| `client/src/pages/SettingsPage.tsx`            | `/settings`                   | Profile, security, billing, notifications tabs                                                                                                                |

---

### Guru (Trainer) Pages — role: `trainer`

| File                                     | Route          | Purpose                                             |
| ---------------------------------------- | -------------- | --------------------------------------------------- |
| `client/src/pages/ClientsPage.tsx`       | `/clients`     | Client roster with CSV export                       |
| `client/src/pages/ClientDetailsPage.tsx` | `/clients/:id` | Client detail: workouts, progress, sessions tabs    |
| `client/src/pages/ExercisesPage.tsx`     | `/exercises`   | Exercise library CRUD                               |
| `client/src/pages/WorkoutPlans.tsx`      | `/workouts`    | Trainer's workout plans (Guru view)                 |
| `client/src/pages/PaymentsPage.tsx`      | `/payments`    | Payment plans (Stripe) + history                    |
| `client/src/pages/ProgressPage.tsx`      | `/progress`    | Multi-role: trainer selects client to view progress |
| `client/src/pages/SchedulePage.tsx`      | `/schedule`    | Appointment management with recurrence              |
| `client/src/pages/SettingsPage.tsx`      | `/settings`    | Same page, role-specific billing section            |

---

### Disciple (Client) Pages — role: `client`

| File                                    | Route          | Purpose                                                    |
| --------------------------------------- | -------------- | ---------------------------------------------------------- |
| `client/src/pages/WorkoutPlans.tsx`     | `/workouts`    | Shows `WeeklyWorkoutView` (assigned workouts from trainer) |
| `client/src/pages/WorkoutExecution.tsx` | `/workout/:id` | Same execution page                                        |
| `client/src/pages/ProgressPage.tsx`     | `/progress`    | Disciple views own progress only                           |
| `client/src/pages/SchedulePage.tsx`     | `/schedule`    | Read-only appointment view                                 |
| `client/src/pages/SettingsPage.tsx`     | `/settings`    | Limited settings                                           |

> **Note**: Disciple login (`/disciple-login`) is **broken** per §VA-1. The route exists but lacks proper auth flow. Disciples cannot currently log in via access code.

---

## KEY COMPONENTS

### App Shell

| File                                  | Purpose                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `client/src/App.tsx`                  | 1,105-line God component. Routing, auth guard, app shell layout, WebSocket provider, role-based CSS class injection |
| `client/src/contexts/UserContext.tsx` | Canonical auth state. `useUser()` hook. Manages public page detection (triple isPublicPage pattern)                 |
| `client/src/components/AuthGuard.tsx` | Persists role to localStorage (`gg_role`) for role-flash prevention                                                 |

### Redesign Components (production, mobile-first)

| File                                                            | Purpose                                                                                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/redesign/dashboard/MobileHero.tsx`       | Hero card: user name, XP ring, streak badge. Desktop stat cards with NumberTicker                                          |
| `client/src/components/redesign/dashboard/ActionZone.tsx`       | Full-width workout CTA. Fetches `GET /api/solo/today-workout` and `GET /api/recovery/fatigue`. Contextual suggestion logic |
| `client/src/components/redesign/dashboard/QuickStats.tsx`       | Mobile-only horizontal scroll stat strip. 4 animated stats                                                                 |
| `client/src/components/redesign/dashboard/WeekStrip.tsx`        | Mobile-only 7-day activity calendar strip                                                                                  |
| `client/src/components/redesign/dashboard/WidgetScroller.tsx`   | Quick-access nav row (icons to AI Coach, Nutrition, etc.)                                                                  |
| `client/src/components/redesign/execution/SetRow.tsx`           | Individual set logging row with inline weight/reps input                                                                   |
| `client/src/components/redesign/execution/RestTimerOverlay.tsx` | Full-screen rest timer overlay                                                                                             |
| `client/src/components/redesign/execution/CompletionSheet.tsx`  | Workout completion bottom sheet with summary                                                                               |
| `client/src/components/redesign/coach/QuickActions.tsx`         | AI Coach quick-action buttons                                                                                              |

### Solo Dashboard Components (existing, kept for desktop)

| File                                                             | Purpose                                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `client/src/components/solo-dashboard/WeeklyOverview.tsx`        | Volume chart + detailed 7-day log. Desktop primary stats display |
| `client/src/components/solo-dashboard/RecoveryBodyStatus.tsx`    | Recovery status section for dashboard                            |
| `client/src/components/solo-dashboard/BodyIntelligencePanel.tsx` | Body intelligence/biometrics summary                             |
| `client/src/components/solo-dashboard/RecentActivityFeed.tsx`    | Recent workouts + XP + meal plan feed                            |
| `client/src/components/solo-dashboard/DashboardSkeleton.tsx`     | Loading skeleton                                                 |
| `client/src/components/solo-dashboard/CircularProgressRing.tsx`  | SVG progress ring (non-animated)                                 |

### Magic UI Components (Phase 1 installed)

| File                                                          | Purpose                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `client/src/components/ui/number-ticker.tsx`                  | Spring-animated count-up. Used in QuickStats, MobileHero, ProgressPage, Achievements |
| `client/src/components/ui/blur-fade.tsx`                      | Blur+fade entrance. Used across SoloDashboard (8 sections)                           |
| `client/src/components/ui/animated-circular-progress-bar.tsx` | CSS-animated SVG ring. Used in Achievements header                                   |
| `client/src/components/ui/border-beam.tsx`                    | Traveling gradient border (reverted from ActionZone/hero — design-language gate)     |

### Custom Icons

| File                                           | Purpose                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| `client/src/components/icons/RoninIcon.tsx`    | Ronin character illustration — used in empty states            |
| `client/src/components/icons/GuruIcon.tsx`     | Guru character illustration — used in empty states             |
| `client/src/components/icons/DiscipleIcon.tsx` | Disciple character illustration (not used per design decision) |

### Key Hooks

| File                                       | Purpose                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `client/src/hooks/useSoloDashboardData.ts` | Orchestrates all dashboard queries (stats, gamification, recovery, activity, etc.) |
| `client/src/hooks/useWorkoutSession.ts`    | Workout execution state machine                                                    |
| `client/src/hooks/useRestTimer.ts`         | Rest timer countdown logic                                                         |
| `client/src/hooks/useWebSocket.ts`         | WebSocket connection for trainer-client messaging                                  |
| `client/src/hooks/useGamification.ts`      | XP/level/achievement queries                                                       |
| `client/src/hooks/useRecovery.ts`          | Fatigue data queries                                                               |
| `client/src/hooks/useFitnessProfile.ts`    | Fitness profile CRUD                                                               |
| `client/src/hooks/use-reduced-motion.ts`   | `prefers-reduced-motion` media query hook                                          |
| `client/src/hooks/use-user.ts`             | Re-exports useUser from UserContext                                                |

---

## API ROUTES — By Domain

All routes prefixed with `/api`. Auth enforcement via `secureAuth` middleware unless noted.

### Auth — `server/routes/auth.ts` (mounted at `/api/auth`)

| Method | Path                             | Auth    | Description                                                       |
| ------ | -------------------------------- | ------- | ----------------------------------------------------------------- |
| POST   | `/api/auth/register`             | Public  | Create account (email, password, role, name). Sends welcome email |
| POST   | `/api/auth/login`                | Public  | Email+password login. Creates session                             |
| POST   | `/api/auth/logout`               | Session | Destroy session                                                   |
| GET    | `/api/auth/me`                   | Session | Return current user (no password)                                 |
| POST   | `/api/auth/forgot-password`      | Public  | Send reset email                                                  |
| POST   | `/api/auth/reset-password`       | Public  | Validate token + update password                                  |
| POST   | `/api/auth/validate-access-code` | Public  | Disciple login via trainer access code                            |
| GET    | `/api/auth/google`               | Public  | Google OAuth initiation                                           |
| GET    | `/api/auth/google/callback`      | Public  | Google OAuth callback                                             |

### Users + Onboarding — `server/routes.ts` (main monolith)

| Method | Path                         | Auth    | Description                              |
| ------ | ---------------------------- | ------- | ---------------------------------------- |
| GET    | `/api/user`                  | Session | Current user data                        |
| POST   | `/api/users/onboarding`      | Session | Upsert solo fitness profile (onboarding) |
| GET    | `/api/users/fitness-profile` | Session | Get fitness profile                      |
| PATCH  | `/api/users/fitness-profile` | Session | Update fitness profile                   |
| GET    | `/api/onboarding/progress`   | Session | Trainer onboarding milestone progress    |
| PUT    | `/api/onboarding/progress`   | Session | Update onboarding milestone              |

### Solo Tracking — `server/routes/solo.ts` (mounted at `/api/solo`)

| Method | Path                             | Auth    | Description                                                                   |
| ------ | -------------------------------- | ------- | ----------------------------------------------------------------------------- |
| GET    | `/api/solo/fitness-profile`      | Session | Get fitness profile                                                           |
| GET    | `/api/solo/today-workout`        | Session | Returns active session, or suggested workout (saved → AI → template fallback) |
| GET    | `/api/solo/weekly-activity`      | Session | 7-day activity array + week summary stats                                     |
| GET    | `/api/solo/stats`                | Session | Total workouts, volume, sets, active days, PRs                                |
| POST   | `/api/solo/session/start`        | Session | Create workoutSession record                                                  |
| PUT    | `/api/solo/session/:id`          | Session | Update session (progress, timer, RPE)                                         |
| POST   | `/api/solo/session/:id/complete` | Session | End session, calculate stats, trigger gamification, update recovery           |
| POST   | `/api/solo/session/:id/log-set`  | Session | Log individual set to workoutSetLogs                                          |
| GET    | `/api/solo/session/:id/sets`     | Session | Get all set logs for session                                                  |
| GET    | `/api/solo/history`              | Session | Past workout sessions                                                         |
| GET    | `/api/solo/strength-summary`     | Session | PR summary for major lifts                                                    |
| POST   | `/api/solo/save-ai-workout`      | Session | Save AI-generated workout to workouts table                                   |
| GET    | `/api/solo/meal-plans`           | Session | Get saved meal plans                                                          |
| POST   | `/api/solo/meal-plans`           | Session | Save meal plan                                                                |
| DELETE | `/api/solo/meal-plans/:id`       | Session | Delete meal plan                                                              |
| GET    | `/api/solo/body-intelligence`    | Session | Body composition + biometrics summary                                         |
| GET    | `/api/solo/xp-history`           | Session | Recent XP transactions                                                        |

### Clients — `server/routes.ts`

| Method | Path                                            | Auth              | Description                  |
| ------ | ----------------------------------------------- | ----------------- | ---------------------------- |
| GET    | `/api/clients`                                  | Session (trainer) | All trainer's clients        |
| GET    | `/api/client/profile`                           | Session (client)  | Disciple's own client record |
| POST   | `/api/clients`                                  | Session (trainer) | Create client                |
| GET    | `/api/clients/:clientId`                        | Session (trainer) | Client detail                |
| PUT    | `/api/clients/:clientId`                        | Session (trainer) | Update client                |
| DELETE | `/api/clients/:clientId`                        | Session (trainer) | Soft-delete client           |
| GET    | `/api/clients/:clientId/access-code`            | Session (trainer) | Current access code          |
| POST   | `/api/clients/:clientId/access-code`            | Session (trainer) | Generate access code         |
| POST   | `/api/clients/:clientId/access-code/regenerate` | Session (trainer) | Regenerate code              |
| DELETE | `/api/clients/:clientId/access-code/revoke`     | Session (trainer) | Revoke code                  |
| GET    | `/api/clients/:clientId/notes`                  | Session (trainer) | Client notes                 |
| POST   | `/api/clients/:clientId/notes`                  | Session (trainer) | Add client note              |

### Exercises — `server/routes.ts`

| Method | Path             | Auth              | Description                    |
| ------ | ---------------- | ----------------- | ------------------------------ |
| GET    | `/api/exercises` | Session           | All exercises (shared library) |
| POST   | `/api/exercises` | Session (trainer) | Create exercise                |

### Workouts — `server/routes.ts`

| Method | Path                                             | Auth              | Description                             |
| ------ | ------------------------------------------------ | ----------------- | --------------------------------------- |
| GET    | `/api/workouts`                                  | Session           | Trainer's workout plans                 |
| POST   | `/api/workouts`                                  | Session (trainer) | Create workout                          |
| GET    | `/api/workouts/templates`                        | Session           | Public workout templates                |
| GET    | `/api/workouts/:id`                              | Session           | Workout detail + exercises              |
| PUT    | `/api/workouts/:id`                              | Session (trainer) | Update workout                          |
| DELETE | `/api/workouts/:id`                              | Session (trainer) | Delete workout                          |
| POST   | `/api/workouts/:id/duplicate`                    | Session (trainer) | Duplicate workout                       |
| POST   | `/api/workouts/:workoutId/exercises`             | Session (trainer) | Add exercise to workout                 |
| DELETE | `/api/workouts/:workoutId/exercises/:exerciseId` | Session (trainer) | Remove exercise                         |
| PUT    | `/api/workouts/:workoutId/exercises/reorder`     | Session (trainer) | Reorder exercises                       |
| GET    | `/api/clients/:clientId/workouts`                | Session (trainer) | Client's assigned workouts              |
| GET    | `/api/client/workouts/weekly`                    | Session (client)  | Disciple's weekly workouts              |
| GET    | `/api/workout-assignments`                       | Session           | Assignments (trainer sees all clients') |
| POST   | `/api/workout-assignments`                       | Session (trainer) | Assign workout to client                |
| GET    | `/api/workout-assignments/:id`                   | Session           | Assignment detail                       |
| PATCH  | `/api/workout-assignments/:id`                   | Session (trainer) | Update assignment                       |
| PUT    | `/api/workout-assignments/:id/complete`          | Session           | Mark assignment complete                |

### Progress + Analytics — `server/routes.ts`

| Method | Path                             | Auth              | Description                               |
| ------ | -------------------------------- | ----------------- | ----------------------------------------- |
| GET    | `/api/progress`                  | Session           | Progress entries (trainer selects client) |
| POST   | `/api/progress`                  | Session           | Add progress entry                        |
| GET    | `/api/training-sessions`         | Session           | Training sessions                         |
| POST   | `/api/training-sessions`         | Session           | Create training session                   |
| PUT    | `/api/training-sessions/:id`     | Session           | Update session                            |
| GET    | `/api/analytics`                 | Session (trainer) | Trainer analytics overview                |
| GET    | `/api/dashboard/stats`           | Session (trainer) | Trainer dashboard stats                   |
| GET    | `/api/dashboard/charts`          | Session (trainer) | Chart data (weight, sessions, growth)     |
| GET    | `/api/dashboard/needs-attention` | Session (trainer) | Clients needing attention                 |

### Appointments/Schedule — `server/routes.ts`

| Method | Path                    | Auth              | Description                                                       |
| ------ | ----------------------- | ----------------- | ----------------------------------------------------------------- |
| GET    | `/api/appointments`     | Session           | Appointments (role-filtered)                                      |
| POST   | `/api/appointments`     | Session (trainer) | Create appointment (supports recurrence: weekly/biweekly/monthly) |
| PUT    | `/api/appointments/:id` | Session (trainer) | Update appointment                                                |
| DELETE | `/api/appointments/:id` | Session (trainer) | Delete appointment                                                |

### AI — `server/routes/ai.ts` (mounted at `/api/ai`)

| Method | Path                         | Auth    | Description                                      |
| ------ | ---------------------------- | ------- | ------------------------------------------------ |
| GET    | `/api/ai/usage`              | Session | Daily AI usage + remaining quota                 |
| POST   | `/api/ai/chat`               | Session | AI coach chat (streams or returns full response) |
| POST   | `/api/ai/generate-workout`   | Session | AI workout generation (Anthropic Claude)         |
| POST   | `/api/ai/generate-meal-plan` | Session | AI meal plan generation                          |
| POST   | `/api/ai/progress-insights`  | Session | AI analysis of progress data                     |

### Gamification — `server/routes/gamification.ts` (mounted at `/api/gamification`)

| Method | Path                                    | Auth    | Description                                                       |
| ------ | --------------------------------------- | ------- | ----------------------------------------------------------------- |
| GET    | `/api/gamification/profile`             | Session | XP, level, rank, streak (checks streak danger)                    |
| POST   | `/api/gamification/initialize`          | Session | Bootstrap gamification record                                     |
| GET    | `/api/gamification/xp/history`          | Session | Recent XP transactions                                            |
| GET    | `/api/gamification/achievements`        | Session | All achievements + progress (seeds if missing, retroactive check) |
| GET    | `/api/gamification/achievements/earned` | Session | Earned achievements only                                          |
| GET    | `/api/gamification/achievements/stats`  | Session | Achievement completion stats                                      |
| POST   | `/api/gamification/streak/update`       | Session | Update streak after workout                                       |
| POST   | `/api/gamification/achievements/check`  | Session | Trigger achievement check                                         |
| GET    | `/api/gamification/leaderboard`         | Session | (via leaderboards.ts) Top users by XP                             |

### Recovery — `server/routes/recovery.ts` (mounted at `/api/recovery`)

| Method | Path                            | Auth    | Description                                                                     |
| ------ | ------------------------------- | ------- | ------------------------------------------------------------------------------- |
| GET    | `/api/recovery/fatigue`         | Session | Muscle fatigue levels (lazy migration: normalizes compound names on first call) |
| GET    | `/api/recovery/recommendations` | Session | AI-generated recovery tips based on fatigue                                     |
| POST   | `/api/recovery/log`             | Session | Log post-workout recovery data (RPE, soreness, sleep)                           |

### Strength — `server/routes/strength.ts` (mounted at `/api/strength`)

| Method | Path                                         | Auth    | Description                               |
| ------ | -------------------------------------------- | ------- | ----------------------------------------- |
| GET    | `/api/strength/personal-records`             | Session | All PRs with exercise join                |
| GET    | `/api/strength/personal-records/:exerciseId` | Session | PR for specific exercise                  |
| POST   | `/api/strength/personal-records`             | Session | Log new PR (XP award + achievement check) |
| GET    | `/api/strength/standards`                    | Session | Strength classification per exercise      |
| POST   | `/api/strength/standards`                    | Session | Upsert strength standard                  |

### Settings — `server/routes/settings.ts` (mounted at `/api/settings`)

| Method | Path                           | Auth    | Description                                                 |
| ------ | ------------------------------ | ------- | ----------------------------------------------------------- |
| GET    | `/api/settings`                | Session | User settings (profile, billing, notifications, appearance) |
| GET    | `/api/settings/stats`          | Session | Client count, workout count, days since joining             |
| PUT    | `/api/settings/profile`        | Session | Update name/email                                           |
| PUT    | `/api/settings/password`       | Session | Change password                                             |
| PUT    | `/api/settings/notifications`  | Session | Update notification preferences                             |
| PUT    | `/api/settings/delete-account` | Session | Soft-delete account                                         |
| POST   | `/api/settings/upload-photo`   | Session | Upload avatar via R2/Cloudflare (multer + sharp)            |

### Payments — `server/routes/payments.ts` (mounted at `/api/payments`)

| Method | Path                      | Auth              | Description                       |
| ------ | ------------------------- | ----------------- | --------------------------------- |
| GET    | `/api/payments/plans`     | Session (trainer) | Get trainer's payment plans       |
| POST   | `/api/payments/plans`     | Session (trainer) | Create plan (Stripe Price object) |
| PUT    | `/api/payments/plans/:id` | Session (trainer) | Update plan                       |
| DELETE | `/api/payments/plans/:id` | Session (trainer) | Delete plan                       |
| GET    | `/api/payments/history`   | Session (trainer) | Payment history                   |
| GET    | `/api/payments/portal`    | Session           | Stripe billing portal URL         |

### Notifications — `server/routes/notifications.ts` (mounted at `/api/notifications`)

| Method | Path                              | Auth    | Description                            |
| ------ | --------------------------------- | ------- | -------------------------------------- |
| GET    | `/api/notifications`              | Session | Paginated notifications (limit/offset) |
| GET    | `/api/notifications/unread-count` | Session | Unread badge count                     |
| PUT    | `/api/notifications/:id/read`     | Session | Mark single read                       |
| PUT    | `/api/notifications/read-all`     | Session | Mark all read                          |
| DELETE | `/api/notifications/clear-all`    | Session | Clear all notifications                |

### Calculators — `server/routes/calculators.ts` (mounted at `/api/calculators`)

| Method | Path                                  | Auth    | Description                                                  |
| ------ | ------------------------------------- | ------- | ------------------------------------------------------------ |
| POST   | `/api/calculators/1rm`                | Public  | 1RM calculation (6 formulas: Epley, Brzycki, Lombardi, etc.) |
| GET    | `/api/calculators/fitness-profile`    | Session | User's fitness profile for calculator autofill               |
| GET    | `/api/calculators/strength-standards` | Session | Strength standards for exercise classification               |
| POST   | `/api/calculators/save-result`        | Session | Save calculator result to history                            |
| GET    | `/api/calculators/history`            | Session | Saved calculation history                                    |

### Calculator Results — `server/routes/calculatorResults.ts`

Handles premium calculator result persistence.

### Health — `server/routes/health.ts`

| Method | Path          | Auth   | Description                        |
| ------ | ------------- | ------ | ---------------------------------- |
| GET    | `/api/health` | Public | DB connectivity check (`SELECT 1`) |

### Webhooks — `server/routes/webhooks.ts`

| Method | Path                   | Auth       | Description                                                       |
| ------ | ---------------------- | ---------- | ----------------------------------------------------------------- |
| POST   | `/api/webhooks/stripe` | Stripe sig | Stripe webhook handler (raw body). DO NOT MODIFY middleware order |

### WebSocket — `server/routes.ts`

| Path             | Description                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ws://[host]/ws` | Room-based messaging. Auth via session cookie. Trainer ownership verified. Supports `join_room`, `send_message`, `typing`, `read_receipt` events |

---

## DATABASE SCHEMA — All Tables

All defined in `shared/schema.ts`. PostgreSQL via Neon. Drizzle ORM.

### Core User Tables

| Table                 | Key Columns                                                                                                                                                                                                                                    | Notes                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `sessions`            | `sid`, `sess`, `expire`                                                                                                                                                                                                                        | express-session PostgreSQL store                                                                  |
| `users`               | `id` (varchar), `email`, `password`, `firstName`, `lastName`, `role` (trainer/client/solo), `subscriptionTier`, `subscriptionStatus`, `stripeCustomerId`, `trialEndsAt`, `onboardingCompleted`, `deletedAt`, `notificationPreferences` (jsonb) | Soft delete via `deletedAt`. Google OAuth fields. Plan tiers: FreeTrial/Solo/Solo_ai/Guru/ProGuru |
| `passwordResetTokens` | `token`, `userId`, `expiresAt`, `used`                                                                                                                                                                                                         | Single-use reset flow                                                                             |

### Trainer-Client Relationship

| Table               | Key Columns                                                                                                                                                        | Notes                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `clients`           | `id`, `trainerId` (FK → users), `name`, `email`, `age`, `gender`, `height` (doublePrecision), `weight` (doublePrecision), body circumferences (jsonb), `deletedAt` | Soft delete. height/weight migrated from decimal string to doublePrecision (§DB-2) |
| `clientAccessCodes` | `code`, `clientId` (FK → clients), `trainerId` (FK → users), `isActive`, `lastUsedAt`                                                                              | Disciple login via access code                                                     |
| `clientIntake`      | `clientId`, `trainerId`, PAR-Q fields (7 boolean), fitness background, emergency contact, consent                                                                  | Health screening questionnaire                                                     |

### Exercise Library

| Table       | Key Columns                                                                                                                                                                                                                                                | Notes                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `exercises` | `id`, `name`, `muscleGroup`, `secondaryMuscles` (text[]), `exerciseType` (enum: strength/cardio/flexibility/bodyweight/plyometric/olympic/machine), `equipment`, `instructions`, `difficulty`, `trainerId` (nullable — null = system exercise), `isPublic` | Seeded from MemoryStorage (38 exercises) |

### Workout System

| Table                | Key Columns                                                                                                                                                                 | Notes                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `workouts`           | `id`, `title`, `description`, `trainerId` (FK → users — both trainer and solo users), `category`, `difficulty`, `duration`, `isTemplate`, `isPublic`                        | Solo users save workouts here too (trainerId = userId)  |
| `workoutExercises`   | `workoutId`, `exerciseId`, `order`, `sets`, `reps`, `weight`, `restSeconds`, `notes`, `setsConfiguration` (jsonb — per-set targets), `supersetGroupId`, `supersetGroupType` | Junction with superset support                          |
| `workoutAssignments` | `workoutId`, `clientId`, `trainerId`, `scheduledDate`, `status` (pending/completed/skipped), `completedAt`, `notes`, `notificationsSent` (jsonb)                            | Trainer → client workout scheduling                     |
| `trainingSessions`   | `trainerId`, `clientId`, `scheduledAt`, `duration`, `status`, `notes`                                                                                                       | Legacy session tracking (distinct from workoutSessions) |
| `appointments`       | `trainerId`, `clientId`, `title`, `startTime`, `endTime`, `recurrenceType` (weekly/biweekly/monthly/null), `recurrenceEndDate`, `workoutAssignmentId`                       | Schedule entries with recurrence                        |

### Solo Workout Tracking

| Table             | Key Columns                                                                                                                                                                                                                                                                   | Notes                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `workoutSessions` | `userId`, `workoutAssignmentId`, `workoutName`, `workoutType`, `startedAt`, `endedAt`, `isActive`, `currentExerciseIndex`, `restTimerSeconds`, `restTimerEndAt`, `totalRestTime`, `totalActiveTime`, `totalSets`, `totalReps`, `totalVolumeKg` (varchar), `perceivedExertion` | Active session state + completion stats |
| `workoutSetLogs`  | `sessionId`, `exerciseId`, `setNumber`, `weightKg`, `reps`, `duration`, `distance`, `rpe`, `isWarmup`, `isDropSet`, `isFailure`                                                                                                                                               | Per-set granular tracking               |

### Progress + Analytics

| Table                    | Key Columns                                                                                  | Notes                                   |
| ------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------- |
| `progressEntries`        | `clientId` (FK), `type` (weight/bodyFat/measurements etc.), `value`, `unit`, `date`, `notes` | Trainer-tracked client progress metrics |
| `calculatorResults`      | `userId`, `calculatorType`, `inputs` (jsonb), `results` (jsonb)                              | Premium calculator history              |
| `userOnboardingProgress` | `userId`, milestones as boolean fields                                                       | Trainer onboarding checklist state      |

### Gamification (V3)

| Table                | Key Columns                                                                                                                                                                                                                                                                      | Notes                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `userFitnessProfile` | `userId`, `age`, `gender`, `currentWeight`, `goalWeight`, `height`, `fitnessGoal`, `activityLevel`, `workoutFrequencyPerWeek`, `preferredWorkoutTypes` (jsonb), `experienceLevel`, `availableEquipment` (jsonb), `dietaryPreferences` (jsonb), `targetCalories`, `targetProtein` | Solo user onboarding profile                |
| `userGamification`   | `userId`, `totalXp`, `currentLevel`, `currentRank` (GenZ rank enum), `streakDays`, `longestStreak`, `totalWorkouts`, `totalVolume`, `totalSets`, `personalRecords`, `lastWorkoutDate`, `streakLastUpdatedDate`, `streakAtRiskNotifiedAt`                                         | Single-row per user gamification state      |
| `achievements`       | `id`, `name`, `description`, `category` (workouts/strength/consistency/nutrition/social/special), `rarity` (common/rare/epic/legendary), `xpReward`, `icon`, `criteria` (jsonb — thresholds), `isSecret`                                                                         | ~45 seeded achievements (not user-specific) |
| `userAchievements`   | `userId`, `achievementId`, `earnedAt`, `progressValue`                                                                                                                                                                                                                           | Junction: earned achievements per user      |
| `xpTransactions`     | `userId`, `amount`, `reason` (workout_completed/personal_record/streak_bonus/achievement_earned), `sourceId`, `sourceType`                                                                                                                                                       | XP audit log                                |

### Strength Tracking

| Table                   | Key Columns                                                                                                                                                                       | Notes                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `personalRecords`       | `userId`, `exerciseId`, `weightKg`, `reps`, `estimated1rm`, `bodyweightAtPr`, `relativeStrength`, `achievedAt`                                                                    | Current PR per user per exercise (upserted) |
| `personalRecordHistory` | `userId`, `exerciseId`, `weightKg`, `reps`, `estimated1rm`, `achievedAt`                                                                                                          | All-time PR history log                     |
| `userStrengthStandards` | `userId`, `exerciseId`, `current1rm`, `bodyweight`, `relativeStrength`, `classification` (Untrained/Beginner/Novice/Intermediate/Advanced/Elite), `percentile`, `nextLevelTarget` | Per-exercise strength classification        |

### Recovery & Fatigue

| Table                | Key Columns                                                                                                                                             | Notes                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `userMuscleFatigue`  | `userId`, `muscleGroup`, `fatigueLevel` (0-100), `lastTrainedAt`, `estimatedFullRecoveryAt`, `volumeLastSession`, `setsLastSession`, `avgRecoveryHours` | Current fatigue state per muscle. Compound entries lazily migrated on first recovery API call |
| `userMuscleVolume`   | `userId`, `muscleGroup`, `volumeThisWeekKg`, `setsThisWeek`, `volumeThisMonthKg`, `setsThisMonth`, `totalVolumeKg`, `totalSets`                         | Cumulative volume tracking                                                                    |
| `workoutRecoveryLog` | `userId`, `workoutLogId`, `musclesWorked` (jsonb), `perceivedExertion`, `muscleSoreness`, `sleepQualityLastNight`                                       | Post-workout recovery entry                                                                   |

### AI + Nutrition

| Table                 | Key Columns                                                                                                                                                                                             | Notes                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `aiGeneratedWorkouts` | `userId`, `workoutName`, `workoutType`, `targetMuscleGroups` (jsonb), `warmup` (jsonb), `mainWorkout` (jsonb — full exercise spec with weight/reps/rest), `cooldown` (jsonb), `coachingNotes`, `isUsed` | AI workout output stored before user saves to workouts |
| `aiChatConversations` | `userId`, `title`, `category`, `isActive`                                                                                                                                                               | Conversation container                                 |
| `aiChatMessages`      | `conversationId`, `role` (user/assistant/system), `content`, `tokensUsed`, `model`                                                                                                                      | Per-message storage                                    |
| `aiUsage`             | `userId`, `date` (YYYY-MM-DD), `requestCount`, `tokenCount`                                                                                                                                             | Daily usage limits enforcement                         |
| `savedMealPlans`      | Referenced in routes — stores AI-generated meal plans per user                                                                                                                                          |                                                        |

### Notifications + Payments + Intake

| Table           | Key Columns                                                                                                                    | Notes                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `notifications` | `userId`, `type`, `title`, `message`, `data` (jsonb), `read`, `readAt`                                                         | In-app notification feed         |
| `paymentPlans`  | `trainerId`, `name`, `description`, `priceInCents`, `currency`, `billingInterval`, `sessionCount`, `stripePriceId`, `isActive` | Trainer-created payment packages |
| `payments`      | `trainerId`, `clientId`, `planId`, `amountInCents`, `status`, `stripePaymentIntentId`, `stripeInvoiceId`, `paidAt`             | Payment transaction record       |
| `clientIntake`  | PAR-Q health screening, fitness background, goals, emergency contact, consent                                                  | Described above                  |

### Archived Tables (schema comments only, not instantiated)

- `mealPlans`, `meals`, `foodLog` — Nutrition detailed tracking (archived, not implemented)
- `groceryStores`, `shoppingLists`, `shoppingListItems` — Shopping helper (archived)
- Leaderboard pre-calculation tables — Queries `userGamification` directly instead

---

## CRITICAL DATA FLOWS

### 1. User Authentication

```
Client → POST /api/auth/login (email + password)
       → loginUser() in server/auth.ts (bcrypt verify)
       → req.session.userId = user.id
       → session.save() → response
Client → GET /api/auth/me (on app load)
       → secureAuth middleware reads session.userId
       → UserContext stores user, triggers role-class on <html>
       → AuthGuard persists role to localStorage (gg_role)
```

**Disciple path** (currently broken §VA-1):

```
Client → POST /api/auth/validate-access-code (code)
       → Lookup clientAccessCodes table
       → Find client.email → find users.email match
       → Session created
```

**Triple isPublicPage guard** — three independent lists in:

- `App.tsx` → `AppLayout.isPublicPage` (sidebar vs bare layout)
- `UserContext.tsx` → `isPublicPage` (controls whether auth query fires)
- `queryClient.ts` → query error handler (suppresses 401 redirect on public pages)

---

### 2. Workout Session (Solo Ronin)

```
1. User opens workout → GET /api/solo/today-workout
   Returns: active session | suggested saved workout | suggested AI workout | template fallback

2. User starts session → POST /api/solo/session/start
   Creates workoutSession record (isActive: true)

3. Per set → POST /api/solo/session/:id/log-set
   Creates workoutSetLogs record

4. Rest timer → client-side only (useRestTimer hook)
   Optional: PUT /api/solo/session/:id (restTimerEndAt update)

5. Set completion → PR check (client-side then server confirm)
   → POST /api/strength/personal-records (if new PR)
   → XP awarded, achievement checked

6. Workout complete → POST /api/solo/session/:id/complete
   → workoutSession.endedAt + stats calculated
   → POST /api/gamification/streak/update
   → POST /api/recovery/log (muscle fatigue update)
   → CompletionSheet displayed with summary
```

---

### 3. AI Workout Generation

```
1. User selects options (focus, goal, style) in WorkoutGenerator.tsx
2. → POST /api/ai/generate-workout
   → aiUsage check (tier limits enforced)
   → Anthropic Claude API call with system prompt + profile context
   → Response parsed → rest periods post-processed by goal/exercise type
   → Saved to aiGeneratedWorkouts table

3. User reviews workout → "Save Workout" button
4. → POST /api/solo/save-ai-workout
   → workouts table entry created (trainerId = userId)
   → workoutExercises entries created
```

AI usage limits enforced in `server/services/aiUsage.ts`. Tier mapping:

- FreeTrial: ~5/day
- Solo: ~10/day
- Solo_ai: ~30/day

---

### 4. AI Coach Chat

```
1. User opens /solo/coach → GET /api/ai/usage (daily remaining shown)
2. User sends message → POST /api/ai/chat
   → aiUsage check
   → Fetch conversation history from aiChatMessages
   → Anthropic Claude API call (streaming or full)
   → Response saved to aiChatMessages
   → Usage incremented in aiUsage table

3. Client parses AI response for workout/meal plan content:
   → 4 parsing strategies (regex, JSON extraction, keyword detection)
   → If workout detected: "Save Workout" button shown
   → POST /api/solo/save-ai-workout

4. Contextual action buttons appear based on message content:
   → Workout mentioned → "Generate Workout" link
   → Nutrition mentioned → "Meal Planner" link
   → Recovery mentioned → "View Recovery" link
```

---

### 5. Gamification + XP

```
Workout complete triggers (via POST /api/solo/session/:id/complete):
  → incrementTotalWorkouts()
  → awardWorkoutXp(duration, sets) → xpTransactions insert
  → updateStreak() → streakDays++, check for streak milestones
  → checkWorkoutAchievements() → query userGamification + compare criteria
  → Notification created if achievement unlocked or level up

PR logged (POST /api/strength/personal-records):
  → awardPersonalRecordXp()
  → incrementPersonalRecords()
  → checkStrengthAchievements()
  → checkClassificationAchievements() (Untrained → Elite progression)

Gamification profile read (GET /api/gamification/profile):
  → Streak danger check: if today - lastWorkoutDate approaches streak window, notify
  → Returns: totalXp, currentLevel, currentRank, streakDays, totalWorkouts

Rank system (GenZ names): NPC → Casual → Grinder → Competitive → Beast → GOATED
Strength classification: Untrained → Beginner → Novice → Intermediate → Advanced → Elite
```

---

### 6. Recovery Tracking

```
After workout complete → POST /api/recovery/log
  → workoutRecoveryLog insert (RPE, soreness, sleep quality)
  → userMuscleFatigue updated per muscle group
    (fatigueLevel based on sets + volume from workoutSetLogs)
  → userMuscleVolume weekly/monthly accumulators updated
  → estimatedFullRecoveryAt = lastTrainedAt + avgRecoveryHours

GET /api/recovery/fatigue:
  → Lazy migration: compound muscle names split into individual entries
    (e.g. "Back (Lats, Mid-Back, Traps)" → ["back", "traps", ...])
  → Returns muscle groups with fatigueLevel, recoveryStatus, lastTrainedAt

Recovery status classification:
  - recovered: fatigueLevel < 30
  - recovering: fatigueLevel 30-70
  - fatigued: fatigueLevel > 70
```

---

### 7. Trainer → Client Assignment Flow

```
1. Trainer creates workout → POST /api/workouts (workouts table)
2. Trainer adds exercises → POST /api/workouts/:id/exercises (workoutExercises)
3. Trainer creates appointment → POST /api/appointments
   → Appointment created with optional workoutAssignmentId
   → If recurrenceType set: repeat appointment created at intervals
4. Trainer assigns workout directly → POST /api/workout-assignments
   → workoutAssignments table: clientId, workoutId, scheduledDate, status: 'pending'
   → Notification created for client

5. Client views assignments → GET /api/client/workouts/weekly
   → workoutAssignments filtered by week range + clientId

6. Client completes workout:
   → Same workout session flow as solo (steps 2-6 above)
   → PUT /api/workout-assignments/:id/complete
   → Trainer notified via notification + WebSocket event

7. Trainer tracks compliance → GET /api/dashboard/charts
   → completionRate calculated from workoutAssignments
   → clientComplianceRates per 7d/30d/90d windows
```

---

## FEATURE COMPLETENESS ASSESSMENT

### Fully Implemented

| Feature                           | Status                                            | Key Files                                                                  |
| --------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Ronin dashboard                   | Complete                                          | `SoloDashboard.tsx`, `useSoloDashboardData.ts`                             |
| Workout session execution         | Complete                                          | `WorkoutExecution.tsx`, `useWorkoutSession.ts`, solo.ts session routes     |
| AI workout generation             | Complete                                          | `WorkoutGenerator.tsx`, `server/routes/ai.ts`, `aiService.ts`              |
| AI Coach chat                     | Complete                                          | `AICoach.tsx`, ai.ts, aiChatConversations/Messages schema                  |
| AI meal plan generation           | Complete                                          | `NutritionPlanner.tsx`, ai.ts generate-meal-plan route                     |
| Muscle recovery tracking          | Complete                                          | `Recovery.tsx`, `server/routes/recovery.ts`, fatigue tables                |
| Gamification (XP + rank + streak) | Complete                                          | `Achievements.tsx`, `server/routes/gamification.ts`, gamification services |
| Personal records tracking         | Complete                                          | `server/routes/strength.ts`, personalRecords/personalRecordHistory         |
| Public calculators (13 types)     | Complete                                          | `client/src/pages/calculators/`                                            |
| Premium calculators (13 types)    | Complete                                          | `client/src/pages/premium-calculators/`                                    |
| Client management (Guru)          | Complete                                          | `ClientsPage.tsx`, `ClientDetailsPage.tsx`, clients routes                 |
| Workout assignment                | Complete                                          | `WorkoutPlans.tsx`, workoutAssignments routes                              |
| Scheduling + appointments         | Complete                                          | `SchedulePage.tsx`, appointments routes with recurrence                    |
| Trainer dashboard analytics       | Complete                                          | `server/routes.ts` dashboard routes                                        |
| Progress tracking (charts)        | Complete                                          | `ProgressPage.tsx` (inline recharts)                                       |
| Settings (profile, security)      | Complete                                          | `SettingsPage.tsx`, settings routes                                        |
| Notifications system              | Complete                                          | `server/routes/notifications.ts`, notificationService                      |
| Trainer payment plans             | Complete                                          | `PaymentsPage.tsx`, payments routes, Stripe Price objects                  |
| Access code (disciple login)      | Schema + API complete, **UI flow broken** (§VA-1) |
| Soft deletes                      | Complete                                          | users, clients tables have `deletedAt`                                     |
| Google OAuth                      | Complete                                          | auth routes + passport strategy                                            |

### Partially Implemented

| Feature                       | Status                             | Gap                                                                    |
| ----------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Disciple (client) login       | API complete                       | UI navigation broken — `/disciple-login` doesn't properly authenticate |
| Payment processing            | Plans CRUD + Stripe Price creation | No Stripe Checkout or payment collection flow wired in client          |
| Client intake / PAR-Q         | Schema + routes exist              | No UI for intake form                                                  |
| WebSocket messaging           | Server complete                    | Client `useWebSocket.ts` exists but no visible messaging UI            |
| File upload (avatar)          | Server complete (R2/sharp)         | Upload UI exists in settings                                           |
| Trainer onboarding milestones | API complete                       | UI checklist exists but some milestones may not auto-trigger           |

### Archived / Not Implemented

| Feature                        | Status                                             |
| ------------------------------ | -------------------------------------------------- |
| Detailed meal/food log         | Archived (schema removed, see docs/archive)        |
| Shopping list / grocery helper | Archived (`server/routes/shopping.ts` stub exists) |
| Pre-calculated leaderboards    | Query-based on userGamification instead            |
| Social following               | Never implemented                                  |
| 3D achievement badges          | Planned (Phase 4 of design upgrade)                |
| Body map SVG                   | Planned (Phase 4 of design upgrade)                |

---

## GAPS

### Critical Bugs

1. **Disciple login broken** (§VA-1) — `/disciple-login` route renders but access code auth flow doesn't complete. Disciples cannot log in at all.
2. **MemoryStorage silent fallback** (§SEC-2) — DB failure silently falls back to in-memory storage with data loss on restart. No 503 in production.
3. **CSP `unsafe-inline`** (§SEC-3) — Content Security Policy has `unsafe-inline` in `scriptSrc`, negating XSS protection.

### Data Integrity

4. **20 tables not in Drizzle schema** (§DB-5) — 20+ tables exist in the database but only ~30 are defined in `shared/schema.ts`. `drizzle-kit generate` produces incorrect diffs. The tables are used via raw queries or imports in route files but lack Drizzle type safety and migration management.
5. **`workoutSessions.totalVolumeKg` stored as varchar** — Should be numeric; causes `parseFloat(String(...))` workarounds.
6. **Streak counter disconnect** — Dashboard can show streak = 2 while workouts this week = 0 (different time windows).

### Architecture Debt

7. **`App.tsx` is 1,105 lines** (§FE-1) — Routing + auth + WebSocket + CSS injection + layout all in one file.
8. **`server/routes.ts` is 2,252 lines** (§BE-3) — Monolith; should be split into domain routers (partially done via sub-routers but main file still massive).
9. **`server/memoryStorage.ts` still exists** — §SEC-1 removed mock data fallbacks from routes, but the MemoryStorage class with 38 seeded exercises still exists as DB fallback per §SEC-2.
10. **framer-motion in 80+ files** (§FE-7 partial) — Removed from 28 files in previous session, but ~80 still import it unnecessarily. Vendor bundle ~38kB gzipped.
11. **`as any` casts** (§FE-5) — 17 TypeScript `as any` casts identified, particularly around auth user typing.

### Missing Features

12. **No CI/CD pipeline** — Railway auto-deploys from main with no lint/test/security gates.
13. **No SLOs or monitoring** — No error rate alerting, no latency tracking, no Stripe webhook reliability monitoring.
14. **Disciple messaging UI** — WebSocket server complete; no visible chat UI for clients to message trainers.
15. **Payment collection** — Stripe payment plans created but no Checkout session or invoice flow to actually collect money from clients.

### Design System

16. **Brand split** (§DS-1) — Gold landing page, purple app interior, different design for public calculators. Partially resolved (H-6 calculators darkened, H-7 structural green removed from calculators).
17. **Typography missing in app** (§DS-2) — Playfair Display used on landing only; disappears inside app pages.
18. **Nutrition Planner green** — Bright `#22c55e` active states unrelated to the role-based accent system.

---

## FILES AUDITED

### Backend

- `server/routes.ts` (2,252 lines — full read in 5 chunks)
- `server/routes/ai.ts`
- `server/routes/auth.ts`
- `server/routes/calculators.ts`
- `server/routes/calculatorResults.ts`
- `server/routes/gamification.ts`
- `server/routes/health.ts`
- `server/routes/intake.ts`
- `server/routes/leaderboards.ts`
- `server/routes/notifications.ts`
- `server/routes/payments.ts`
- `server/routes/recovery.ts`
- `server/routes/settings.ts`
- `server/routes/shopping.ts`
- `server/routes/solo.ts`
- `server/routes/strength.ts`
- `server/routes/uploads.ts`
- `server/routes/webhooks.ts`
- `server/storage.ts`
- `server/memoryStorage.ts` (first 80 lines)

### Schema

- `shared/schema.ts` (full read — 1,310+ lines)

### Frontend Pages

- `client/src/pages/solo/SoloDashboard.tsx`
- `client/src/pages/solo/AICoach.tsx`
- `client/src/pages/solo/Achievements.tsx`
- `client/src/pages/solo/NutritionPlanner.tsx`
- `client/src/pages/solo/Recovery.tsx`
- `client/src/pages/solo/WorkoutGenerator.tsx`
- `client/src/pages/solo/SoloOnboarding.tsx` (directory confirmed)
- `client/src/pages/WorkoutExecution.tsx` (first 100 lines)
- `client/src/pages/WorkoutPlans.tsx` (first 60 lines)
- `client/src/pages/ProgressPage.tsx` (first 80 lines)
- `client/src/pages/SchedulePage.tsx` (first 80 lines)
- `client/src/pages/ClientsPage.tsx` (first 80 lines)
- `client/src/pages/ClientDetailsPage.tsx` (first 60 lines)
- `client/src/pages/PaymentsPage.tsx` (first 50 lines)
- `client/src/pages/SettingsPage.tsx` (first 50 lines)
- `client/src/pages/ExercisesPage.tsx` (first 40 lines)
- `client/src/pages/LandingPage.tsx` (first 40 lines)
- `client/src/pages/WorkoutBuilder.tsx` (directory confirmed)
- `client/src/pages/auth/` (all files listed)
- `client/src/pages/calculators/` (all 13 files listed)
- `client/src/pages/premium-calculators/` (all 13 files listed)

### Frontend Components

- `client/src/components/redesign/dashboard/ActionZone.tsx`
- `client/src/components/redesign/dashboard/MobileHero.tsx`
- `client/src/components/redesign/dashboard/QuickStats.tsx`
- `client/src/components/redesign/dashboard/WeekStrip.tsx`
- `client/src/components/redesign/dashboard/WidgetScroller.tsx`
- `client/src/components/redesign/execution/SetRow.tsx`
- `client/src/components/redesign/execution/RestTimerOverlay.tsx`
- `client/src/components/redesign/execution/CompletionSheet.tsx`
- `client/src/components/redesign/coach/QuickActions.tsx`
- `client/src/components/solo-dashboard/` (all files listed)
- `client/src/components/ui/number-ticker.tsx`
- `client/src/components/ui/blur-fade.tsx`
- `client/src/components/ui/animated-circular-progress-bar.tsx`
- `client/src/components/ui/border-beam.tsx`

### Brain Notes Read

- `_brain/notes/design-upgrade-plan.md`

### Hooks Inventoried

- `client/src/hooks/` (full directory listing — 15 hooks)

---

## Claude Code plugins (user scope)

- frontend-design@claude-plugins-official — UI/component design skill
- code-review@claude-plugins-official — code quality review
- context7@claude-plugins-official — live library documentation fetching
- superpowers@claude-plugins-official — enhanced capabilities

All installed at user scope — available in every project automatically.
CLAUDE.md instructs Claude Code to use them on every relevant task.

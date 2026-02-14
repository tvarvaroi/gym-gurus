# GymGurus Onboarding Optimization Strategy

**Document Version:** 1.0
**Last Updated:** February 2026
**Brand Colors:** Electric Blue (`#3B82F6`) | Emerald (`#10B981`)
**Platform:** GymGurus Fitness Training Management

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Signup Flow Optimization](#1-signup-flow-optimization)
4. [Post-Signup Onboarding: Trainers](#2-post-signup-onboarding-for-trainers)
5. [Post-Signup Onboarding: Solo Users](#3-post-signup-onboarding-for-solo-users)
6. [Activation Metrics & KPIs](#4-activation-metrics--kpis)
7. [Gamification Integration](#5-gamification-integration)
8. [Re-engagement for Incomplete Onboarding](#6-re-engagement-for-incomplete-onboarding)
9. [A/B Testing Opportunities](#7-ab-testing-opportunities)
10. [Technical Implementation Notes](#8-technical-implementation-notes)
11. [Roadmap & Prioritization](#roadmap--prioritization)

---

## Executive Summary

The GymGurus onboarding system is the single most important funnel for converting signups into activated users. This document defines the end-to-end strategy for optimizing the onboarding experience across all three user roles (Trainer, Client, Solo), with the goal of achieving **>60% full onboarding completion** and **<3 minute average completion time**.

The strategy covers the existing implementation (WelcomeModal, SetupChecklist, server-side milestone tracking), identifies gaps, and provides a phased roadmap for improvements spanning signup friction reduction, role-specific guided flows, gamification hooks, re-engagement loops, and A/B testing.

**Key Outcomes Targeted:**

- Reduce time-to-first-value from current ~8 minutes to <3 minutes
- Increase 7-day retention from baseline to >45%
- Achieve >60% full onboarding completion rate across all roles
- Reduce step-by-step drop-off to <15% per step

---

## Current State Assessment

### What Exists Today

#### WelcomeModal (`client/src/components/onboarding/WelcomeModal.tsx`)

- **Role-aware multi-step flow** with animated transitions (Framer Motion)
- **Trainer path** (5 steps): Welcome -> Goals -> Training Style -> Client Count -> Completion
- **Solo path** (4 steps): Welcome -> Fitness Level -> Goals -> Completion
- Progress indicator with percentage and step counter
- Feature preview cards on the welcome step (role-specific)
- Confetti celebration on completion (lazy-loaded `react-confetti`)
- Skip/dismiss capability via close button (sends `selectedGoal: "skip"`)
- Analytics tracking via `trackEvent()` for: `onboarding_started`, `onboarding_goal_selected`, `onboarding_training_style`, `onboarding_fitness_level`, `onboarding_client_count`, `onboarding_completed`
- Gradient button styling with shimmer hover effect

**Trainer Goals Available:**
| Goal ID | Label | Icon |
|---------|-------|------|
| `manage_clients` | Manage Clients Better | Users |
| `grow_clients` | Grow My Client Base | TrendingUp |
| `save_time` | Save Time on Admin | Clock |
| `track_progress` | Track Client Progress | Target |

**Solo Goals Available:**
| Goal ID | Label | Icon |
|---------|-------|------|
| `build_muscle` | Build Muscle | Dumbbell |
| `lose_weight` | Lose Weight | Flame |
| `get_stronger` | Get Stronger | Trophy |
| `stay_consistent` | Stay Consistent | Target |

**Training Styles (Trainer only):**
| Style ID | Label |
|----------|-------|
| `one_on_one` | 1-on-1 Training |
| `group` | Group Training |
| `online` | Online Coaching |
| `hybrid` | Hybrid |

**Client Count Brackets (Trainer only):** 1-10, 11-25, 26-50, 50+

**Fitness Levels (Solo only):** Beginner, Intermediate, Advanced, Athlete

#### SetupChecklist (`client/src/components/onboarding/SetupChecklist.tsx`)

- **Post-modal guided task list** rendered on the Dashboard
- Premium glass-morphism design with animated progress bar and shimmer effect
- Items: Add first client, Create workout, Assign workout, Schedule session
- Each item has a completion state, description, and action button
- Auto-dismisses when all items are completed
- Manual dismiss button available
- Completion celebration with animated gradient background

#### Server-Side Tracking (`server/routes.ts` + `shared/schema.ts`)

**Database Table: `user_onboarding_progress`**

| Column                      | Type           | Default             | Description                                     |
| --------------------------- | -------------- | ------------------- | ----------------------------------------------- |
| `id`                        | VARCHAR (UUID) | `gen_random_uuid()` | Primary key                                     |
| `user_id`                   | VARCHAR        | --                  | FK to `users.id`, unique, cascade delete        |
| `welcome_modal_completed`   | BOOLEAN        | `false`             | Modal flow finished                             |
| `selected_goal`             | TEXT           | `null`              | User's chosen primary goal                      |
| `added_first_client`        | BOOLEAN        | `false`             | Auto-tracked on POST `/api/clients`             |
| `created_first_workout`     | BOOLEAN        | `false`             | Auto-tracked on POST `/api/workouts`            |
| `assigned_first_workout`    | BOOLEAN        | `false`             | Auto-tracked on POST `/api/workout-assignments` |
| `scheduled_first_session`   | BOOLEAN        | `false`             | Auto-tracked on POST `/api/training-sessions`   |
| `logged_first_progress`     | BOOLEAN        | `false`             | Tracked on progress entry                       |
| `sent_first_message`        | BOOLEAN        | `false`             | Tracked on WebSocket message                    |
| `completed_product_tour`    | BOOLEAN        | `false`             | Manual toggle                                   |
| `dismissed_feature_prompts` | TEXT[]         | `[]`                | Array of dismissed prompt IDs                   |
| `onboarding_completed_at`   | TIMESTAMP      | `null`              | Set when checklist dismissed                    |
| `created_at`                | TIMESTAMP      | `NOW()`             | Record creation                                 |
| `updated_at`                | TIMESTAMP      | `NOW()`             | Last modification                               |

**API Endpoints:**

- `GET /api/onboarding/progress` -- Fetch current user's onboarding state (returns defaults if no record)
- `PUT /api/onboarding/progress` -- Partial update of onboarding fields (Zod validated)

**Auto-Milestone Tracking:**
The server automatically marks milestones as side-effects of core actions:

- `POST /api/clients` -> sets `addedFirstClient: true`
- `POST /api/workouts` -> sets `createdFirstWorkout: true`
- `POST /api/workout-assignments` -> sets `assignedFirstWorkout: true`
- `POST /api/training-sessions` -> sets `scheduledFirstSession: true`

Each auto-track is wrapped in try/catch so it never blocks the primary action.

#### Dashboard Integration (`client/src/components/Dashboard.tsx`)

- Fetches onboarding progress via React Query (`/api/onboarding/progress`)
- Shows WelcomeModal if `welcomeModalCompleted === false` AND localStorage key `gymgurus_welcome_completed` is not `"true"`
- Shows SetupChecklist if welcome modal is done but `onboardingCompletedAt` is null and items remain incomplete
- `handleWelcomeComplete()` writes to localStorage immediately (prevents flash on reload), then PUTs to server
- `handleChecklistDismiss()` sets `onboardingCompletedAt` to current timestamp

#### Analytics Infrastructure (`client/src/lib/analytics.ts`)

- Google Analytics integration via `gtag.js`
- Controlled by `VITE_GA_MEASUREMENT_ID` env var
- `trackEvent(name, params)` function used throughout onboarding
- `trackPageView(path)` for route-level tracking

### Gaps Identified

1. **No Client role onboarding** -- Clients logging in see no guided experience
2. **No email/re-engagement system** -- No follow-up for users who abandon onboarding
3. **No gamification hooks** -- Onboarding milestones do not award XP or achievements
4. **Training style and client count not persisted** -- WelcomeModal passes `trainingStyle` and `clientCount` to `onComplete()` but Dashboard only saves `selectedGoal` to the API
5. **Skip tracking is minimal** -- Users who skip (`selectedGoal: "skip"`) are not tracked separately
6. **No A/B testing infrastructure** -- No feature flags or variant assignment
7. **No tooltip/spotlight tours** -- `completedProductTour` field exists but no tour component
8. **Checklist is trainer-only** -- Solo users see no post-modal guided experience

---

## 1. Signup Flow Optimization

### Current Flow

```
Landing Page -> "Get Started" -> Replit Auth (production) / Mock Login (dev)
                                   |
                                   v
                           Role Selection: Trainer / Client / Solo
                                   |
                                   v
                           Dashboard (triggers WelcomeModal)
```

### Recommended Flow

```
Landing Page -> "Get Started" -> Google OAuth (single click)
                                   |
                                   v
                           Role Selection Screen (full-page, not modal)
                              Trainer / Client / Solo
                                   |
                                   v
                           Minimal Profile Fields (name + optional photo)
                                   |
                                   v
                           Dashboard (triggers WelcomeModal immediately)
```

### Friction Reduction Techniques

**1. Single-Click OAuth**

- Replace Replit Auth with Google OAuth as the primary method
- Add Apple Sign-In as secondary (covers ~95% of fitness app users)
- Pre-fill name and avatar from OAuth profile data
- Eliminate manual email/password fields entirely

**2. Progressive Profiling**

- Collect only what is needed at each stage:
  - Signup: Email + name (auto-filled from OAuth)
  - WelcomeModal: Goal + training style/fitness level
  - First week: Additional preferences via contextual prompts
- Never ask for information you can infer (e.g., timezone from browser)

**3. Role Selection Design**

- Full-page layout (not a small modal) with large clickable cards
- Each role card shows: icon, title, 1-line description, 3 bullet features
- Use brand colors: Electric Blue (`#3B82F6`) cards with Emerald (`#10B981`) accent on hover
- "Not sure?" helper text linking to a comparison or quiz

**4. Progress Indicator Design**

- Segmented progress bar at the top of the flow (already implemented in WelcomeModal)
- Show "Step X of Y" with percentage (already implemented)
- Enhancement: Add estimated time remaining ("~1 min left")
- Enhancement: Use Electric Blue (`#3B82F6`) for filled segments, muted gray for upcoming

**5. Reduce Perceived Wait Time**

- Optimistic UI: Show the dashboard skeleton while onboarding data saves
- Lazy-load confetti component (already implemented via `React.lazy`)
- Pre-fetch dashboard data during the final onboarding step

### Signup Flow Metrics to Track

| Metric                     | Target      | Measurement                                   |
| -------------------------- | ----------- | --------------------------------------------- |
| OAuth click-to-dashboard   | <10 seconds | Timer from OAuth redirect to dashboard render |
| Role selection abandonment | <5%         | Users who see role screen but never select    |
| Profile completion rate    | >95%        | Users who complete the minimal fields         |

---

## 2. Post-Signup Onboarding for Trainers

### Overview

Trainers are the primary revenue-generating role. Their onboarding must demonstrate value within the first 3 minutes by getting them from zero to "one client with a workout assigned."

### Guided Steps (5 Steps)

#### Step 1: "What's your training style?" (Training Style Selection)

**Current Status:** Implemented in WelcomeModal

| Option          | ID           | Description                       | Dashboard Customization                  |
| --------------- | ------------ | --------------------------------- | ---------------------------------------- |
| 1-on-1 Training | `one_on_one` | Personal training sessions        | Show individual client cards prominently |
| Group Training  | `group`      | Small group fitness classes       | Show group session calendar view         |
| Online Coaching | `online`     | Remote program design & check-ins | Emphasize messaging and program builder  |
| Hybrid          | `hybrid`     | Mix of in-person and online       | Balanced dashboard layout                |

**Enhancement Required:** Currently `trainingStyle` is passed to `onComplete()` but only `selectedGoal` is saved to the API. The PUT request in `handleWelcomeComplete()` should also include:

```typescript
await updateOnboardingMutation.mutateAsync({
  welcomeModalCompleted: true,
  selectedGoal: data.selectedGoal,
  trainingStyle: data.trainingStyle, // ADD THIS
  clientCount: data.clientCount, // ADD THIS
});
```

This requires adding `training_style` and `client_count` columns to the `user_onboarding_progress` table.

#### Step 2: "How many clients do you have?" (Client Count)

**Current Status:** Implemented in WelcomeModal

| Bracket | ID      | Label                | Implication                                          |
| ------- | ------- | -------------------- | ---------------------------------------------------- |
| 1-10    | `1-10`  | Just getting started | Show simple list view, emphasize adding first client |
| 11-25   | `11-25` | Growing steadily     | Show grid view, introduce bulk actions               |
| 26-50   | `26-50` | Established business | Show analytics dashboard, highlight reporting        |
| 50+     | `50+`   | Large operation      | Show team features, API integrations                 |

**Post-Selection Logic:**

- If "1-10": Skip advanced features, focus on core client management
- If "50+": Show brief "Enterprise Features" callout before completion

#### Step 3: "Add your first client" (Guided Form)

**Current Status:** Exists as a SetupChecklist item, but not a guided experience

**Recommended Enhancement:**

- After WelcomeModal completion, the first checklist item should open a **guided client form** (not just the standard form)
- Pre-populate with example data: "Try adding a client like 'Sarah Johnson'"
- Show only essential fields: Name, Email, Phone (optional)
- Include a "Skip -- I'll add clients later" option
- On completion: Celebration micro-animation + "Client added" toast with Emerald (`#10B981`) accent
- Auto-track: Server already sets `addedFirstClient: true` on `POST /api/clients`

**Guided Form Fields (Minimal):**

```
Name:    [Sarah Johnson]  (placeholder)
Email:   [sarah@example.com]  (placeholder)
Phone:   [Optional]
Goal:    [Dropdown: Weight Loss / Muscle Gain / General Fitness / Sport Specific]
```

#### Step 4: "Create your first workout" (Pre-loaded Template)

**Current Status:** Exists as a SetupChecklist item linking to `/workouts`

**Recommended Enhancement:**

- Instead of navigating away, open an **in-context workout builder** with a pre-loaded template
- Template options based on training style:
  - 1-on-1: "Full Body Strength" (4 exercises, 45 min)
  - Group: "HIIT Circuit" (6 exercises, 30 min)
  - Online: "Progressive Overload Program" (5 exercises, 50 min)
  - Hybrid: "Push/Pull Split" (5 exercises, 40 min)
- User can customize the template (change exercises, sets, reps) or use as-is
- "Use This Template" button creates the workout immediately
- Auto-track: Server already sets `createdFirstWorkout: true` on `POST /api/workouts`

**Template Structure Example ("Full Body Strength"):**
| Exercise | Sets | Reps | Rest |
|----------|------|------|------|
| Barbell Squat | 4 | 8 | 90s |
| Bench Press | 4 | 8 | 90s |
| Barbell Row | 3 | 10 | 60s |
| Overhead Press | 3 | 10 | 60s |

#### Step 5: "Try the AI coach" (Sample Conversation)

**Current Status:** Listed as a "What's next" item on the completion screen, but not a guided step

**Recommended Enhancement:**

- Add a dedicated step (either in the checklist or as a tooltip prompt)
- Show a pre-written conversation starter: "Ask the AI: 'Create a 4-week progressive overload plan for a beginner client'"
- One-click button to open the AI chat with the prompt pre-filled
- Track interaction: `sentFirstMessage: true` (field already exists in schema)
- Show a sample AI response preview to set expectations

### Trainer Onboarding Flow Diagram

```
WelcomeModal                           Dashboard (SetupChecklist)
+-----------+    +---------+    +--------+    +---+    +---+    +---+    +---+
| Welcome   | -> | Goals   | -> |Training| -> |Count| -> |Done| => |Add | -> |Create| -> |Assign| -> |AI   |
| (preview) |    |(4 cards)|    | Style  |    |    |    |    |    |Client|    |Workout|    |Workout|    |Coach|
+-----------+    +---------+    +--------+    +---+    +---+    +---+    +---+    +---+    +---+
   Step 1          Step 2        Step 3       Step 4   Step 5   Task 1   Task 2   Task 3   Task 4
```

---

## 3. Post-Signup Onboarding for Solo Users

### Overview

Solo users are self-directed fitness enthusiasts. Their onboarding must feel fast, personalized, and immediately rewarding through gamification hooks (XP, streaks, achievements).

### Guided Steps (4 Steps)

#### Step 1: "What's your fitness level?" (Fitness Level Selection)

**Current Status:** Implemented in WelcomeModal

| Level        | ID             | Description                         | Impact on Recommendations                         |
| ------------ | -------------- | ----------------------------------- | ------------------------------------------------- |
| Beginner     | `beginner`     | New to working out or returning     | Simpler exercises, lower volume, more guidance    |
| Intermediate | `intermediate` | 6+ months consistent, knows basics  | Standard programming, moderate volume             |
| Advanced     | `advanced`     | Years of experience, specific goals | Advanced techniques, higher volume, periodization |
| Athlete      | `athlete`      | Competitive or sport-specific       | Sport-specific programming, performance metrics   |

**Enhancement Required:** Like training style, `fitnessLevel` should be persisted to the database. Add `fitness_level` column to the `user_onboarding_progress` table.

#### Step 2: "What's your main goal?" (Goal Selection)

**Current Status:** Implemented in WelcomeModal

| Goal            | ID                | Recommended Calculator  | Recommended First Action        |
| --------------- | ----------------- | ----------------------- | ------------------------------- |
| Build Muscle    | `build_muscle`    | 1RM Calculator          | Log a strength workout          |
| Lose Weight     | `lose_weight`     | BMI Calculator          | Log a cardio/HIIT workout       |
| Get Stronger    | `get_stronger`    | Strength Standards Calc | Log a strength workout          |
| Stay Consistent | `stay_consistent` | Any (user choice)       | Log any workout to start streak |

**Post-Selection Logic:**

- Store `selectedGoal` to personalize the dashboard experience
- Use goal to determine which calculator to surface in Step 4
- Influence the recommended workout templates

#### Step 3: "Log your first workout" (Guided Logging Experience)

**Current Status:** Listed as "What's next" on completion screen, not a guided step

**Recommended Enhancement:**

- After WelcomeModal closes, show a prominent **"Log Your First Workout"** card on the Solo dashboard
- Pre-loaded with a simple workout template based on fitness level + goal:
  - Beginner + Build Muscle: "Beginner Full Body" (3 exercises)
  - Advanced + Get Stronger: "Strength Test Day" (3 compound lifts)
  - Any + Lose Weight: "Quick HIIT Burn" (4 exercises, 20 min)
  - Any + Stay Consistent: "Easy Starter" (3 exercises, 15 min)
- Show inline exercise logging (sets x reps x weight) with autofill suggestions
- On completion: Award **+50 XP** and show a "First Workout" celebration
- Track: `loggedFirstProgress: true`

**Guided Workout Template Example ("Beginner Full Body"):**
| Exercise | Sets | Reps | Suggested Weight |
|----------|------|------|-----------------|
| Goblet Squat | 3 | 10 | 20 lbs |
| Dumbbell Press | 3 | 10 | 15 lbs |
| Lat Pulldown | 3 | 10 | 50 lbs |

#### Step 4: "Try a calculator" (Personalized Calculator Link)

**Current Status:** Listed as "What's next" on completion screen, not a guided step

**Recommended Enhancement:**

- Show a contextual banner or card: "Based on your goal, try this calculator"
- Calculator routing based on `selectedGoal`:

| Goal              | Calculator         | Route                             | Rationale                 |
| ----------------- | ------------------ | --------------------------------- | ------------------------- |
| `build_muscle`    | 1RM Calculator     | `/calculators/one-rep-max`        | Know your working weights |
| `lose_weight`     | BMI Calculator     | `/calculators/bmi`                | Establish your baseline   |
| `get_stronger`    | Strength Standards | `/calculators/strength-standards` | See where you rank        |
| `stay_consistent` | 1RM Calculator     | `/calculators/one-rep-max`        | Track strength progress   |

- Pre-fill calculator with data from the logged workout (if available)
- On first calculator use: Award **+25 XP** for "Explorer" milestone
- Track: Add `usedFirstCalculator` to onboarding progress (new field)

### Solo Onboarding Flow Diagram

```
WelcomeModal                                    Dashboard
+-----------+    +---------+    +--------+    +---+    +---+    +---+
| Welcome   | -> | Fitness | -> |  Goals | -> |Done| => |Log | -> |Try  |
| (preview) |    | Level   |    |(4 cards)|    |    |    |Workout|    |Calc |
+-----------+    +---------+    +--------+    +---+    +---+    +---+
   Step 1          Step 2        Step 3       Step 4   Task 1   Task 2
```

---

## 4. Activation Metrics & KPIs

### Primary Activation Metrics

| Metric                            | Definition                                                    | Target      | Measurement Method                  |
| --------------------------------- | ------------------------------------------------------------- | ----------- | ----------------------------------- |
| **Time to First Client Added**    | Duration from account creation to `addedFirstClient: true`    | <5 minutes  | `created_at` vs milestone timestamp |
| **Time to First Workout Created** | Duration from account creation to `createdFirstWorkout: true` | <8 minutes  | `created_at` vs milestone timestamp |
| **Time to First AI Interaction**  | Duration from account creation to `sentFirstMessage: true`    | <15 minutes | `created_at` vs milestone timestamp |
| **7-Day Retention Rate**          | % of users who return at least once in days 2-7               | >45%        | Login event tracking                |
| **Onboarding Completion Rate**    | % of users with `onboardingCompletedAt` set within 7 days     | >60%        | Database query                      |
| **Average Onboarding Time**       | Mean time from `onboarding_started` to `onboarding_completed` | <3 minutes  | Analytics event timestamps          |

### Step-by-Step Drop-Off Rates

Track the conversion between each onboarding step to identify the highest-friction points.

**Trainer Funnel:**

```
Signup -> Welcome (100%)
  -> Goals Selection (target: >95%)
    -> Training Style (target: >90%)
      -> Client Count (target: >85%)
        -> Completion (target: >80%)
          -> Add Client [checklist] (target: >60%)
            -> Create Workout [checklist] (target: >50%)
              -> Assign Workout [checklist] (target: >40%)
                -> AI Coach [checklist] (target: >30%)
```

**Solo Funnel:**

```
Signup -> Welcome (100%)
  -> Fitness Level (target: >95%)
    -> Goal Selection (target: >90%)
      -> Completion (target: >85%)
        -> Log Workout [guided] (target: >65%)
          -> Try Calculator [guided] (target: >50%)
```

**Maximum Acceptable Drop-Off Per Step:** <15%

### Secondary Metrics

| Metric                      | Definition                                             | Target                         |
| --------------------------- | ------------------------------------------------------ | ------------------------------ |
| Skip Rate                   | % of users who dismiss WelcomeModal without completing | <20%                           |
| Checklist Completion Rate   | % who complete all 4 checklist items                   | >35%                           |
| Goal Distribution           | Breakdown of selected goals by role                    | Balanced (no >40% single goal) |
| Training Style Distribution | Breakdown for trainers                                 | Informational                  |
| Fitness Level Distribution  | Breakdown for solo users                               | Informational                  |
| Onboarding NPS              | Post-onboarding micro-survey score                     | >50                            |

### KPI Dashboard Query (Pseudo-SQL)

```sql
-- Onboarding completion rate (last 30 days)
SELECT
  COUNT(CASE WHEN onboarding_completed_at IS NOT NULL THEN 1 END)::float /
  COUNT(*)::float * 100 AS completion_rate,
  AVG(EXTRACT(EPOCH FROM (onboarding_completed_at - created_at))) / 60 AS avg_minutes,
  COUNT(CASE WHEN selected_goal = 'skip' THEN 1 END)::float /
  COUNT(*)::float * 100 AS skip_rate
FROM user_onboarding_progress
WHERE created_at > NOW() - INTERVAL '30 days';

-- Step-by-step drop-off
SELECT
  COUNT(*) AS total_users,
  COUNT(CASE WHEN welcome_modal_completed THEN 1 END) AS completed_modal,
  COUNT(CASE WHEN added_first_client THEN 1 END) AS added_client,
  COUNT(CASE WHEN created_first_workout THEN 1 END) AS created_workout,
  COUNT(CASE WHEN assigned_first_workout THEN 1 END) AS assigned_workout,
  COUNT(CASE WHEN scheduled_first_session THEN 1 END) AS scheduled_session
FROM user_onboarding_progress
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 5. Gamification Integration

### XP Rewards for Onboarding Milestones

Integrate onboarding milestones with the existing gamification system (`server/services/gamification/xpService.ts`, `achievementService.ts`).

| Milestone                    | XP Reward      | Achievement Badge     | Trigger                         |
| ---------------------------- | -------------- | --------------------- | ------------------------------- |
| Complete WelcomeModal        | +25 XP         | --                    | `welcomeModalCompleted: true`   |
| Add first client (Trainer)   | +50 XP         | "First Steps"         | `addedFirstClient: true`        |
| Create first workout         | +50 XP         | "Architect"           | `createdFirstWorkout: true`     |
| Assign first workout         | +30 XP         | --                    | `assignedFirstWorkout: true`    |
| Schedule first session       | +30 XP         | "Scheduler"           | `scheduledFirstSession: true`   |
| Log first workout (Solo)     | +50 XP         | "First Steps"         | `loggedFirstProgress: true`     |
| Use first calculator         | +25 XP         | "Explorer"            | `usedFirstCalculator: true`     |
| Try AI coach                 | +25 XP         | "AI Pioneer"          | `sentFirstMessage: true`        |
| **Complete full onboarding** | **+100 XP**    | **"Fully Onboarded"** | `onboardingCompletedAt != null` |
| **Total Possible**           | **335-385 XP** |                       |                                 |

### "First Steps" Achievement Badge

**Badge Name:** First Steps
**Badge Description:** "Completed your first core action on GymGurus"
**Badge Icon:** Footprints or stepping stones (in Electric Blue `#3B82F6`)
**Trigger:** First client added (Trainer) OR first workout logged (Solo)
**Rarity:** Common (expected for most users)

**Implementation:**

```typescript
// In server/services/gamification/achievementService.ts
const ONBOARDING_ACHIEVEMENTS = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Completed your first core action',
    icon: 'footprints',
    xpReward: 50,
    condition: (progress) => progress.addedFirstClient || progress.loggedFirstProgress,
  },
  {
    id: 'fully_onboarded',
    name: 'Fully Onboarded',
    description: 'Completed the entire onboarding journey',
    icon: 'graduation-cap',
    xpReward: 100,
    condition: (progress) => progress.onboardingCompletedAt !== null,
  },
];
```

### Streak Initialization on First Workout

When a solo user logs their first workout during onboarding:

1. Initialize their workout streak counter to 1
2. Show a "Streak Started" toast with Emerald (`#10B981`) accent
3. Explain streaks: "Come back tomorrow to keep your streak alive!"
4. Display the streak flame icon on the dashboard

**Implementation Hook:**
The existing `PUT /api/workout-assignments/:id/complete` endpoint already calls `updateStreak(userId)` from `xpService.ts`. Ensure the solo workout logging flow triggers the same streak logic.

### Level 1 Celebration Moment

When a user accumulates enough XP during onboarding to reach Level 1 (if starting from 0):

1. Trigger a full-screen celebration overlay (already implemented: `CelebrationOverlay` component)
2. Show: "You reached Level 1!" with the user's Gen-Z rank title
3. Include confetti animation (lazy-loaded, already available)
4. Auto-dismiss after 5 seconds or on click

**XP Thresholds:**

- Level 1: 100 XP (achievable by completing WelcomeModal + 1 core action)
- Level 2: 250 XP (achievable by completing full onboarding)

### Gamification Timeline During Onboarding

```
Step 1 (Welcome)     -> No XP (motivational only)
Step 2 (Goals)       -> No XP (data collection)
Step 3 (Style/Level) -> No XP (data collection)
Step 4 (Count/Goals) -> No XP (data collection)
Step 5 (Completion)  -> +25 XP (modal done)
Task 1 (Client/Log)  -> +50 XP + "First Steps" badge + streak init
Task 2 (Workout)     -> +50 XP + "Architect" badge
Task 3 (Assign/Calc) -> +25-30 XP
Task 4 (AI/Achieve)  -> +25 XP
Full Completion      -> +100 XP + "Fully Onboarded" badge
                        ========
                        ~280-335 XP = Level 2 reached
```

---

## 6. Re-engagement for Incomplete Onboarding

### In-App Reminders (24h After Incomplete Onboarding)

**Trigger:** User has `welcomeModalCompleted: true` but `onboardingCompletedAt` is null, and last login was >24h ago.

**Implementation:**

- On Dashboard mount, check onboarding progress
- If incomplete and >24h since `created_at`, show a **persistent but dismissible banner**:
  - Headline: "Pick up where you left off"
  - Body: "You're X steps away from completing setup"
  - CTA: "Continue Setup" (scrolls to or re-opens the relevant step)
  - Dismiss: "Remind me later" (suppresses for 24h via localStorage)

**Banner Design:**

```
+---------------------------------------------------------------+
|  [Sparkles icon]  Pick up where you left off                [X]|
|  You're 2 steps away from completing setup.                    |
|  [Continue Setup - Electric Blue button]  [Remind me later]    |
+---------------------------------------------------------------+
```

**localStorage Key:** `gymgurus_reengagement_dismissed_at`

### Email Nudge Sequence

**Day 1 Email (Welcome Sequence):**

| Element   | Content                                                              |
| --------- | -------------------------------------------------------------------- |
| Subject   | "Welcome to GymGurus -- let's finish setting up"                     |
| Preheader | "You're 2 minutes away from your first workout plan"                 |
| Body      | Personalized based on `selectedGoal`, shows next uncompleted step    |
| CTA       | "Complete Your Setup" (deep link to dashboard)                       |
| Fallback  | If goal is "skip", use generic "Here's what GymGurus can do for you" |

**Day 3 Email (Value Reminder):**

| Element | Content                                                    |
| ------- | ---------------------------------------------------------- |
| Subject | "Your clients are waiting (and so is our AI coach)"        |
| Body    | Feature highlight based on role + goal, social proof stats |
| CTA     | "Open GymGurus"                                            |

**Day 7 Email (Last Chance):**

| Element | Content                                                               |
| ------- | --------------------------------------------------------------------- |
| Subject | "Still want to try GymGurus?"                                         |
| Body    | Quick-win offer: "Log in and we'll create your first workout for you" |
| CTA     | "Set Up in 60 Seconds"                                                |

**Email Suppression Rules:**

- Do not send if `onboardingCompletedAt` is set
- Do not send if user logged in within the last 24h
- Maximum 3 emails in the welcome sequence
- Unsubscribe link in every email

### Dashboard Persistent Checklist

**Current Implementation:** The SetupChecklist already persists on the Dashboard until dismissed or all items are completed. This is working as intended.

**Enhancement:**

- Make the checklist **collapsible but not fully dismissible** until at least 2 of 4 items are completed
- After 2+ items completed, show the dismiss button
- When collapsed, show a small floating badge: "2/4 setup tasks remaining"
- After dismissal, add a "Setup Tasks" link in the user profile dropdown for users who want to return to it

### Tooltip Hints on Relevant Features

**Implementation:** Use a lightweight tooltip library (e.g., `@radix-ui/react-tooltip` already in the project via shadcn/ui) to show contextual hints on features the user has not yet discovered.

**Tooltip Triggers:**

| Feature             | Tooltip                                     | Show When                                                 | Dismiss                      |
| ------------------- | ------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| Client list sidebar | "Add your first client here"                | `addedFirstClient === false` + visited dashboard 2+ times | On click or explicit dismiss |
| Workout builder     | "Create your first workout plan"            | `createdFirstWorkout === false` + viewed workout page     | On click or explicit dismiss |
| AI chat icon        | "Try asking the AI for workout suggestions" | `sentFirstMessage === false` + 3+ days since signup       | On click or explicit dismiss |
| Calculator nav item | "Check your strength standards"             | `usedFirstCalculator === false` + solo user               | On click or explicit dismiss |
| Schedule page       | "Book your first session"                   | `scheduledFirstSession === false` + 1+ clients            | On click or explicit dismiss |

**Tooltip Design:**

- Background: Dark glass (matches existing `glass` utility class)
- Border: 1px `border-primary/30`
- Arrow pointing to the feature
- "Got it" dismiss button
- Store dismissed tooltips in `dismissed_feature_prompts` array (already in schema)

---

## 7. A/B Testing Opportunities

### Test 1: 3-Step vs 5-Step Onboarding (Trainer)

**Hypothesis:** Reducing the WelcomeModal from 5 steps to 3 steps (Welcome -> Combined Goals + Style -> Completion) will increase completion rate by >15%.

| Variant         | Steps   | Content                                                          |
| --------------- | ------- | ---------------------------------------------------------------- |
| **Control (A)** | 5 steps | Welcome -> Goals -> Training Style -> Client Count -> Completion |
| **Variant (B)** | 3 steps | Welcome -> Combined (Goal + Style side-by-side) -> Completion    |

**Primary Metric:** WelcomeModal completion rate
**Secondary Metric:** 7-day retention, checklist engagement
**Sample Size:** 500 users per variant (1000 total)
**Duration:** 2-4 weeks

**Risk:** Variant B may reduce data quality (less granular goal/style info). Mitigate by collecting client count as a separate optional prompt after onboarding.

### Test 2: Skip Button vs Forced Completion

**Hypothesis:** Removing the close/skip button from the WelcomeModal will increase completion rate but may decrease satisfaction.

| Variant         | Skip Option                    | Close Button                      |
| --------------- | ------------------------------ | --------------------------------- |
| **Control (A)** | Close button visible (current) | Yes, sends `selectedGoal: "skip"` |
| **Variant (B)** | No close button, must complete | No, "Back" and "Continue" only    |

**Primary Metric:** Completion rate, skip rate
**Secondary Metric:** User satisfaction (post-onboarding micro-survey), bounce rate
**Guardrail Metric:** If bounce rate increases >5%, auto-terminate test

### Test 3: With vs Without Feature Preview Cards

**Hypothesis:** Showing feature preview cards on the Welcome step increases engagement but may slow down completion.

| Variant         | Welcome Step                                                     |
| --------------- | ---------------------------------------------------------------- |
| **Control (A)** | Icon + heading + description + 4 feature preview cards (current) |
| **Variant (B)** | Icon + heading + description only (no preview cards)             |

**Primary Metric:** Time to complete WelcomeModal
**Secondary Metric:** Feature discovery rate (do users who see previews use those features sooner?)

### Test 4: CTA Copy Variations

**Hypothesis:** Action-oriented CTA copy will outperform generic copy.

| Element        | Variant A (Control)    | Variant B            | Variant C                     |
| -------------- | ---------------------- | -------------------- | ----------------------------- |
| Welcome CTA    | "Get Started"          | "Let's Go"           | "Personalize My Experience"   |
| Completion CTA | "Start Using GymGurus" | "Go to My Dashboard" | "Let's Build Something Great" |

**Primary Metric:** Click-through rate on each CTA
**Secondary Metric:** Completion rate

### Test 5: Guided Onboarding vs Self-Service

**Hypothesis:** A fully guided onboarding (where each checklist step opens inline) outperforms the current approach of linking to full pages.

| Variant         | Checklist Behavior                                     |
| --------------- | ------------------------------------------------------ |
| **Control (A)** | Checklist item clicks navigate to full pages (current) |
| **Variant (B)** | Checklist items expand inline with guided mini-forms   |

**Primary Metric:** Checklist completion rate
**Secondary Metric:** Time to complete all checklist items

### A/B Testing Infrastructure Requirements

1. **Feature Flag System:** Implement a simple feature flag service
   - Server-side: `isFeatureEnabled(userId, flagName) -> boolean`
   - Client-side: `useFeatureFlag(flagName) -> boolean`
   - Variant assignment: Deterministic hash of `userId + testName` for consistency

2. **Variant Assignment Storage:**

   ```typescript
   // New table or localStorage
   interface ABTestAssignment {
     userId: string;
     testName: string;
     variant: 'A' | 'B' | 'C';
     assignedAt: Date;
   }
   ```

3. **Analytics Events:**
   - `ab_test_assigned`: `{ testName, variant }`
   - `ab_test_converted`: `{ testName, variant, metric }`
   - `ab_test_impression`: `{ testName, variant, step }`

---

## 8. Technical Implementation Notes

### Database Schema

#### Existing Table: `user_onboarding_progress`

Full schema as defined in `shared/schema.ts`:

```typescript
export const userOnboardingProgress = pgTable('user_onboarding_progress', {
  id: varchar('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  welcomeModalCompleted: boolean('welcome_modal_completed').notNull().default(false),
  selectedGoal: text('selected_goal'),
  addedFirstClient: boolean('added_first_client').notNull().default(false),
  createdFirstWorkout: boolean('created_first_workout').notNull().default(false),
  assignedFirstWorkout: boolean('assigned_first_workout').notNull().default(false),
  scheduledFirstSession: boolean('scheduled_first_session').notNull().default(false),
  loggedFirstProgress: boolean('logged_first_progress').notNull().default(false),
  completedProductTour: boolean('completed_product_tour').notNull().default(false),
  sentFirstMessage: boolean('sent_first_message').notNull().default(false),
  dismissedFeaturePrompts: text('dismissed_feature_prompts')
    .array()
    .default(sql`ARRAY[]::TEXT[]`),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Recommended Schema Additions

```sql
-- Migration: Add extended onboarding fields
ALTER TABLE user_onboarding_progress
  ADD COLUMN IF NOT EXISTS training_style TEXT,
  ADD COLUMN IF NOT EXISTS client_count TEXT,
  ADD COLUMN IF NOT EXISTS fitness_level TEXT,
  ADD COLUMN IF NOT EXISTS used_first_calculator BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_variant TEXT DEFAULT 'control',
  ADD COLUMN IF NOT EXISTS reengagement_email_sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reengagement_dismissed_at TIMESTAMP;
```

**Drizzle ORM Addition (schema.ts):**

```typescript
// Add to userOnboardingProgress table definition:
trainingStyle: text("training_style"),
clientCount: text("client_count"),
fitnessLevel: text("fitness_level"),
usedFirstCalculator: boolean("used_first_calculator").notNull().default(false),
onboardingVariant: text("onboarding_variant").default("control"),
reengagementEmailSentAt: timestamp("reengagement_email_sent_at"),
reengagementDismissedAt: timestamp("reengagement_dismissed_at"),
```

### API Endpoints

#### Existing Endpoints

| Method | Path                       | Auth         | Rate Limit         | Description                           |
| ------ | -------------------------- | ------------ | ------------------ | ------------------------------------- |
| `GET`  | `/api/onboarding/progress` | `secureAuth` | `generalRateLimit` | Fetch current user's onboarding state |
| `PUT`  | `/api/onboarding/progress` | `secureAuth` | `generalRateLimit` | Partial update onboarding fields      |

#### Recommended New Endpoints

| Method | Path                              | Auth         | Rate Limit        | Description                                          |
| ------ | --------------------------------- | ------------ | ----------------- | ---------------------------------------------------- |
| `POST` | `/api/onboarding/events`          | `secureAuth` | `apiRateLimit`    | Track granular onboarding analytics events           |
| `GET`  | `/api/onboarding/recommendations` | `secureAuth` | `apiRateLimit`    | Get personalized recommendations based on goal/level |
| `POST` | `/api/onboarding/skip`            | `secureAuth` | `strictRateLimit` | Explicitly skip onboarding with reason tracking      |

### Component Architecture

#### Existing Components

| Component        | Path                                                  | Role                        |
| ---------------- | ----------------------------------------------------- | --------------------------- |
| `WelcomeModal`   | `client/src/components/onboarding/WelcomeModal.tsx`   | Multi-step onboarding modal |
| `SetupChecklist` | `client/src/components/onboarding/SetupChecklist.tsx` | Post-modal guided task list |

#### Recommended New Components

| Component                 | Path                                                           | Role                                      |
| ------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `OnboardingTooltip`       | `client/src/components/onboarding/OnboardingTooltip.tsx`       | Contextual feature hints                  |
| `ReengagementBanner`      | `client/src/components/onboarding/ReengagementBanner.tsx`      | Persistent "continue setup" banner        |
| `GuidedClientForm`        | `client/src/components/onboarding/GuidedClientForm.tsx`        | Simplified client creation for onboarding |
| `WorkoutTemplateSelector` | `client/src/components/onboarding/WorkoutTemplateSelector.tsx` | Pre-loaded workout template picker        |
| `SoloChecklist`           | `client/src/components/onboarding/SoloChecklist.tsx`           | Post-modal tasks for solo users           |
| `OnboardingXPToast`       | `client/src/components/onboarding/OnboardingXPToast.tsx`       | XP award notification during onboarding   |

### Analytics Events

#### Currently Tracked Events

| Event Name                  | Parameters       | Trigger                                    |
| --------------------------- | ---------------- | ------------------------------------------ |
| `onboarding_started`        | `{ role }`       | User clicks "Get Started" on welcome step  |
| `onboarding_goal_selected`  | `{ goal, role }` | User selects a goal and clicks continue    |
| `onboarding_training_style` | `{ style }`      | User selects training style (trainer only) |
| `onboarding_fitness_level`  | `{ level }`      | User selects fitness level (solo only)     |
| `onboarding_client_count`   | `{ count }`      | User selects client count (trainer only)   |
| `onboarding_completed`      | `{ role }`       | User reaches the completion step           |

#### Recommended Additional Events

| Event Name                            | Parameters                         | Trigger                                |
| ------------------------------------- | ---------------------------------- | -------------------------------------- |
| `onboarding_skipped`                  | `{ role, step, reason }`           | User dismisses modal before completion |
| `onboarding_step_viewed`              | `{ role, step, stepIndex }`        | User views any onboarding step         |
| `onboarding_step_time`                | `{ role, step, durationMs }`       | Time spent on each step                |
| `onboarding_checklist_item_completed` | `{ itemId, role }`                 | Checklist item marked done             |
| `onboarding_checklist_dismissed`      | `{ completedCount, totalCount }`   | User dismisses checklist               |
| `onboarding_reengagement_shown`       | `{ type, daysSinceSignup }`        | Re-engagement banner shown             |
| `onboarding_reengagement_clicked`     | `{ type }`                         | User clicks re-engagement CTA          |
| `onboarding_tooltip_shown`            | `{ tooltipId, feature }`           | Tooltip hint displayed                 |
| `onboarding_tooltip_dismissed`        | `{ tooltipId, feature }`           | User dismisses tooltip                 |
| `onboarding_xp_awarded`               | `{ milestone, xpAmount, totalXp }` | XP awarded for onboarding action       |

### localStorage Keys

| Key                                  | Type                  | Purpose                                | Set By                              |
| ------------------------------------ | --------------------- | -------------------------------------- | ----------------------------------- |
| `gymgurus_welcome_completed`         | `"true"` / absent     | Prevents WelcomeModal flash on reload  | `Dashboard.handleWelcomeComplete()` |
| `gymgurus_reengagement_dismissed_at` | ISO timestamp         | Suppress re-engagement banner for 24h  | `ReengagementBanner.onDismiss()`    |
| `gymgurus_tooltip_dismissed_{id}`    | `"true"` / absent     | Track dismissed tooltips client-side   | `OnboardingTooltip.onDismiss()`     |
| `gymgurus_onboarding_variant`        | `"A"` / `"B"` / `"C"` | A/B test variant (client-side cache)   | Feature flag system                 |
| `gymgurus_lead_popup_shown`          | `"true"` / absent     | Lead capture popup tracking (existing) | `useLeadCapture` hook               |
| `gymgurus_lead_popup_dismissed`      | `"true"` / absent     | Lead capture dismissal (existing)      | `useLeadCapture` hook               |
| `gymgurus_visit_count`               | number string         | Visit counter (existing)               | `useLeadCapture` hook               |

### Data Flow Diagram

```
User Action (e.g., "Add Client")
        |
        v
Client Component (Dashboard.tsx)
        |
        |--> API Call (POST /api/clients)
        |         |
        |         v
        |    Server Route (routes.ts)
        |         |
        |         |--> storage.createClient(data)  [primary action]
        |         |
        |         |--> storage.updateUserOnboardingProgress(  [side-effect]
        |         |      trainerId, { addedFirstClient: true }
        |         |    )
        |         |
        |         v
        |    Response: 201 Created
        |
        |--> React Query invalidation
        |         |
        |         |--> Refetch /api/onboarding/progress
        |         |
        |         v
        |    SetupChecklist re-renders with updated state
        |
        |--> trackEvent("onboarding_checklist_item_completed", { itemId: "add-client" })
        |
        v
   Dashboard UI updated
```

---

## Roadmap & Prioritization

### Phase 1: Quick Wins (Week 1-2)

**Impact: High | Effort: Low**

- [ ] **Fix training style / client count / fitness level persistence** -- Update `handleWelcomeComplete()` to save all modal data to the API, not just `selectedGoal`
- [ ] **Add schema columns** for `training_style`, `client_count`, `fitness_level`
- [ ] **Track skip events** -- Fire `onboarding_skipped` event when user dismisses modal
- [ ] **Add step timing** -- Track time spent per step for drop-off analysis
- [ ] **Solo user checklist** -- Create a `SoloChecklist` with "Log workout" and "Try calculator" items

### Phase 2: Guided Experiences (Week 3-4)

**Impact: High | Effort: Medium**

- [ ] **Guided client form** -- Simplified form with example data for first client
- [ ] **Workout template selector** -- Pre-loaded templates based on training style
- [ ] **AI conversation starter** -- Pre-filled prompt for first AI interaction
- [ ] **Calculator routing** -- Surface the most relevant calculator based on goal

### Phase 3: Gamification Hooks (Week 5-6)

**Impact: Medium | Effort: Medium**

- [ ] **XP awards for milestones** -- Integrate onboarding milestones with XP service
- [ ] **"First Steps" achievement** -- Badge awarded on first core action
- [ ] **"Fully Onboarded" achievement** -- Badge for completing all onboarding
- [ ] **Streak initialization** -- Start streak counter on first workout log
- [ ] **Level 1 celebration** -- Show CelebrationOverlay when reaching Level 1

### Phase 4: Re-engagement (Week 7-8)

**Impact: Medium | Effort: Medium**

- [ ] **Re-engagement banner** -- Show after 24h of incomplete onboarding
- [ ] **Tooltip hints** -- Contextual feature discovery prompts
- [ ] **Make checklist collapsible** -- Minimize instead of full dismiss
- [ ] **Email welcome sequence** -- 3-email drip for incomplete onboarding

### Phase 5: A/B Testing & Optimization (Week 9-12)

**Impact: Variable | Effort: High**

- [ ] **Feature flag infrastructure** -- Deterministic variant assignment
- [ ] **Test: 3-step vs 5-step** -- Trainer onboarding simplification
- [ ] **Test: Skip button removal** -- Impact on completion vs satisfaction
- [ ] **Test: Guided vs self-service** -- Inline checklist vs page navigation
- [ ] **Analytics dashboard** -- Real-time onboarding funnel visualization

### Success Criteria

The onboarding optimization initiative will be considered successful when:

1. **>60%** of all new users complete the full onboarding flow within 7 days
2. **<3 minutes** average time to complete the WelcomeModal + first core action
3. **<15%** drop-off rate at any individual onboarding step
4. **>45%** 7-day retention rate for users who complete onboarding
5. **>20%** of users who complete onboarding reach Level 1 within 24 hours
6. **<20%** WelcomeModal skip rate

---

_This document should be reviewed and updated quarterly as metrics data accumulates and new optimization opportunities are identified._

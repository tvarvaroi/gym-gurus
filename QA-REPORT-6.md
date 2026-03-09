# QA Report 6 — AI Fixes Verification + Recovery System Investigation

**Date:** 2026-02-26
**Environment:** https://gym-gurus-production.up.railway.app
**Test Account:** test@test.com / Ronin (solo) role
**Profile Data:** Weight 81.6kg, Height 180cm, Gender male, Age 28, Goal muscle gain, Level intermediate
**Tested By:** Playwright MCP (automated) + source code analysis
**Deploy:** Commit 57f5ed1 (verified via asset hash `index-TTe8jAgK.js`)

---

## TEST 1 — AI Coach Real API Calls

**Previous state (QA-REPORT-5):** All responses came from keyword-matched fallback system (~100ms response time, generic advice, no profile math).

### Question 1: "Based on my weight and height, exactly how many calories should I eat per day to build muscle?"

| Criteria                          | Result                                                                                | Evidence           |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------ |
| Response time                     | ~5-8 seconds (real API call)                                                          | PASS — not instant |
| References user stats             | Yes — "Weight: 81.6kg, Height: 180.3cm, Age: 28"                                      | PASS               |
| Gives specific TDEE number        | Yes — "TDEE (maintenance): ~2,802 kcal/day"                                           | PASS               |
| Calculates muscle building target | Yes — "3,050–3,100 kcal/day (+250-300 surplus)"                                       | PASS               |
| Includes macro breakdown          | Yes — full table: Protein 147-180g, Carbs 380-420g, Fat 85-100g                       | PASS               |
| Markdown formatting               | Yes — headers, tables, bold, horizontal rules                                         | PASS               |
| Safety disclaimer                 | Yes — "For personalized medical or dietary advice, consult a healthcare professional" | PASS               |

### Question 2: "How much protein should I eat daily?"

| Criteria                    | Result                                            | Evidence |
| --------------------------- | ------------------------------------------------- | -------- |
| Calculates from body weight | Yes — "At 81.6kg, using 1.6–2.2g/kg bodyweight"   | PASS     |
| Specific number             | Yes — "131–180g protein/day, sweet spot 147g/day" | PASS     |
| Sample meal plan            | Yes — 5-meal breakdown totaling ~161g             | PASS     |
| Practical tips              | Yes — "Spread across 4+ meals", "30-40g per dose" | PASS     |

### Question 3: "What was my first question?" (Conversation Memory Test)

| Criteria                    | Result                                                     | Evidence |
| --------------------------- | ---------------------------------------------------------- | -------- |
| Remembers previous messages | **NO** — "You haven't asked any questions before this one" | **FAIL** |

**Root Cause Analysis:** The `aiChat()` function in `server/routes/ai.ts` (line ~76) builds conversation history from the database. However, the AI responded as if this was the first message, suggesting either: (a) messages are not being saved/retrieved between requests within the same conversation, or (b) the conversation ID is not being maintained across messages in the same session. The `generateText` call receives the `messages` array but the server may only be passing the latest message rather than the full history.

### TEST 1 VERDICT: **FIXED** (with conversation memory caveat)

The AI Coach now makes **real Claude API calls** instead of using the fallback system. Responses are personalized, math-based, and use the user's actual profile data. The only remaining issue is conversation memory — the AI does not remember earlier messages in the same chat session.

| Metric                       | Before (QA-5)              | After (QA-6)                                      |
| ---------------------------- | -------------------------- | ------------------------------------------------- |
| Response time                | ~100ms (fallback)          | ~5-8s (real API)                                  |
| Profile-aware calorie advice | Generic "eat in a surplus" | Specific: "TDEE 2,802 → eat 3,050-3,100 kcal"     |
| Profile-aware protein advice | Generic ranges             | Specific: "At 81.6kg → 131-180g, sweet spot 147g" |
| Markdown formatting          | None                       | Full (headers, tables, bold)                      |
| Conversation memory          | None                       | None (still broken)                               |
| Safety disclaimers           | None                       | Present                                           |

---

## TEST 2 — Meal Planner Protein Accuracy

**Previous state (QA-REPORT-5):** Generated 149.7g protein vs 163g target (-8.2%, outside 5% window).

**Config:** Bulk (muscle gain), 2802 kcal target, 163g protein target, 4 meals, No restrictions, Moderate budget, Basic cooking

### Generated Meal Plan

| Meal            | Time     | Calories | Protein  | Carbs    | Fat     | Prep |
| --------------- | -------- | -------- | -------- | -------- | ------- | ---- |
| Breakfast       | 7:00 AM  | 661      | 41g      | 74g      | 17g     | 10m  |
| Lunch           | 12:30 PM | 706      | 47g      | 82g      | 16g     | 15m  |
| Afternoon Snack | 4:00 PM  | 404      | 38g      | 46g      | 9g      | 5m   |
| Dinner          | 7:30 PM  | 740      | 40g      | 80g      | 21g     | 25m  |
| **TOTAL**       |          | **2511** | **166g** | **282g** | **63g** |      |

### Accuracy Check

| Metric                  | Target    | Actual | Accuracy  | Result                 |
| ----------------------- | --------- | ------ | --------- | ---------------------- |
| **Protein**             | 163g      | 166g   | **+1.8%** | **PASS** (within 5%)   |
| Per-meal minimum (>30g) | 35g floor | 38-47g | All above | **PASS**               |
| Calories                | 2802      | 2511   | -10.4%    | **MISS** (outside 10%) |

### TEST 2 VERDICT: **FIXED** (protein target)

| Metric            | Before (QA-5)         | After (QA-6)            |
| ----------------- | --------------------- | ----------------------- |
| Protein accuracy  | 149.7g / 163g = -8.2% | 166g / 163g = **+1.8%** |
| Within 5% window? | NO                    | **YES**                 |
| Per-meal protein  | Not checked           | 38-47g (all >30g)       |
| Calorie accuracy  | 2968 / 2802 = +5.9%   | 2511 / 2802 = -10.4%    |

**Note:** Protein accuracy is now excellent. Calorie total dropped lower than target — the strict protein constraint may have caused the AI to under-allocate calories. This is a trade-off: protein accuracy improved significantly while calorie accuracy decreased.

---

## TEST 3 — Workout Generator Rest Periods

**Previous state (QA-REPORT-5):** All exercises had universal 60s rest regardless of type or goal.

**Config:** Push Day, Build Strength, Intermediate, 45 min, Full Gym

### Generated Exercises

| #   | Exercise               | Type            | Sets × Reps | Rest    | Expected Rest (Strength) | Match?  |
| --- | ---------------------- | --------------- | ----------- | ------- | ------------------------ | ------- |
| 1   | Barbell Bench Press    | Heavy compound  | 5 × 3-5     | **60s** | 150-180s                 | **NO**  |
| 2   | Barbell Overhead Press | Heavy compound  | 4 × 4-6     | **60s** | 150-180s                 | **NO**  |
| 3   | Incline Barbell Press  | Medium compound | 4 × 4-6     | **60s** | 120s                     | **NO**  |
| 4   | Close-Grip Bench Press | Medium compound | 4 × 4-6     | **60s** | 120s                     | **NO**  |
| 5   | Cable Lateral Raise    | Isolation       | 3 × 6       | **60s** | 60-90s                   | Partial |

### Analysis

All 5 exercises show **identical 60s rest periods**. The fix did NOT work.

**Interesting:** The AI-generated Pro Tips section explicitly states: _"Do NOT cut rest periods short on heavy compounds. The 150–180s rest is non-negotiable for CNS recovery — performance will drop sharply without it."_ This proves the AI **understands** the correct rest periods from the prompt but outputs uniform 60s in the structured data.

**Root Cause:** This is a `generateObject` schema constraint issue, not a prompt issue. The workout schema likely stores `restSeconds` as a number per exercise, and the AI model defaults to a single value (60) for all exercises despite the detailed prompt instructions. The model treats the rest field as a simple default rather than calculating per-exercise values. Possible fixes:

1. **Schema-level:** Add a `restSeconds` field per exercise with a description like "Rest in seconds: 150-180 for heavy compounds, 120 for medium, 60-90 for isolation"
2. **Post-processing:** After generation, apply rest period rules based on exercise name/type server-side
3. **Few-shot example:** Include a complete example workout in the prompt showing different rest periods per exercise

### TEST 3 VERDICT: **STILL BROKEN**

Rest periods remain universal 60s across all exercises. The prompt-only approach is insufficient — the structured output schema needs modification or post-processing is needed.

---

## TEST 4 — Recovery System Data Source Investigation

### Dashboard Observations (from browser)

| Element                | Value                                                         | Implication                    |
| ---------------------- | ------------------------------------------------------------- | ------------------------------ |
| "Start Workout" button | Links to `/workouts` (list page)                              | Not an active workout session  |
| Weekly workouts        | 0                                                             | No completed workouts recorded |
| Volume                 | 0 kg lifted                                                   | No exercise data recorded      |
| PRs                    | 0 all time                                                    | No performance data            |
| Streak                 | 0 days                                                        | No workout streak              |
| Recovery Status card   | "No recovery data yet — Complete a workout to track recovery" | Fatigue table is empty         |
| Weekly calendar        | Mon-Sun, no workout dots                                      | No completed workouts          |

### Workout Builder Observations (from browser)

The workout builder at `/workout-builder/:id` shows:

- Exercise list with sets/reps/rest
- "Add Exercise", "Move up/down", "Remove" buttons
- **NO "Start Workout" or "Begin Session" button**

The "Start Workout" button on the generated workout preview page actually **saves the workout and redirects to My Workouts** — it does NOT start an active workout session.

### Source Code Investigation

#### A. Fatigue Write Mechanism EXISTS

**File:** `server/routes/solo.ts` (Lines 399-566)
**Endpoint:** `POST /api/solo/sessions/:sessionId/complete`

When this endpoint is called, it:

1. Calculates fatigue per muscle group (lines 425-472) using formula: `Math.min(100, (weight × sets × avgReps × 0.7) / 1.4)`
2. Writes to `userMuscleFatigue` table (lines 474-514) with fatigueLevel, lastTrainedAt, estimatedFullRecoveryAt
3. Writes to `userMuscleVolume` table (lines 516-554) for volume tracking
4. Writes to `workoutRecoveryLog` table (lines 556-562)

#### B. Workout Execution Page EXISTS

**File:** `client/src/pages/WorkoutExecution.tsx`

This is a complete active workout UI with:

- Set-by-set logging with weight and rep tracking
- "Complete Set" buttons
- Completion screen with workout stats
- "Finish & Save Workout" button

**On completion:** Calls `PUT /api/workout-assignments/:id/complete`

#### C. THE CRITICAL DISCONNECT

**File:** `server/routes.ts` (Lines 1538-1633)
**Endpoint:** `PUT /api/workout-assignments/:id/complete`

This endpoint:

- Awards XP and updates gamification (lines 1568-1611)
- Updates `workoutAssignments` status to 'completed'
- **DOES NOT call fatigue/recovery update code**

#### D. Two Disconnected Completion Flows

| Flow                               | Endpoint                                      | Gamification | Fatigue | Volume  | Used By            |
| ---------------------------------- | --------------------------------------------- | ------------ | ------- | ------- | ------------------ |
| **Main UI (WorkoutExecution.tsx)** | `PUT /api/workout-assignments/:id/complete`   | YES          | **NO**  | **NO**  | The actual UI flow |
| **Solo Sessions (unused)**         | `POST /api/solo/sessions/:sessionId/complete` | YES          | **YES** | **YES** | Nothing in the UI  |

The fatigue calculation code is fully implemented and correct, but the endpoint that the actual workout execution UI calls (`workout-assignments/complete`) **never triggers it**.

#### E. Navigation Path to WorkoutExecution.tsx

While `WorkoutExecution.tsx` exists as a component, the workout builder has no "Start Workout" button to reach it. The Dashboard "Start Workout" links to `/workouts` (the list). The path to actually execute a workout may be unreachable from the current UI.

#### F. Schema Reference

**File:** `shared/schema.ts` (Lines 898-920)

```
userMuscleFatigue table:
- fatigueLevel (0-100)
- lastTrainedAt (timestamp)
- estimatedFullRecoveryAt (calculated)
- volumeLastSession, setsLastSession
- avgRecoveryHours (default by muscle group)
```

### TEST 4 VERDICT: Architectural Disconnect — Recovery System Has No Data Source

**The recovery/fatigue system is fully implemented but has NO functional data pipeline.**

The fatigue calculation code exists → the database schema exists → the recovery display works → but **nothing in the user-facing workflow ever writes fatigue data**.

### Features Dependent on Workout Completion Data

| Feature                        | Current State                          | Root Cause                                 |
| ------------------------------ | -------------------------------------- | ------------------------------------------ |
| Recovery fatigue levels        | Always 100% recovered, "Never" trained | `userMuscleFatigue` table is empty         |
| Dashboard "This Week" workouts | Always 0                               | No completed workout records               |
| Dashboard volume (kg lifted)   | Always 0                               | No exercise volume data                    |
| Dashboard PRs                  | Always 0                               | No performance records                     |
| Dashboard streak               | Always 0 days                          | No workout completion timestamps           |
| Weekly calendar dots           | None shown                             | No completed workouts to display           |
| Progress tracking              | Always empty                           | No data points to graph                    |
| Achievements                   | None earnable (beyond signup)          | No workout completions to trigger them     |
| AI Coach workout history       | No history to reference                | No completed workout records in DB         |
| Recovery recommendations       | Always "Rest Day"                      | No fatigue data to base recommendations on |

### What Would Fix It

The fix requires **bridging the two completion flows**. When `PUT /api/workout-assignments/:id/complete` is called (the flow that the actual UI uses), it must also:

1. Calculate muscle fatigue from the completed exercises
2. Write to `userMuscleFatigue` table
3. Write to `userMuscleVolume` table
4. Log to `workoutRecoveryLog`

Additionally, the workout builder needs a "Start Workout" button that navigates to the `WorkoutExecution.tsx` page, enabling the complete flow: Generate → Save → Start → Log Sets → Complete → Update Fatigue.

---

## Summary

| Test                         | Status                | Key Finding                                                                                                                     |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| TEST 1: AI Coach Real API    | **FIXED**             | Real Claude API calls with personalized, math-based responses. Conversation memory still broken.                                |
| TEST 2: Meal Planner Protein | **FIXED**             | 166g vs 163g target = +1.8% (within 5%). Calorie accuracy decreased to -10.4%.                                                  |
| TEST 3: Workout Rest Periods | **STILL BROKEN**      | All exercises still 60s rest. Prompt changes insufficient — need schema-level or post-processing fix.                           |
| TEST 4: Recovery System      | **ARCHITECTURAL GAP** | Fatigue code exists but is disconnected from the UI workout completion flow. 10+ features depend on data that is never written. |

### Priority Recommendations

1. **HIGH — Workout Rest Periods (Test 3):** Add `restSeconds` description to the Zod schema for each exercise, or apply post-processing after AI generation to set rest based on exercise type + goal.

2. **HIGH — Recovery Bridge (Test 4):** Add fatigue calculation to `PUT /api/workout-assignments/:id/complete` endpoint. This single change would unlock: recovery tracking, dashboard stats, progress graphs, achievements, and AI Coach workout context.

3. **MEDIUM — Conversation Memory (Test 1):** Investigate why the chat endpoint is not passing full conversation history to `generateText`. Check if messages are saved to DB between requests and if the full history is retrieved.

4. **LOW — Calorie Accuracy (Test 2):** Protein accuracy improved but calorie total dropped. Consider adding a secondary constraint: "Total calories MUST be within 10% of target."

5. **MEDIUM — Start Workout Button (Test 4):** Add a "Start Workout" button to the workout builder page that navigates to `WorkoutExecution.tsx`. Currently there is no UI path from saved workouts to active workout execution.

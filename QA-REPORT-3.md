# QA-REPORT-3: GymGurus Deep QA & Product Intelligence Test

**Date:** 2026-02-26
**Tester:** Claude Code (Automated)
**Environment:** Production — https://gym-gurus-production.up.railway.app
**Test Account:** test@test.com / Testtest1 (Ronin AI — solo_ai/active)
**Browser:** Playwright Chromium (1280×900 desktop + 375×812 mobile)

---

## Section A — Bug Report (Prioritised)

### CRITICAL Bugs

| #   | Page              | Bug                                   | Steps to Reproduce                                                                                                  | Expected                                                                   | Actual                                                                                                                                            |
| --- | ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Generate → Save   | **Saved workout loses all exercises** | 1. Generate Workout (Push Day, 4 exercises) 2. Click "Save to My Workouts" 3. Open saved workout in Workout Builder | Workout builder shows the 4 AI-generated exercises                         | "No exercises added yet — Total Exercises: 0". Metadata (title, duration, category) saved but exercises array is empty                            |
| A2  | Nutrition Planner | **Macro totals all show 0g / blank**  | 1. Open Nutrition Planner 2. Set goals 3. Click "Generate Meal Plan"                                                | Daily Totals & per-meal macros populated (protein/carbs/fat grams)         | Daily Totals: "0g protein, 0g carbs, 0g fat". Per-meal macros: "g protein g carbs g fat" (no numbers). Per-meal kcal totals also blank            |
| A3  | Calculators       | **Save Result 500 error**             | 1. Open any calculator (e.g. BMI) 2. Click "Save Result"                                                            | Result saved, shown in history                                             | Toast: "Save failed — 500: Failed to save calculator result". `/api/calculator-results` and `/api/calculator-results/{type}` return server errors |
| A4  | AI Coach          | **No user profile context**           | 1. Open AI Coach 2. Ask "What do you know about my fitness profile?"                                                | AI references user weight (81.6kg), height (180cm), goals, workout history | AI gives completely generic advice with no awareness of stored profile data                                                                       |

### HIGH Bugs

| #   | Page        | Bug                                                    | Steps to Reproduce                                                               | Expected                               | Actual                                                                                                                                      |
| --- | ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A5  | Dashboard   | **"My Progress" quick link goes to wrong URL**         | 1. Open Dashboard 2. Click "My Progress" card in quick links                     | Navigates to `/progress`               | Navigates to `/solo/achievements`. The card is labelled "My Progress" with subtitle "View achievements" but the URL is `/solo/achievements` |
| A6  | Dashboard   | **"Your Progress" → "View All" links to achievements** | 1. Open Dashboard 2. Scroll to "Your Progress" widget 3. Click "View All"        | Navigates to `/progress`               | Navigates to `/solo/achievements`                                                                                                           |
| A7  | Dashboard   | **Weekly calendar shows day numbers instead of dates** | 1. Open Dashboard 2. Look at "This Week" calendar widget                         | Shows actual dates (Mon 23, Tue 24, …) | Shows generic day numbers: Mon 1, Tue 2, Wed 3, Thu 4, Fri 5, Sat 6, Sun 7                                                                  |
| A8  | Calculators | **Profile weight/height not pre-filled**               | 1. Settings → Profile shows Weight: 81.6kg, Height: 180cm 2. Open BMI Calculator | Sliders default to 81.6kg / 180cm      | Sliders default to 70kg / 170cm (generic defaults)                                                                                          |

### MEDIUM Bugs

| #   | Page              | Bug                                                  | Steps to Reproduce           | Expected                                                             | Actual                                                                                    |
| --- | ----------------- | ---------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A9  | Calculators       | **Favorites API errors on load**                     | 1. Open Calculators hub page | Loads cleanly                                                        | Console error: "Failed to load resource" on `/api/calculator-results` (returned 500)      |
| A10 | All Pages         | **apple-mobile-web-app-capable deprecation warning** | Navigate to any page         | No console warnings                                                  | Warning: `<meta name="apple-mobile-web-app-capable">` is deprecated                       |
| A11 | Settings → Plan   | **Plan name shows internal tier ID**                 | 1. Settings → Plan tab       | Shows friendly name like "Ronin AI"                                  | Shows raw `solo_ai` as plan name                                                          |
| A12 | Dashboard         | **AI Coach Suggestion is generic/static**            | 1. Open Dashboard            | Personalized suggestion based on workout history, recovery, or goals | Static text: "Keep up the great work! Consistency is key to reaching your fitness goals." |
| A13 | Nutrition Planner | **Defaults don't reflect user profile**              | 1. Open Nutrition Planner    | Calories/protein pre-calculated from profile weight/goal             | Generic defaults: 2200 cal, 160g protein, no goal selected                                |

### LOW Bugs

| #   | Page     | Bug                                                   | Steps to Reproduce    | Expected                               | Actual                                                                                                                                                |
| --- | -------- | ----------------------------------------------------- | --------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A14 | Recovery | **Discrepancy: 15 vs 10 muscle groups**               | 1. Open Recovery page | Shows all 15 tracked muscle groups     | Shows only 10 (Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Abs). Missing: Lats, Forearms, Traps, Obliques, Lower Back |
| A15 | Recovery | **Summary says "15 Recovered" but only 10 displayed** | 1. Open Recovery page | Summary count matches displayed groups | Summary: "15 Recovered, 0 Recovering, 0 Fatigued" but only 10 muscle group cards visible                                                              |

---

## Section B — Feature Test Matrix

| Page                    | Feature                    | Status  | Notes                                                                                                                                |
| ----------------------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Dashboard**           | Welcome message            | PASS    | "Welcome back, test!" with personalised name                                                                                         |
|                         | Today's Workout card       | PASS    | Shows "Push Day", 4 exercises, ~45 min, muscle tags                                                                                  |
|                         | Start Workout link         | PASS    | Links to /workouts                                                                                                                   |
|                         | Quick links (4 cards)      | PARTIAL | AI Coach, Generate, Recovery link correctly. "My Progress" links to /solo/achievements (BUG A5)                                      |
|                         | AI Coach Suggestion widget | PARTIAL | Renders but content is static/generic (BUG A12)                                                                                      |
|                         | Stats row (4 metrics)      | PASS    | 0 workouts, 0 kg, 0 PRs, 0 streak (correct for new account)                                                                          |
|                         | Your Progress widget       | PASS    | Level 1, 0 Day Streak, Newcomer, 0/50 XP                                                                                             |
|                         | Recovery Status widget     | PASS    | "No recovery data yet"                                                                                                               |
|                         | This Week calendar         | FAIL    | Shows numbers 1-7 instead of actual dates (BUG A7)                                                                                   |
|                         | Mobile layout (375px)      | PASS    | Sidebar hidden, content stacks, 2-column quick links                                                                                 |
| **AI Coach**            | Chat interface             | PASS    | Text input, send button, quick topic buttons                                                                                         |
|                         | AI response                | PASS    | Returns real AI responses (Anthropic API connected)                                                                                  |
|                         | Usage counter              | PASS    | Shows "998/999 today" (solo_ai tier working)                                                                                         |
|                         | Quick topic buttons        | PASS    | Auto-send predefined messages                                                                                                        |
|                         | Empty message rejection    | PASS    | Cannot send empty messages                                                                                                           |
|                         | Profile context            | FAIL    | AI has no awareness of user profile data (BUG A4)                                                                                    |
| **Generate Workout**    | Form fields (8)            | PASS    | Focus, Goal, Style, Duration, Equipment, Difficulty, Warm-up, Cool-down                                                              |
|                         | AI generation              | PASS    | Returns structured workout with warm-up, exercises, cool-down, pro tips                                                              |
|                         | Regenerate button          | PASS    | Present in output                                                                                                                    |
|                         | Start Workout button       | PASS    | Present in output                                                                                                                    |
|                         | Save to My Workouts        | PARTIAL | Saves metadata but exercises are empty (BUG A1)                                                                                      |
| **Nutrition Planner**   | Form fields (7)            | PASS    | Goal, Calories, Protein, Meals/day, Restrictions (8 options), Budget, Cooking Skill                                                  |
|                         | AI meal plan generation    | PASS    | Returns 4 meals with food items, times, kcal per item                                                                                |
|                         | Macro totals               | FAIL    | All show 0g/blank (BUG A2)                                                                                                           |
|                         | Per-meal macros            | FAIL    | Show "g protein g carbs g fat" without numbers (BUG A2)                                                                              |
|                         | Regenerate button          | PASS    | Present in output                                                                                                                    |
| **My Workouts**         | Workout list               | PASS    | Shows saved workouts with title, difficulty, duration, category                                                                      |
|                         | Search bar                 | PASS    | Text input present                                                                                                                   |
|                         | Generate with AI button    | PASS    | Links to /solo/generate                                                                                                              |
|                         | Workout builder            | PARTIAL | Opens but shows 0 exercises (BUG A1)                                                                                                 |
|                         | Add Exercise button        | PASS    | Present in builder                                                                                                                   |
|                         | Breadcrumb navigation      | PASS    | Dashboard > My Workouts > Workout Name                                                                                               |
| **My Progress**         | Empty state                | PASS    | CTA: "Complete your first workout to start tracking progress!"                                                                       |
|                         | Generate a Workout button  | PASS    | Present in empty state                                                                                                               |
| **Recovery**            | Overall recovery %         | PASS    | Shows 100% for fresh account                                                                                                         |
|                         | Muscle group cards (10)    | PASS    | Each shows name, status, fatigue %, last trained date                                                                                |
|                         | Muscle detail panel        | PASS    | Clicking shows "Fatigue level: 0%, Last trained: Never"                                                                              |
|                         | Recovery tips (4)          | PASS    | Sleep, Hydration, Active Recovery, Protein Intake                                                                                    |
|                         | Today's Recommendation     | PASS    | "Rest Day" (correct for no workout history)                                                                                          |
|                         | Summary stats              | PARTIAL | Shows 15 Recovered but only 10 muscle groups displayed (BUG A15)                                                                     |
| **Achievements**        | Empty state                | PASS    | "No achievements found" with clear messaging                                                                                         |
|                         | Hidden stats when empty    | PASS    | "0/0 Unlocked" is hidden (QA-2 fix confirmed)                                                                                        |
|                         | Category tabs (5)          | PASS    | All, Workouts, Strength, Consistency, Social                                                                                         |
|                         | Rarity guide               | PASS    | Common, Uncommon, Rare, Epic, Legendary                                                                                              |
| **Calculators**         | Hub page (12 calculators)  | PASS    | TDEE, BMI, Body Fat, Macros, 1RM, Plates, Strength Standards, VO2 Max, Heart Rate Zones, Calories Burned, Ideal Weight, Water Intake |
|                         | Stats row                  | PARTIAL | Shows 0/0/0 but backed by broken API (BUG A9)                                                                                        |
|                         | BMI computation            | PASS    | 70kg/170cm = 24.2 BMI "Normal Weight" — mathematically correct                                                                       |
|                         | TDEE computation           | PASS    | Produces BMR, TDEE, target calories, macro breakdown                                                                                 |
|                         | Save Result                | FAIL    | 500 error (BUG A3)                                                                                                                   |
|                         | Add to Favorites           | FAIL    | API errors (BUG A9)                                                                                                                  |
|                         | Slider bounds              | PASS    | Weight: 40-200kg, Height: 140-220cm — prevents extreme values                                                                        |
| **Schedule**            | Week view                  | PASS    | Shows Mon-Sun with dates, "No appointments"                                                                                          |
|                         | Day/Week/Month tabs        | PASS    | All three tabs present                                                                                                               |
|                         | Navigation arrows          | PASS    | Previous/next week navigation                                                                                                        |
|                         | Current week               | PASS    | Feb 23 - Mar 1, 2026                                                                                                                 |
| **Settings — Profile**  | Body Stats                 | PASS    | Weight: 81.6kg, Height: 180cm, Body Fat: empty                                                                                       |
|                         | Unit toggle                | PASS    | Metric (kg, cm) / Imperial (lbs, ft/in)                                                                                              |
|                         | Profile info               | PASS    | Name: test test, Email: test@test.com, Role: solo                                                                                    |
|                         | Photo upload               | PASS    | Click-to-change UI present                                                                                                           |
|                         | Save buttons               | PASS    | "Save Body Stats" and "Save Changes"                                                                                                 |
| **Settings — Security** | Password change form       | PASS    | Current/New/Confirm fields + Update button                                                                                           |
| **Settings — Plan**     | Current plan display       | PARTIAL | Shows "solo_ai" instead of friendly name (BUG A11)                                                                                   |
|                         | Account stats              | PASS    | 0 days, 1 Workout Plan                                                                                                               |
|                         | Manage Subscription        | PASS    | Button present                                                                                                                       |
| **Settings — Alerts**   | Email notifications (3)    | PASS    | Workout reminders, Weekly report, Features/announcements                                                                             |
|                         | In-app notifications (3)   | PASS    | Workout reminders, Achievements, System updates                                                                                      |
|                         | Toggle switches            | PASS    | All functional                                                                                                                       |
| **Settings — Danger**   | Delete account             | PASS    | Warning list, "Plan tab" reference (QA-2 fix confirmed), Delete button                                                               |

---

## Section C — Data Flow Analysis

### Profile Data → Feature Usage Matrix

| Data Point                 | Stored In                | AI Coach               | Generate Workout    | Nutrition                    | Calculators                   | Recovery |
| -------------------------- | ------------------------ | ---------------------- | ------------------- | ---------------------------- | ----------------------------- | -------- |
| **Weight (81.6 kg)**       | Settings Profile         | NOT USED               | Not visible in form | NOT USED (defaults 2200 cal) | NOT USED (defaults 70-75kg)   | N/A      |
| **Height (180 cm)**        | Settings Profile         | NOT USED               | Not visible in form | NOT USED                     | NOT USED (defaults 170-175cm) | N/A      |
| **Body Fat %**             | Settings Profile (empty) | NOT USED               | Not visible in form | NOT USED                     | NOT USED                      | N/A      |
| **Name (test)**            | Settings Profile         | NOT USED               | N/A                 | N/A                          | N/A                           | N/A      |
| **Role (solo)**            | Users table              | Determines UI/nav      | Determines UI/nav   | Determines UI/nav            | N/A                           | N/A      |
| **Subscription (solo_ai)** | Users table              | Sets daily limit (999) | N/A                 | N/A                          | N/A                           | N/A      |

### Key Data Flow Gaps

1. **Profile → AI Coach**: The AI Coach has ZERO context about the user. It doesn't know weight, height, goals, workout history, or any profile data. This makes every AI interaction generic.
2. **Profile → Calculators**: Calculators use hardcoded defaults (70kg/170cm for BMI, 75kg/175cm for TDEE) instead of pulling from the user's saved body stats.
3. **Profile → Nutrition Planner**: Target calories (2200) and protein (160g) are generic defaults, not calculated from user's weight/goal.
4. **Workout Generation → Workout Save**: AI generates exercises (name, sets, reps, rest, muscle group) but the save action only persists the workout shell (title, duration, category, difficulty) — the exercises array is lost.
5. **Workout Completion → Recovery**: The recovery system is designed to receive fatigue data after workouts, but the workout completion flow doesn't trigger fatigue updates. The integration is incomplete.
6. **Workout Completion → Dashboard Stats**: All dashboard stats show 0 because there's no completed workout data flowing through.

---

## Section D — Feature Interconnection Report

### Interconnection Matrix

| Feature Pair                   | Connected? | Quality  | Notes                                                                                              |
| ------------------------------ | ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| Dashboard → AI Coach           | YES        | Good     | Quick link works, suggestion links to coach                                                        |
| Dashboard → Generate Workout   | YES        | Good     | Quick link and Today's Workout card work                                                           |
| Dashboard → My Progress        | BROKEN     | Bug      | Quick link goes to /solo/achievements instead of /progress (A5)                                    |
| Dashboard → Recovery           | YES        | Good     | Widget shows status, "Full View" links correctly                                                   |
| Dashboard → Workouts           | YES        | Good     | "Start Workout" links to /workouts                                                                 |
| Generate Workout → My Workouts | BROKEN     | Critical | Save works but exercises are lost (A1)                                                             |
| Generate Workout → Recovery    | MISSING    | N/A      | Generated workout doesn't inform recovery predictions                                              |
| AI Coach → Profile Data        | MISSING    | Critical | AI has no user context whatsoever (A4)                                                             |
| Calculators → Profile          | MISSING    | Major    | Profile weight/height not pre-filled (A8)                                                          |
| Nutrition → Profile            | MISSING    | Major    | Defaults not derived from profile (A13)                                                            |
| Workout Completion → Recovery  | MISSING    | Major    | Completing workouts doesn't update muscle fatigue                                                  |
| Workout Completion → Stats     | MISSING    | Major    | No completed workouts means all stats are 0                                                        |
| Recovery → Generate Workout    | MISSING    | Minor    | Recovery page says "Rest Day" but Generate page doesn't use recovery data to suggest muscle groups |
| Achievements → Workouts        | DESIGNED   | N/A      | Achievement system exists but no achievements are defined yet                                      |
| Settings → Theme               | YES        | Good     | Role-based theming applies correctly                                                               |

### Data Island Summary

The app has several **data islands** — features that work in isolation but don't communicate:

1. **Profile/Settings** → stores user data but nothing reads it
2. **AI Coach** → operates without any user context
3. **Calculators** → use generic defaults, can't save results
4. **Nutrition Planner** → generates plans but doesn't know user's body stats
5. **Recovery** → has a sophisticated model but no workout data feeds into it

---

## Section E — Recovery System Analysis

### Architecture

The recovery system spans 6 files:

- **Frontend**: `client/src/pages/solo/Recovery.tsx` (427 lines)
- **API**: `server/routes/recovery.ts` (412 lines)
- **Data**: `client/src/lib/constants/muscleGroups.ts` (202 lines)
- **Hook**: `client/src/hooks/useRecovery.ts` (298 lines)
- **Schema**: `shared/schema.ts` — tables: `userMuscleFatigue`, `userMuscleVolume`, `workoutRecoveryLog`

### Q1: How many muscle groups are tracked?

**15 in the schema** (chest, back, shoulders, biceps, triceps, quads, hamstrings, glutes, calves, abs, lats, forearms, traps, obliques, lower_back). **Only 10 displayed** in the Recovery page UI.

### Q2: What is the fatigue decay formula?

**Linear decay:**

```
recoveryProgress = MIN(1, hoursSinceTraining / recoveryHours)
currentFatigue = MAX(0, fatigueLevel × (1 - recoveryProgress))
```

Fatigue decreases linearly to 0 over the full recovery period.

### Q3: How is fatigue calculated from workout data?

```
baseFatigue = muscleWeight × sets × reps × intensity
normalizedFatigue = MIN(100, baseFatigue / 1.4)
```

Where: muscleWeight = 1.0 (primary), 0.5 (secondary), 0.25 (tertiary); intensity defaults to 0.7.

### Q4: Does the recovery system pull from completed workout logs?

**Designed to, but NOT wired up.** The workout completion endpoint (`/api/solo/workout-session/complete`) calculates volume and updates gamification, but does NOT call the recovery fatigue update endpoint (`/api/recovery/fatigue/update`). This is the critical integration gap.

### Q5: What's the time-based recovery model?

Per-muscle recovery times:
| Muscle Group | Recovery Time |
|-------------|--------------|
| Quads, Hamstrings, Glutes | 72 hours |
| Chest, Back, Shoulders, Calves, Lower Back, Traps, Lats | 48 hours |
| Biceps, Triceps | 36 hours |
| Forearms, Abs, Obliques | 24 hours |

### Q6: Are recovery tips hardcoded or dynamic?

**Hardcoded.** Four static tips in the React component: Sleep Quality, Hydration, Active Recovery, Protein Intake. No personalization based on user data.

### Q7: Does "Today's Recommendation" use real data?

**Yes**, it queries fatigue levels and classifies muscles as recovered (≥80% recovery progress), recovering, or fatigued. It suggests workout type (push/pull/legs/full_body/rest) based on which muscle groups are ready. Currently shows "Rest Day" because no fatigue data exists.

### Q8: Summary assessment

The recovery system is **well-architected but under-connected**. The database schema, fatigue formula, time-based decay model, and recommendation logic are all sound. The critical gap is that workout completions don't trigger fatigue updates, so the system stays at "100% recovered, Rest Day" permanently unless fatigue is manually posted via API.

---

## Section F — Edge Case & Stress Test Results

| Test                      | Page           | Input                                   | Expected                   | Result                                                                                            |
| ------------------------- | -------------- | --------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| Empty AI message          | AI Coach       | Send empty text                         | Rejected                   | PASS — cannot send empty                                                                          |
| Extreme slider values     | BMI Calculator | Weight: 40kg (min), Height: 140cm (min) | Calculates edge BMI        | PASS — sliders bounded by min/max, React state prevents direct DOM manipulation                   |
| Calculator max values     | BMI Calculator | Weight: 200kg, Height: 220cm            | Valid BMI                  | PASS — sliders allow range                                                                        |
| Save without data         | Calculators    | Click Save Result                       | Error or save              | FAIL — 500 error (API broken regardless of input)                                                 |
| Mobile viewport (375×812) | Dashboard      | Resize to iPhone                        | Responsive layout          | PASS — sidebar hidden, content stacks, 2-col quick links, all readable                            |
| Mobile viewport           | Navigation     | Toggle sidebar                          | Opens mobile nav           | PASS — hamburger menu visible, sidebar slides in                                                  |
| No workout history        | My Progress    | Fresh account                           | Empty state with CTA       | PASS — "Complete your first workout" message with Generate button                                 |
| No workout history        | Recovery       | Fresh account                           | All muscles 100% recovered | PASS — 100% recovery, all "Never" trained, "Rest Day" recommendation                              |
| No achievements           | Achievements   | Fresh account                           | Empty state, stats hidden  | PASS — "No achievements found", stats row hidden (QA-2 fix)                                       |
| No appointments           | Schedule       | Fresh account                           | Empty week                 | PASS — All 7 days show "No appointments"                                                          |
| Rapid tab switching       | Settings       | Click all 5 tabs quickly                | No errors/crashes          | PASS — all tabs render instantly                                                                  |
| XSS in name field         | Settings       | Inject `<script>alert(1)</script>`      | Sanitized                  | NOT TESTED — requires form submission (avoided for safety)                                        |
| Console errors            | All pages      | Check console on every page             | Zero errors                | PARTIAL — 0 errors on most pages; Calculator pages have 500 errors from `/api/calculator-results` |
| Zero-state dashboard      | Dashboard      | No workout data                         | All stats show 0           | PASS — 0 workouts, 0 kg, 0 PRs, 0 streak                                                          |

---

## Section G — Product Recommendations

### Priority 1: Fix Critical Data Loss Bugs

1. **Fix workout exercise persistence (A1)**: When saving AI-generated workouts, ensure the exercises array is included in the POST payload and persisted to the database. This is the #1 blocker for the entire workout flow.
2. **Fix nutrition macro parsing (A2)**: The AI returns meal data but the frontend macro extraction logic fails. Debug the JSON response parsing to extract protein/carbs/fat values.
3. **Fix calculator result saving (A3)**: The `/api/calculator-results` endpoint returns 500. Likely a missing database table or schema mismatch.

### Priority 2: Wire Up Data Flow

4. **Pass profile data to AI Coach (A4)**: Include user weight, height, goals, and recent workout history in the AI system prompt. This would transform the AI from a generic chatbot to a personalised coach.
5. **Pre-fill calculators from profile (A8)**: Read user's saved weight/height from the profile and use them as calculator defaults instead of generic 70kg/170cm.
6. **Connect workout completion to recovery (E)**: When a workout session is completed, automatically calculate and POST fatigue data for the worked muscle groups. This would activate the entire recovery system.
7. **Derive nutrition defaults from profile**: Calculate TDEE from profile weight/height/activity level and use as the default target calories.

### Priority 3: Fix Navigation & Display

8. **Fix "My Progress" quick link URL (A5/A6)**: Change `/solo/achievements` to `/progress` in the dashboard quick links and "View All" link.
9. **Fix weekly calendar dates (A7)**: Show actual calendar dates (Feb 23, 24, 25…) instead of generic day numbers (1, 2, 3…).
10. **Show friendly plan name (A11)**: Map `solo_ai` → "Ronin AI" in the Settings Plan tab.

### Priority 4: Polish & Enhancement

11. **Dynamic AI Coach Suggestion**: Replace the static dashboard suggestion with a real AI-generated tip based on recovery status, last workout, or streak.
12. **Show all 15 muscle groups in Recovery UI**: The schema tracks 15 muscles but the UI only shows 10. Add the missing 5 (Lats, Forearms, Traps, Obliques, Lower Back).
13. **Define seed achievements**: The achievements system is built but has 0 defined achievements. Add starter achievements (First Workout, 3-Day Streak, First PR, etc.).
14. **Recovery → Generate Workout integration**: When recovery says certain muscles are ready, pre-select those in the workout generator.

---

## Test Execution Summary

| Metric                  | Value                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Pages tested**        | 12 (Dashboard, AI Coach, Generate, Nutrition, Workouts, Builder, Progress, Recovery, Achievements, Calculators, Schedule, Settings) |
| **Features tested**     | 65+ individual elements                                                                                                             |
| **Bugs found**          | 15 (4 Critical, 4 High, 5 Medium, 2 Low)                                                                                            |
| **Console errors**      | 8 total (all from calculator-results API 500)                                                                                       |
| **Console warnings**    | apple-mobile-web-app-capable on every page                                                                                          |
| **QA-2 fixes verified** | 3/3 (web-vitals ✓, achievements stats ✓, danger tab copy ✓)                                                                         |
| **Mobile responsive**   | PASS                                                                                                                                |
| **Data flow gaps**      | 6 critical disconnections identified                                                                                                |
| **Recovery system**     | Well-designed but disconnected from workout data                                                                                    |

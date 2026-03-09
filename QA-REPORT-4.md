# QA Report 4 — Production Verification

**Date:** 2026-02-26
**Environment:** https://gym-gurus-production.up.railway.app
**Test Account:** test@test.com / Ronin (solo) role
**Tested By:** Playwright MCP (automated)

---

## Section A: QA-REPORT-3 Bug Verification (A1-A15)

| Bug | Description                                      | Priority | Status       | Notes                                                                                                                                                        |
| --- | ------------------------------------------------ | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Saved workout loses exercises                    | Critical | FIXED        | Generated Push-Strength workout with 4 exercises, saved, opened in workout builder — all 4 exercises present with sets/reps/rest                             |
| A2  | Nutrition Planner macro totals show 0g/blank     | Critical | FIXED        | Daily totals: 2802 kcal, 212g protein, 280g carbs, 92g fat. Per-meal macros display correctly (53g P / 70g C / 23g F). Per-food protein shown (e.g. "16g P") |
| A3  | Calculator Save Result returns 500               | Critical | FIXED        | BMI "Save Result" button works — shows "Result saved!" notification, entry appears in Recent Results with BMI value, category, health risk                   |
| A4  | AI Coach has no user profile context             | High     | STILL BROKEN | Asked "What do you know about me?" — got generic fitness tips. No mention of weight (81.6kg), height (180cm), or any profile data                            |
| A5  | Dashboard "My Progress" links to /achievements   | High     | FIXED        | QuickActionCard links to `/progress` with description "Track your fitness journey"                                                                           |
| A6  | Gamification "View All" links to /achievements   | High     | FIXED        | "View All" link now points to `/progress`                                                                                                                    |
| A7  | Weekly calendar shows "Mon 1, Tue 2..."          | Medium   | FIXED        | Shows real dates: Mon 23, Tue 24, Wed 25, Thu 26, Fri 27, Sat 28, Sun 1                                                                                      |
| A8  | Calculator inputs not pre-filled from profile    | Medium   | STILL BROKEN | BMI calculator shows Weight: 70kg, Height: 170cm (defaults). Profile has 81.6kg / 180cm. Waited 5s for async load — no change                                |
| A9  | Calculator favorites API returns 404             | Medium   | FIXED        | "Add to favorites" button works — toggles to "Remove from favorites" without errors                                                                          |
| A10 | Deprecated apple-mobile-web-app-capable meta tag | Low      | STILL BROKEN | Console warning still present on every page load                                                                                                             |
| A11 | Settings Plan tab shows raw "solo_ai"            | Medium   | FIXED        | Plan tab displays "Ronin AI" with "Active subscription"                                                                                                      |
| A12 | Dashboard AI suggestion is static/generic        | Medium   | FIXED        | Shows contextual message: "Ready to start your fitness journey? Generate your first AI-powered workout!" (based on 0 completed workouts)                     |
| A13 | Nutrition planner defaults not from profile      | Medium   | FIXED        | Target Calories: 2802, Protein Target: 163g (derived from 81.6kg / 180cm profile, not default 2200)                                                          |
| A14 | Recovery page shows only 10 muscle groups        | High     | FIXED        | Shows all 15 muscle groups with fatigue %, recovery status, last trained date                                                                                |
| A15 | Missing forearms/obliques/traps/lats/lower back  | High     | FIXED        | All 5 previously missing groups now visible: Forearms, Obliques, Lower Back, Traps, Lats                                                                     |

**Summary:** 12/15 FIXED, 3/15 STILL BROKEN (A4, A8, A10)

---

## Section B: New Behavior Tests

| #   | Test Scenario                                                         | Result | Details                                                                                                                          |
| --- | --------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Generate workout > Save > Open in My Workouts > exercises present     | PASS   | 4 exercises (Barbell Bench Press, Incline Barbell Press, Overhead Press, Skull Crushers) all persist with correct sets/reps/rest |
| 2   | BMI calculator > weight/height pre-filled from profile (81.6kg/180cm) | FAIL   | Shows default 70kg/170cm. Profile data not loaded into calculator sliders                                                        |
| 3   | AI Coach > "What do you know about me?" > references profile data     | FAIL   | Returns generic fitness tips without any profile context (weight, height, goals)                                                 |
| 4   | Nutrition Planner > calorie target derived from profile, not 2200     | PASS   | Shows 2802 kcal target and 163g protein target (calculated from profile)                                                         |
| 5   | Dashboard "My Progress" link > navigates to /progress                 | PASS   | Links to `/progress` with "Track your fitness journey" description                                                               |
| 6   | Dashboard weekly calendar > shows real dates (Feb 24, 25, 26...)      | PASS   | Mon 23, Tue 24, Wed 25, Thu 26, Fri 27, Sat 28, Sun 1                                                                            |
| 7   | Generate meal plan > macro totals show real numbers, not 0g           | PASS   | 2802 kcal, 212g protein, 280g carbs, 92g fat. Per-meal: 53g P, 70g C, 23g F. Prep times shown                                    |
| 8   | Settings > Plan tab > shows "Ronin AI" not "solo_ai"                  | PASS   | Displays "Ronin AI" with "Active subscription" status                                                                            |
| 9   | Dashboard suggestion > not generic "Keep up the great work"           | PASS   | Shows "Ready to start your fitness journey? Generate your first AI-powered workout!" (contextual for 0 workouts)                 |

**Summary:** 7/9 PASS, 2/9 FAIL (tests 2 and 3)

---

## Section C: Remaining Issues

### STILL BROKEN — A4: AI Coach Profile Context

- **Severity:** High
- **Observed:** AI Coach returns generic fitness tips regardless of user question
- **Expected:** Should reference user's weight (81.6kg), height (180cm), goals, workout history
- **Likely cause:** Backend AI service may not be injecting fitness profile into the system prompt on production, or the AI call is falling back to a generic response

### STILL BROKEN — A8: Calculator Pre-fill from Profile

- **Severity:** Medium
- **Observed:** BMI calculator sliders default to 70kg / 170cm
- **Expected:** Should pre-fill from fitness profile (81.6kg / 180cm)
- **Likely cause:** The `useFitnessProfile()` hook may not be wired into the calculator component, or the `useEffect` that applies profile values is not triggering

### STILL BROKEN — A10: Deprecated Meta Tag

- **Severity:** Low
- **Observed:** Console warning: `<meta name="apple-mobile-web-app-capable">` is deprecated
- **Expected:** Should use `<meta name="mobile-web-app-capable">` instead
- **Location:** `index.html` or equivalent HTML template

---

## Section D: Dashboard Observations

The dashboard now correctly shows:

- Today's Workout card (Push Day, 4 exercises, ~45 min, Chest/Shoulders/Triceps tags)
- Quick action cards with correct navigation links
- AI Coach Suggestion with contextual messaging
- Weekly calendar with real Feb 23-Mar 1 dates
- Stats cards (This Week, Volume, PRs, Streak)
- Gamification progress (Level 1, XP 0/50, Newcomer rank)
- Recovery status section
- "View All" links pointing to /progress

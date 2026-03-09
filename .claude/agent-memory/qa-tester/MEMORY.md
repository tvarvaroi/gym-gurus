# QA Tester Agent Memory — GymGurus

## Status as of 2026-02-27 (Session 13 — New Execution UI Audit)

### FIXED: Stats Pipeline (workoutSessions writes)

- Workout completion NOW writes to workoutSessions correctly
- Dashboard "This Week" counter updates after completion
- Weekly activity bar shows checkmark on workout day
- Progress page shows stats and history (not empty state)
- Schedule "Completed this month" counter updates
- AI Coach correctly identifies completed session by name and date

### FIXED: Volume Calculation (Session 13 confirmed correct)

- New workouts calculate volume accurately — verified 11,820 kg match
- Legacy data still shows inflated values (e.g., 9,127 kg AI Coach Workout from old sessions)
- New sessions are correct going forward

### FIXED: Workout Execution Page No Longer Crashes

- /workout-execution/:id loads and completes workouts without errors
- Tested with workout ID b552ac5a-681a-46f2-a6a5-1923ee146a4d (lower body)

### FIXED: Nutrition Planner 500 on Load

- GET /api/solo/meal-plans now returns 200

### FIXED: Recovery Muscle Names, AI Coach Grammar, today-workout 200, weekly bar grammar

- All confirmed still working in Session 13

## ACTIVE BUGS (New in Session 13 — New Execution UI)

### BUG-13-01: Rest Timer Hidden Behind Sticky Bottom Bar (CRITICAL)

- After completing a set, rest timer bar appears at bottom
- The bottom bar (z-index 30) overlaps and intercepts clicks on Skip/+30s
- Normal .click() fails: "flex-none h-16...z-30 intercepts pointer events"
- Workaround for automation: dispatchEvent JS injection
- Fix needed: raise z-index of rest timer, or hide bottom bar during rest period

### BUG-13-02: Bottom Bar Not Actually Sticky (HIGH)

- "Finish Workout" / "Exercises" bar is `position: static` — not fixed or sticky
- At 900px viewport, bar renders at Y=1023px (below fold) with ~300px dead space
- Fix needed: `position: fixed; bottom: 0` with padding compensation

### BUG-13-03: Mobile Layout Broken at 375px (CRITICAL — highest priority)

- Top bar (X, name, timer) hidden behind app header on narrow viewports
- Horizontal scrollbar present — content overflows
- Checkmark buttons clipped off right edge
- This is the primary use case (phone at gym rack) and it is broken

### BUG-13-04: Today's Workout Card Shows First, Not Most Recent (LOW)

- Card always shows first completed workout of the day, not the latest one

### BUG-13-05: AI Coach No Access to Exercise/Volume Details (MEDIUM)

- AI knows workout name, date, duration
- AI does NOT know exercises, sets, reps, weights, or volume
- Cannot give granular coaching or progressive overload suggestions

## Test Credentials

- URL: https://gym-gurus-production.up.railway.app
- Test user: test@test.com / Testtest1 (role: Ronin/solo)
- Login URL: /auth/login?role=solo (Ronin role pre-selected)
- Workout ID used in Session 13: b552ac5a-681a-46f2-a6a5-1923ee146a4d

## Execution Page Technical Notes (New UI, Session 13)

- Weight stepper step: 2.5kg for barbell exercises, 1kg for machine exercises (context-aware)
- All sets for current exercise shown simultaneously — good design
- Complete Set button: 48×48px touch target — passes requirement
- Complete Set button has CSS gradient animation — use force:true or JS dispatchEvent
- Navigation dots: color-coded (green=done, gold=active, grey=todo) — functional
- KG/LBS toggle: present, working
- Previous performance hints: ABSENT — no "Last: 80×8" indicator anywhere
- XP shown as brief animation on Save & Exit only, not displayed on summary screen
- Auto-fill: completing set N auto-fills same weight/reps into set N+1 — good feature

## Architecture Notes

- AI Coach daily limit counter: "XXX/999 today" visible in header
- Generate Workout recovery banner: accurate, reads live muscle fatigue from DB
- Generate Workout "Start Workout" button: saves workout and navigates to execution
- Schedule page: lists each completed session with timestamp in calendar cell
- Progress page: shows per-session volume correctly for new data

## Score History

- QA-09: 30.5/35 (87%) — different scale
- QA-10: 31/40 (77.5%) — stats pipeline broken, meal plan 500, minor display bugs
- QA-11: 36/40 (90.0%) — stats pipeline fixed, new today-workout 500 regression, volume inflated
- QA-12: targeted fix verification only (no full score)
- QA-13: 31/40 (77.5%) — volume fix confirmed; new UI has mobile/sticky/z-index bugs; TEST 5 scored 0/4

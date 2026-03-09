# QA Report — GymGurus Session 13

**Date:** 2026-02-27
**Tester:** Quinn (Autonomous QA Agent)
**App URL:** https://gym-gurus-production.up.railway.app
**Test Account:** test@test.com / Testtest1 (Ronin/solo role)
**Workout Used:** Intermediate Hypertrophy – Lower Body (Quads, Hamstrings, Glutes, Calves) — ID: b552ac5a-681a-46f2-a6a5-1923ee146a4d

---

## TEST 1 — Redesigned Workout Execution UI Audit

### Page Load

Navigated to /workouts, clicked Start on the lower body workout. The execution page loaded at `/workout-execution/b552ac5a-681a-46f2-a6a5-1923ee146a4d` without errors or crashes.

### UI Element Inventory

**Sticky top bar:**
Present. Contains:

- Exit button (X) on the left — aria-label "Exit workout"
- Workout name in center, truncated with ellipsis on narrow viewports: "Intermediate Hypertrophy – Lower Body (Quads, Hamstrings, Glute..."
- Live duration timer in gold on the right (e.g., "0:03", "1:39") — counts up correctly

**Progress bar / exercise counter:**
Present as a text line below the top bar: `Exercise 1 of 7 · Set 1 of 4`. Updates correctly as sets and exercises are completed. No visual progress bar (e.g., filled bar), just the text label.

**Exercise name and muscle group:**
Present. Exercise name is a large bold H2 heading ("Barbell Back Squat"). Muscle group and rest period shown below in smaller text: "Quads, Glutes, Hamstrings · Rest: 120s". Clean and readable.

**Set list (all sets shown for current exercise):**
Present. All sets for the current exercise are rendered simultaneously in a vertical list. Set 1 is highlighted in gold on the active set. Completed sets turn green with a filled checkmark. Future sets are dimmed. This is a strong design choice — the user can see the whole picture at once.

**Weight stepper buttons:**
Present. Format: `[-] [value] [+]`. The step size is context-aware:

- Barbell exercises: step = 2.5 kg (aria-label "Increase weight by 2.5 kg")
- Machine exercises: step = 1 kg (aria-label "Increase weight by 1 kg")
  This is a thoughtful improvement. Values can also be typed directly into the spinbutton.

**Rep stepper buttons:**
Present. Format: `[-] [value] [+]`, step = 1 rep. Working correctly.

**Large checkmark button per set:**
Present. Measured via getBoundingClientRect: 48×48 pixels exactly. The target is met. Button has a CSS gradient animation which causes instability in automated testing (requires force click), but visually looks good.

**Previous performance hint:**
ABSENT. There is no "Last: 80kg × 8" hint shown for any set. This is a missing feature noted below.

**Rest timer:**
Present as a floating bar at the bottom of the page when a set is completed. Contains: "Rest period" label, countdown, "+30s" button, and gold "Skip" button. The rest timer is NOT a full-screen overlay, which is correct.

**CRITICAL BUG — Rest timer hidden behind sticky bottom bar:**
When the rest timer appears, it renders at the bottom of the page. The sticky bottom bar (`z-30`) overlaps and intercepts pointer events to the "+30s" and "Skip" buttons. In Playwright, normal `.click()` on the Skip button throws: `<div class="flex-none h-16 flex items-center justify-between...z-30">…</div> intercepts pointer events`. Skip only works via `dispatchEvent` JS injection. In real mobile use, a user's tap on Skip may be intercepted by the "Finish Workout" button zone. This is a z-index/layout conflict.

**Sticky bottom bar:**
Present at the bottom with "Exercises" (icon + text) on the left and "Finish Workout" on the right. However, on a 900px viewport, the bar is below the fold — the page content does not fill the viewport height, leaving a large empty gap between the set list and the bottom bar. Users must scroll down to see "Finish Workout" despite the content fitting in a much smaller area. The bar is position `static`, not `fixed` or `sticky` — confirmed via computed style check.

**Exercise navigation dots:**
Present below the set list. Small colored dots (one per exercise) allow jumping between exercises. Completed exercises show a green dot, the current exercise shows a gold/yellow dot, incomplete exercises show grey dots. Functional and compact.

**KG / LBS toggle:**
Present, working. Two buttons at the top right of the exercise area.

### Mobile Layout at 375px

Tested by resizing viewport to 375×812.

**Issues found:**

1. The top bar (X, workout name, timer) is NOT visible at 375px — it is cut off or hidden behind the app header.
2. A horizontal scrollbar appears at the bottom — content overflows horizontally.
3. The checkmark buttons on the right side of each set row are partially clipped and not fully visible. The button itself is accessible (touch target exists) but the visual is poor.
4. Large empty white space below the set list.
5. The "Exercises" and "Finish Workout" bottom bar is visible at the very bottom but sits above the browser chrome at an awkward position.

### Overall Design Rating: 7/10

Strengths: Dark theme looks professional and gym-appropriate. All-sets-visible layout is excellent UX. Context-aware weight step increments show good attention to detail. Rest timer is non-blocking.

Weaknesses: Bottom bar is not actually sticky. Rest timer is obscured by the bottom bar (z-index bug). No previous performance hints. Poor mobile layout at 375px with horizontal overflow and hidden top bar. Empty dead space between content and bottom bar on desktop.

---

## TEST 2 — Complete a Full Workout (Fresh Data)

### Workout Completed

**Workout:** Intermediate Hypertrophy – Lower Body (7 exercises, ~24 sets total)

Note: The test plan specified 4 exercises with 3 sets each. The chosen workout had 7 exercises with varying set counts (3–4 sets each). The first 4 exercises in the plan were logged with the specified weights; the remaining 3 exercises were logged with reasonable values. This gives a larger dataset than the plan specifies but still validates the volume calculation.

### Actual Data Logged

| Exercise                    | Sets | Weights × Reps        |
| --------------------------- | ---- | --------------------- |
| Barbell Back Squat          | 4/4  | 80kg × 8, 8, 7, 8     |
| Romanian Deadlift (Barbell) | 4/4  | 50kg × 10, 10, 8, 10  |
| Leg Press (Machine)         | 3/3  | 30kg × 12, 12, 10     |
| Lying Leg Curl (Machine)    | 3/3  | 20kg × 15, 15, 15     |
| Cable Pull-Through          | 3/3  | 30kg × 12, 12, 12     |
| Leg Extension (Machine)     | 3/3  | 40kg × 12, 12, 12     |
| Seated Calf Raise (Machine) | 4/4  | 50kg × 15, 15, 15, 15 |

### Summary Screen Contents

**Duration:** 5:01
**Total Volume:** 11,820 kg
**Sets:** 24/24
**Est. kcal:** ~35

**Exercise breakdown shown:** Yes. Each exercise listed with set count and weights/reps per set. Format: "80kg x 8, 8, 7, 8". Clean and readable.

**Muscles Worked section:** Present. Lists: Quads/Glutes/Hamstrings, Hamstrings/Glutes, Quads/Glutes, Hamstrings, Glutes/Hamstrings, Quads, Calves (Soleus).

**PRs detected:** No PR section visible on the summary screen. No notification of personal records.

**XP earned:** Shown as "+105 XP" in a brief animation overlay on the "Save & Exit" button tap. Not shown as a permanent element on the summary screen — easy to miss.

**Save & Exit:** Works. Redirects to /workouts after 3s. Toast notification briefly appears but disappears quickly.

### Volume Calculation Verification

**Manual calculation:**

- Barbell Back Squat: (80×8) + (80×8) + (80×7) + (80×8) = 640 + 640 + 560 + 640 = **2,480 kg**
- Romanian Deadlift: (50×10) + (50×10) + (50×8) + (50×10) = 500 + 500 + 400 + 500 = **1,900 kg**
- Leg Press: (30×12) + (30×12) + (30×10) = 360 + 360 + 300 = **1,020 kg**
- Lying Leg Curl: (20×15) + (20×15) + (20×15) = 300 + 300 + 300 = **900 kg**
- Cable Pull-Through: (30×12) + (30×12) + (30×12) = 360 + 360 + 360 = **1,080 kg**
- Leg Extension: (40×12) + (40×12) + (40×12) = 480 + 480 + 480 = **1,440 kg**
- Seated Calf Raise: (50×15) + (50×15) + (50×15) + (50×15) = 750 + 750 + 750 + 750 = **3,000 kg**
- **TOTAL = 11,820 kg**

**App showed:** 11,820 kg

**RESULT: CORRECT. Volume calculation is accurate — the 2.2x inflation bug is fixed for new workouts.**

---

## TEST 3 — Dashboard After Fresh Workout

### Dashboard State After Completing Workout

**Today's Workout card:**
Renders without errors. HTTP 200 (no 500). However, the card shows "AI Coach Workout" — the FIRST workout completed today, not the most recently completed one. The lower body workout I just finished does NOT appear in the card. The card appears to be pinned to the first completed workout of the day rather than the most recent. This is a minor UX issue.

The card shows:

- Badge: "✓ Completed Today"
- Workout name: "AI Coach Workout"
- Duration: 2min
- Sets: 12
- Volume: 9127kg (this is the legacy inflated value from the older AI Coach Workout session — a pre-existing data issue)

**Weekly workouts count:** 3 (updated from 2 — correct, reflects new workout)

**Volume total:** 23.5k kg (increased from 11.7k — correct, 11.7k + 11.82k ≈ 23.5k)

**Streak:** 1 day

**Weekly bar / calendar:**
Friday shows a checkmark (✓). Days without workouts show their date number. "3 workouts" displayed (plural correct).

**Recovery widget:**
Shows fatigued muscles from the lower body workout:

- Quads, Glutes, Hamstrings: 85%
- Hamstrings, Glutes: 81%
- Quads, Glutes: 83%
- Hamstrings: 78%

These are the correctly identified muscles from the lower body session. Recovery widget is accurate.

**Grammar check:** "3 workouts" — correct plural. No grammar errors found.

**AI Coach Suggestion widget:** Shows "Analyzing your progress..." which is a loading/processing state. Does not appear to fully resolve during normal page load.

---

## TEST 4 — Full Data Pipeline

### a) Recovery (/solo/recovery)

**Muscles fatigued after lower body workout (all "Just now"):**

- Quads, Glutes, Hamstrings: 15% fatigue
- Hamstrings, Glutes: 19% fatigue
- Quads, Glutes: 17% fatigue
- Hamstrings: 22% fatigue
- Glutes, Hamstrings: 18% fatigue
- Quads: 18% fatigue
- Calves (Soleus): 30% fatigue (highest — calf raises with 50kg × 15 reps × 4 sets)

**Fatigue percentages reasonable?** Yes. Fatigue values are low-to-moderate (15–30%) immediately after training, which is plausible given the system uses gradual accumulation. Higher fatigue on Calves (Soleus) from the high-volume calf raises makes logical sense. The "Just now" timestamp is accurate.

**Overall recovery:** 92% — shown at the top. 19 muscle groups "Recovered", 2 "Recovering", 0 "Fatigued".

**Today's Recommendation:** Pull Day (Back, Biceps). Lists: Back/Biceps/Triceps/Forearms/Glutes/Calves as Ready; Chest/Shoulders/Quads/Hamstrings as Rest. This is accurate given both a push workout (chest/shoulders) and leg workout (quads/hamstrings) were done today.

**No underscore issues in muscle names:** Confirmed clean. All names are title case.

### b) Schedule (/schedule)

**Completed this month counter:** 3 — correct.

**Today's workouts visible on calendar:** Yes. February 27 shows three entries:

1. 14:24 — AI Coach Workout
2. 15:07 — AI Coach Workout
3. 18:25 — Intermediate Hypertrophy – Lower Body (Quads, Hamstrings, Glutes, Calves)

**Green/completed indicator:** The date cell for Feb 27 shows the workout count badge ("3") and lists all three sessions. No explicit green checkmark per entry, but the sessions are clearly listed.

**Planned remaining:** 0 (no planned workouts exist, which is correct).

### c) Progress (/progress)

**Data visible (not empty state):** Yes. The page shows real data.

**Stats shown:**

- Total Workouts: 3
- Total Volume: 23,547 kg
- Total Time: 10min
- Total Sets: 46

**Recent Workouts list:**

1. Intermediate Hypertrophy – Lower Body — Fri, Feb 27 — 5min, 24 sets, **11,820 kg** (CORRECT)
2. AI Coach Workout — Fri, Feb 27 — 3min, 10 sets, 2,600 kg
3. AI Coach Workout — Fri, Feb 27 — 2min, 12 sets, 9,127 kg (legacy inflated value)

**Volume chart:** Weekly Volume bar chart renders. Shows activity in the "Feb 23" week.

**Does the volume match?** Yes. 11,820 kg shown for the fresh workout — matches exactly.

### d) AI Coach (/solo/coach)

**Question asked:** "What workout did I just complete?"

**AI Response:**

> Based on your completed session history, your most recent workout was: **Intermediate Hypertrophy – Lower Body (Quads, Hamstrings, Glutes, Calves)** — February 27, 2026 — logged at approximately 5 minutes duration. That tracks with your current recovery status too — your **hamstrings are at 22% fatigue** and **calves (soleus) at 30% fatigue**, which lines up with that lower body session.

**Does it reference the session name and date?** Yes — correct name, correct date.

**Second question asked:** "What exercises did I do and what was the total volume?"

**AI Response:**

> I don't have that level of detail, unfortunately. My access to your data only shows: Workout name, Date, Duration. I **don't have visibility into** the specific exercises, sets, reps, or weights you logged — so I can't calculate total volume for that session.

**Assessment:** The AI Coach knows the workout name, date, and duration, but does NOT have access to the granular logged data (exercises, sets, reps, weights). This is a significant capability gap. The AI can identify the session but cannot provide coaching based on the specific work performed. This is a data access limitation, not a bug per se, but it meaningfully reduces the value of the AI Coach for post-workout analysis.

---

## TEST 5 — Execution UX Quality Checklist

| Element                 | Rating | Notes                                                                                                                                                                                                                                                                                            |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overall visual design   | 7/10   | Dark theme is polished and gym-appropriate. Gold accent on active set. Professional feel, though the empty space and layout issues drag it down.                                                                                                                                                 |
| Weight input (steppers) | 8/10   | Context-aware step size (2.5kg barbells, 1kg machines) is excellent. Direct input also works. Covers most use cases well.                                                                                                                                                                        |
| Rep input (steppers)    | 8/10   | Clean, functional, step-by-1. Direct input works. No issues.                                                                                                                                                                                                                                     |
| Set completion feedback | 7/10   | Green checkmark on complete is satisfying. XP animation on final save is good. No audible feedback. Previous performance hints are MISSING — a notable gap for progressive overload.                                                                                                             |
| Rest timer design       | 5/10   | Non-blocking floating bar is the right concept. However, the z-index bug causes the sticky bottom bar to overlap and intercept clicks on Skip/+30s. In real use a tapper would hit "Finish Workout" instead of "Skip". Critical layout conflict.                                                 |
| Exercise navigation     | 7/10   | Navigation dots are compact and functional. Named buttons accessible via aria-labels. Can jump to any exercise mid-workout. Dots could be larger for gym use (sweaty hands, bad light).                                                                                                          |
| Summary screen          | 7/10   | Shows duration, volume, sets, kcal, exercise breakdown, and muscles worked. Looks good. Missing: PRs, detailed comparison to previous sessions, share functionality. XP shown only as a brief animation.                                                                                         |
| Mobile friendliness     | 3/10   | Significant failures at 375px: top bar hidden, horizontal scrollbar present, checkmark buttons clipped off-screen. The execution page is essentially unusable as a true mobile experience. Given this is a workout tracking app meant for use in a gym (on a phone), this is a critical failure. |
| Speed/responsiveness    | 8/10   | Button interactions feel snappy. No lag on stepper increments. Set completion and page transitions are fast. Rest timer countdown is smooth.                                                                                                                                                     |
| "Gym-ready" feel        | 6/10   | The design language and dark theme are appropriate. The core loop (see all sets, tap weight, tap reps, tap checkmark) is solid. But the mobile failures, missing previous-performance hints, hidden bottom bar, and rest timer bug make it feel like a desktop demo, not a gym floor tool.       |

**Average rating: (7+8+8+7+5+7+7+3+8+6) / 10 = 66/100 = 6.6/10**

---

## TEST 6 — Start Workout From All Entry Points

### a) My Workouts page → Start button

**Result: PASS**
Clicked Start on "Intermediate Hypertrophy – Lower Body". Navigated immediately to `/workout-execution/b552ac5a-681a-46f2-a6a5-1923ee146a4d`. No errors.

### b) Dashboard → Start Workout or similar button

**Result: FAIL (no such button exists)**
The Dashboard does not have a direct "Start Workout" button. The "Today's Workout" card shows a completed badge and stats but no button to start a new workout from the dashboard. The quick-action links lead to AI Coach, Generate Workout, My Progress, and Recovery — but not directly to workout execution. A user wanting to start a workout from the dashboard must navigate to My Workouts via the sidebar.

### c) Generate Workout → Start Workout

**Result: PASS**
Navigated to /solo/generate, generated a Pull Day workout ("Intermediate Pull Day — Strength Focus"). Clicked "Start Workout" button. A toast appeared: "Workout Saved & Ready — Starting your workout now!" and the app navigated to `/workout-execution/89570c29-1f24-4905-9330-d2fac1d6fcb2`. The execution page loaded correctly.

---

## SECTION A — BUGS

### BUG-13-01: Rest Timer Hidden Behind Sticky Bottom Bar (CRITICAL)

**Steps to reproduce:**

1. Start any workout
2. Complete Set 1 of any exercise
3. Observe the rest timer floating bar appear
4. Attempt to click "Skip" or "+30s"

**Actual result:** The sticky bottom bar (z-index 30) overlaps the rest timer area and intercepts pointer events. The Skip and +30s buttons cannot be tapped in normal usage. In Playwright this manifests as: `<div class="flex-none h-16...z-30">…</div> intercepts pointer events`. A user tapping the skip area would instead trigger the "Finish Workout" button.

**Expected result:** The rest timer should render above the sticky bottom bar, OR the bottom bar should hide/minimize while the rest timer is active.

**Console errors:** None — purely a CSS z-index/layout conflict.

**Screenshots:** `execution-bottom-bar.png` shows the overlap at bottom of viewport.

---

### BUG-13-02: Workout Execution Bottom Bar Not Sticky (HIGH)

**Steps to reproduce:**

1. Start any workout
2. On a 900px tall desktop viewport, observe the "Exercises" and "Finish Workout" buttons

**Actual result:** The bottom bar is `position: static` (confirmed via computed style). At 900px viewport height, the bar renders at Y=1023px — below the fold. A large empty area (~300px of blank black space) separates the content from the bar. Users must scroll down to reach "Finish Workout".

**Expected result:** The bottom bar should be `position: fixed` or `position: sticky` to always be visible without scrolling.

**Console errors:** None.

---

### BUG-13-03: Mobile Layout Broken at 375px (CRITICAL)

**Steps to reproduce:**

1. Start any workout
2. Resize viewport to 375px width
3. Observe the execution page

**Actual result:**

- The sticky top bar (X, workout name, timer) is not visible — hidden behind the app header or scrolled off
- A horizontal scrollbar appears — content overflows horizontally
- Checkmark buttons on the right side of set rows are visually clipped/cut off
- Large empty vertical dead space on screen

**Expected result:** Execution page should be fully usable on 375px mobile width — the primary use case for gym usage is a smartphone.

**Console errors:** None.

---

### BUG-13-04: Today's Workout Card Shows First Workout, Not Most Recent (LOW)

**Steps to reproduce:**

1. Complete two workouts in the same day
2. Navigate to /dashboard

**Actual result:** The "Today's Workout" card shows the first workout completed that day ("AI Coach Workout", volume 9,127 kg) rather than the most recently completed workout ("Intermediate Hypertrophy – Lower Body", volume 11,820 kg).

**Expected result:** The card should show the most recently completed workout, or indicate that multiple workouts were completed today.

**Console errors:** None.

---

### BUG-13-05: AI Coach Cannot Access Exercise/Volume Details of Sessions (MEDIUM)

**Steps to reproduce:**

1. Complete a workout
2. Go to AI Coach and ask "What exercises did I do and what was the total volume?"

**Actual result:** AI Coach responds: "I don't have that level of detail... I don't have visibility into the specific exercises, sets, reps, or weights you logged."

**Expected result:** The AI Coach should have access to the full logged session data including exercises, sets, reps, weights, and volume to provide meaningful post-workout coaching and progressive overload advice.

---

### BUG-13-06: XP Earned Not Permanently Displayed on Summary Screen (LOW)

**Steps to reproduce:**

1. Complete a workout and reach the summary screen
2. Click "Save & Exit"

**Actual result:** "+105 XP" appears as a brief CSS animation overlay on the button, then disappears. The summary screen itself does not show how much XP was earned.

**Expected result:** XP earned should be displayed as a permanent element on the summary screen so users can see the reward before clicking Save & Exit.

---

### BUG-13-07: No Previous Performance Hints in Execution UI (MEDIUM)

**Steps to reproduce:**

1. Complete a workout (e.g., AI Coach Workout) that has logged history
2. Start the same workout again
3. Observe the weight/rep fields for each set

**Actual result:** No "Last: 80kg × 8" hint appears. All weight and rep fields default to 0.

**Expected result:** Previous session's weights and reps should pre-populate or display as hints to support progressive overload tracking — one of the core value propositions of a workout tracking app.

---

### BUG-13-08: Legacy Inflated Volume Data Remains in Database (LOW — Pre-existing)

**Description:** The older "AI Coach Workout" session shows 9,127 kg volume (was inflated ~2.2x in prior sessions). This legacy data cannot be corrected retroactively and continues to distort the "Total Volume" shown on the Progress page. The fix for new workouts is confirmed working (11,820 kg is correct for the new session), but historical data remains polluted.

---

## SECTION B — UX CRITIQUE

### 1. Execution Page: Desktop vs. Gym Floor Disconnect

The workout execution page was designed with a desktop browser in mind. The non-sticky bottom bar, large empty whitespace, and horizontal overflow on mobile all suggest the page has not been tested on an actual phone screen. Since workouts happen in gyms — on smartphones — this is the highest-priority UX failure. A user would be unable to comfortably use this page while standing at a squat rack.

### 2. Missing Previous Performance Data

For a progressive overload-focused app, the most important UX element during workout execution is knowing what you lifted last time. The absence of this hint forces users to mentally remember or write it down externally, which defeats the purpose of using a tracking app. This should appear as a subtle secondary line under each set (e.g., "Last session: 80 × 8").

### 3. AI Coach Knowledge Gap

The AI Coach branding implies a coaching relationship, but the AI has no access to the granular logged data. It can say "you completed a lower body workout" but cannot say "you squatted 80kg for 4 sets last time — consider adding 2.5kg today." This gap makes the AI feel like a generic chatbot with session awareness rather than a true coach.

### 4. Dashboard Does Not Surface "Start Workout"

The dashboard is the main entry point after login, but it does not have a prominent path to start a workout. There is no "Start a Workout" button or card on the dashboard. A new user or returning user would have to discover /workouts via the sidebar. The Today's Workout card could include a "Start Again" or "Start New" CTA when it shows a completed workout.

### 5. Today's Workout Card Shows First, Not Most Recent

When multiple workouts are completed in a day, the card freezes on the first one. This is confusing if the user trains twice. There should be a "most recently active" selection, or a summary ("3 workouts today") with a list.

### 6. Summary Screen Missing Comparison to Previous Session

The summary screen shows raw numbers but no comparison to last time. "11,820 kg (+2,340 kg vs. last session)" or "New PR on Barbell Back Squat!" would make the completion moment much more rewarding and informative.

### 7. Rest Timer vs. Bottom Bar Z-Index Conflict

The rest timer and the sticky bottom bar both occupy the bottom of the screen but have a conflicting z-index relationship. The intended UX (quickly tap Skip, keep lifting) is broken because the bottom bar physically sits on top of the rest timer buttons.

---

## SECTION C — PRIORITY FIXES

| Priority | Issue                                           | Reasoning                                                                                                                                                                   |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Mobile layout broken at 375px                   | This is a gym app — primary use is on a phone at a rack. Current state is unusable on the most common device type.                                                          |
| P2       | Bottom bar not sticky / below fold              | "Finish Workout" is the most important button in the flow. Requiring scroll to reach it, on a non-scrollable-feeling page, will cause confusion and accidental abandonment. |
| P3       | Rest timer hidden behind bottom bar             | Skip is a frequently used action. The z-index conflict means it cannot be tapped normally. In a gym this will be noticed immediately.                                       |
| P4       | Add previous performance hints                  | Core value prop of a workout tracker. Without "Last: 80kg × 8", users have no progressive overload reference.                                                               |
| P5       | AI Coach access to session details              | The AI Coach is a premium feature. Its inability to discuss specific logged exercises/volume makes it feel like a generic chatbot. Feed session data into the AI context.   |
| P6       | Dashboard "Start Workout" CTA                   | The dashboard should have a prominent entry point to start a workout, not just report completed ones.                                                                       |
| P7       | Today's Workout card — show most recent         | Minor logic fix: query for most recent completed session today, not the first one.                                                                                          |
| P8       | Show XP on summary screen permanently           | Small but meaningful for engagement. The XP earn moment should be celebrated, not hidden behind a transition.                                                               |
| P9       | Summary screen: show PRs and session comparison | Would significantly improve the "completion reward" moment and encourage continued use.                                                                                     |

---

## 40-POINT SCORECARD

### TEST 1 — UI Audit (10 checks, 10 points)

| #   | Check                                            | Result                                                                                                                                                 | Points |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Sticky top bar with X, name, timer               | PASS — Top bar present with all three elements                                                                                                         | 1      |
| 2   | Progress bar with exercise/set counts            | PASS — "Exercise X of Y · Set X of Y" text present                                                                                                     | 1      |
| 3   | Exercise name prominent                          | PASS — H2 bold heading, clearly visible                                                                                                                | 1      |
| 4   | Set list for current exercise (all sets visible) | PASS — All sets shown simultaneously                                                                                                                   | 1      |
| 5   | Weight steppers work                             | PASS — Context-aware step size, direct input also works                                                                                                | 1      |
| 6   | Rep steppers work                                | PASS — Step-by-1, works correctly                                                                                                                      | 1      |
| 7   | Large checkmark buttons (48px+)                  | PASS — Measured at exactly 48×48px                                                                                                                     | 1      |
| 8   | Rest timer non-blocking (floating bar)           | PARTIAL — Rest timer IS a bar, not full-screen. But the bar is hidden behind the sticky bottom bar z-index conflict, making Skip/+30s untappable. FAIL | 0      |
| 9   | Sticky bottom bar                                | FAIL — Bar is `position: static`, not sticky/fixed. Below fold on 900px viewport.                                                                      | 0      |
| 10  | Mobile layout (375px) no overflow                | FAIL — Horizontal scrollbar, top bar hidden, checkmarks clipped                                                                                        | 0      |

**TEST 1 SCORE: 7/10**

---

### TEST 2 — Workout Completion (8 checks, 8 points)

| #   | Check                                          | Result                                                                    | Points |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| 1   | Can enter weights via steppers                 | PASS                                                                      | 1      |
| 2   | Can enter reps via steppers                    | PASS                                                                      | 1      |
| 3   | Set completion works (checkmark)               | PASS — Force click required due to animation, but functionally works      | 1      |
| 4   | Auto-advance to next set works                 | PASS — Active set highlight moves to next set after completion            | 1      |
| 5   | Exercise navigation works                      | PASS — Dot navigation and auto-advance between exercises                  | 1      |
| 6   | Finish Workout button works                    | PASS — Summary screen appears                                             | 1      |
| 7   | Summary screen shows correct data              | PASS — Duration, volume, sets, breakdown, muscles all shown               | 1      |
| 8   | Volume calculation CORRECT (not 2.2x inflated) | PASS — App showed 11,820 kg; manual calculation = 11,820 kg. Exact match. | 1      |

**TEST 2 SCORE: 8/8**

---

### TEST 3 — Dashboard (7 checks, 7 points)

| #   | Check                                                        | Result                                                                                                                                                                                                                                                 | Points |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Today's Workout card loads (no 500)                          | PASS — Loads with HTTP 200, card renders                                                                                                                                                                                                               | 1      |
| 2   | Workout count updated                                        | PASS — Shows 3 (was 2 before workout)                                                                                                                                                                                                                  | 1      |
| 3   | Volume is correct (not inflated)                             | PARTIAL — Dashboard shows 23.5k total (correct for cumulative). New workout's 11.8k added correctly. However the card still shows 9,127 kg for the legacy AI Coach Workout (pre-existing inflated data). New data is correct. Score: PASS for new data | 1      |
| 4   | Weekly bar shows today's activity                            | PASS — Friday shows ✓ checkmark                                                                                                                                                                                                                        | 1      |
| 5   | Streak updated                                               | PASS — Shows "1" day streak                                                                                                                                                                                                                            | 1      |
| 6   | Recovery shows fatigued muscles                              | PASS — Quads/Glutes/Hamstrings showing high fatigue percentages                                                                                                                                                                                        | 1      |
| 7   | Grammar correct ("3 workouts" not "3 workouts" singular bug) | PASS — "3 workouts" correct plural                                                                                                                                                                                                                     | 1      |

**TEST 3 SCORE: 7/7**

---

### TEST 4 — Data Pipeline (8 checks, 8 points)

| #   | Check                                | Result                                                                                                                                        | Points |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Recovery page shows fatigued muscles | PASS — 7 lower body muscle groups show "Just now" fatigue                                                                                     | 1      |
| 2   | Fatigue percentages reasonable       | PASS — 15–30% range immediately post-workout; higher on calves from high-volume raises                                                        | 1      |
| 3   | Schedule shows today's workout       | PASS — Feb 27 shows 3 workouts including the new one at 18:25                                                                                 | 1      |
| 4   | Schedule shows completed indicator   | PASS — Sessions listed with timestamps in the calendar cell                                                                                   | 1      |
| 5   | Progress page shows data (not empty) | PASS — Full stats and recent workout list visible                                                                                             | 1      |
| 6   | Progress volume correct              | PASS — Shows 11,820 kg for the new session                                                                                                    | 1      |
| 7   | AI Coach knows about the workout     | PASS — Correctly identifies "Intermediate Hypertrophy – Lower Body" on Feb 27                                                                 | 1      |
| 8   | AI Coach references session details  | PARTIAL — Knows name, date, duration, and cross-references recovery fatigue. But does NOT know exercises, sets, reps, or volume. Half credit. | 0      |

**TEST 4 SCORE: 7/8**

---

### TEST 5 — UX Quality (4 checks, 4 points)

| #   | Check                       | Result                                                                                 | Points |
| --- | --------------------------- | -------------------------------------------------------------------------------------- | ------ |
| 1   | Average UX rating ≥ 7/10    | FAIL — Average is 6.6/10 (66/100). Pulled down by mobile (3/10) and rest timer (5/10). | 0      |
| 2   | Average UX rating ≥ 8/10    | FAIL — Average is 6.6/10                                                               | 0      |
| 3   | No element rated below 5/10 | FAIL — Mobile friendliness rated 3/10                                                  | 0      |
| 4   | "Gym-ready" feel ≥ 7/10     | FAIL — Rated 6/10. The mobile failures prevent a gym-ready verdict.                    | 0      |

**TEST 5 SCORE: 0/4**

---

### TEST 6 — Entry Points (3 checks, 3 points)

| #   | Check                        | Result                                                              | Points |
| --- | ---------------------------- | ------------------------------------------------------------------- | ------ |
| 1   | Start from My Workouts works | PASS                                                                | 1      |
| 2   | Start from Dashboard works   | FAIL — No "Start Workout" button on dashboard                       | 0      |
| 3   | Start from Generator works   | PASS — "Start Workout" button saves and navigates to execution page | 1      |

**TEST 6 SCORE: 2/3**

---

## FINAL SCORECARD

| Test                        | Score  | Max    |
| --------------------------- | ------ | ------ |
| TEST 1 — UI Audit           | 7      | 10     |
| TEST 2 — Workout Completion | 8      | 8      |
| TEST 3 — Dashboard          | 7      | 7      |
| TEST 4 — Data Pipeline      | 7      | 8      |
| TEST 5 — UX Quality         | 0      | 4      |
| TEST 6 — Entry Points       | 2      | 3      |
| **TOTAL**                   | **31** | **40** |

**Final Grade: 31/40 = 77.5% — B (Some Issues)**

---

## GRADE SUMMARY

**31/40 — Grade: B**

The core data pipeline is solid: volume calculation is now correct, workout completion writes to the database correctly, dashboard stats update, recovery page reflects the new session, schedule shows the completed workout, and the progress page shows accurate per-session volume. The data layer is in good shape.

What brings the score to B is the execution UX. The workout execution page has meaningful layout failures that make it unsuitable for real gym use: the bottom bar is not sticky, the rest timer is hidden behind the bottom bar, and the mobile layout at 375px is broken with horizontal overflow and a hidden top bar. For an app whose entire value proposition is logging workouts in a gym — on a phone — these are the most important screens to get right, and they currently have multiple defects that would frustrate a real user on the gym floor.

The missing "previous performance hints" and the AI Coach's inability to discuss logged exercise details are also material gaps that reduce the coaching value of the product.

**What's working well:** Dark theme and visual design, data accuracy, recovery awareness, generate workout flow, schedule/progress tracking, grammar fixes, no JS errors.

**What needs immediate attention:** Mobile layout on execution page, sticky bottom bar, rest timer z-index conflict.

---

## Score History

| Session                 | Score             | Notes                                                                                             |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| QA-09                   | 30.5/35 (87%)     | Different scale                                                                                   |
| QA-10                   | 31/40 (77.5%)     | Stats pipeline broken, meal plan 500, minor display bugs                                          |
| QA-11                   | 36/40 (90.0%)     | Stats pipeline fixed, today-workout 500 regression, volume inflated                               |
| QA-12 (targeted)        | N/A               | Fix verification only: BUG-08 fixed, BUG-07 fixed, BUG-06 partially fixed                         |
| **QA-13 (this report)** | **31/40 (77.5%)** | Volume fix confirmed correct. New UI has mobile/sticky bar/z-index issues dropping TEST 5 to 0/4. |

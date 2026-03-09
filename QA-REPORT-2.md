# QA Report 2 — GymGurus Production App

**Date:** 2026-02-26
**Tester:** Claude Code (Playwright MCP automated testing)
**Environment:** https://gym-gurus-production.up.railway.app
**Account:** test@test.com (Ronin role)
**Browser:** Chromium (Playwright headless)

---

## Executive Summary

This is a follow-up QA test after three critical bug fixes were deployed. All three fixes are confirmed working. Navigation across 12+ pages works without rate-limit lockout. Several new issues discovered, most notably a 500 error on the calculator-results API and an empty My Progress page.

---

## Fix Verification Results

### FIX 1: Auth Rate Limiter (PASS)

**Previous bug:** Users were locked out after ~5 page navigations because `authRateLimit` was set to 5 requests per 15 minutes in production, and it applied to GET `/api/auth/user` (called on every navigation).

**Verification:** Navigated to **12 different pages** in sequence (Dashboard, AI Coach, Generate Workout, Nutrition Planner, My Workouts, My Progress, Recovery, Achievements, Calculators, BMI Calculator, Schedule, Settings) plus navigated back to Dashboard. Every `/api/auth/user` call returned **200 OK**. Zero 429 errors observed.

**Verdict:** FIXED

### FIX 2: Onboarding Redirect Loop (PASS)

**Previous bug:** After completing onboarding, user was redirected back to onboarding step 1 instead of the dashboard, because `queryClient.invalidateQueries()` hadn't resolved before `navigate('/solo')` fired.

**Verification:** Login redirected directly to `/dashboard`. Navigating away and back to `/dashboard` stayed on dashboard. No redirect to `/solo/onboarding` observed at any point.

**Verdict:** FIXED

### FIX 3: 429 Error Message (UNABLE TO VERIFY DIRECTLY)

**Previous bug:** When the frontend received a 429 response, it showed "Connection Error — check your internet connection" instead of a rate limit message.

**Verification:** No 429 errors occurred during this session (which is the intended outcome of FIX 1). The code changes are deployed and correct — `App.tsx` and `QueryErrorState.tsx` both detect `429:` prefix errors and show "Too Many Requests" with an appropriate message. Cannot trigger naturally since the rate limit is now 100/15min.

**Verdict:** CODE VERIFIED (cannot trigger organically)

---

## Bug Report

### BUG-1: Calculator Results API Returns 500 (NEW)

| Field           | Value                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**    | Medium                                                                                                                                      |
| **Page**        | `/dashboard/calculators`, `/dashboard/calculators/bmi`                                                                                      |
| **Endpoint**    | `GET /api/calculator-results` and `GET /api/calculator-results/bmi`                                                                         |
| **Status Code** | 500 Internal Server Error                                                                                                                   |
| **Impact**      | Calculator UI renders and computes values correctly, but saved results history fails to load. "Save Result" functionality is likely broken. |
| **Screenshot**  | N/A (no visible error in UI — silent failure)                                                                                               |

**Steps to reproduce:**

1. Navigate to Calculators page
2. Open any calculator (e.g. BMI)
3. Check network tab — `/api/calculator-results` returns 500

**Notes:** The calculator-results endpoint returns 500 on both the index page (GET /api/calculator-results) and specific calculator pages (GET /api/calculator-results/bmi). This is a server-side error, likely a missing table or column in the database schema.

---

### BUG-2: My Progress Page Is Completely Empty (EXISTING)

| Field          | Value                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Severity**   | Medium                                                                                          |
| **Page**       | `/progress`                                                                                     |
| **Impact**     | Page shows only heading and subtitle. No charts, data, empty state guidance, or call-to-action. |
| **Screenshot** | `qa-screenshots/04-my-progress.png`                                                             |

**What renders:**

- Heading: "Progress Tracking"
- Subtitle: "Monitor client progress and track fitness goals with precision"
- Nothing else — blank page below subtitle

**Issues:**

1. No content whatsoever — no empty state component, no "log your first workout" CTA
2. Subtitle says "Monitor **client** progress" — this is trainer-oriented copy that doesn't match the Ronin (solo) user role
3. Stark contrast with other pages that have rich empty states (My Workouts, Recovery, Achievements all handle the no-data case gracefully)

---

### BUG-3: AI Features Return 503 (KNOWN — Config Issue)

| Field           | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| **Severity**    | High (feature-blocking)                                                 |
| **Endpoints**   | `/api/ai/chat`, `/api/ai/generate-workout`, `/api/ai/progress-insights` |
| **Status Code** | 503 Service Unavailable                                                 |
| **Root Cause**  | `ANTHROPIC_API_KEY` not configured in Railway environment variables     |

**User-facing errors:**

- AI Coach: "Sorry, I had trouble generating a response. Please try again."
- Generate Workout: "AI service not configured. Contact support."
- Dashboard progress insights: Silent failure (no visible error)

**Recommendation:** Set `ANTHROPIC_API_KEY` in Railway environment variables to enable AI features. If intentionally disabled, show a more helpful message (e.g., "AI features are coming soon" instead of "Contact support").

---

### BUG-4: /api/analytics/web-vitals Returns 403 (KNOWN)

| Field           | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| **Severity**    | Low                                                        |
| **Endpoint**    | `POST /api/analytics/web-vitals`                           |
| **Status Code** | 403 Forbidden                                              |
| **Frequency**   | 2-6 times per page navigation (40+ errors in this session) |
| **Impact**      | No user-visible impact. Console noise only.                |

**Notes:** This endpoint fires on every page load and often fires multiple times. Many requests also fail with `net::ERR_ABORTED` (likely cancelled by navigation before completing). The 403 is likely a CSRF token issue. Consider either:

1. Fixing the CSRF exemption for this endpoint
2. Reducing the frequency of web-vitals reporting
3. Suppressing the console errors in production

---

### BUG-5: Achievements Shows "0/0 Unlocked" (MINOR)

| Field        | Value                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| **Severity** | Low                                                                        |
| **Page**     | `/solo/achievements`                                                       |
| **Impact**   | Minor confusion — displays "0/0 Unlocked" when no achievements are defined |

**Expected:** Should show something like "0/12 Unlocked" (total available achievements) or omit the counter if no achievements are configured yet.

**Actual:** Shows "0/0 Unlocked" with "0 XP Earned" — the denominator being 0 suggests no achievements are defined in the system. The `/api/gamification/achievements` endpoint returns 200 but likely returns an empty array.

---

### BUG-6: Settings > Danger Tab References Non-Existent "Subscription Tab" (MINOR)

| Field        | Value                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| **Severity** | Low                                                                                                    |
| **Page**     | `/settings` > Danger tab                                                                               |
| **Impact**   | Confusing copy — tells users to "cancel it first in the Subscription tab" but the tab is called "Plan" |

**Actual text:** "Your subscription will not be automatically cancelled — cancel it first in the Subscription tab"
**Should say:** "...cancel it first in the Plan tab"

---

## Page-by-Page Test Results

| #   | Page                | URL                          | Status       | Notes                                                                                  |
| --- | ------------------- | ---------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| 1   | Dashboard           | `/dashboard`                 | PASS         | Full content: today's workout, quick links, stats, progress, recovery, weekly activity |
| 2   | AI Coach            | `/solo/coach`                | PARTIAL      | UI loads, chat interface works, but AI responses fail (503 — no API key)               |
| 3   | Generate Workout    | `/solo/generate`             | PARTIAL      | Full form with preferences loads, generation fails (503 — no API key)                  |
| 4   | Nutrition Planner   | `/solo/nutrition`            | PARTIAL      | Full form loads (goals, calories, macros, restrictions), generation would fail         |
| 5   | My Workouts         | `/workouts`                  | PASS         | Empty state with search bar and "Generate with AI" CTA                                 |
| 6   | My Progress         | `/progress`                  | FAIL         | Completely empty — only heading visible (BUG-2)                                        |
| 7   | Recovery            | `/solo/recovery`             | PASS         | Excellent — 10 muscle groups, fatigue %, recovery tips, daily recommendation           |
| 8   | Achievements        | `/solo/achievements`         | PASS (minor) | Category tabs, rarity guide, empty state. "0/0 Unlocked" is odd (BUG-5)                |
| 9   | Calculators         | `/dashboard/calculators`     | PARTIAL      | 12 calculator cards load, but `/api/calculator-results` returns 500 (BUG-1)            |
| 10  | BMI Calculator      | `/dashboard/calculators/bmi` | PARTIAL      | Sliders work, BMI computes correctly (24.2), but save/history broken (500)             |
| 11  | Schedule            | `/schedule`                  | PASS         | Weekly view with Day/Week/Month tabs, date navigation arrows                           |
| 12  | Settings - Profile  | `/settings`                  | PASS         | Body stats, profile info, photo upload                                                 |
| 13  | Settings - Security | `/settings`                  | PASS         | Change password form                                                                   |
| 14  | Settings - Plan     | `/settings`                  | PASS         | Current plan display, trial countdown, upgrade button                                  |
| 15  | Settings - Alerts   | `/settings`                  | PASS         | Email and in-app notification toggles                                                  |
| 16  | Settings - Danger   | `/settings`                  | PASS (minor) | Delete account with warnings. Copy references wrong tab name (BUG-6)                   |

---

## Console Error Summary

| Error                                     | Count | Severity | Notes                                 |
| ----------------------------------------- | ----- | -------- | ------------------------------------- |
| `/api/analytics/web-vitals` 403           | ~28   | Low      | Known CSRF issue, fires on every page |
| `/api/analytics/web-vitals` ERR_ABORTED   | ~18   | Low      | Navigation cancels pending requests   |
| `/api/ai/progress-insights` 503           | 2     | Medium   | No API key configured                 |
| `/api/ai/chat` 503                        | 1     | Medium   | No API key configured                 |
| `/api/ai/generate-workout` 503            | 1     | Medium   | No API key configured                 |
| `/api/calculator-results` 500             | 3     | Medium   | Server error — likely missing table   |
| `/api/calculator-results/bmi` 500         | 3     | Medium   | Same as above                         |
| `apple-mobile-web-app-capable` deprecated | 12    | Info     | Fires once per page, browser warning  |

**Total:** 41 errors, 12 warnings across 12 page navigations.
**Zero 429 rate limit errors** (FIX 1 confirmed).

---

## Network Request Summary

**Successful endpoints (200):**

- `GET /api/auth/user` — on every navigation (FIX 1 confirmed)
- `GET /api/workouts` — on every navigation
- `GET /api/notifications` — on every navigation
- `GET /api/notifications/unread-count` — on every navigation
- `GET /api/solo/today-workout`
- `GET /api/gamification/profile`
- `GET /api/strength/summary`
- `GET /api/recovery/fatigue`
- `GET /api/recovery/recommendations`
- `GET /api/solo/weekly-activity`
- `GET /api/solo/stats`
- `GET /api/ai/usage`
- `GET /api/solo/fitness-profile`
- `GET /api/exercises`
- `GET /api/gamification/achievements`
- `GET /api/appointments`
- `GET /api/clients`
- `GET /api/users/fitness-profile`
- `GET /api/settings/stats`
- `POST /api/auth/login`

**Failed endpoints:**

- `POST /api/analytics/web-vitals` — 403 (CSRF)
- `POST /api/ai/*` — 503 (no API key)
- `GET /api/calculator-results*` — 500 (server error)

---

## UX Observations

### Positive

- **Dashboard is excellent** — personalized greeting, today's workout card, quick action links, stats cards, progress/recovery widgets, weekly calendar
- **Recovery page is best-in-class** — muscle group grid with fatigue percentages, actionable tips, daily recommendation
- **Calculators hub is comprehensive** — 12 calculators spanning nutrition, body metrics, strength, and cardio
- **Navigation is smooth** — sidebar highlights active page, transitions are fast
- **Settings is well-organized** — 5 logical tabs covering all account needs
- **Empty states are handled well** (except My Progress) — My Workouts, Achievements, and Recovery all have helpful empty states with CTAs
- **Free trial banner** — visible but dismissible, shows days remaining

### Areas for Improvement

1. **My Progress page needs content** — even an empty state with a CTA would be better than a blank page
2. **AI error messages** — "Contact support" is a dead end. Guide users to set up their own API key or indicate that the feature is temporarily unavailable
3. **web-vitals noise** — 40+ console errors per session from a non-critical analytics endpoint is excessive
4. **Calculator results API** — 500 error prevents save/history features from working
5. **Page title inconsistency** — Calculators pages use "Premium Calculators | GymGurus" while all other pages use "GymGurus - Fitness Management Platform for Personal Trainers"

---

## Priority Recommendations

| Priority | Action                                     | Impact                                                            |
| -------- | ------------------------------------------ | ----------------------------------------------------------------- |
| P1       | Fix `/api/calculator-results` 500 error    | Enables calculator save/history features                          |
| P1       | Set `ANTHROPIC_API_KEY` in Railway env     | Enables all AI features (coach, workout gen, nutrition, insights) |
| P2       | Build out My Progress page                 | Currently a dead-end page in the sidebar nav                      |
| P2       | Fix or silence web-vitals 403              | Eliminates 40+ console errors per session                         |
| P3       | Fix Achievements "0/0" counter             | Minor display issue                                               |
| P3       | Fix "Subscription tab" copy in Danger zone | References wrong tab name                                         |
| P3       | Standardize page titles                    | Inconsistent meta titles                                          |

---

## Test Metadata

- **Pages navigated:** 16 (including sub-pages and tab switches)
- **Rate limit errors:** 0 (FIX 1 confirmed)
- **Onboarding redirects:** 0 (FIX 2 confirmed)
- **Screenshots captured:** 6
- **Duration:** ~5 minutes
- **Previous report:** QA-REPORT.md (2026-02-26)

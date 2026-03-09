# GymGurus QA Report

**Date:** 2026-02-26
**Tester:** Quinn (Autonomous QA Engineer)
**Environment:** Production (https://gym-gurus-production.up.railway.app)
**Test Account:** test@test.com / Ronin role
**Browser:** Chromium via Playwright MCP

---

## SECTION A — BUGS (Ranked by Severity)

### BUG-1: Auth Rate Limiter Locks Users Out After ~5 Page Views (CRITICAL)

- **Severity:** CRITICAL
- **Page/Section:** Every page after the 5th navigation
- **Steps to reproduce:**
  1. Log in as any user
  2. Land on Dashboard (works fine — fires 9+ parallel API calls)
  3. Click any sidebar link (e.g., My Workouts, My Progress, Recovery)
  4. See "Connection Error" screen
  5. ALL subsequent pages show the same error for 15 minutes
- **What happened:** Every page navigation calls `GET /api/auth/user` to verify the session. The `authRateLimit` in `server/middleware/rateLimiter.ts:101-106` allows only **5 requests per 15 minutes in production**. After ~5 page views, the user gets HTTP 429 on `/api/auth/user`, and the frontend interprets this as a total connection failure.
- **What should happen:** `/api/auth/user` is a session-check endpoint called on every navigation — it should be exempt from the auth rate limiter (which is designed for login/register abuse prevention) or have a much higher limit (e.g., 200/min).
- **Root cause:** `server/middleware/rateLimiter.ts` line 104: `maxRequests: process.env.NODE_ENV === 'development' ? 1000 : 5` — the auth rate limit is 1000 in dev but only 5 in production. `server/routes.ts` line 119: `app.use('/api/auth', authRateLimit, authRoutes)` applies this to ALL auth routes including the session check.
- **Console errors:** `Failed to load resource: /api/auth/user` (429)
- **Screenshot:** `qa-screenshots/03-workouts-connection-error.png`

---

### BUG-2: "Connection Error" Message Is Misleading (HIGH)

- **Severity:** HIGH
- **Page/Section:** Error screen shown when rate-limited
- **Steps to reproduce:** Trigger BUG-1
- **What happened:** Shows "Connection Error — Unable to connect to the server. Please check your internet connection and try again." with a "Try Again" button. The actual cause is HTTP 429 (rate limiting).
- **What should happen:** When the server returns 429, the UI should show "You're making too many requests. Please wait a moment and try again." with the `Retry-After` header value displayed. The "Try Again" button should have a cooldown matching the retry-after duration.
- **Console errors:** None beyond the 429 response

---

### BUG-3: Onboarding Completion Loops Back to Step 1 (HIGH)

- **Severity:** HIGH
- **Page/Section:** `/solo/onboarding` — Step 9 "Get Started" button
- **Steps to reproduce:**
  1. Log in as a new user
  2. Complete all 9 onboarding steps
  3. Click "Get Started" on the summary page
- **What happened:** The page reloads and shows Step 1 again (same URL `/solo/onboarding`). The onboarding data IS saved (confirmed: re-login goes to dashboard, not onboarding), but the redirect after completion fails.
- **What should happen:** Clicking "Get Started" should redirect to `/dashboard` or `/solo/coach` (the first meaningful experience).
- **Console errors:** No JS errors — appears to be a frontend routing/state issue

---

### BUG-4: All AI Features Return Errors (HIGH)

- **Severity:** HIGH (3 major features completely broken)
- **Page/Section:** AI Coach (`/solo/coach`), Generate Workout (`/solo/generate`), Nutrition Planner (`/solo/nutrition`)
- **Steps to reproduce:**
  1. Navigate to AI Coach, type a message, press Enter
  2. Navigate to Generate Workout, click "Generate Workout"
  3. Navigate to Nutrition Planner, click "Generate Meal Plan"
- **What happened:**
  - AI Coach: "Sorry, I had trouble generating a response. Please try again." (`/api/ai/chat` fails)
  - Generate Workout: "AI service not configured. Contact support." (`/api/ai/generate-workout` fails)
  - Nutrition Planner: Not tested due to BUG-1, but same root cause expected
- **What should happen:** AI features should work or show a clear "AI features coming soon" message instead of error states
- **Root cause:** `ANTHROPIC_API_KEY` is not set in Railway environment variables. Server startup logs confirm: "ANTHROPIC_API_KEY: AI coaching & workout suggestions (disabled)"
- **Console errors:** `Failed to load resource: /api/ai/chat` (error), `/api/ai/generate-workout` (error)
- **Screenshot:** `qa-screenshots/02-ai-coach-error.png`

---

### BUG-5: `/api/analytics/web-vitals` Returns 403 on Every Page (MEDIUM)

- **Severity:** MEDIUM
- **Page/Section:** Every single page load
- **Steps to reproduce:** Load any page, check console
- **What happened:** `POST /api/analytics/web-vitals` returns 403 Forbidden on every page. Sometimes shows `net::ERR_ABORTED`. Generates 2-4 console errors per page load.
- **What should happen:** Either fix the CSRF/auth issue on this endpoint, or disable the client-side web-vitals reporter entirely if the endpoint isn't configured.
- **Console errors:** `Failed to load resource: the server responded with a status of 403` (multiple per page)

---

### BUG-6: `/api/ai/progress-insights` Returns 503 on Dashboard (MEDIUM)

- **Severity:** MEDIUM
- **Page/Section:** Dashboard
- **Steps to reproduce:** Load the dashboard
- **What happened:** `POST /api/ai/progress-insights` returns 503 (Service Unavailable). The dashboard shows a hardcoded fallback: "Keep up the great work! Consistency is key to reaching your fitness goals."
- **What should happen:** If AI is disabled, don't make the API call at all. The fallback message is fine but the 503 error in console is noisy.

---

### BUG-7: Volume Unit Mismatch — Shows "kg" for Imperial Users (LOW)

- **Severity:** LOW
- **Page/Section:** Dashboard stats row
- **Steps to reproduce:** Complete onboarding selecting "Imperial (lbs, ft/in)", view dashboard
- **What happened:** Stats section shows "0 kg lifted" under Volume
- **What should happen:** Should show "0 lbs lifted" since the user selected imperial units during onboarding

---

### BUG-8: Deprecated `apple-mobile-web-app-capable` Meta Tag Warning (LOW)

- **Severity:** LOW
- **Page/Section:** Every page
- **Steps to reproduce:** Load any page, check console warnings
- **What happened:** `<meta name="apple-mobile-web-app-capable" content="yes">` generates a deprecation warning on every page load
- **What should happen:** Remove or replace with modern PWA manifest configuration

---

## SECTION B — UX & PRODUCT CRITIQUE

### 1. Feature Coherence

The feature set is **ambitious and well-chosen** for a fitness app. The sidebar tells a coherent story: AI-powered coaching → workout generation → nutrition planning → workout logging → progress tracking → recovery → gamification. This is a strong vision.

**However**, the coherence breaks down in practice:

- AI features (the app's primary differentiator) are completely non-functional in production
- The dashboard shows a "Today's Workout: Push Day" but clicking "Start Workout" leads to the broken `/workouts` page (due to rate limiting)
- There's no clear flow from "generate a workout" → "do the workout" → "track the results"
- The gamification system (Level 1, Newcomer, 0 XP) exists but there's no explanation of how to earn XP

### 2. User Journey Gaps

**Critical gap: There's no working end-to-end user flow.**

- Onboarding collects excellent data (goals, stats, equipment, frequency) but doesn't lead anywhere meaningful — it loops back to step 1
- The dashboard shows "Today's Workout: Push Day" which is promising, but this is a static suggestion — you can't actually start it (rate limiting kills the workouts page)
- Even if workouts page worked, there's no visible connection between: onboarding data → AI generating personalized workouts → user executing them → progress tracking reflecting results
- The AI Coach, if it worked, doesn't appear to reference the user's onboarding data in its responses

### 3. Information Architecture

**Sidebar organization is good but bloated:**

- 11 sidebar items is a lot. Consider collapsing related items:
  - "AI Coach" + "Generate Workout" + "Nutrition Planner" → "AI Tools" (expandable)
  - "My Workouts" already has a chevron suggesting sub-items
  - "My Progress" + "Recovery" + "Achievements" → "Progress" (expandable)
- "Calculators" feels out of place among the AI-powered features — it's a utility, not a core flow
- "Schedule" is separate from "My Workouts" which is confusing — workouts should include scheduling

### 4. Value Delivery

| Feature           | Delivers Value? | Assessment                                                                                                   |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| Dashboard         | Partially       | Good overview but all zeros for new users is discouraging. "Push Day" suggestion is nice but not actionable. |
| AI Coach          | No (broken)     | Would be the #1 value driver if working. Critical to fix.                                                    |
| Generate Workout  | No (broken)     | Excellent form UI with many options. Would be very valuable if working.                                      |
| Nutrition Planner | No (broken)     | Same — great UI, broken backend.                                                                             |
| My Workouts       | No (broken)     | Can't even load the page due to rate limiting.                                                               |
| My Progress       | Unknown         | Can't test due to rate limiting.                                                                             |
| Recovery          | Unknown         | Can't test due to rate limiting.                                                                             |
| Achievements      | Unknown         | Can't test due to rate limiting. Gamification visible on dashboard.                                          |
| Calculators       | Unknown         | Can't test due to rate limiting.                                                                             |
| Schedule          | Unknown         | Can't test due to rate limiting.                                                                             |
| Settings          | Unknown         | Can't test due to rate limiting.                                                                             |

**Verdict:** The app currently delivers almost zero value because the rate limiter locks users out and AI features are disabled. Fix those two issues and the value proposition immediately jumps.

### 5. Onboarding Experience

**The onboarding flow is excellent in design:**

- 9 clear steps with good progress indication
- Appropriate questions (goals, body stats, equipment, frequency, injuries, diet)
- Nice UI with emoji icons, clear labels, and good visual hierarchy
- Profile summary at the end is a nice touch
- Sensible defaults and "recommended" badges

**Issues:**

- Completion doesn't redirect — user is stranded (BUG-3)
- No skip option for users who want to explore first
- No "I'll do this later" escape hatch
- After onboarding, the collected data isn't visibly used anywhere (AI is broken, dashboard shows generic content)
- Step 8 (workout frequency) has "3 days/week" pre-selected with a recommended badge, but Continue is already enabled — user might not notice they should actively choose

### 6. Data Flow

- Onboarding data → Dashboard: **Partially connected** (Push Day suggestion references onboarding)
- Onboarding data → AI Coach: **Unknown** (AI is broken)
- Workout logs → Dashboard stats: **Not testable** (can't access workouts page)
- Measurements → Progress: **Not testable**
- Volume unit preference → Dashboard: **Broken** (shows kg instead of lbs)

### 7. Missing Features

What a real fitness user would expect:

1. **Exercise library/database** — browsable list of exercises with instructions and videos
2. **Workout history** — log of completed workouts with dates and stats
3. **Progress photos** — ability to upload and compare physique over time
4. **1RM calculator** — may exist in Calculators (couldn't test)
5. **Rest timer** — countdown between sets during workout execution
6. **Social features** — share workouts, follow friends, community
7. **Workout templates** — save and reuse favorite routines
8. **Notifications/reminders** — push notifications for scheduled workouts
9. **Data export** — download workout history as CSV

### 8. Competitive Gap

| Feature            | GymGurus               | Strong    | Hevy         | Fitbod         |
| ------------------ | ---------------------- | --------- | ------------ | -------------- |
| Workout logging    | Broken                 | Excellent | Excellent    | Good           |
| Exercise library   | Unknown                | Huge      | Huge         | Large          |
| AI coaching        | Broken (but promising) | None      | None         | AI-powered     |
| Nutrition tracking | Broken                 | None      | None         | None           |
| Gamification       | Basic (levels/XP)      | None      | Social       | None           |
| Recovery tracking  | Unknown                | None      | None         | Recovery score |
| Price              | Free trial             | $4.99/mo  | Free/Premium | $12.99/mo      |

**Unique value proposition:** GymGurus could differentiate with the AI trifecta (coach + workout generation + nutrition planning). No competitor offers all three. But currently none of them work.

### 9. Design & Polish

**Strengths:**

- Dark theme with gold accents is visually striking and premium-feeling
- Role-themed branding (Ronin/Guru/Disciple with Japanese martial arts theme) is unique and memorable
- Sidebar navigation is clean and well-organized with icons
- Dashboard card layout is attractive with gradient backgrounds
- Onboarding UI is one of the best I've seen — emoji icons, clear steps, nice animations
- The login page role selection carousel is creative and engaging

**Weaknesses:**

- Trial banner ("14 days left") has no clear CTA — "Upgrade" goes nowhere visible
- Week calendar on dashboard shows day numbers (1-7) instead of workout status or checkmarks
- "0 workouts, 0 volume, 0 PRs, 0 streak" — all zeros is discouraging for new users. Consider hiding until there's data, or showing encouraging prompts
- The "AI Coach Suggestion" on dashboard is a static fallback message — feels like placeholder content
- Header bar text "GYM GURUS — Elite Fitness Platform" is redundant with sidebar logo — wastes horizontal space

### 10. Role System

The Ronin (solo user) experience feels **80% designed but 20% implemented:**

- Sidebar is fully populated with Ronin-specific features
- Dashboard is personalized with Ronin-appropriate content
- Onboarding is complete and role-appropriate
- But no features actually work beyond viewing the dashboard
- No visible hints about Guru (trainer) or Shihan (admin) features
- The login page shows Guru and Disciple role options — clear they exist
- No "upgrade to Guru" path visible in the Ronin experience

---

## SECTION C — FEATURE INTERACTION MAP

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Onboarding  │────▶│   Dashboard     │────▶│  AI Coach    │
│ (9 steps)   │     │ (Today's        │     │  (broken)    │
│             │     │  Workout, Stats)│     │              │
└─────────────┘     └────────┬────────┘     └──────────────┘
      │                      │
      │                      │              ┌──────────────┐
      │              ┌───────▼────────┐     │ Generate     │
      └─────────────▶│  Profile Data  │────▶│ Workout      │
        (goals,      │  (stored in DB)│     │ (broken)     │
         stats,      └───────┬────────┘     └──────────────┘
         equipment)          │
                             │              ┌──────────────┐
                     ┌───────▼────────┐     │ Nutrition    │
                     │  My Workouts   │     │ Planner      │
                     │  (broken/429)  │     │ (broken)     │
                     └───────┬────────┘     └──────────────┘
                             │
                     ┌───────▼────────┐
                     │  My Progress   │     ┌──────────────┐
                     │  (broken/429)  │     │ Recovery     │
                     └───────┬────────┘     │ (broken/429) │
                             │              └──────────────┘
                     ┌───────▼────────┐
                     │  Achievements  │     ┌──────────────┐
                     │  (broken/429)  │     │ Schedule     │
                     └────────────────┘     │ (broken/429) │
                                            └──────────────┘
CONNECTED:                               ISLANDS (no connections):
  Onboarding → Dashboard (partial)         Calculators
  Dashboard → AI Coach (link)              Schedule
  Dashboard → Recovery (link)              Settings
  Dashboard → Achievements (link)

SHOULD CONNECT BUT DON'T:
  Onboarding data → AI Coach (personalized responses)
  Generated Workout → My Workouts (save & execute)
  My Workouts → Progress (auto-track volume, PRs)
  Progress → AI Coach (reference stats in advice)
  Recovery → AI Coach (factor into workout suggestions)
  Nutrition → Dashboard (daily macro tracking widget)
  Schedule → Notifications (workout reminders)
  Achievements → Dashboard (celebration moments)
```

---

## SECTION D — PRIORITY RECOMMENDATIONS

### 1. Fix Auth Rate Limiter (CRITICAL — Quick Fix)

**What:** Exempt `GET /api/auth/user` from `authRateLimit`, or create a separate higher limit (200+/min) for session-check endpoints. The current 5/15min limit makes the app completely unusable after viewing ~5 pages.
**Why:** This single bug makes 90% of the app inaccessible. Users are locked out after visiting a few pages.
**Complexity:** Quick fix — change one line in `server/routes.ts` to apply `authRateLimit` only to `POST /api/auth/*` (login/register) routes, not `GET /api/auth/user`.

### 2. Set ANTHROPIC_API_KEY in Railway (CRITICAL — Quick Fix)

**What:** Add the `ANTHROPIC_API_KEY` environment variable in Railway dashboard.
**Why:** Three major features (AI Coach, Generate Workout, Nutrition Planner) are completely broken without it. These are the app's primary differentiators.
**Complexity:** Quick fix — add one env var in Railway dashboard.

### 3. Fix Onboarding Redirect (HIGH — Quick Fix)

**What:** After completing step 9 and clicking "Get Started", redirect to `/dashboard` instead of looping back to step 1.
**Why:** First impression is everything. New users complete 9 steps and then feel stuck.
**Complexity:** Quick fix — likely a missing `navigate('/dashboard')` call in the onboarding completion handler.

### 4. Fix Error Messages for Rate Limiting (HIGH — Quick Fix)

**What:** When the frontend receives a 429 response, show "Too many requests — please wait" instead of "Connection Error — check your internet connection."
**Why:** The current message is actively misleading and confusing. Users will think the server is down.
**Complexity:** Quick fix — add a 429 status check in the error handling component.

### 5. Reduce Dashboard API Call Flood (MEDIUM — Medium Work)

**What:** The dashboard fires 9+ parallel API calls on load. Batch these into fewer requests, or add request deduplication/caching on the client.
**Why:** Contributes to rate limiting, slow load times, and wasted server resources.
**Complexity:** Medium — requires either a batch API endpoint or client-side request optimization.

### 6. Fix Web-Vitals 403 Error Spam (MEDIUM — Quick Fix)

**What:** Either fix CSRF configuration for `/api/analytics/web-vitals` or disable the client-side reporter.
**Why:** 2-4 console errors per page load is noisy and masks real errors during debugging.
**Complexity:** Quick fix — the endpoint is already in the CSRF exclusion list, but something else (possibly rate limiting or auth) is blocking it.

### 7. Unit Consistency (Volume kg vs lbs) (MEDIUM — Quick Fix)

**What:** Dashboard volume stat should respect the user's unit preference from onboarding.
**Why:** Showing "kg" when the user selected "Imperial (lbs)" is incorrect and confusing.
**Complexity:** Quick fix — read unit preference and display accordingly.

### 8. Connect Features End-to-End (HIGH — Major Work)

**What:** Create a complete flow: Onboarding → AI generates first workout → User can execute it → Progress auto-tracks → AI references progress in coaching.
**Why:** Currently features exist as isolated islands. The magic happens when they connect.
**Complexity:** Major work — requires data flow architecture between features.

### 9. Empty State Improvements (MEDIUM — Medium Work)

**What:** Replace "0 workouts, 0 volume, 0 PRs, 0 streak" with actionable empty states like "Complete your first workout to start tracking!" with a CTA button.
**Why:** All-zero dashboards are discouraging for new users. Empty states should guide, not depress.
**Complexity:** Medium — design and implement empty state components for each widget.

### 10. Sidebar Navigation Cleanup (LOW — Medium Work)

**What:** Group related items (AI Tools, Progress), reduce from 11 to 6-7 top-level items, add collapsible sections.
**Why:** 11 sidebar items is overwhelming, especially when most don't work yet. Fewer, working items is better than many broken ones.
**Complexity:** Medium — restructure sidebar component and routing.

---

## Summary

GymGurus has a **strong vision and excellent UI design**, but is currently **non-functional in production** due to two blockers: the auth rate limiter (BUG-1) and missing AI API key (BUG-4). Fixing just these two issues would transform the app from "broken" to "impressive demo." The onboarding flow is genuinely one of the best I've seen in a fitness app — polished, thoughtful, and well-designed. The Japanese martial arts theming (Ronin/Guru/Disciple) is creative and memorable. The technical foundation is solid.

**If I could only fix three things:**

1. Auth rate limiter (makes the app usable)
2. ANTHROPIC_API_KEY (makes AI features work)
3. Onboarding redirect (makes first experience complete)

These three quick fixes would make GymGurus a genuinely compelling product demo.

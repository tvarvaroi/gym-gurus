# GymGurus -- Comprehensive Test Plan

**Version:** 1.0
**Last Updated:** 2026-02-14
**Maintainer:** Engineering Team

---

## Table of Contents

1. [Test Architecture Overview](#1-test-architecture-overview)
2. [Coverage Targets](#2-coverage-targets)
3. [Test Data Strategy](#3-test-data-strategy)
4. [CI/CD Integration Plan](#4-cicd-integration-plan)
5. [E2E Test Specs](#5-e2e-test-specs)
6. [Known Issues & Test Gaps](#6-known-issues--test-gaps)
7. [Bug Hunt Checklist](#7-bug-hunt-checklist)
8. [Performance Testing Plan](#8-performance-testing-plan)
9. [Accessibility Testing Checklist](#9-accessibility-testing-checklist)
10. [Test Environment Matrix](#10-test-environment-matrix)

---

## 1. Test Architecture Overview

GymGurus uses a three-tier testing strategy aligned with the testing pyramid:

```
        /  E2E Tests (Playwright)  \          <-- Slow, high confidence
       /   Integration Tests        \         <-- API + DB round-trips
      /    Unit Tests (Vitest)       \        <-- Fast, high volume
     /_______________________________ \
```

### 1.1 Unit Tests (Vitest)

**Location:** `__tests__/` directories co-located with source files
**Runner:** Vitest
**Scope:**

| Area                  | Examples                                                             |
| --------------------- | -------------------------------------------------------------------- |
| Calculation functions | `calculateBMI()`, `calculateAll1RM()`, `getStrengthClassification()` |
| Schema validation     | Zod insert schemas for all tables                                    |
| Utility functions     | `exportClientsToCSV()`, `exportWorkoutsToCSV()`, date helpers        |
| React hooks           | `useWebSocket`, `useUser`, `useCelebration`                          |
| State reducers        | Onboarding state machine, sidebar cookie persistence                 |

### 1.2 Integration Tests

**Location:** `server/__tests__/` and `tests/integration/`
**Runner:** Vitest with `supertest`
**Scope:**

| Area                | Examples                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| API routes          | CRUD for clients, workouts, exercises, assignments                               |
| Authentication      | Replit Auth flow, session persistence, role-based access                         |
| Middleware          | Rate limiters, `secureAuth`, `requireClientOwnership`, `requireTrainerOwnership` |
| Database operations | `storage.ts` methods (create, read, update, delete)                              |
| WebSocket           | Real-time notification delivery, connection handling                             |

### 1.3 End-to-End Tests (Playwright)

**Location:** `e2e/`
**Runner:** Playwright Test
**Scope:**

| Spec File               | Coverage                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `trainer-flow.spec.ts`  | Trainer onboarding, client CRUD, workout lifecycle, AI coach |
| `solo-flow.spec.ts`     | Solo onboarding, all calculators, gamification, achievements |
| `mobile.spec.ts`        | Responsive layouts at 375px, 390px, 768px, landscape         |
| `accessibility.spec.ts` | axe-core WCAG 2.1 AA scans, keyboard navigation, ARIA        |

---

## 2. Coverage Targets

| Layer                       | Target                    | Current (est.) | Notes                                 |
| --------------------------- | ------------------------- | -------------- | ------------------------------------- |
| Server (unit + integration) | **80%** line coverage     | ~45%           | Priority: routes, storage, middleware |
| Client (unit)               | **60%** line coverage     | ~30%           | Priority: calculation libs, hooks     |
| E2E critical paths          | **100%** of P0 flows      | ~40%           | All trainer and solo critical paths   |
| Accessibility               | **0 critical violations** | TBD            | axe-core scans on all major pages     |

### Coverage Enforcement

- `vitest --coverage` generates lcov reports
- CI fails if server coverage drops below 80%
- CI fails if client coverage drops below 60%
- Coverage badges are generated and displayed in the README

---

## 3. Test Data Strategy

### 3.1 Seed Data

The test database is seeded before each E2E run with deterministic data:

| Entity                | Count | Purpose                                                 |
| --------------------- | ----- | ------------------------------------------------------- |
| Users (trainer)       | 2     | Primary trainer + secondary trainer for isolation tests |
| Users (solo)          | 2     | Solo user with gamification data + fresh solo user      |
| Users (client)        | 3     | Assigned to primary trainer                             |
| Clients               | 5     | Mix of active, paused, inactive statuses                |
| Exercises             | 20    | Covers all 7 exercise types                             |
| Workouts              | 5     | Different categories and difficulty levels              |
| Workout Assignments   | 10    | Various statuses: scheduled, completed, missed          |
| Progress Entries      | 50    | Weight, body fat, measurements over 3 months            |
| Achievements          | 15    | Mix of earned and locked achievements                   |
| Gamification stats    | 2     | XP, levels, streaks for solo users                      |
| AI Chat Conversations | 3     | With message history for AI coach tests                 |
| Notifications         | 20    | Mix of read and unread                                  |

### 3.2 Test Data Fixtures

```typescript
// Example fixture: test-data/trainer.fixture.ts
export const TEST_TRAINER = {
  email: 'test-trainer@gymgurus.test',
  firstName: 'Test',
  lastName: 'Trainer',
  role: 'trainer' as const,
  onboardingCompleted: false,
};

export const TEST_SOLO_USER = {
  email: 'test-solo@gymgurus.test',
  firstName: 'Solo',
  lastName: 'User',
  role: 'solo' as const,
  isIndependent: true,
  onboardingCompleted: false,
};

export const TEST_CLIENT = {
  name: 'Jane Doe',
  email: 'jane.doe@gymgurus.test',
  goal: 'Weight loss and muscle building',
  status: 'active',
  age: 28,
  gender: 'female',
  height: '165',
  weight: '62',
};
```

### 3.3 Database Reset Strategy

- **Before each E2E suite:** Truncate all tables and re-seed
- **Before each integration test:** Use transactions with rollback
- **Unit tests:** No database access (mocked via `vi.mock`)

---

## 4. CI/CD Integration Plan

### 4.1 Pipeline Stages

```yaml
# .github/workflows/test.yml (conceptual)
stages:
  lint:
    - ESLint + Prettier check
    - TypeScript type checking (tsc --noEmit)

  unit-tests:
    - vitest run --coverage
    - Coverage threshold enforcement (server: 80%, client: 60%)

  integration-tests:
    - Start PostgreSQL service container
    - Run database migrations
    - Seed test data
    - vitest run --config vitest.integration.config.ts

  e2e-tests:
    - Start PostgreSQL service container
    - Build the application
    - Start the server (background)
    - Seed test data
    - npx playwright test
    - Upload test report artifacts

  accessibility:
    - Run axe-core scans (part of e2e suite)
    - Generate a11y report
```

### 4.2 Triggers

| Event                  | Tests Run                                |
| ---------------------- | ---------------------------------------- |
| Push to any branch     | Lint + Unit tests                        |
| Pull request to `main` | Lint + Unit + Integration + E2E          |
| Nightly (scheduled)    | Full suite including performance tests   |
| Release tag            | Full suite + smoke tests against staging |

### 4.3 Artifact Outputs

- Playwright HTML report (`playwright-report/`)
- Coverage report (lcov + HTML)
- axe-core accessibility report
- Performance benchmark results
- Screenshots on E2E failure

---

## 5. E2E Test Specs

### 5.1 Trainer Critical Path (`e2e/trainer-flow.spec.ts`)

| Test Case                    | Steps                                                                                    | Priority |
| ---------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Complete onboarding          | Login -> Welcome Modal -> Goal selection -> Training style -> Client count -> Completion | P0       |
| Add first client             | Navigate to /clients -> Click Add Client -> Fill form -> Submit -> Verify in list        | P0       |
| Create first workout         | Navigate to /workouts -> Create workout -> Fill details -> Save                          | P0       |
| Assign workout to client     | Open workout -> Click Assign -> Select client -> Confirm                                 | P0       |
| Dashboard stats verification | Navigate to /dashboard -> Verify client count, workout count updated                     | P0       |
| AI coach interaction         | Navigate to AI coach -> Send message -> Verify response                                  | P1       |
| CSV export                   | Dashboard -> Export button -> Verify download                                            | P1       |
| Notification center          | Dashboard -> Bell icon -> Verify panel opens                                             | P2       |
| Client details navigation    | Clients list -> Click client -> Verify details page                                      | P1       |

### 5.2 Solo User Critical Path (`e2e/solo-flow.spec.ts`)

| Test Case                      | Steps                                                         | Priority |
| ------------------------------ | ------------------------------------------------------------- | -------- |
| Complete solo onboarding       | Login -> Welcome Modal -> Fitness level -> Goal -> Completion | P0       |
| All calculator pages load      | Visit each of 13 calculator routes -> Verify no errors        | P0       |
| BMI calculator computes        | Enter weight + height -> Verify BMI value and category        | P0       |
| 1RM calculator computes        | Enter weight + reps -> Verify estimated 1RM                   | P0       |
| Strength standards classifies  | Enter bodyweight + lifts -> Verify classification             | P0       |
| Calculator edge cases          | Zero, negative, extreme values -> No NaN/crash                | P1       |
| Achievements page loads        | Navigate to /solo/achievements -> Verify content              | P1       |
| Gamification API returns stats | GET /api/gamification/stats -> Verify response shape          | P1       |
| AI Coach page loads            | Navigate to /solo/coach -> Verify chat input                  | P1       |
| Recovery page loads            | Navigate to /solo/recovery -> Verify content                  | P2       |

### 5.3 Mobile Viewport (`e2e/mobile.spec.ts`)

| Test Case                     | Viewport | Priority |
| ----------------------------- | -------- | -------- |
| Landing page no overflow      | 375px    | P0       |
| Mobile navigation (hamburger) | 375px    | P0       |
| BMI calculator usable         | 375px    | P0       |
| 1RM calculator usable         | 375px    | P1       |
| Strength standards usable     | 375px    | P1       |
| Dashboard responsive          | 375px    | P0       |
| All calculators no overflow   | 375px    | P1       |
| Touch target sizes (44x44px)  | 375px    | P1       |
| Calculator hub grid           | 390px    | P1       |
| Sidebar behavior on tablet    | 768px    | P2       |
| Landscape orientation         | 667x375  | P2       |

### 5.4 Accessibility (`e2e/accessibility.spec.ts`)

| Test Case                       | Tool              | Priority |
| ------------------------------- | ----------------- | -------- |
| Landing page axe scan           | axe-core          | P0       |
| Dashboard axe scan              | axe-core          | P0       |
| All calculator pages axe scan   | axe-core          | P0       |
| Solo pages axe scan             | axe-core          | P1       |
| Skip-to-content link            | Manual/Playwright | P1       |
| Tab order logical flow          | Manual/Playwright | P1       |
| Dialog focus trapping           | Manual/Playwright | P1       |
| Heading hierarchy               | Manual/Playwright | P1       |
| Images have alt text            | Manual/Playwright | P1       |
| Form inputs have labels         | Manual/Playwright | P1       |
| Buttons have accessible names   | Manual/Playwright | P1       |
| Respects prefers-reduced-motion | Manual/Playwright | P2       |
| Readable at 200% zoom           | Manual/Playwright | P2       |

---

## 6. Known Issues & Test Gaps

### 6.1 Known Issues

| ID     | Issue                                                    | Severity | Status |
| ------ | -------------------------------------------------------- | -------- | ------ |
| KI-001 | Notification polling may cause 503 under high load       | Major    | Open   |
| KI-002 | CSV export fails silently when no data exists            | Minor    | Open   |
| KI-003 | AI coach response timeout on slow connections (>30s)     | Major    | Open   |
| KI-004 | Calculator range slider values reset on unit toggle      | Minor    | Open   |
| KI-005 | WebSocket reconnection can cause duplicate notifications | Minor    | Open   |
| KI-006 | Workout assignment status not real-time updated          | Minor    | Open   |
| KI-007 | Mobile sidebar overlay does not trap focus               | Moderate | Open   |
| KI-008 | Strength standards NaN when bodyweight is 0              | Minor    | Open   |

### 6.2 Test Gaps

| Area                          | Gap                                           | Priority to Address |
| ----------------------------- | --------------------------------------------- | ------------------- |
| Payment flow (Stripe)         | No E2E tests for payment plans, invoices      | High                |
| WebSocket stability           | No load testing for concurrent WS connections | High                |
| Client intake (PAR-Q)         | No tests for health screening form            | Medium              |
| Meal planning & nutrition     | No tests for meal plan CRUD                   | Medium              |
| Shopping list generation      | No tests for grocery API integration          | Low                 |
| Leaderboard calculations      | No tests for rank computation accuracy        | Medium              |
| Multi-timezone scheduling     | No tests for timezone edge cases (DST)        | High                |
| File uploads (profile images) | No tests for image upload/display             | Low                 |

---

## 7. Bug Hunt Checklist

Use this checklist during dedicated bug hunt sessions. Each item describes a specific scenario to test manually and the expected behavior.

### 7.1 Server Errors (503, 500)

- [ ] **503 on notification polling:** Open the dashboard and leave it idle for 5+ minutes. Monitor the browser console and network tab for 503 responses from `/api/notifications`. Expected: The client should retry gracefully without error toasts flooding the UI.
- [ ] **503 on rapid page navigation:** Click through Dashboard -> Clients -> Workouts -> Exercises -> Schedule rapidly (within 2 seconds). Expected: No 503 errors; rate limiters should queue, not reject.
- [ ] **500 on invalid client ID:** Navigate to `/clients/nonexistent-uuid`. Expected: 404 page, not a 500 server error.
- [ ] **500 on malformed workout assignment:** Attempt to create a workout assignment with a past date via API. Expected: Validation error (400), not 500.

### 7.2 Notification System

- [ ] **Polling interval:** Verify notifications poll at the configured interval (not more frequently than every 30 seconds).
- [ ] **Duplicate notifications:** Assign a workout, then unassign and reassign. Verify the client does not receive duplicate notifications.
- [ ] **Notification read state:** Mark a notification as read, refresh the page, verify it stays read.
- [ ] **Empty state:** New user with no notifications should see "No notifications" message, not a loading spinner forever.

### 7.3 CSV Export

- [ ] **Export with data:** Export clients CSV from dashboard with 5+ clients. Verify the file contains all client fields (name, email, goal, status, age, gender).
- [ ] **Export with no data:** Export clients CSV when the trainer has zero clients. Expected: Empty CSV with headers only, or a "No data to export" message.
- [ ] **Export with special characters:** Add a client with unicode characters in the name (e.g., "Jose Garcia"). Export CSV and verify encoding is correct.
- [ ] **Large export:** Export with 500+ clients. Verify the download completes within 10 seconds and the file is not truncated.

### 7.4 AI Coach Fallback

- [ ] **API key missing:** Remove the AI API key from environment. Send a message to AI coach. Expected: User-friendly error message ("AI coach is temporarily unavailable"), not a raw error.
- [ ] **Rate limit exceeded:** Send 15+ messages rapidly to AI coach. Expected: Rate limit message is displayed, previous messages are preserved.
- [ ] **Long response:** Ask a complex question that generates a long response. Verify the response renders fully without truncation.
- [ ] **Network timeout:** Simulate slow network (throttle to 2G in DevTools). Send a message. Expected: Loading indicator shown, timeout after 30s with retry option.

### 7.5 Calculator Edge Cases

- [ ] **BMI with zero height:** Set height to 0. Expected: No NaN/Infinity, show a "Please enter a valid height" message or default to 0.
- [ ] **BMI with zero weight:** Set weight to 0. Expected: BMI shows 0 or a prompt.
- [ ] **1RM with 1 rep:** Enter weight=100, reps=1. Expected: 1RM = 100 (input weight).
- [ ] **1RM with 30 reps:** Enter weight=50, reps=30. Expected: Reasonable estimate, no NaN.
- [ ] **Strength standards with extreme bodyweight:** Enter bodyweight=30kg and bodyweight=200kg. Verify classifications are reasonable.
- [ ] **TDEE with all activity levels:** Cycle through each activity level. Verify TDEE changes appropriately.
- [ ] **Body fat with missing measurements:** Leave some circumference fields empty. Expected: Graceful handling, not a crash.
- [ ] **Unit conversion accuracy:** Toggle between metric and imperial. Verify that the displayed values convert correctly (1 kg = 2.20462 lbs, 1 cm = 0.393701 in).

### 7.6 Authentication & Authorization

- [ ] **Session expiry:** Log in, wait for session to expire (or manually clear cookies), then try to navigate. Expected: Redirect to login, not a blank page.
- [ ] **Role enforcement:** Log in as a solo user and navigate to `/clients`. Expected: Access denied or redirect, not trainer data.
- [ ] **Concurrent sessions:** Log in from two browsers simultaneously. Verify both sessions work independently.
- [ ] **CSRF protection:** Attempt a POST to `/api/clients` without proper session cookie. Expected: 401 or 403.

### 7.7 Data Integrity

- [ ] **Concurrent client updates:** Open the same client in two tabs. Edit the name in both tabs and save both. Verify no data corruption.
- [ ] **Workout deletion cascade:** Delete a workout that has assignments. Verify the assignments are also removed.
- [ ] **Client deletion cascade:** Delete a client with progress entries, appointments, and assignments. Verify all related records are cleaned up.

---

## 8. Performance Testing Plan

### 8.1 Seed Data for Load Testing

Generate realistic volumes of data for performance testing:

| Entity              | Load Test Volume | Realistic Max |
| ------------------- | ---------------- | ------------- |
| Users (trainers)    | 100              | 10,000        |
| Users (solo)        | 1,000            | 100,000       |
| Clients             | 5,000            | 50,000        |
| Exercises           | 500              | 1,000         |
| Workouts            | 10,000           | 100,000       |
| Workout Assignments | 50,000           | 500,000       |
| Progress Entries    | 200,000          | 2,000,000     |
| Notifications       | 100,000          | 1,000,000     |
| AI Chat Messages    | 50,000           | 500,000       |

### 8.2 Load Testing Tools

| Tool              | Purpose                                       |
| ----------------- | --------------------------------------------- |
| **k6** (Grafana)  | HTTP load testing for API endpoints           |
| **Artillery**     | WebSocket load testing for real-time features |
| **Lighthouse CI** | Client-side performance audits in CI          |
| **Web Vitals**    | Real User Monitoring (RUM) for CWV metrics    |

### 8.3 Performance Benchmarks

| Metric                             | Target          | Method           |
| ---------------------------------- | --------------- | ---------------- |
| **Time to First Byte (TTFB)**      | < 200ms         | Lighthouse / k6  |
| **Largest Contentful Paint (LCP)** | < 2.5s          | Lighthouse       |
| **First Input Delay (FID)**        | < 100ms         | Web Vitals       |
| **Cumulative Layout Shift (CLS)**  | < 0.1           | Lighthouse       |
| **API response time (p95)**        | < 500ms         | k6               |
| **API response time (p99)**        | < 1000ms        | k6               |
| **Dashboard load time**            | < 3s            | E2E timer        |
| **Calculator page load time**      | < 1.5s          | Lighthouse       |
| **WebSocket connection time**      | < 500ms         | Artillery        |
| **Bundle size (gzipped)**          | < 300KB initial | Webpack analyzer |

### 8.4 Load Test Scenarios

#### Scenario 1: Dashboard Load under Concurrency

```
# k6 script concept
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '2m',  target: 50 },   // Hold at 50 users
    { duration: '30s', target: 200 },  // Spike to 200 users
    { duration: '1m',  target: 200 },  // Hold at 200 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
};
```

#### Scenario 2: Notification Polling Storm

- 200 concurrent users polling `/api/notifications` every 30 seconds
- Expected: Server maintains < 500ms p95 response time
- Watch for: Connection pool exhaustion, 503 errors

#### Scenario 3: Workout Assignment Bulk Create

- Create 100 workout assignments in rapid succession
- Expected: All succeed within 30 seconds
- Watch for: Database lock contention, timeout errors

#### Scenario 4: Calculator API under Load

- 500 concurrent requests to `/api/calculators/strength-standards`
- Expected: < 200ms p95 (calculator endpoints are lightweight)

### 8.5 Database Query Analysis

**Queries to Profile:**

| Query                             | Expected Performance | Index Strategy                            |
| --------------------------------- | -------------------- | ----------------------------------------- |
| Get trainer's clients             | < 10ms               | `idx_clients_trainer_id`                  |
| Get client's workout assignments  | < 10ms               | `idx_workout_assignments_client_id`       |
| Get workout with exercises        | < 20ms               | `idx_workout_exercises_workout_id` + join |
| Get user notifications (unread)   | < 15ms               | `idx_notifications_user_feed` (composite) |
| Get gamification stats            | < 5ms                | `idx_user_gamification_user_id` (unique)  |
| Get progress entries (date range) | < 20ms               | `idx_progress_entries_client_type_date`   |
| Get leaderboard (top 50)          | < 30ms               | `idx_leaderboard_entries_rank`            |
| Aggregate weekly workout volume   | < 50ms               | `idx_workout_assignments_week`            |

**Tools for Query Analysis:**

- `EXPLAIN ANALYZE` on all critical queries
- `pg_stat_statements` for identifying slow queries in production
- Connection pool monitoring via `pgBouncer` or Drizzle pool stats

### 8.6 Client-Side Performance

**Lighthouse Audits (targets):**

| Page           | Performance | Accessibility | Best Practices | SEO  |
| -------------- | ----------- | ------------- | -------------- | ---- |
| Landing page   | > 90        | > 90          | > 90           | > 90 |
| Dashboard      | > 80        | > 85          | > 90           | N/A  |
| Calculators    | > 90        | > 90          | > 90           | > 90 |
| Client details | > 80        | > 85          | > 90           | N/A  |

**Bundle Analysis:**

- Use `vite-plugin-visualizer` to identify large dependencies
- Verify code splitting: each calculator page is a separate chunk
- Lazy-loaded routes should not block initial render
- Target: Initial bundle < 300KB gzipped, route chunks < 50KB each

---

## 9. Accessibility Testing Checklist

### WCAG 2.1 Level AA Compliance

#### Perceivable

- [ ] **1.1.1 Non-text Content:** All images have alt text. Decorative images use `alt=""` or `role="presentation"`.
- [ ] **1.2.1 Audio/Video:** Auto-playing video on landing page is muted; no audio-only content.
- [ ] **1.3.1 Info and Relationships:** Headings follow h1 -> h2 -> h3 hierarchy. Form inputs have labels.
- [ ] **1.3.2 Meaningful Sequence:** DOM order matches visual order.
- [ ] **1.3.3 Sensory Characteristics:** Instructions do not rely solely on color (e.g., "click the red button").
- [ ] **1.4.1 Use of Color:** BMI categories use color + text labels. Strength standards use color + label.
- [ ] **1.4.3 Contrast (Minimum):** Text contrast ratio >= 4.5:1 for normal text, >= 3:1 for large text.
- [ ] **1.4.4 Resize Text:** Content readable at 200% zoom without loss of information.
- [ ] **1.4.10 Reflow:** Content reflows at 320px width without horizontal scrolling.
- [ ] **1.4.11 Non-text Contrast:** UI components (buttons, inputs) have >= 3:1 contrast against background.

#### Operable

- [ ] **2.1.1 Keyboard:** All interactive elements are keyboard accessible.
- [ ] **2.1.2 No Keyboard Trap:** Focus can be moved away from any component.
- [ ] **2.4.1 Bypass Blocks:** "Skip to main content" link is present and functional.
- [ ] **2.4.2 Page Titled:** Each page has a descriptive `<title>` (via `useSEO` hook).
- [ ] **2.4.3 Focus Order:** Tab order follows logical reading order.
- [ ] **2.4.4 Link Purpose:** Links have descriptive text (not "click here").
- [ ] **2.4.6 Headings and Labels:** Headings and labels are descriptive.
- [ ] **2.4.7 Focus Visible:** Keyboard focus indicator is visible on all interactive elements.
- [ ] **2.5.5 Target Size:** Touch targets are at least 44x44 CSS pixels.

#### Understandable

- [ ] **3.1.1 Language of Page:** `<html lang="en">` is set.
- [ ] **3.2.1 On Focus:** No unexpected context changes on focus.
- [ ] **3.2.2 On Input:** Unit toggle buttons change results without unexpected side effects.
- [ ] **3.3.1 Error Identification:** Form validation errors are announced to screen readers.
- [ ] **3.3.2 Labels or Instructions:** Calculator inputs have clear labels indicating expected values and units.

#### Robust

- [ ] **4.1.1 Parsing:** HTML is valid (no duplicate IDs, proper nesting).
- [ ] **4.1.2 Name, Role, Value:** Custom components expose proper ARIA roles and states.
- [ ] **4.1.3 Status Messages:** Toast notifications use `role="alert"` or `aria-live`.

### Screen Reader Testing

| Screen Reader | Browser          | Pages to Test                              |
| ------------- | ---------------- | ------------------------------------------ |
| NVDA          | Chrome (Windows) | Dashboard, BMI Calculator, Client form     |
| VoiceOver     | Safari (macOS)   | Landing page, 1RM Calculator, Achievements |
| TalkBack      | Chrome (Android) | Mobile dashboard, Calculator hub           |

### Keyboard Testing Matrix

| Action            | Key(s)        | Pages                           |
| ----------------- | ------------- | ------------------------------- |
| Navigate forward  | Tab           | All pages                       |
| Navigate backward | Shift+Tab     | All pages                       |
| Activate button   | Enter / Space | All pages                       |
| Close dialog      | Escape        | Modals, dropdowns               |
| Navigate dropdown | Arrow keys    | Select elements, dropdown menus |
| Submit form       | Enter         | Client form, workout form       |

---

## 10. Test Environment Matrix

### Browser Matrix

| Browser | Version | OS                   | Priority |
| ------- | ------- | -------------------- | -------- |
| Chrome  | Latest  | Windows 10/11, macOS | P0       |
| Firefox | Latest  | Windows 10/11, macOS | P1       |
| Safari  | Latest  | macOS, iOS           | P1       |
| Edge    | Latest  | Windows 10/11        | P2       |
| Chrome  | Latest  | Android              | P1       |
| Safari  | Latest  | iOS                  | P1       |

### Device Matrix

| Device            | Viewport  | OS            | Priority |
| ----------------- | --------- | ------------- | -------- |
| iPhone SE         | 375x667   | iOS           | P0       |
| iPhone 14         | 390x844   | iOS           | P0       |
| iPhone 14 Pro Max | 430x932   | iOS           | P1       |
| Pixel 7           | 412x915   | Android       | P1       |
| iPad Mini         | 768x1024  | iPadOS        | P1       |
| iPad Air          | 820x1180  | iPadOS        | P2       |
| Desktop 1080p     | 1920x1080 | Windows/macOS | P0       |
| Desktop 1440p     | 2560x1440 | macOS         | P2       |

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Appendix: Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test -- --coverage

# Integration tests
npm run test:integration

# E2E tests (all)
npx playwright test

# E2E tests (specific file)
npx playwright test e2e/trainer-flow.spec.ts

# E2E tests (headed mode for debugging)
npx playwright test --headed

# E2E tests (specific project/browser)
npx playwright test --project=chromium

# Accessibility tests only
npx playwright test e2e/accessibility.spec.ts

# Mobile tests only
npx playwright test e2e/mobile.spec.ts

# Generate and view Playwright report
npx playwright show-report
```

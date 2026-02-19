# Phase 1: Code Health Assessment

**Audit Date:** 2026-02-17
**Skills Used:** code-health-assessor, clean-code, coding-standards, typescript-expert

---

## Health Score Card (/80)

| Dimension                  | Score    | Evidence                                                                                 |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| File Size & Complexity     | **4/10** | 25 files over 500-line threshold; 4 files in NIGHTMARE tier (>1500 lines)                |
| Dead Code & Unused Exports | **5/10** | 12 unused npm packages (~80-100MB waste); some unreferenced files                        |
| Duplication                | **4/10** | Calculator pages 60-70% duplicated; `calculateBMR` has 3 independent copies              |
| Type Safety                | **4/10** | ~372 type escapes; `(req.user as any).id` appears 65 times; no Express type augmentation |
| Dependencies               | **5/10** | 12 unused packages; `react-icons` (65MB, 0 imports); some outdated                       |
| Pattern Consistency        | **5/10** | Mixed `apiRequest()` vs raw `fetch()`; inconsistent form handling; no import ordering    |
| Architecture               | **5/10** | Monolithic `routes.ts` (2035 lines); unused error handler system; good state management  |
| Debug Artifacts            | **7/10** | 38 console.log debug leftovers; 0 debugger/FIXME/HACK; clean overall                     |

### **TOTAL: 39/80 — Moderate Tech Debt**

**Rating: 40-60 range = "Moderate tech debt. Ship-worthy with known risks."**

---

## Step 1: File Size Audit

### Executive Summary

| Severity                       | Count  | Threshold                 |
| ------------------------------ | ------ | ------------------------- |
| NIGHTMARE (>1500 lines)        | 4      | Immediate action required |
| CODE SMELL (>1000 lines)       | 4      | Split soon                |
| MUST SPLIT (>800 lines)        | 5      | Plan for next sprint      |
| SHOULD SPLIT (>500 lines)      | 14+    | Address when touching     |
| **Total files over threshold** | **27** |                           |

### Top 30 Largest Files

| Rank | Lines | Severity     | File                                                         |
| ---- | ----- | ------------ | ------------------------------------------------------------ |
| 1    | 2,035 | NIGHTMARE    | `server/routes.ts`                                           |
| 2    | 1,559 | NIGHTMARE    | `client/src/pages/WorkoutExecution.tsx`                      |
| 3    | 1,556 | NIGHTMARE    | `client/src/pages/ClientDetailsPage.tsx`                     |
| 4    | 1,502 | NIGHTMARE    | `shared/schema.ts`                                           |
| 5    | 1,369 | CODE SMELL   | `server/storage.ts`                                          |
| 6    | 1,290 | CODE SMELL   | `client/src/pages/SchedulePage.tsx`                          |
| 7    | 1,079 | CODE SMELL   | `client/src/components/LoginPage.tsx`                        |
| 8    | 974   | CODE SMELL   | `client/src/components/landing/pages/LoginCarouselPage.tsx`  |
| 9    | 947   | MUST SPLIT   | `server/memoryStorage.ts`                                    |
| 10   | 841   | MUST SPLIT   | `server/seed.ts`                                             |
| 11   | 836   | MUST SPLIT   | `server/test/routes/calculators.test.ts`                     |
| 12   | 816   | MUST SPLIT   | `client/src/pages/WorkoutBuilder.tsx`                        |
| 13   | 784   | SHOULD SPLIT | `client/src/components/onboarding/WelcomeModal.tsx`          |
| 14   | 776   | SHOULD SPLIT | `client/src/pages/ProgressPage.tsx`                          |
| 15   | 733   | SHOULD SPLIT | `client/src/App.tsx`                                         |
| 16   | 733   | SHOULD SPLIT | `client/src/components/dashboard/ClientDashboard.tsx`        |
| 17   | 728   | SHOULD SPLIT | `client/src/components/ui/sidebar.tsx` (3rd-party — skip)    |
| 18   | 695   | SHOULD SPLIT | `client/src/pages/WorkoutPlans.tsx`                          |
| 19   | 686   | SHOULD SPLIT | `client/src/pages/solo/SoloDashboard.tsx`                    |
| 20   | 656   | SHOULD SPLIT | `client/src/pages/solo/WorkoutGenerator.tsx`                 |
| 21   | 630   | SHOULD SPLIT | `client/src/components/WeeklyWorkoutView.tsx`                |
| 22   | 610   | SHOULD SPLIT | `client/src/components/layout/AppHeader.tsx`                 |
| 23   | 609   | SHOULD SPLIT | `server/test/routes/workouts.test.ts`                        |
| 24   | 590   | SHOULD SPLIT | `server/services/aiService.ts`                               |
| 25   | 585   | SHOULD SPLIT | `client/src/components/gamification/AchievementBadgeSVG.tsx` |
| 26   | 581   | SHOULD SPLIT | `client/src/pages/ExercisesPage.tsx`                         |
| 27   | 570   | SHOULD SPLIT | `client/src/components/ClientFormModal.tsx`                  |
| 28   | 567   | SHOULD SPLIT | `client/src/components/ClientIntakeForm.tsx`                 |
| 29   | 552   | SHOULD SPLIT | `client/src/components/landing/pages/PricingPage.tsx`        |
| 30   | 530   | SHOULD SPLIT | `client/src/pages/calculators/VO2MaxCalc.tsx`                |

### NIGHTMARE Files — Detailed Analysis

**1. `server/routes.ts` (2,035 lines)** — Monolithic Express route handler with 12+ domains (auth, clients, exercises, workouts, assignments, progress, sessions, appointments, settings, analytics, messages, WebSocket). Already delegates some to sub-routers but retains ~50 inline handlers. **Split into domain-specific route files.**

**2. `client/src/pages/WorkoutExecution.tsx` (1,559 lines)** — Full workout execution: exercise step-through, set logging, rest timer, progressive overload, PR detection, sound effects, swipe gestures. 6+ responsibilities. **Extract into orchestrator + ExerciseStep + SetLogger + WorkoutSummary + useWorkoutExecution hook.**

**3. `client/src/pages/ClientDetailsPage.tsx` (1,556 lines)** — 5-tab client detail view (Overview, Workouts, Progress, Sessions, Intake) with biometric calculations, charts, and inline modals. 7+ responsibilities. **Extract each tab into its own component.**

**4. `shared/schema.ts` (1,502 lines)** — ALL Drizzle ORM table definitions for 30+ tables, relations, insert schemas, and type exports. 8+ domains. **Split into domain-grouped schema modules with index re-export.**

### Duplication Alert

`LoginPage.tsx` (1,079 lines) and `LoginCarouselPage.tsx` (974 lines) share ~60% identical code: ShimmerParticle component, 3D parallax card, role descriptions, animation configs. Combined 2,053 lines with ~1,200 lines duplicated.

---

## Step 2: Dead Code Audit

### Unused npm Packages (HIGH Priority — Remove Immediately)

| Package                     | Evidence                             | Savings |
| --------------------------- | ------------------------------------ | ------- |
| `react-icons`               | 0 imports in source code             | ~65MB   |
| `passport-local`            | 0 imports (abandoned since 2015)     | Small   |
| `memorystore`               | 0 imports                            | Small   |
| `next-themes`               | 0 imports (custom theme system used) | Small   |
| `tw-animate-css`            | 0 references anywhere                | Small   |
| `react-confetti`            | 0 imports                            | Small   |
| `@stripe/react-stripe-js`   | 0 imports (no client-side Stripe)    | Medium  |
| `@stripe/stripe-js`         | 0 imports                            | Medium  |
| `tsconfig-paths`            | 0 imports (Vite handles aliases)     | Small   |
| `@jridgewell/trace-mapping` | 0 imports (accidental direct dep)    | Small   |
| `zod-validation-error`      | 0 imports                            | Small   |
| `@tailwindcss/vite` (dev)   | Not in vite.config.ts                | Small   |

**Estimated savings: ~80-100MB from node_modules**

### @types in Wrong Section (Move to devDependencies)

`@types/bcryptjs`, `@types/compression`, `@types/cookie`, `@types/memoizee`, `@types/pg`

### Potentially Unreferenced Files

- `server/redis.ts` — Exports `initRedis()`, `getRedisStore()`, etc. but no server file imports from it. May be dead code or missing integration.
- `client/src/components/ui/checkbox.tsx` — UI component exists but 0 imports found.
- `server/middleware/errorHandler.ts` — Complete error handler implementation that is never registered in `server/index.ts`.

### TODO Comments (Legitimate Feature Markers)

| File                            | Line | Content                                            |
| ------------------------------- | ---- | -------------------------------------------------- |
| `server/routes/shopping.ts`     | 350  | `// TODO: Fetch meal plan and extract ingredients` |
| `server/routes/gamification.ts` | 175  | `// TODO: Implement actual leaderboard queries`    |

---

## Step 3: Type Safety Audit

### Summary

| Category                           | Count    |
| ---------------------------------- | -------- |
| `: any` / `<any>` type annotations | ~210     |
| `as any` casts                     | ~160     |
| `as unknown` casts                 | 1        |
| `@ts-ignore` directives            | 0        |
| `@ts-expect-error` directives      | 0        |
| `eslint-disable` comments          | 1        |
| **Total type escapes**             | **~372** |

### The #1 Systemic Issue: `(req.user as any).id`

This pattern appears **~65 times** across server code because no Express Request type augmentation exists. A single `.d.ts` file would eliminate all 65 instances.

**Files affected:** `routes.ts` (~30), `recovery.ts` (8), `payments.ts` (8), `gamification.ts` (10), `solo.ts` (8), `strength.ts` (7), `notifications.ts` (4), `ai.ts` (4), and more.

### Frontend Type Gaps

- **`useQuery<any>`** — At least 15 instances where React Query hooks use `any` instead of proper response types
- **`onError: (error: any)`** — 15+ mutation error callbacks typed as `any` instead of `Error`
- **Array iterator params** — 20+ `.map()`, `.filter()`, `.reduce()` callbacks use `(item: any)`
- **Component props** — `user: any`, `icon: any`, `chartData: any` across dashboard components

### Structural Assessment

| Question                 | Answer                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Are API responses typed? | **No.** `apiRequest()` returns raw `Response`. Most `useQuery` calls parameterized with `any`. |
| Are form values typed?   | **Partially.** react-hook-form + Zod in 5 modal components. Raw useState elsewhere.            |
| Are DB results typed?    | **Partially.** `IStorage` has 6 methods returning `Promise<any>` or `Promise<any[]>`.          |
| Do shared types exist?   | **Yes but underused.** `shared/schema.ts` exports ~50 types. Only 8 client files import them.  |

### Top 10 Fixes by Impact

1. Add Express Request type augmentation (eliminates ~65 casts)
2. Type all `useQuery<>` generics with shared types (eliminates ~15 `any`)
3. Type `IStorage` return values (eliminates 6 interface-level `any`)
4. Replace `onError: (error: any)` with `(error: Error)` (eliminates ~15)
5. Type `catch (err: any)` blocks to `catch (err: unknown)` (eliminates ~10)
6. Type dashboard component props (eliminates ~10)
7. Type WorkoutPlans component props (eliminates ~14)
8. Add WebSocket type augmentation (eliminates ~5)
9. Add Express Session type augmentation (eliminates 3)
10. Type Stripe webhook handlers (eliminates 6)

---

## Step 4: Copy-Paste Detection

### 1. Calculator Pages (CRITICAL — 60-70% Structural Duplication)

All 12 calculators duplicate identical boilerplate:

| Pattern                                       | Occurrences | Wasted Lines |
| --------------------------------------------- | ----------- | ------------ |
| `useSEO()` block with JSON-LD                 | 12 files    | ~180         |
| `<Breadcrumbs>` component                     | 12 files    | ~72          |
| Header block (icon + h1 + subtitle)           | 12 files    | ~96          |
| `<RelatedCalculators>` + `<LeadCapturePopup>` | 12 files    | ~24          |
| Info/disclaimer note                          | 11 files    | ~55          |
| Gender toggle (Male/Female)                   | 6 files     | ~72          |
| Unit toggle (Metric/Imperial)                 | 4 files     | ~48          |

**Business logic duplication:** `calculateBMR()` (Mifflin-St Jeor formula) exists in **3 independent copies**: `TDEECalc.tsx`, `MacroCalc.tsx`, and `biometricCalculations.ts`. Activity level multipliers also duplicated 3x.

**Fix:** Create `<CalculatorLayout>` wrapper component (~500 lines saved) + extract shared calculation utils.

### 2. Server Error Handling (MODERATE — 25-30%)

| Pattern                                  | Count |
| ---------------------------------------- | ----- |
| `} catch (error)` blocks                 | 51    |
| `res.status(500).json({ error: '...' })` | 41    |
| `if (error instanceof ZodError)` checks  | 12    |
| `const trainerId = (req.user as any).id` | 17    |

**Fix:** Create `asyncHandler` wrapper + `getTrainerId(req)` utility.

### 3. Form Modals (MODERATE — 40-50%)

`ClientFormModal.tsx` and `WorkoutFormModal.tsx` have identical structure for create/update/delete mutations (18 lines per mutation x 3 = 54 lines duplicated per modal).

**Fix:** Create `useCrudMutations` hook.

### 4. API Call Pattern Inconsistency (MODERATE)

| Pattern        | Count     | CSRF Protected? |
| -------------- | --------- | --------------- |
| `apiRequest()` | 23 calls  | Yes             |
| Raw `fetch()`  | ~30 calls | **No**          |

**Fix:** Migrate all raw `fetch()` mutations to `apiRequest()` (CSRF security concern).

---

## Step 5: Debug Artifacts

| Category               | Count     | Action Needed?                         |
| ---------------------- | --------- | -------------------------------------- |
| `console.log`          | 163 total | **38 are debug leftovers**             |
| `console.warn`         | 36        | All intentional (graceful degradation) |
| `console.error`        | 111       | All intentional (error handling)       |
| `TODO`                 | 2         | Legitimate feature markers             |
| `FIXME`                | 0         | Clean                                  |
| `HACK`                 | 0         | Clean                                  |
| `alert()`              | 7         | All in XSS test data (safe)            |
| `debugger`             | 0         | Clean                                  |
| `localhost`            | 9         | All in test/config (expected)          |
| `PLACEHOLDER` / `TEMP` | 0         | Clean                                  |

### Debug Leftovers to Clean (38 total)

**HIGH PRIORITY (Production noise / data exposure):**

- `server/routes.ts` — 22 debug console.logs logging user emails, client IDs, request data (lines 468-477, 711-721, 999-1005, 1043-1048)
- `server/storage.ts` — 5 debug logs (lines 382, 426, 570, 582, 625)
- `client/src/pages/SchedulePage.tsx` — 4 debug logs (lines 208-235)
- `client/src/pages/ClientDetailsPage.tsx` — 2 debug logs (lines 840, 854)

**MEDIUM PRIORITY (Cosmetic):**

- `client/src/components/LoginPage.tsx` — 5 video lifecycle debug logs
- `client/src/lib/web-vitals.ts` — 1 noisy web vitals log
- `client/src/hooks/useGamification.ts` — 1 level-up debug log

---

## Step 6: Pattern Consistency

| Area               | Score    | Key Issue                                                                               |
| ------------------ | -------- | --------------------------------------------------------------------------------------- |
| API Calls          | **4/10** | `apiRequest()` exists but 60%+ uses raw `fetch()` — CSRF tokens missing on mutations    |
| Forms              | **5/10** | react-hook-form + Zod in modals; raw useState elsewhere; shared validators unused       |
| State Management   | **8/10** | React Query used consistently; one Context for auth; clean                              |
| Error Handling     | **5/10** | Two error handler systems (one unused); `asyncHandler` never used; manual try/catch x51 |
| File Naming        | **6/10** | Components PascalCase; hooks split between kebab-case and camelCase                     |
| Import Ordering    | **3/10** | No enforced order; mixed alias/relative paths in same file                              |
| ESLint/Prettier    | **7/10** | Properly configured with pre-commit hooks; missing import plugin                        |
| Component Patterns | **6/10** | Mixed export styles (default vs named); hooks-at-top mostly followed                    |

**Overall Pattern Consistency: 5.5/10**

---

## Step 7: Dependencies Audit

### Lockfile Status

- `package-lock.json` committed to git (correct)
- No conflicting lockfiles (yarn.lock, pnpm-lock.yaml)

### Dependency Counts

- Direct dependencies: 78
- Direct devDependencies: 22
- Total direct: ~100

### Outdated Packages (Notable)

| Package             | Current | Latest | Notes                                  |
| ------------------- | ------- | ------ | -------------------------------------- |
| `passport-local`    | ^1.0.0  | 1.0.0  | **Abandoned (2015). UNUSED — remove.** |
| `tailwindcss` (dev) | ^3.4.17 | 4.x    | Major upgrade available                |
| `vite` (dev)        | ^5.4.19 | 6.x    | Major upgrade available                |
| `typescript` (dev)  | 5.6.3   | 5.7+   | Pinned, minor behind                   |

### Duplicate Functionality

| Issue                 | Packages                                                                   | Action                      |
| --------------------- | -------------------------------------------------------------------------- | --------------------------- |
| Two icon libraries    | `lucide-react` (98 files) + `react-icons` (0 files)                        | **Remove `react-icons`**    |
| Two animation systems | `tailwindcss-animate` (used) + `tw-animate-css` (unused)                   | **Remove `tw-animate-css`** |
| Two session stores    | `connect-pg-simple` + `connect-redis` (both used) + `memorystore` (unused) | **Remove `memorystore`**    |

**NOTE:** `npm audit` and `npm outdated` were not run directly. Run manually for real-time vulnerability data.

---

## Prioritized Refactoring Backlog

### Critical (Security / Data Exposure)

1. **Migrate raw `fetch()` mutations to `apiRequest()`** — CSRF tokens missing on ~30 state-changing requests
2. **Remove 22 debug console.logs from `server/routes.ts`** — Logging user emails and client IDs in production
3. **Add Express Request type augmentation** — Eliminates 65 unsafe `as any` casts

### High (Code Quality / Maintainability)

4. **Remove 12 unused npm packages** — ~80-100MB savings; `react-icons` alone is 65MB
5. **Split `server/routes.ts`** (2,035 lines) into domain-specific route files
6. **Split `shared/schema.ts`** (1,502 lines) into domain-grouped modules
7. **Deduplicate `LoginPage.tsx` / `LoginCarouselPage.tsx`** — ~1,200 lines of shared code
8. **Create `<CalculatorLayout>` wrapper** — Eliminates ~500 lines from 12 calculators

### Medium (Tech Debt Reduction)

9. Split `ClientDetailsPage.tsx` into tab components
10. Split `WorkoutExecution.tsx` into sub-components + hook
11. Split `SchedulePage.tsx` into form + calendar + hooks
12. Extract `calculateBMR` and `ACTIVITY_MULTIPLIERS` to shared utils (3 copies)
13. Type all `useQuery<>` generics with shared schema types
14. Create `asyncHandler` wrapper for server routes (eliminates 51 try/catch blocks)
15. Remove unused `server/middleware/errorHandler.ts` or integrate it
16. Move 5 `@types/*` packages to devDependencies

### Low (Nice to Have)

17. Add `eslint-plugin-simple-import-sort` for consistent imports
18. Standardize hook file naming (kebab-case vs camelCase)
19. Create `useCrudMutations` hook for form modal DRY-up
20. Clean remaining 16 cosmetic console.log debug leftovers
21. Standardize export style (default vs named) across page components

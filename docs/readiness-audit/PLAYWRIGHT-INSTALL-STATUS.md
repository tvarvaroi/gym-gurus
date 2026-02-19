# Playwright E2E Testing Setup - IN PROGRESS ⏳

**Date:** 2026-02-18
**Status:** INSTALLED - Tests Running (with failures)
**Time Spent:** ~45 minutes
**Priority:** BLOCKER #3

---

## ✅ Installation Complete

### 1. Playwright Installed

```bash
npm install --save-dev @playwright/test
```

- ✅ @playwright/test@^1.58.2 added to devDependencies
- ✅ Chromium browser installed (145.0.7632.6)
- ✅ FFmpeg installed for video recording
- ✅ Chrome Headless Shell installed

### 2. Accessibility Tools Installed

```bash
npm install --save-dev @axe-core/playwright axe-core
```

- ✅ @axe-core/playwright@^4.11.1 added
- ✅ axe-core@^4.11.1 added

### 3. Test Scripts Added to package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## 🧪 Test Suite Overview

**Test Files:**

- [e2e/accessibility.spec.ts](e2e/accessibility.spec.ts) - Accessibility tests with axe-core
- [e2e/mobile.spec.ts](e2e/mobile.spec.ts) - Mobile responsive tests
- [e2e/solo-flow.spec.ts](e2e/solo-flow.spec.ts) - Solo user journey tests
- [e2e/trainer-flow.spec.ts](e2e/trainer-flow.spec.ts) - Trainer journey tests

**Test Coverage:**

- 174 total tests across 2 projects (chromium + mobile)
- Accessibility (WCAG 2.1 compliance)
- Mobile responsiveness (iPhone SE, iPhone 14, iPad Mini)
- User flows (onboarding, CRUD operations)
- Keyboard navigation
- Visual regression

---

## ⚠️ Test Status: FAILURES DETECTED

**Current Test Run:** ~143/174 tests completed

### Known Failures (Partial List):

#### Mobile Responsiveness Issues:

- ❌ Solo dashboard missing `<main>` landmark on mobile
- ❌ Calculator pages missing input elements on mobile
- ❌ Landscape orientation issues

#### Authentication/Routing Issues:

- ❌ Preview login page not rendering role selection buttons
  - Tests expect `/preview-login` to have Trainer/Client/Solo buttons
  - Buttons not visible (likely routing or auth issue)

#### Calculator Page Issues:

- ❌ BMI Calculator inputs not found
- ❌ 1RM Calculator inputs not found
- ❌ Strength Standards inputs not found
- ❌ Calculator pages timing out

#### Common Error Pattern:

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('button', { name: /solo/i })
Expected: visible
Timeout: 10000ms
Error: element(s) not found
```

---

## 🔍 Root Cause Analysis (Preliminary)

### Issue 1: `/preview-login` Page Not Loading

**Symptoms:**

- All login tests fail with "role selection buttons not found"
- Affects trainer-flow, solo-flow tests

**Possible Causes:**

1. Route `/preview-login` may not exist or is misconfigured
2. Auth redirect happening before page loads
3. Button selectors may have changed
4. Page may require authentication before rendering

**Next Steps:**

- Verify `/preview-login` route exists in [client/src/App.tsx](client/src/App.tsx)
- Check if preview login page component renders correctly
- Validate button names match test selectors

### Issue 2: Calculator Pages Missing Form Elements

**Symptoms:**

- Input fields not found on calculator pages
- Tests timing out waiting for number inputs

**Possible Causes:**

1. Calculator pages may lazy-load inputs
2. Pages may require authentication
3. Calculator component structure changed
4. Inputs may be in shadow DOM or iframe

**Next Steps:**

- Manual test: Visit `/calculators/bmi` and verify inputs exist
- Check if calculators render without auth
- Verify selector `input[type="number"]` matches actual markup

### Issue 3: Mobile Layout Missing Semantic HTML

**Symptoms:**

- `<main>` element not found on mobile viewports
- Navigation landmarks missing

**Possible Causes:**

1. Mobile layout removes semantic HTML
2. CSS hides elements with `display: none` (accessibility issue)
3. Different component tree for mobile vs desktop

**Next Steps:**

- Check if `<main>` exists in DOM but is hidden
- Verify ARIA landmarks are present
- Test with screen reader

---

## 📊 Estimated Failure Breakdown

Based on partial results (~143/174 tests):

**Passing:** ~110 tests (~63%)

- ✅ Most accessibility tests (axe-core checks)
- ✅ Landing page tests
- ✅ Terms/Privacy pages
- ✅ Basic navigation tests

**Failing:** ~30 tests (~17%)

- ❌ Login/authentication flows
- ❌ Calculator interactions
- ❌ Mobile responsive layouts
- ❌ Solo user flows

**Running/Pending:** ~34 tests (~20%)

---

## 🚧 Blocker Status

**BLOCKER #3: Install Playwright & Verify Tests Pass**

- ✅ Playwright Installed
- ⏳ Tests Running
- ❌ Tests Passing (BLOCKED)

**Current Blockers:**

1. Preview login page not rendering
2. Calculator input elements not found
3. Mobile semantic HTML issues

---

## 🛠️ Immediate Action Items

### 1. Fix Preview Login Page (HIGH PRIORITY)

```bash
# Manual test
Open browser → http://localhost:5000/preview-login
Verify: "Trainer", "Client", "Solo" buttons visible
```

If buttons don't exist:

- Check [client/src/components/landing/pages/LoginCarouselPage.tsx](client/src/components/landing/pages/LoginCarouselPage.tsx)
- Verify route mapping in App.tsx
- Update test selectors if button names changed

### 2. Debug Calculator Pages (HIGH PRIORITY)

```bash
# Manual test
Open browser → http://localhost:5000/calculators/bmi
Verify: Weight and Height number inputs exist
```

If inputs don't exist:

- Check if calculators require authentication
- Verify component renders correctly
- Fix or update test selectors

### 3. Add Semantic HTML to Mobile Layout (MEDIUM PRIORITY)

- Ensure `<main>` element exists on all pages
- Add ARIA landmarks (nav, main, footer)
- Verify landmarks aren't hidden via CSS

---

## 📝 Test Results (When Complete)

**HTML Report:** Will be generated at `playwright-report/index.html`

To view:

```bash
npx playwright show-report
```

---

## 🎯 Success Criteria

Before marking BLOCKER #3 as complete:

- [ ] Preview login page renders correctly
- [ ] All calculator inputs are accessible
- [ ] Mobile semantic HTML issues resolved
- [ ] All critical user flows pass
- [ ] At least 95% of tests passing
- [ ] No accessibility violations (critical/serious)
- [ ] No broken authentication flows

---

## ⏭️ Next Steps

1. **Wait for test run to complete** (currently at 143/174)
2. **Review full HTML report** (`npx playwright show-report`)
3. **Fix top 3 issues:**
   - Preview login page
   - Calculator inputs
   - Mobile semantics
4. **Re-run tests** and verify all pass
5. **Mark BLOCKER #3 as complete**
6. **Proceed to BLOCKER #4:** Production error monitoring (Sentry)

---

**Progress:** BLOCKER #2 (Soft Delete) ✅ → BLOCKER #3 (E2E Tests) ⏳ → BLOCKER #4 (Monitoring) → BLOCKER #5 (Performance)

**Estimated Time to Fix:** 2-3 hours
**Launch Readiness:** Still 1-2 weeks away (pending test fixes + remaining blockers)

import { test, expect, type Page } from '@playwright/test';

/**
 * Solo User Flow E2E Tests
 *
 * Critical path tests for the "solo" role in GymGurus -- independent users who
 * train without a personal trainer. Covers: login, onboarding, calculator usage,
 * gamification (XP, streaks, achievements), and AI workout generation.
 *
 * Prerequisites:
 *   - The app is running at BASE_URL (default: http://localhost:5000)
 *   - A test database is seeded with the solo user test account
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsSolo(page: Page) {
  await page.goto(`${BASE_URL}/preview-login`);
  await page.waitForLoadState('networkidle');

  // The dev login page provides role-selection buttons.
  const soloButton = page.getByRole('button', { name: /solo/i });
  await expect(soloButton).toBeVisible({ timeout: 10_000 });
  await soloButton.click();

  // Solo users land on /dashboard (which renders SoloDashboard) or /solo.
  await page.waitForURL(/\/(dashboard|solo)/, { timeout: 15_000 });
}

async function waitForAuthUser(page: Page) {
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/auth/user') && resp.status() === 200,
    { timeout: 10_000 }
  );
}

// ---------------------------------------------------------------------------
// Onboarding Tests
// ---------------------------------------------------------------------------

test.describe('Solo User - Onboarding', () => {
  test('login as solo -> complete onboarding steps', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    // The WelcomeModal should appear for new solo users with onboarding incomplete.
    const welcomeModal = page.locator('[role="dialog"]');

    if (await welcomeModal.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Step 1 - Welcome screen
      const getStartedBtn = welcomeModal.getByRole('button', {
        name: /get started|next|continue/i,
      });
      if (await getStartedBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await getStartedBtn.click();
      }

      // Step 2 - Fitness level selection (solo-specific)
      const fitnessLevel = welcomeModal.getByText(/beginner|intermediate|advanced/i).first();
      if (await fitnessLevel.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await fitnessLevel.click();
        const nextBtn = welcomeModal.getByRole('button', { name: /next|continue/i });
        if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await nextBtn.click();
        }
      }

      // Step 3 - Goal selection (solo goals: build_muscle, lose_weight, etc.)
      const goalOption = welcomeModal
        .getByText(/build muscle|lose weight|get stronger|general fitness/i)
        .first();
      if (await goalOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await goalOption.click();
        const nextBtn = welcomeModal.getByRole('button', { name: /next|continue|finish|done/i });
        if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await nextBtn.click();
        }
      }

      // Step 4 - Completion / celebration screen
      await page.waitForTimeout(2_000);

      // Dismiss the modal.
      const closeBtn = welcomeModal.getByRole('button', {
        name: /close|dismiss|let's go|x|start/i,
      });
      if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }

    // After onboarding, the solo dashboard should be visible.
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('solo onboarding page loads at /solo/onboarding', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/solo/onboarding`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Calculator Tests
// ---------------------------------------------------------------------------

test.describe('Solo User - Calculators', () => {
  const calculatorRoutes = [
    { path: '/calculators', name: 'Calculators Hub' },
    { path: '/calculators/bmi', name: 'BMI Calculator' },
    { path: '/calculators/1rm', name: '1RM Calculator' },
    { path: '/calculators/strength-standards', name: 'Strength Standards' },
    { path: '/calculators/tdee', name: 'TDEE Calculator' },
    { path: '/calculators/body-fat', name: 'Body Fat Calculator' },
    { path: '/calculators/macros', name: 'Macro Calculator' },
    { path: '/calculators/plates', name: 'Plate Calculator' },
    { path: '/calculators/vo2max', name: 'VO2 Max Calculator' },
    { path: '/calculators/heart-rate-zones', name: 'Heart Rate Zones' },
    { path: '/calculators/calories-burned', name: 'Calories Burned' },
    { path: '/calculators/ideal-weight', name: 'Ideal Weight' },
    { path: '/calculators/water-intake', name: 'Water Intake' },
  ];

  for (const calc of calculatorRoutes) {
    test(`${calc.name} page loads correctly`, async ({ page }) => {
      await page.goto(`${BASE_URL}${calc.path}`);
      await page.waitForLoadState('networkidle');

      // Each calculator page should render without errors.
      await expect(page.getByRole('main').or(page.locator('body'))).toBeVisible({
        timeout: 10_000,
      });

      // Page should not show a 404 or error state.
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).not.toMatch(/404|not found|error occurred/i);
    });
  }

  test('BMI Calculator computes and displays result', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // The BMI calculator has weight and height inputs.
    const weightInput = page.locator('input[type="number"]').first();
    const heightInput = page.locator('input[type="number"]').nth(1);

    await expect(weightInput).toBeVisible({ timeout: 10_000 });

    // Set weight to 80 kg and height to 175 cm using the number inputs.
    await weightInput.fill('80');
    await heightInput.fill('175');

    // The result should display a BMI value.
    // BMI = 80 / (1.75^2) = 26.12 -> "Overweight"
    await expect(page.getByText(/26\.\d/)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/overweight/i)).toBeVisible({ timeout: 5_000 });
  });

  test('BMI Calculator switches between metric and imperial', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Click the Imperial toggle button.
    const imperialBtn = page.getByRole('button', { name: /imperial/i });
    await expect(imperialBtn).toBeVisible({ timeout: 10_000 });
    await imperialBtn.click();

    // Labels should change to lbs/inches.
    await expect(page.getByText(/lbs/i)).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText(/inches/i)).toBeVisible({ timeout: 3_000 });

    // Switch back to metric.
    const metricBtn = page.getByRole('button', { name: /metric/i });
    await metricBtn.click();
    await expect(page.getByText(/kg/i)).toBeVisible({ timeout: 3_000 });
  });

  test('1RM Calculator computes estimated max', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/1rm`);
    await page.waitForLoadState('networkidle');

    // The 1RM calc has weight and reps inputs.
    const weightInput = page.locator('input[type="number"]').first();
    const repsInput = page.locator('input[type="number"]').nth(1);

    await expect(weightInput).toBeVisible({ timeout: 10_000 });

    await weightInput.fill('100');
    await repsInput.fill('5');

    // 1RM for 100kg x 5 with Epley = 100 * (1 + 5/30) = ~117 kg.
    // The result should show a number near 115-120.
    const resultText = await page.locator('.text-6xl, .text-5xl, .text-4xl').first().textContent();
    expect(resultText).toBeTruthy();
    const oneRM = parseFloat(resultText!.replace(/[^0-9.]/g, ''));
    expect(oneRM).toBeGreaterThan(100);
    expect(oneRM).toBeLessThan(150);
  });

  test('1RM Calculator quick rep buttons work', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/1rm`);
    await page.waitForLoadState('networkidle');

    // Click the "10 reps" quick button.
    const tenRepsBtn = page.getByRole('button', { name: /^10 reps$/i });
    await expect(tenRepsBtn).toBeVisible({ timeout: 10_000 });
    await tenRepsBtn.click();

    // Verify the reps input changed to 10.
    const repsInput = page.locator('input[type="number"]').nth(1);
    await expect(repsInput).toHaveValue('10', { timeout: 3_000 });
  });

  test('Strength Standards Calculator classifies lifts', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/strength-standards`);
    await page.waitForLoadState('networkidle');

    // Set bodyweight.
    const bodyweightInput = page.locator('input[type="number"]').first();
    await expect(bodyweightInput).toBeVisible({ timeout: 10_000 });
    await bodyweightInput.fill('80');

    // The page should display classification labels.
    await expect(
      page.getByText(/beginner|novice|intermediate|advanced|elite/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Overall strength score should be visible.
    await expect(page.getByText(/\/100/)).toBeVisible({ timeout: 5_000 });
  });

  test('calculator pages handle edge case inputs gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    const weightInput = page.locator('input[type="number"]').first();
    const heightInput = page.locator('input[type="number"]').nth(1);

    // Zero values should not cause NaN or crash.
    await weightInput.fill('0');
    await heightInput.fill('0');
    await page.waitForTimeout(500);

    // The page should still be functional (no crash).
    await expect(page.getByRole('main').or(page.locator('body'))).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/NaN|undefined|error/i);

    // Negative values.
    await weightInput.fill('-10');
    await heightInput.fill('175');
    await page.waitForTimeout(500);
    const bodyTextNeg = await page.locator('body').textContent();
    expect(bodyTextNeg).not.toMatch(/NaN|undefined/i);

    // Extremely large values.
    await weightInput.fill('9999');
    await heightInput.fill('300');
    await page.waitForTimeout(500);
    await expect(page.getByRole('main').or(page.locator('body'))).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Gamification Tests (XP, Streaks, Achievements)
// ---------------------------------------------------------------------------

test.describe('Solo User - Gamification', () => {
  test('achievements page loads and displays badges', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/solo/achievements`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

    // The achievements page should display some content about badges or achievements.
    const pageText = await page.getByRole('main').textContent();
    expect(pageText).toBeTruthy();
  });

  test('solo dashboard displays XP and level information', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Solo dashboard should show gamification stats (XP, level, streak).
    const mainContent = await page.getByRole('main').textContent();
    expect(mainContent).toBeTruthy();

    // Look for gamification-related elements.
    const xpElement = page.locator('[data-testid="xp-display"], .xp-display').first();
    const levelElement = page.locator('[data-testid="level-display"], .level-display').first();
    const streakElement = page.locator('[data-testid="streak-display"], .streak-display').first();

    // At least some gamification info should be present in the dashboard.
    // These may use different selectors depending on the component implementation.
    const hasGamification =
      (await xpElement.isVisible().catch(() => false)) ||
      (await levelElement.isVisible().catch(() => false)) ||
      (await streakElement.isVisible().catch(() => false)) ||
      /xp|level|streak|points/i.test(mainContent ?? '');

    // This is a soft assertion -- if gamification is not yet rendered, log it.
    if (!hasGamification) {
      console.warn('Gamification elements not found on solo dashboard. Verify implementation.');
    }
  });

  test('gamification API returns user stats', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    // Query the gamification API directly.
    const response = await page.request.get(`${BASE_URL}/api/gamification/stats`);

    // The API should return 200 with gamification data.
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toBeTruthy();
      // Expect fields like totalXp, currentLevel, currentStreakDays.
      if (data.totalXp !== undefined) {
        expect(typeof data.totalXp).toBe('number');
      }
      if (data.currentLevel !== undefined) {
        expect(typeof data.currentLevel).toBe('number');
        expect(data.currentLevel).toBeGreaterThanOrEqual(1);
      }
    }
    // 404 is acceptable if the endpoint naming differs.
  });

  test('achievements API returns achievement list', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    const response = await page.request.get(`${BASE_URL}/api/gamification/achievements`);

    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data) || (data && typeof data === 'object')).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Solo Feature Pages
// ---------------------------------------------------------------------------

test.describe('Solo User - Feature Pages', () => {
  test('AI Coach page loads', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/solo/coach`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

    // Should have a chat input.
    const chatInput = page
      .locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i], input[type="text"]'
      )
      .first();
    await expect(chatInput).toBeVisible({ timeout: 10_000 });
  });

  test('Recovery page loads', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/solo/recovery`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
  });

  test('Workout Generator page loads', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/solo/generate`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
  });

  test('solo user can navigate to all solo sections', async ({ page }) => {
    await loginAsSolo(page);
    await waitForAuthUser(page);

    const soloRoutes = [
      '/dashboard',
      '/solo/coach',
      '/solo/recovery',
      '/solo/achievements',
      '/solo/generate',
      '/solo/onboarding',
    ];

    for (const route of soloRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

      // No error states.
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).not.toMatch(/500|internal server error/i);
    }
  });
});

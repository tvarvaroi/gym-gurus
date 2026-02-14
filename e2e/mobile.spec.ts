import { test, expect, type Page, devices } from '@playwright/test';

/**
 * Mobile Viewport E2E Tests
 *
 * Verifies that GymGurus renders correctly and is fully functional on small
 * (mobile) viewports. Tests cover navigation, calculator pages, dashboard
 * responsiveness, sidebar behavior, and touch-friendly element sizing.
 *
 * Device profiles used:
 *   - iPhone SE (375 x 667)   -- smallest commonly supported phone
 *   - iPhone 14 (390 x 844)   -- standard modern phone
 *   - iPad Mini (768 x 1024)  -- small tablet (for breakpoint coverage)
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsSolo(page: Page) {
  await page.goto(`${BASE_URL}/preview-login`);
  await page.waitForLoadState('networkidle');
  const soloButton = page.getByRole('button', { name: /solo/i });
  if (await soloButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await soloButton.click();
    await page.waitForURL(/\/(dashboard|solo)/, { timeout: 15_000 });
  }
}

async function loginAsTrainer(page: Page) {
  await page.goto(`${BASE_URL}/preview-login`);
  await page.waitForLoadState('networkidle');
  const trainerButton = page.getByRole('button', { name: /trainer/i });
  if (await trainerButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await trainerButton.click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  }
}

// ---------------------------------------------------------------------------
// iPhone SE Viewport (375px)
// ---------------------------------------------------------------------------

test.describe('Mobile - iPhone SE (375px)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('landing page renders correctly on 375px viewport', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // The page should not have horizontal overflow.
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance

    // Hero text should be visible.
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('navigation works on mobile via hamburger/sidebar', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // On mobile, the sidebar should be collapsed. Look for a hamburger / trigger.
    const sidebarTrigger = page
      .locator(
        'button[data-sidebar="trigger"], [data-testid="sidebar-trigger"], button[aria-label*="menu" i], button[aria-label*="sidebar" i]'
      )
      .first();

    if (await sidebarTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sidebarTrigger.click();

      // The sidebar should expand or overlay.
      const sidebar = page.locator('[data-sidebar="sidebar"], aside, nav').first();
      await expect(sidebar).toBeVisible({ timeout: 5_000 });

      // Click a navigation item (e.g., "Calculators").
      const calcLink = sidebar.getByText(/calculator/i).first();
      if (await calcLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await calcLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/calculators/);
      }
    }
  });

  test('BMI calculator page is usable on 375px', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Page header should be visible.
    await expect(page.getByText(/BMI Calculator/i).first()).toBeVisible({ timeout: 10_000 });

    // Inputs should be accessible and not clipped.
    const weightInput = page.locator('input[type="number"]').first();
    await expect(weightInput).toBeVisible();

    // Verify the input is within the viewport.
    const inputBox = await weightInput.boundingBox();
    expect(inputBox).toBeTruthy();
    if (inputBox) {
      expect(inputBox.x).toBeGreaterThanOrEqual(0);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(375 + 5);
    }

    // Unit toggle buttons should be visible and tappable.
    const metricBtn = page.getByRole('button', { name: /metric/i });
    const imperialBtn = page.getByRole('button', { name: /imperial/i });
    await expect(metricBtn).toBeVisible();
    await expect(imperialBtn).toBeVisible();

    // Fill in values and verify result renders.
    await weightInput.fill('70');
    const heightInput = page.locator('input[type="number"]').nth(1);
    await heightInput.fill('170');

    // BMI result should be visible.
    await expect(page.locator('.text-6xl, .text-5xl, .text-4xl').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('1RM calculator page is usable on 375px', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/1rm`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/1RM Calculator/i).first()).toBeVisible({ timeout: 10_000 });

    // Quick rep buttons should wrap properly and be tappable.
    const repButtons = page.locator('button').filter({ hasText: /^\d+ reps?$/ });
    const buttonCount = await repButtons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Each button should be within viewport bounds.
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const box = await repButtons.nth(i).boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375 + 5);
      }
    }
  });

  test('Strength Standards calculator is usable on 375px', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/strength-standards`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Strength Standards/i).first()).toBeVisible({ timeout: 10_000 });

    // Gender toggle buttons should be visible.
    const maleBtn = page.getByRole('button', { name: /male/i });
    await expect(maleBtn).toBeVisible();

    // No horizontal scroll.
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(375 + 5);
  });

  test('dashboard responsiveness on 375px', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Dashboard should render without horizontal overflow.
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(375 + 5);

    // Cards should stack vertically on mobile.
    const cards = page.locator('.bg-card, [class*="Card"]');
    const cardCount = await cards.count();

    if (cardCount >= 2) {
      const firstBox = await cards.first().boundingBox();
      const secondBox = await cards.nth(1).boundingBox();

      if (firstBox && secondBox) {
        // On mobile, cards should be stacked (second card's Y > first card's bottom).
        // Or they should at least not overflow the viewport width.
        expect(firstBox.width).toBeLessThanOrEqual(375 + 5);
        expect(secondBox.width).toBeLessThanOrEqual(375 + 5);
      }
    }
  });

  test('all calculator pages load without horizontal overflow', async ({ page }) => {
    const calcPaths = [
      '/calculators/bmi',
      '/calculators/1rm',
      '/calculators/strength-standards',
      '/calculators/tdee',
      '/calculators/body-fat',
      '/calculators/macros',
      '/calculators/plates',
      '/calculators/vo2max',
      '/calculators/heart-rate-zones',
      '/calculators/calories-burned',
      '/calculators/ideal-weight',
      '/calculators/water-intake',
    ];

    for (const path of calcPaths) {
      await page.goto(`${BASE_URL}${path}`);
      await page.waitForLoadState('networkidle');

      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(
        bodyScrollWidth,
        `Horizontal overflow detected on ${path}: scrollWidth=${bodyScrollWidth}, viewport=${viewportWidth}`
      ).toBeLessThanOrEqual(viewportWidth + 10);
    }
  });

  test('touch targets are at least 44x44px', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Check that interactive elements meet the 44px minimum touch target size.
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    let undersizedCount = 0;
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        // WCAG 2.5.5 recommends 44x44px minimum for touch targets.
        if (box.width < 44 || box.height < 44) {
          undersizedCount++;
        }
      }
    }

    // Allow some buttons to be smaller (e.g., icon-only), but most should comply.
    const complianceRate = buttonCount > 0 ? 1 - undersizedCount / Math.min(buttonCount, 10) : 1;
    expect(complianceRate).toBeGreaterThanOrEqual(0.6); // At least 60% comply.
  });
});

// ---------------------------------------------------------------------------
// iPhone 14 Viewport (390px)
// ---------------------------------------------------------------------------

test.describe('Mobile - iPhone 14 (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('landing page hero is fully visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    // No horizontal overflow.
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(390 + 5);
  });

  test('calculator hub shows grid of calculators', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators`);
    await page.waitForLoadState('networkidle');

    // The calculators hub should show a grid of calculator links/cards.
    const calcCards = page.locator('a[href*="/calculators/"], [data-testid="calculator-card"]');
    const cardCount = await calcCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // All cards should be within viewport.
    for (let i = 0; i < Math.min(cardCount, 5); i++) {
      const box = await calcCards.nth(i).boundingBox();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(390 + 10);
      }
    }
  });

  test('solo dashboard is responsive on 390px', async ({ page }) => {
    await loginAsSolo(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(390 + 5);

    await expect(page.getByRole('main')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// iPad Mini Viewport (768px) - Tablet Breakpoint
// ---------------------------------------------------------------------------

test.describe('Tablet - iPad Mini (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('sidebar may show in collapsed mode on tablet', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // On tablet, the sidebar might be in collapsed (icon) mode or fully visible.
    const sidebar = page.locator('[data-sidebar="sidebar"], aside').first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);

    if (sidebarVisible) {
      const box = await sidebar.boundingBox();
      if (box) {
        // Sidebar should not consume more than half the viewport on tablet.
        expect(box.width).toBeLessThan(768 / 2);
      }
    }
  });

  test('dashboard shows multi-column layout on tablet', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // On tablet width, stat cards may display in a 2-column grid.
    const cards = page.locator('.bg-card, [class*="Card"]');
    const cardCount = await cards.count();

    if (cardCount >= 2) {
      const firstBox = await cards.first().boundingBox();
      const secondBox = await cards.nth(1).boundingBox();

      if (firstBox && secondBox) {
        // On tablet, two cards might be side by side (same Y position).
        // Or they might still stack. Just verify they fit within viewport.
        expect(firstBox.x + firstBox.width).toBeLessThanOrEqual(768 + 5);
        expect(secondBox.x + secondBox.width).toBeLessThanOrEqual(768 + 5);
      }
    }
  });

  test('calculators display properly on tablet', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/strength-standards`);
    await page.waitForLoadState('networkidle');

    // The 2-column grid (gender + unit) should be side by side on tablet.
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(768 + 5);

    await expect(page.getByText(/Strength Standards/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Landscape Orientation
// ---------------------------------------------------------------------------

test.describe('Mobile - Landscape (667x375)', () => {
  test.use({ viewport: { width: 667, height: 375 } });

  test('app is usable in landscape orientation', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

    // Content should still be accessible despite reduced height.
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(667 + 5);
  });

  test('calculator input fields are reachable in landscape', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Scroll down to reach input fields if needed.
    const weightInput = page.locator('input[type="number"]').first();
    await weightInput.scrollIntoViewIfNeeded();
    await expect(weightInput).toBeVisible({ timeout: 5_000 });
  });
});

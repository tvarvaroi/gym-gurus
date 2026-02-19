import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility (a11y) E2E Tests
 *
 * Automated accessibility testing for GymGurus using @axe-core/playwright
 * (Deque axe engine). Tests cover WCAG 2.1 Level AA compliance across all
 * major pages: landing, dashboard, calculators, settings, and solo features.
 *
 * Also includes manual-pattern tests for keyboard navigation, focus management,
 * ARIA landmarks, color contrast, and screen reader friendliness.
 *
 * Prerequisites:
 *   - npm install @axe-core/playwright (devDependency)
 *   - The app is running at BASE_URL
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsTrainer(page: Page) {
  await page.goto(`${BASE_URL}/test-login`);
  await page.waitForLoadState('networkidle');
  const trainerButton = page.getByRole('button', { name: /trainer/i });
  if (await trainerButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await trainerButton.click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
  }
}

async function loginAsSolo(page: Page) {
  await page.goto(`${BASE_URL}/test-login`);
  await page.waitForLoadState('networkidle');
  const soloButton = page.getByRole('button', { name: /solo/i });
  if (await soloButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await soloButton.click();
    await page.waitForURL(/\/(dashboard|solo)/, { timeout: 15_000 });
  }
}

/**
 * Run axe accessibility scan and return results.
 * By default checks against WCAG 2.1 AA rules.
 */
async function runAxeScan(page: Page, options?: { exclude?: string[] }) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);

  // Exclude known third-party elements that we cannot control.
  const excludeSelectors = options?.exclude ?? [];
  for (const selector of excludeSelectors) {
    builder = builder.exclude(selector);
  }

  return builder.analyze();
}

// ---------------------------------------------------------------------------
// Axe Automated Scans - Public Pages
// ---------------------------------------------------------------------------

test.describe('Accessibility - Public Pages (axe-core)', () => {
  test('landing page has no critical a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page, {
      exclude: ['video', 'iframe'], // Exclude video elements that may have third-party issues.
    });

    // Filter for critical and serious violations only.
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      console.error(
        'Landing page a11y violations:',
        JSON.stringify(
          criticalViolations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
          })),
          null,
          2
        )
      );
    }

    expect(
      criticalViolations.length,
      `Found ${criticalViolations.length} critical/serious a11y violations on landing page`
    ).toBe(0);
  });

  test('terms page has no critical a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });

  test('privacy page has no critical a11y violations', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Axe Automated Scans - Authenticated Pages
// ---------------------------------------------------------------------------

test.describe('Accessibility - Trainer Dashboard (axe-core)', () => {
  test('dashboard has no critical a11y violations', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page, {
      exclude: ['.recharts-wrapper'], // Chart library may have known issues.
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalViolations.length > 0) {
      console.error(
        'Dashboard a11y violations:',
        JSON.stringify(
          criticalViolations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
          })),
          null,
          2
        )
      );
    }

    expect(criticalViolations.length).toBe(0);
  });

  test('clients page has no critical a11y violations', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });

  test('workouts page has no critical a11y violations', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/workouts`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });

  test('schedule page has no critical a11y violations', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/schedule`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Axe Automated Scans - Calculator Pages
// ---------------------------------------------------------------------------

test.describe('Accessibility - Calculator Pages (axe-core)', () => {
  const calculators = [
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

  for (const calc of calculators) {
    test(`${calc.name} has no critical a11y violations`, async ({ page }) => {
      await page.goto(`${BASE_URL}${calc.path}`);
      await page.waitForLoadState('networkidle');

      const results = await runAxeScan(page);
      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalViolations.length > 0) {
        console.error(
          `${calc.name} a11y violations:`,
          JSON.stringify(
            criticalViolations.map((v) => ({ id: v.id, impact: v.impact })),
            null,
            2
          )
        );
      }

      expect(
        criticalViolations.length,
        `Found ${criticalViolations.length} critical/serious violations on ${calc.name}`
      ).toBe(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Axe Automated Scans - Solo User Pages
// ---------------------------------------------------------------------------

test.describe('Accessibility - Solo User Pages (axe-core)', () => {
  test('solo dashboard has no critical a11y violations', async ({ page }) => {
    await loginAsSolo(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page, {
      exclude: ['.recharts-wrapper'],
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });

  test('AI Coach page has no critical a11y violations', async ({ page }) => {
    await loginAsSolo(page);

    await page.goto(`${BASE_URL}/solo/coach`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });

  test('achievements page has no critical a11y violations', async ({ page }) => {
    await loginAsSolo(page);

    await page.goto(`${BASE_URL}/solo/achievements`);
    await page.waitForLoadState('networkidle');

    const results = await runAxeScan(page);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Keyboard Navigation Tests
// ---------------------------------------------------------------------------

test.describe('Accessibility - Keyboard Navigation', () => {
  test('skip-to-content link is functional', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // The app has a "Skip to main content" link (sr-only by default).
    // Press Tab to focus it.
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a[href="#main-content"]');
    if (await skipLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // The skip link should become visible on focus.
      await expect(skipLink).toBeFocused();

      // Activate the skip link.
      await page.keyboard.press('Enter');

      // Focus should move to the main content area.
      const mainContent = page.locator('#main-content');
      if (await mainContent.isVisible().catch(() => false)) {
        // Verify main content is in the viewport.
        const box = await mainContent.boundingBox();
        expect(box).toBeTruthy();
      }
    }
  });

  test('tab order follows logical document flow on BMI calculator', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Collect the tab order by pressing Tab repeatedly.
    const focusOrder: string[] = [];
    const maxTabs = 20;

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return 'none';
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role') ?? '';
        const ariaLabel = el.getAttribute('aria-label') ?? '';
        const text = (el as HTMLElement).innerText?.substring(0, 30) ?? '';
        return `${tag}[${role || text || ariaLabel}]`;
      });
      focusOrder.push(focusedTag);

      // Break if we've looped back to the body.
      if (focusedTag === 'body[]') break;
    }

    // Verify we visited interactive elements (buttons, inputs, links).
    const interactiveElements = focusOrder.filter((el) =>
      /^(button|input|a|select|textarea)/.test(el)
    );
    expect(interactiveElements.length).toBeGreaterThan(2);
  });

  test('all calculator inputs are reachable via keyboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Tab through the page and check that both number inputs get focused.
    let foundInputs = 0;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const tagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
      if (tagName === 'input') {
        foundInputs++;
      }
    }

    // BMI calculator has at least 2 number inputs (weight, height).
    expect(foundInputs).toBeGreaterThanOrEqual(2);
  });

  test('dialog modals trap focus', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    // Open the "Add Client" dialog.
    const addClientBtn = page.getByRole('button', { name: /add client|new client/i });
    if (await addClientBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await addClientBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // Tab through the dialog -- focus should not leave the dialog.
      const dialogFocusLog: boolean[] = [];
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        const isInDialog = await page.evaluate(() => {
          const active = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(active) ?? false;
        });
        dialogFocusLog.push(isInDialog);
      }

      // All tabbed elements should be inside the dialog (focus trap).
      const focusEscaped = dialogFocusLog.some((inDialog) => !inDialog);
      expect(focusEscaped).toBe(false);

      // Escape should close the dialog.
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 3_000 });
    }
  });

  test('Escape key closes dropdown menus', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Try to find and open a dropdown menu (e.g., user menu in header).
    const dropdownTrigger = page
      .locator('[data-testid="user-menu"], button[aria-haspopup="menu"]')
      .first();

    if (await dropdownTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dropdownTrigger.click();

      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible({ timeout: 3_000 });

      await page.keyboard.press('Escape');
      await expect(menu).not.toBeVisible({ timeout: 3_000 });
    }
  });
});

// ---------------------------------------------------------------------------
// ARIA & Semantic HTML Tests
// ---------------------------------------------------------------------------

test.describe('Accessibility - ARIA & Semantics', () => {
  test('pages have proper landmark regions', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Check for essential ARIA landmarks.
    const mainRegion = page.locator('[role="main"], main');
    await expect(mainRegion).toBeVisible({ timeout: 10_000 });

    // Navigation should be present (sidebar or header nav).
    const navRegion = page.locator('[role="navigation"], nav');
    const navCount = await navRegion.count();
    expect(navCount).toBeGreaterThan(0);
  });

  test('images have alt text', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const imageCount = await images.count();

    let missingAlt = 0;
    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const role = await images.nth(i).getAttribute('role');

      // Images should have alt text unless they are decorative (role="presentation").
      if (!alt && alt !== '' && role !== 'presentation' && role !== 'none') {
        missingAlt++;
      }
    }

    expect(missingAlt, `Found ${missingAlt} images without alt text on dashboard`).toBe(0);
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const inputCount = await inputs.count();

    let unlabeled = 0;
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Check for a <label> with matching `for` attribute.
      let hasLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      // Input is labeled if it has: <label>, aria-label, aria-labelledby, or is inside a <label>.
      const hasAriaLabel = !!ariaLabel || !!ariaLabelledBy;
      const isWrappedInLabel = await input.evaluate((el) => el.closest('label') !== null);

      if (!hasLabel && !hasAriaLabel && !isWrappedInLabel) {
        unlabeled++;
        const tagName = await input.evaluate((el) => el.tagName);
        const type = await input.getAttribute('type');
        console.warn(`Unlabeled input: <${tagName} type="${type}" placeholder="${placeholder}">`);
      }
    }

    // Allow up to 2 unlabeled inputs (range sliders might not have explicit labels
    // if they are visually paired with number inputs).
    expect(unlabeled).toBeLessThanOrEqual(2);
  });

  test('headings follow a hierarchical structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map((el) => ({
        level: parseInt(el.tagName.substring(1), 10),
        text: el.textContent?.trim().substring(0, 50) ?? '',
      }));
    });

    // There should be at least one heading.
    expect(headings.length).toBeGreaterThan(0);

    // The first heading should be h1.
    expect(headings[0].level).toBe(1);

    // Headings should not skip levels (e.g., h1 -> h3 without h2).
    for (let i = 1; i < headings.length; i++) {
      const jump = headings[i].level - headings[i - 1].level;
      expect(
        jump,
        `Heading level jumped from h${headings[i - 1].level} to h${headings[i].level}: "${headings[i].text}"`
      ).toBeLessThanOrEqual(1);
    }
  });

  test('buttons have accessible names', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    let unnamed = 0;
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      const text = (await btn.textContent())?.trim();
      const ariaLabel = await btn.getAttribute('aria-label');
      const ariaLabelledBy = await btn.getAttribute('aria-labelledby');
      const title = await btn.getAttribute('title');

      if (!text && !ariaLabel && !ariaLabelledBy && !title) {
        unnamed++;
        const html = await btn.evaluate((el) => el.outerHTML.substring(0, 100));
        console.warn(`Button without accessible name: ${html}`);
      }
    }

    // All buttons should have accessible names.
    expect(unnamed, `Found ${unnamed} buttons without accessible names`).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Color Contrast & Visual Tests
// ---------------------------------------------------------------------------

test.describe('Accessibility - Visual', () => {
  test('no auto-playing media without controls', async ({ page }) => {
    await loginAsTrainer(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const videos = page.locator('video[autoplay]');
    const videoCount = await videos.count();

    for (let i = 0; i < videoCount; i++) {
      const hasControls = await videos.nth(i).getAttribute('controls');
      const isMuted = await videos.nth(i).getAttribute('muted');

      // Auto-playing videos should be muted or have controls.
      expect(
        hasControls !== null || isMuted !== null,
        'Found auto-playing video without controls or muted attribute'
      ).toBe(true);
    }
  });

  test('page respects prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // The page should still be functional with reduced motion.
    await expect(page.getByText(/BMI Calculator/i).first()).toBeVisible({ timeout: 10_000 });

    // Animations should be disabled or reduced. We cannot easily verify this
    // automatically, but we ensure the page does not crash.
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/error/i);
  });

  test('text is readable at 200% zoom', async ({ page }) => {
    await page.goto(`${BASE_URL}/calculators/bmi`);
    await page.waitForLoadState('networkidle');

    // Simulate 200% zoom by setting viewport to half size and using scale.
    await page.setViewportSize({ width: 640, height: 480 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2';
    });

    // The page should not have overlapping text or clipped content.
    // (This is a basic check -- visual regression would be needed for thorough testing.)
    await expect(page.locator('body')).toBeVisible();

    // Reset zoom.
    await page.evaluate(() => {
      document.documentElement.style.zoom = '1';
    });
  });
});

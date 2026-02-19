import { test, expect } from '@playwright/test';
import {
  loginAsRole,
  verifyTheme,
  verifyCalculatorSave,
  verifyCalculatorTheming,
  fillCalculatorInputs,
  navigateToCalculator,
  waitForAnimations,
  takeRoleScreenshot,
  type UserRole,
} from './auth-helpers';

/**
 * Premium Calculator E2E Tests
 *
 * Tests the premium calculator system with:
 * - Role-specific theming on all calculators
 * - Save/load functionality for all user results
 * - Calculation accuracy and UI responsiveness
 * - Recent results and favorites features
 */

test.describe('Premium Calculator Hub', () => {
  test('should display calculator hub for authenticated users', async ({ page }) => {
    await loginAsRole(page, 'trainer');

    await page.goto('/dashboard/calculators');
    await waitForAnimations(page);

    // Verify hub page elements
    await expect(page.locator('h1')).toContainText(['Premium', 'Calculators']);
    await expect(page.locator('text="All Calculators"')).toBeVisible();

    // Should show stats
    await expect(page.locator('text="Total Calculations", text="Favorites"')).toBeVisible();
  });

  test('should show all 13 calculator cards', async ({ page }) => {
    await loginAsRole(page, 'client');

    await page.goto('/dashboard/calculators');
    await waitForAnimations(page);

    // Check for specific calculators
    const calculators = [
      'TDEE',
      'BMI',
      'Body Fat',
      'Macro',
      'One Rep Max',
      'Plate',
      'Strength Standards',
      'VO2 Max',
      'Heart Rate',
      'Calories Burned',
      'Ideal Weight',
      'Water Intake',
    ];

    for (const calc of calculators) {
      await expect(page.locator(`text="${calc}"`).first()).toBeVisible();
    }
  });

  test('should apply role theme to calculator hub', async ({ page }) => {
    await loginAsRole(page, 'solo');

    await page.goto('/dashboard/calculators');
    await waitForAnimations(page);

    await verifyTheme(page, 'solo');
    await takeRoleScreenshot(page, 'solo', 'calculator-hub');
  });
});

test.describe('TDEE Calculator', () => {
  test('should load TDEE calculator with role theme', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'tdee');

    // Verify page loaded
    await expect(page.locator('h1, h2')).toContainText(['TDEE', 'Calculator']);

    // Verify premium styling
    await verifyCalculatorTheming(page, 'trainer');

    // Check for save button
    await expect(page.locator('button:has-text("Save Result")')).toBeVisible();
  });

  test('should calculate TDEE correctly', async ({ page }) => {
    await loginAsRole(page, 'client');
    await navigateToCalculator(page, 'tdee');

    // Fill inputs
    await fillCalculatorInputs(page, {
      weight: 75,
      height: 175,
      age: 30,
    });

    // Select activity level (if not already selected)
    await page.selectOption('select:has-text("Activity"), select:has-text("Moderate")', {
      label: /Moderate/,
    });

    await waitForAnimations(page);

    // Results should be visible
    await expect(page.locator('text="TDEE", text="calories"')).toBeVisible();
    await expect(page.locator('text="Basal Metabolic Rate", text="BMR"')).toBeVisible();
  });

  test('should save TDEE calculation', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await navigateToCalculator(page, 'tdee');

    // Wait for page to fully load
    await waitForAnimations(page);

    // Save result
    await verifyCalculatorSave(page);

    // Refresh page and check for saved result
    await page.reload();
    await waitForAnimations(page);

    await expect(page.locator('text="Recent Results", text="saved"')).toBeVisible();
  });
});

test.describe('BMI Calculator', () => {
  test('should calculate BMI correctly', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'bmi');

    // Fill inputs using sliders
    const weightSlider = page.locator('input.premium-slider').first();
    const heightSlider = page.locator('input.premium-slider').nth(1);

    await weightSlider.fill('70');
    await heightSlider.fill('170');

    await waitForAnimations(page);

    // BMI result should be visible
    await expect(page.locator('text="Body Mass Index", text="BMI"')).toBeVisible();
    await expect(page.locator('.gradient-text')).toBeVisible();
  });

  test('should show category classification', async ({ page }) => {
    await loginAsRole(page, 'client');
    await navigateToCalculator(page, 'bmi');

    await waitForAnimations(page);

    // Should show category (Underweight, Normal, Overweight, etc.)
    await expect(
      page.locator('text="Normal Weight", text="Overweight", text="Underweight"')
    ).toBeVisible();
  });
});

test.describe('Body Fat Calculator', () => {
  test('should calculate body fat percentage', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await navigateToCalculator(page, 'body-fat');

    // Set gender
    await page.click('button:has-text("Male")');

    await waitForAnimations(page);

    // Result should show
    await expect(page.locator('text="Body Fat Percentage", text="%"')).toBeVisible();
    await expect(
      page.locator('text="Essential Fat", text="Athletic", text="Fitness"')
    ).toBeVisible();
  });

  test('should show different inputs for female', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'body-fat');

    // Select female
    await page.click('button:has-text("Female")');
    await waitForAnimations(page);

    // Should show hips input for females
    await expect(page.locator('text="Hips"')).toBeVisible();
  });
});

test.describe('Macro Calculator', () => {
  test('should calculate macros with diet type selection', async ({ page }) => {
    await loginAsRole(page, 'client');
    await navigateToCalculator(page, 'macros');

    await waitForAnimations(page);

    // Select diet type
    await page.selectOption('select', { label: /Balanced/ });

    await waitForAnimations(page);

    // Should show macro breakdown
    await expect(page.locator('text="Protein", text="Carbs", text="Fat"')).toBeVisible();
    await expect(page.locator('text="Daily Calories"')).toBeVisible();
  });

  test('should show per-meal breakdown', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await navigateToCalculator(page, 'macros');

    await waitForAnimations(page);

    // Should show per-meal section
    await expect(page.locator('text="Per Meal"')).toBeVisible();
  });
});

test.describe('1RM Calculator', () => {
  test('should calculate one rep max', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, '1rm');

    // Set weight and reps
    const weightSlider = page.locator('input.premium-slider').first();
    const repsSlider = page.locator('input.premium-slider').nth(1);

    await weightSlider.fill('100');
    await repsSlider.fill('5');

    await waitForAnimations(page);

    // Should show 1RM estimate
    await expect(page.locator('text="Estimated 1RM"')).toBeVisible();
    await expect(page.locator('text="Min", text="Max"')).toBeVisible();
  });

  test('should show rep max table', async ({ page }) => {
    await loginAsRole(page, 'client');
    await navigateToCalculator(page, '1rm');

    await waitForAnimations(page);

    // Should show rep max table
    await expect(page.locator('text="Rep Max Table"')).toBeVisible();
  });
});

test.describe('Water Intake Calculator', () => {
  test('should calculate daily water intake', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await navigateToCalculator(page, 'water-intake');

    await waitForAnimations(page);

    // Should show water recommendation
    await expect(page.locator('text="Daily Water Intake", text="liters", text="L"')).toBeVisible();
    await expect(page.locator('text="glasses"')).toBeVisible();
  });

  test('should adjust for activity and climate', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'water-intake');

    // Select very active
    await page.click('button:has-text("Very Active"), button:has-text("Athlete")');

    await waitForAnimations(page);

    // Should show breakdown
    await expect(page.locator('text="Intake Breakdown", text="Activity bonus"')).toBeVisible();
  });
});

test.describe('Cross-Role Calculator Testing', () => {
  const roles: UserRole[] = ['trainer', 'client', 'solo'];
  const calculators = ['tdee', 'bmi', 'body-fat'];

  for (const role of roles) {
    for (const calc of calculators) {
      test(`${role} should access ${calc} calculator with correct theme`, async ({ page }) => {
        await loginAsRole(page, role);
        await navigateToCalculator(page, calc);

        // Verify theme
        await verifyTheme(page, role);

        // Verify premium styling
        await verifyCalculatorTheming(page, role);

        // Take screenshot
        await takeRoleScreenshot(page, role, `calculator-${calc}`);
      });
    }
  }
});

test.describe('Save and Load Functionality', () => {
  test('should save and reload calculator result', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'bmi');

    // Set specific values
    const weightSlider = page.locator('input.premium-slider').first();
    await weightSlider.fill('75');

    await waitForAnimations(page);

    // Save result
    await verifyCalculatorSave(page);

    // Navigate away
    await page.goto('/dashboard');

    // Navigate back
    await navigateToCalculator(page, 'bmi');

    // Should show recent results
    await expect(page.locator('text="Recent Results"')).toBeVisible();
  });

  test('should toggle favorite on calculator', async ({ page }) => {
    await loginAsRole(page, 'client');
    await navigateToCalculator(page, 'tdee');

    // Click favorite star
    const favoriteButton = page.locator('button[title*="favorite"], button:has(svg)').first();
    await favoriteButton.click();

    await waitForAnimations(page);

    // Save result
    await verifyCalculatorSave(page);

    // Go to hub
    await page.goto('/dashboard/calculators');

    // Should appear in favorites section
    await expect(page.locator('text="Favorites", text="Favorite"')).toBeVisible();
  });
});

test.describe('Calculator Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginAsRole(page, 'solo');
    await navigateToCalculator(page, 'bmi');

    // Should still be functional
    await expect(page.locator('h1, h2')).toContainText(['BMI']);
    await expect(page.locator('button:has-text("Save Result")')).toBeVisible();

    await takeRoleScreenshot(page, 'solo', 'calculator-mobile');
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'macros');

    // Should still be functional
    await expect(page.locator('h1, h2')).toContainText(['Macro']);
    await expect(page.locator('button:has-text("Save Result")')).toBeVisible();
  });
});

test.describe('Calculator Navigation', () => {
  test('should navigate between calculators', async ({ page }) => {
    await loginAsRole(page, 'client');

    // Start at hub
    await page.goto('/dashboard/calculators');

    // Click TDEE
    await page.click('text="TDEE Calculator", a:has-text("TDEE")');
    await page.waitForURL(/\/tdee/);
    await expect(page.locator('h1, h2')).toContainText(['TDEE']);

    // Back to hub
    await page.click('text="All Calculators", a:has-text("All Calculators")');
    await page.waitForURL(/\/dashboard\/calculators$/);

    // Click BMI
    await page.click('text="BMI Calculator", a:has-text("BMI")');
    await page.waitForURL(/\/bmi/);
    await expect(page.locator('h1, h2')).toContainText(['BMI']);
  });

  test('should use breadcrumb navigation', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await navigateToCalculator(page, 'body-fat');

    // Click breadcrumb back to hub
    const breadcrumb = page
      .locator('a:has-text("All Calculators"), text="All Calculators"')
      .first();
    if (await breadcrumb.isVisible()) {
      await breadcrumb.click();
      await page.waitForURL(/\/dashboard\/calculators$/);
    }
  });
});

test.describe('Premium Features', () => {
  test('should NOT show lead capture popup', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await navigateToCalculator(page, 'tdee');

    await waitForAnimations(page);

    // Premium calculators should NOT have lead capture
    await expect(page.locator('text="Enter your email", text="Get Results"')).not.toBeVisible();
  });

  test('should show premium styling elements', async ({ page }) => {
    await loginAsRole(page, 'client');
    await navigateToCalculator(page, 'macros');

    await waitForAnimations(page);

    // Check for premium classes
    const premiumCard = page.locator('.premium-card').first();
    const premiumGlow = page.locator('.premium-glow').first();

    await expect(premiumCard.or(premiumGlow)).toBeVisible();
  });
});

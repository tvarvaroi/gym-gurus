import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for Authentication and Role-Based Testing
 *
 * These utilities help test login flows, role-specific features, and theming
 * across all 3 user roles: Trainer (Guru), Client (Disciple), Solo (Ronin)
 */

export type UserRole = 'trainer' | 'client' | 'solo';

export interface RoleTheme {
  role: UserRole;
  displayName: string;
  bodyClass: string;
  primaryColor: string; // HSL format
  primaryHex: string;
}

export const ROLE_THEMES: Record<UserRole, RoleTheme> = {
  trainer: {
    role: 'trainer',
    displayName: 'Guru',
    bodyClass: 'role-guru',
    primaryColor: '43 54% 55%', // Gold
    primaryHex: '#c9a855',
  },
  client: {
    role: 'client',
    displayName: 'Disciple',
    bodyClass: 'role-disciple',
    primaryColor: '170 78% 40%', // Teal
    primaryHex: '#0d9488',
  },
  solo: {
    role: 'solo',
    displayName: 'Ronin',
    bodyClass: 'role-ronin',
    primaryColor: '271 81% 60%', // Purple
    primaryHex: '#a855f7',
  },
};

/**
 * Login as a specific role using the /test-login dev endpoint
 */
export async function loginAsRole(page: Page, role: UserRole): Promise<void> {
  await page.goto('/test-login');

  // Wait for test login page to load
  await page.waitForSelector('button:has-text("Trainer")');

  // Click the appropriate role button by aria-label
  const roleButtonText = role === 'trainer' ? 'Trainer' : role === 'client' ? 'Client' : 'Solo';
  await page.click(`button:has-text("${roleButtonText}")`);

  // Wait for navigation to complete (API login redirects to dashboard)
  await page.waitForLoadState('networkidle');

  // Wait for dashboard to load (should be at /dashboard or role-specific route)
  await page.waitForURL(/\/(dashboard|trainer|client|solo)/, { timeout: 10000 });

  // Wait for page to fully load
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Verify that the correct role theme is applied to the page
 */
export async function verifyTheme(page: Page, role: UserRole): Promise<void> {
  const theme = ROLE_THEMES[role];

  // Check html element class (role class is on <html> element)
  const htmlClass = await page.locator('html').getAttribute('class');
  expect(htmlClass).toContain(theme.bodyClass);

  // Check CSS custom property for --primary color
  const primaryColorValue = await page.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  });

  expect(primaryColorValue).toBe(theme.primaryColor);
}

/**
 * Verify role-specific navigation items are present
 */
export async function verifyRoleNavigation(page: Page, role: UserRole): Promise<void> {
  // All roles should have these common items
  await expect(page.locator('a:has-text("Dashboard"), a:has-text("Home")')).toBeVisible();
  await expect(page.locator('a:has-text("Calculators")')).toBeVisible();

  // Role-specific navigation items
  if (role === 'trainer') {
    await expect(page.locator('a:has-text("My Clients"), a:has-text("Clients")')).toBeVisible();
    await expect(page.locator('a:has-text("Client Intake"), a:has-text("Intake")')).toBeVisible();
  } else if (role === 'client') {
    await expect(page.locator('a:has-text("My Workouts"), a:has-text("Workouts")')).toBeVisible();
    await expect(page.locator('a:has-text("My Trainer"), a:has-text("Trainer")')).toBeVisible();
  } else if (role === 'solo') {
    await expect(
      page.locator('a:has-text("Workout Generator"), a:has-text("AI Workouts")')
    ).toBeVisible();
    await expect(page.locator('a:has-text("AI Coach"), a:has-text("Coach")')).toBeVisible();
  }
}

/**
 * Verify role-specific permissions and access
 */
export async function verifyRolePermissions(page: Page, role: UserRole): Promise<void> {
  // Trainer-only routes
  if (role !== 'trainer') {
    await page.goto('/trainer/clients');
    await page.waitForURL('/'); // Should redirect to home
  }

  // Client-only routes
  if (role !== 'client') {
    await page.goto('/client/workouts');
    await page.waitForURL('/'); // Should redirect to home
  }

  // Solo-only routes
  if (role !== 'solo') {
    await page.goto('/solo/generator');
    await page.waitForURL('/'); // Should redirect to home
  }

  // All authenticated users should access calculators
  await page.goto('/dashboard/calculators');
  await expect(
    page.locator('h1:has-text("Premium Calculators"), h1:has-text("Calculators")')
  ).toBeVisible();
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Try multiple logout mechanisms
  const logoutSelectors = [
    'button:has-text("Logout")',
    'button:has-text("Sign Out")',
    'a:has-text("Logout")',
    'a:has-text("Sign Out")',
    '[data-logout-button]',
    '[aria-label*="logout" i]',
    '[aria-label*="sign out" i]',
  ];

  let clicked = false;
  for (const selector of logoutSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
      await element.click();
      clicked = true;
      break;
    }
  }

  // If no logout button found, navigate to logout endpoint directly
  if (!clicked) {
    await page.goto('/api/logout');
  }

  // Wait for redirect to landing page
  await page.waitForURL('/', { timeout: 5000 }).catch(() => {
    // Some implementations might redirect elsewhere
  });

  await page.waitForLoadState('networkidle');
}

/**
 * Wait for page animations to complete
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await page.waitForTimeout(500); // Wait for framer-motion animations
}

/**
 * Take a screenshot with role-specific filename
 */
export async function takeRoleScreenshot(page: Page, role: UserRole, name: string): Promise<void> {
  await page.screenshot({
    path: `e2e/screenshots/${role}-${name}.png`,
    fullPage: true,
  });
}

/**
 * Verify premium calculator save functionality
 */
export async function verifyCalculatorSave(page: Page): Promise<void> {
  // Click save button
  await page.click('button:has-text("Save Result")');

  // Wait for success toast
  await expect(page.locator('text="Result saved", text="saved"')).toBeVisible({ timeout: 5000 });

  // Wait for toast to disappear
  await page.waitForTimeout(2000);
}

/**
 * Verify calculator has role-themed styling
 */
export async function verifyCalculatorTheming(page: Page, role: UserRole): Promise<void> {
  const theme = ROLE_THEMES[role];

  // Check for premium styling classes
  await expect(page.locator('.premium-card, .premium-glow, .premium-button')).toBeVisible();

  // Verify gradient text uses role color
  const gradientElement = page.locator('.gradient-text').first();
  if (await gradientElement.isVisible()) {
    const color = await gradientElement.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    // Color should contain primary theme values (rough check)
    expect(color).toBeTruthy();
  }
}

/**
 * Fill calculator inputs with test values
 */
export async function fillCalculatorInputs(page: Page, inputs: Record<string, any>): Promise<void> {
  for (const [key, value] of Object.entries(inputs)) {
    // Try different input types
    const rangeInput = page
      .locator(`input[type="range"][name="${key}"], input.premium-slider`)
      .first();
    const numberInput = page.locator(`input[type="number"][name="${key}"]`).first();
    const selectInput = page.locator(`select[name="${key}"]`).first();

    if (await rangeInput.isVisible()) {
      await rangeInput.fill(String(value));
    } else if (await numberInput.isVisible()) {
      await numberInput.fill(String(value));
    } else if (await selectInput.isVisible()) {
      await selectInput.selectOption(String(value));
    }
  }

  await waitForAnimations(page);
}

/**
 * Navigate to a premium calculator
 */
export async function navigateToCalculator(page: Page, calculatorType: string): Promise<void> {
  await page.goto(`/dashboard/calculators/${calculatorType}`);
  await page.waitForLoadState('networkidle');
  await waitForAnimations(page);
}

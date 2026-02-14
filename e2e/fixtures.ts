/**
 * E2E test fixtures for Playwright.
 *
 * Provides test user credentials for each role, common page-object helpers,
 * and an authentication utility so E2E tests can quickly log in as any role.
 */
import { test as base, type Page, type BrowserContext } from '@playwright/test';

// ──────────────────────────────────────────────
// 1. Test user credentials per role
// ──────────────────────────────────────────────

export interface TestCredentials {
  email: string;
  password: string;
  role: 'trainer' | 'client' | 'solo';
  displayName: string;
}

/** Pre-seeded test accounts (must match your dev/seed data). */
export const TEST_USERS: Record<string, TestCredentials> = {
  trainer: {
    email: 'trainer@test.gymgurus.com',
    password: 'TestTrainer123!',
    role: 'trainer',
    displayName: 'Test Trainer',
  },
  client: {
    email: 'client@test.gymgurus.com',
    password: 'TestClient123!',
    role: 'client',
    displayName: 'Test Client',
  },
  solo: {
    email: 'solo@test.gymgurus.com',
    password: 'TestSolo123!',
    role: 'solo',
    displayName: 'Solo User',
  },
};

// ──────────────────────────────────────────────
// 2. Common page-object helpers
// ──────────────────────────────────────────────

/** Helpers that operate on any Page instance. */
export class AppHelpers {
  constructor(private page: Page) {}

  /** Navigate to the app root and wait for the shell to be ready. */
  async goto(path = '/') {
    await this.page.goto(path);
    // Wait for the React app to hydrate (main content area appears)
    await this.page.waitForSelector('[data-testid="app-shell"], main, #root', {
      timeout: 15_000,
    });
  }

  /** Open the sidebar / navigation drawer (mobile or desktop). */
  async openNav() {
    const menuButton = this.page.locator(
      'button[aria-label="Menu"], button[aria-label="Open menu"], [data-testid="nav-toggle"]'
    );
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
  }

  /** Navigate to a specific section via the sidebar. */
  async navigateTo(label: string) {
    await this.openNav();
    await this.page.getByRole('link', { name: new RegExp(label, 'i') }).click();
    // Allow route transition
    await this.page.waitForLoadState('networkidle');
  }

  /** Assert that a toast / notification with the given text appears. */
  async expectToast(text: string | RegExp) {
    await this.page
      .locator('[role="status"], [data-testid="toast"]')
      .filter({ hasText: text })
      .waitFor({
        timeout: 5_000,
      });
  }

  /** Wait for any loading spinners to disappear. */
  async waitForLoaded() {
    // Wait for common loading indicators to vanish
    await this.page
      .locator('[data-testid="loading"], [aria-label="Loading"]')
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => {
        // Ignore if no loading indicator was ever present
      });
  }
}

// ──────────────────────────────────────────────
// 3. Authentication helper
// ──────────────────────────────────────────────

/**
 * Log in to the application as the specified role.
 *
 * This performs a UI-based login through the login page.
 * For faster tests, consider storing authenticated state and reusing it
 * via `storageState` in the Playwright config.
 */
export async function loginAs(
  page: Page,
  role: keyof typeof TEST_USERS = 'trainer'
): Promise<void> {
  const creds = TEST_USERS[role];

  await page.goto('/');

  // Click "Login" or "Sign In" if visible on the landing page
  const loginLink = page.getByRole('link', { name: /log\s*in|sign\s*in/i });
  if (await loginLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await loginLink.click();
  }

  // Fill in credentials
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);

  // Submit
  await page.getByRole('button', { name: /log\s*in|sign\s*in|submit/i }).click();

  // Wait for redirect to the authenticated dashboard
  await page.waitForURL(/\/(dashboard|home|app)/, { timeout: 10_000 }).catch(() => {
    // Some flows may stay on the same URL; wait for authenticated content instead
  });

  await page.waitForLoadState('networkidle');
}

/**
 * Save the authenticated browser state so subsequent tests can skip login.
 *
 * Usage in globalSetup or a setup project:
 * ```ts
 * const ctx = await browser.newContext();
 * const page = await ctx.newPage();
 * await loginAs(page, 'trainer');
 * await saveAuthState(ctx, 'trainer');
 * ```
 */
export async function saveAuthState(
  context: BrowserContext,
  role: keyof typeof TEST_USERS
): Promise<string> {
  const storagePath = `e2e/.auth/${role}-state.json`;
  await context.storageState({ path: storagePath });
  return storagePath;
}

// ──────────────────────────────────────────────
// 4. Extended Playwright test fixture
// ──────────────────────────────────────────────

/**
 * Extended `test` fixture that provides an `app` helper on every test.
 *
 * @example
 * ```ts
 * import { test, expect } from '../e2e/fixtures';
 *
 * test('dashboard loads', async ({ app, page }) => {
 *   await app.goto('/dashboard');
 *   await expect(page).toHaveTitle(/GymGurus/);
 * });
 * ```
 */
export const test = base.extend<{ app: AppHelpers }>({
  app: async ({ page }, use) => {
    const app = new AppHelpers(page);
    await use(app);
  },
});

export { expect } from '@playwright/test';

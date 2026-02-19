import { test, expect } from '@playwright/test';
import {
  loginAsRole,
  verifyTheme,
  verifyRoleNavigation,
  verifyRolePermissions,
  logout,
  waitForAnimations,
  takeRoleScreenshot,
  ROLE_THEMES,
  type UserRole,
} from './auth-helpers';

/**
 * Comprehensive Login and Role Testing Suite
 *
 * Tests all 3 user roles (Trainer/Guru, Client/Disciple, Solo/Ronin) to verify:
 * - Login flow works correctly
 * - Role-specific theming is applied (gold/teal/purple)
 * - Navigation items match role permissions
 * - Protected routes enforce authorization
 * - Theme persists across page navigation
 */

test.describe('Login and Authentication', () => {
  test('should load test login page', async ({ page }) => {
    await page.goto('/test-login');

    // Verify page title and description
    await expect(page.getByText('Test Login - Select Role')).toBeVisible();
    await expect(page.getByText('This is a simplified login page for E2E testing')).toBeVisible();

    // Verify all role buttons are visible
    await expect(page.locator('button:has-text("Trainer")')).toBeVisible();
    await expect(page.locator('button:has-text("Client")')).toBeVisible();
    await expect(page.locator('button:has-text("Solo")')).toBeVisible();
  });

  const roles: UserRole[] = ['trainer', 'client', 'solo'];

  for (const role of roles) {
    test(`should login successfully as ${role}`, async ({ page }) => {
      await loginAsRole(page, role);

      // Verify we're on a dashboard/authenticated page
      await expect(page).toHaveURL(/\/(dashboard|trainer|client|solo)/);

      // Verify page loaded (should see main navigation or dashboard content)
      await expect(page.locator('nav, main, [data-testid="app-shell"]')).toBeVisible();
    });
  }
});

test.describe('Role-Specific Theming', () => {
  const roles: UserRole[] = ['trainer', 'client', 'solo'];

  for (const role of roles) {
    test(`should apply correct theme for ${role} (${ROLE_THEMES[role].displayName})`, async ({
      page,
    }) => {
      await loginAsRole(page, role);
      await waitForAnimations(page);

      // Verify theme
      await verifyTheme(page, role);

      // Take screenshot for visual verification
      await takeRoleScreenshot(page, role, 'dashboard-theme');
    });

    test(`should persist ${role} theme across navigation`, async ({ page }) => {
      await loginAsRole(page, role);

      // Navigate to different pages
      const pages = ['/dashboard', '/dashboard/calculators'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await waitForAnimations(page);
        await verifyTheme(page, role);
      }
    });
  }

  test('should show correct theme colors - Trainer (Gold)', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await verifyTheme(page, 'trainer');

    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    expect(primaryColor).toBe('43 54% 55%'); // Gold HSL
  });

  test('should show correct theme colors - Client (Teal)', async ({ page }) => {
    await loginAsRole(page, 'client');
    await verifyTheme(page, 'client');

    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    expect(primaryColor).toBe('170 78% 40%'); // Teal HSL
  });

  test('should show correct theme colors - Solo (Purple)', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await verifyTheme(page, 'solo');

    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    expect(primaryColor).toBe('271 81% 60%'); // Purple HSL
  });
});

test.describe('Role-Specific Navigation', () => {
  test('should show Trainer-specific navigation items', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await verifyRoleNavigation(page, 'trainer');

    // Trainer should see "My Clients"
    await expect(page.locator('a:has-text("My Clients"), a:has-text("Clients")')).toBeVisible();
  });

  test('should show Client-specific navigation items', async ({ page }) => {
    await loginAsRole(page, 'client');
    await verifyRoleNavigation(page, 'client');

    // Client should see "My Workouts"
    await expect(page.locator('a:has-text("My Workouts"), a:has-text("Workouts")')).toBeVisible();
  });

  test('should show Solo-specific navigation items', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await verifyRoleNavigation(page, 'solo');

    // Solo should see "Workout Generator" or "AI Coach"
    await expect(
      page.locator('a:has-text("Workout Generator"), a:has-text("AI Coach")')
    ).toBeVisible();
  });

  test('all roles should have access to Calculators', async ({ page }) => {
    const roles: UserRole[] = ['trainer', 'client', 'solo'];

    for (const role of roles) {
      await loginAsRole(page, role);
      await expect(page.locator('a:has-text("Calculators")')).toBeVisible();

      // Click and verify navigation
      await page.click('a:has-text("Calculators")');
      await page.waitForURL(/\/dashboard\/calculators/);
      await expect(
        page.locator('h1:has-text("Premium Calculators"), h1:has-text("Calculators")')
      ).toBeVisible();

      // Logout for next iteration
      await logout(page);
    }
  });
});

test.describe('Role-Based Permissions', () => {
  test('should enforce Trainer-only routes', async ({ page }) => {
    // Login as Client, try to access Trainer routes
    await loginAsRole(page, 'client');

    await page.goto('/trainer/clients');
    // Should redirect away from trainer-only page
    await page.waitForURL(/^(?!.*\/trainer\/clients)/);
  });

  test('should enforce Client-only routes', async ({ page }) => {
    // Login as Solo, try to access Client routes
    await loginAsRole(page, 'solo');

    await page.goto('/client/workouts');
    // Should redirect away from client-only page
    await page.waitForURL(/^(?!.*\/client\/workouts)/);
  });

  test('should enforce Solo-only routes', async ({ page }) => {
    // Login as Trainer, try to access Solo routes
    await loginAsRole(page, 'trainer');

    await page.goto('/solo/generator');
    // Should redirect away from solo-only page
    await page.waitForURL(/^(?!.*\/solo\/generator)/);
  });

  test('all roles should access premium calculators', async ({ page }) => {
    const roles: UserRole[] = ['trainer', 'client', 'solo'];

    for (const role of roles) {
      await loginAsRole(page, role);

      await page.goto('/dashboard/calculators');
      await expect(page).toHaveURL('/dashboard/calculators');
      await expect(page.locator('h1')).toContainText(['Premium', 'Calculators']);

      await logout(page);
    }
  });
});

test.describe('Logout Functionality', () => {
  test('should logout successfully', async ({ page }) => {
    await loginAsRole(page, 'trainer');

    // Verify logged in
    await expect(page).toHaveURL(/\/(dashboard|trainer)/);

    // Logout
    await logout(page);

    // Verify logged out (redirected to landing)
    await expect(page).toHaveURL('/');
    await expect(page.locator('a:has-text("Login"), a:has-text("Get Started")')).toBeVisible();
  });

  test('should clear session on logout', async ({ page }) => {
    await loginAsRole(page, 'client');

    await logout(page);

    // Try to access protected route after logout
    await page.goto('/dashboard/calculators');

    // Should redirect to landing page (not authenticated)
    await page.waitForURL('/');
  });
});

test.describe('Dashboard Content', () => {
  test('Trainer dashboard should show client-related content', async ({ page }) => {
    await loginAsRole(page, 'trainer');

    // Should see trainer-specific dashboard elements
    await expect(page.locator('text="Guru", text="Trainer", text="Clients"')).toBeVisible();
  });

  test('Client dashboard should show workout-related content', async ({ page }) => {
    await loginAsRole(page, 'client');

    // Should see client-specific dashboard elements
    await expect(page.locator('text="Disciple", text="Client", text="Workouts"')).toBeVisible();
  });

  test('Solo dashboard should show AI/generator content', async ({ page }) => {
    await loginAsRole(page, 'solo');

    // Should see solo-specific dashboard elements
    await expect(
      page.locator('text="Ronin", text="Solo", text="Generator", text="AI"')
    ).toBeVisible();
  });
});

test.describe('Visual Regression', () => {
  test('Trainer dashboard screenshot', async ({ page }) => {
    await loginAsRole(page, 'trainer');
    await waitForAnimations(page);
    await takeRoleScreenshot(page, 'trainer', 'dashboard-full');
  });

  test('Client dashboard screenshot', async ({ page }) => {
    await loginAsRole(page, 'client');
    await waitForAnimations(page);
    await takeRoleScreenshot(page, 'client', 'dashboard-full');
  });

  test('Solo dashboard screenshot', async ({ page }) => {
    await loginAsRole(page, 'solo');
    await waitForAnimations(page);
    await takeRoleScreenshot(page, 'solo', 'dashboard-full');
  });
});

test.describe('Theme Switching', () => {
  test('should apply different themes when switching roles', async ({ page }) => {
    // Login as Trainer (Gold)
    await loginAsRole(page, 'trainer');
    await verifyTheme(page, 'trainer');
    const trainerColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    await logout(page);

    // Login as Client (Teal)
    await loginAsRole(page, 'client');
    await verifyTheme(page, 'client');
    const clientColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });

    // Colors should be different
    expect(trainerColor).not.toBe(clientColor);
    expect(trainerColor).toBe('43 54% 55%'); // Gold
    expect(clientColor).toBe('170 78% 40%'); // Teal
  });
});

test.describe('Accessibility', () => {
  test('login buttons should be keyboard accessible', async ({ page }) => {
    await page.goto('/test-login');

    // Tab to first button
    await page.keyboard.press('Tab');

    // Should focus on Trainer button
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    expect(focused).toContain('Trainer');

    // Press Enter to click
    await page.keyboard.press('Enter');

    // Should login
    await page.waitForURL(/\/(dashboard|trainer)/);
  });

  test('all roles should have proper ARIA labels', async ({ page }) => {
    const roles: UserRole[] = ['trainer', 'client', 'solo'];

    for (const role of roles) {
      await loginAsRole(page, role);

      // Check for proper landmark regions
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
      await expect(page.locator('main, [role="main"]')).toBeVisible();

      await logout(page);
    }
  });
});

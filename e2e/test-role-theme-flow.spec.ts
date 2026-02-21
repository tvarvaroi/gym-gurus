import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test.describe('Role-Themed Authentication Flow', () => {
  test('should navigate from landing page to themed login page', async ({ page }) => {
    // Step 1: Navigate to landing page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('📍 Current URL:', page.url());
    await page.screenshot({ path: 'screenshots/01-landing-page.png', fullPage: true });

    // Step 2: Wait for role cards to be visible
    await page.waitForSelector('text=Guru', { timeout: 10000 });
    console.log('✅ Guru role card found');

    // Step 3: Click on Trainer/Guru role card
    const trainerCard = page.locator('text=Guru').first();
    await trainerCard.click();
    await page.waitForTimeout(500); // Wait for selection animation

    console.log('✅ Clicked Guru role card');
    await page.screenshot({ path: 'screenshots/02-role-selected.png', fullPage: true });

    // Step 4: Check if SIGN IN button is visible and enabled
    const signInButton = page.locator('button:has-text("SIGN IN")');
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
    console.log('✅ Sign In button is visible and enabled');

    // Step 5: Click SIGN IN button
    console.log('🔄 Clicking Sign In button...');
    await signInButton.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    console.log('📍 Current URL after click:', currentUrl);
    await page.screenshot({ path: 'screenshots/03-after-signin-click.png', fullPage: true });

    // Step 6: Verify redirect to login page with role parameter
    expect(currentUrl).toContain('/auth/login');
    expect(currentUrl).toContain('role=trainer');
    console.log('✅ Redirected to /auth/login?role=trainer');

    // Step 7: Wait for login page to load
    await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
    console.log('✅ Login page loaded');

    // Step 8: Check for role badge
    const roleBadge = page.locator('text=Trainer (Guru)');
    if (await roleBadge.isVisible()) {
      console.log('✅ Role badge "Trainer (Guru)" is visible');
    } else {
      console.log('❌ Role badge NOT visible');
    }

    // Step 9: Check for themed button (should have gold gradient)
    const submitButton = page.locator('button:has-text("Sign In")');
    await expect(submitButton).toBeVisible();

    const buttonStyles = await submitButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        background: computed.background,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });
    console.log('🎨 Submit button styles:', JSON.stringify(buttonStyles, null, 2));

    // Step 10: Check for themed link
    const forgotPasswordLink = page.locator('a:has-text("Forgot password?")');
    if (await forgotPasswordLink.isVisible()) {
      const linkColor = await forgotPasswordLink.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log('🎨 Forgot password link color:', linkColor);
    }

    await page.screenshot({ path: 'screenshots/04-login-page-final.png', fullPage: true });
  });

  test('should show themed register page', async ({ page }) => {
    // Navigate directly to register page with role
    await page.goto(`${BASE_URL}/auth/register?role=client`);
    await page.waitForLoadState('networkidle');

    console.log('📍 Current URL:', page.url());
    await page.screenshot({ path: 'screenshots/05-register-page-client.png', fullPage: true });

    // Check for role badge
    const roleBadge = page.locator('text=Client (Disciple)');
    if (await roleBadge.isVisible()) {
      console.log('✅ Role badge "Client (Disciple)" is visible');
    } else {
      console.log('❌ Role badge NOT visible');
    }

    // Check if role is pre-selected in dropdown
    const roleSelect = page.locator('button[role="combobox"]').first();
    const selectedValue = await roleSelect.textContent();
    console.log('📋 Selected role in dropdown:', selectedValue);

    // Check submit button styling
    const submitButton = page.locator('button:has-text("Create Account")');
    const buttonStyles = await submitButton.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        background: computed.background,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });
    console.log('🎨 Create Account button styles:', JSON.stringify(buttonStyles, null, 2));

    await page.screenshot({ path: 'screenshots/06-register-page-final.png', fullPage: true });
  });

  test('should allow changing role from auth pages', async ({ page }) => {
    // Navigate to login with role
    await page.goto(`${BASE_URL}/auth/login?role=solo`);
    await page.waitForLoadState('networkidle');

    console.log('📍 Current URL:', page.url());
    await page.screenshot({ path: 'screenshots/07-login-solo.png', fullPage: true });

    // Check for "Choose different role" link
    const changeRoleLink = page.locator('a:has-text("Choose different role")');
    if (await changeRoleLink.isVisible()) {
      console.log('✅ "Choose different role" link is visible');

      // Click it
      await changeRoleLink.click();
      await page.waitForLoadState('networkidle');

      const newUrl = page.url();
      console.log('📍 URL after clicking change role:', newUrl);

      // Should redirect to home
      expect(newUrl).toBe(`${BASE_URL}/`);
      console.log('✅ Redirected back to landing page');

      await page.screenshot({ path: 'screenshots/08-back-to-landing.png', fullPage: true });
    } else {
      console.log('❌ "Choose different role" link NOT visible');
    }
  });
});

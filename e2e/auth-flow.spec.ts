import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

// Test user data
const testUser = {
  email: `test-${Date.now()}@gymgurus.test`,
  password: 'TestPassword123',
  firstName: 'Test',
  lastName: 'User',
};

test.describe('Authentication Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('should load registration page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    // Check for registration form elements
    await expect(page.locator('h1')).toContainText('Create Account');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
  });

  test('should validate registration form', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    // Try to submit empty form
    await page.locator('button[type="submit"]').click();

    // Check for validation errors
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Last name is required')).toBeVisible();

    // Test password validation
    await page.locator('input[name="password"]').fill('short');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('should show password strength indicators', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    const passwordInput = page.locator('input[name="password"]');

    // Type a password and check strength indicators
    await passwordInput.fill('TestPassword123');

    // Should show green checkmarks for met requirements
    await expect(page.locator('text=At least 8 characters').first()).toBeVisible();
    await expect(page.locator('text=One uppercase letter').first()).toBeVisible();
    await expect(page.locator('text=One number').first()).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    // Fill in registration form
    await page.locator('input[name="firstName"]').fill(testUser.firstName);
    await page.locator('input[name="lastName"]').fill(testUser.lastName);
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="confirmPassword"]').fill(testUser.password);

    // Select role (Solo/Ronin)
    await page.locator('button').filter({ hasText: 'Select your role' }).click();
    await page.locator('[role="option"]').filter({ hasText: 'Solo' }).click();

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    // Try to register with the same email
    await page.locator('input[name="firstName"]').fill('Another');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="confirmPassword"]').fill(testUser.password);

    // Select role
    await page.locator('button').filter({ hasText: 'Select your role' }).click();
    await page.locator('[role="option"]').filter({ hasText: 'Solo' }).click();

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Should show error
    await expect(page.locator('text=/already exists/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto(`${BASE_URL}/auth/login`);
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Logout (call API directly since there might not be a logout button in UI yet)
    const response = await page.request.post(`${BASE_URL}/api/auth/logout`);
    expect(response.ok()).toBeTruthy();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Check for login form
    await expect(page.locator('h1')).toContainText('Welcome Back');

    // Fill in credentials
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Try wrong password
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill('WrongPassword123');
    await page.locator('button[type="submit"]').click();

    // Should show error
    await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first();

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle
    await toggleButton.click();

    // Password should be visible
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should navigate to registration from login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Click "Sign up" link
    await page.locator('a').filter({ hasText: 'Sign up' }).click();

    // Should navigate to register page
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('h1')).toContainText('Create Account');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Click "Forgot password?" link
    await page.locator('a').filter({ hasText: 'Forgot password' }).click();

    // Should navigate to forgot password page
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.locator('h1')).toContainText('Reset Password');
  });

  test('should submit forgot password form', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/forgot-password`);

    // Fill in email
    await page.locator('input[name="email"]').fill(testUser.email);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should show success message (always, to prevent email enumeration)
    await expect(page.locator('text=/password reset link has been sent/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Clear cookies/session
    await page.context().clearCookies();

    // Try to access dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    // Should either redirect to login or show 401
    // Check if redirected or if there's an error
    const url = page.url();
    const hasAuthError = await page
      .locator('text=/Authentication required|Please log in/i')
      .isVisible()
      .catch(() => false);

    expect(url.includes('/auth/login') || hasAuthError).toBeTruthy();
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/auth/login`);
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/register`);

    await page.locator('input[name="password"]').fill('TestPassword123');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPassword123');
    await page.locator('button[type="submit"]').click();

    // Should show mismatch error
    await expect(page.locator('text=/Passwords do not match/i')).toBeVisible();
  });

  test('should check /api/auth/me endpoint', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/login`);
    await page.locator('input[name="email"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Call /api/auth/me
    const response = await page.request.get(`${BASE_URL}/api/auth/me`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testUser.email);
    expect(data.user.firstName).toBe(testUser.firstName);
    expect(data.user.role).toBe('solo');
  });

  test('should reject /api/auth/me when not authenticated', async ({ page }) => {
    // Clear session
    await page.context().clearCookies();

    // Try to access /api/auth/me
    const response = await page.request.get(`${BASE_URL}/api/auth/me`);
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

test.describe('Password Reset Flow', () => {
  test('should validate reset password form', async ({ page }) => {
    // Note: In real scenario, you'd need a valid token
    // For now, test the UI validation
    await page.goto(`${BASE_URL}/auth/reset-password?token=fake-token`);

    // Try weak password
    await page.locator('input[name="password"]').fill('weak');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=/Password must be at least 8 characters/i')).toBeVisible();
  });

  test('should show error for missing token', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/reset-password`);

    // Should show invalid token message
    await expect(page.locator('text=/Invalid or missing reset token/i')).toBeVisible();
  });
});

test.describe('Form Accessibility', () => {
  test('should have proper labels and ARIA attributes', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Check for labels
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Tab through form
    await page.keyboard.press('Tab'); // Email
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Password
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab'); // Submit button
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });
});

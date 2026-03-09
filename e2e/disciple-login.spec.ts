import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test.describe('Disciple Login Page — § VA-1 regression', () => {
  test('should render the access code form, not the landing carousel', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    // Must show the Client Access heading (DiscipleLoginPage)
    await expect(page.locator('h1')).toContainText('Client Access');

    // Must show the access code input
    await expect(page.locator('input#accessCode')).toBeVisible();

    // Must NOT show landing carousel content
    await expect(page.locator('text=Run Your Fitness Business')).not.toBeVisible();
  });

  test('should show the access code placeholder GG-XXXX-XXXX', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    const input = page.locator('input#accessCode');
    await expect(input).toHaveAttribute('placeholder', 'GG-XXXX-XXXX');
  });

  test('should format code input as user types', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    const input = page.locator('input#accessCode');
    await input.fill('GG12345678');

    // Should auto-format to GG-1234-5678
    await expect(input).toHaveValue('GG-1234-5678');
  });

  test('should disable submit button when code is incomplete', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();

    // Type partial code
    const input = page.locator('input#accessCode');
    await input.fill('GG1234');
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when code is complete', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    const input = page.locator('input#accessCode');
    await input.fill('GG12345678');

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should show error on invalid access code', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    const input = page.locator('input#accessCode');
    await input.fill('GG12345678');

    await page.locator('button[type="submit"]').click();

    // Should show an error (invalid code)
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('should have a link to trainer login', async ({ page }) => {
    await page.goto(`${BASE_URL}/disciple-login`);

    const trainerLink = page.locator('a[href="/auth/login"]');
    await expect(trainerLink).toBeVisible();
    await expect(trainerLink).toContainText('Log in here');
  });
});

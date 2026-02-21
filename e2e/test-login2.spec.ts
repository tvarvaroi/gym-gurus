import { test } from '@playwright/test';

test('Test /login2 route', async ({ page }) => {
  console.log('Testing /login2...');
  await page.goto('http://localhost:5000/login2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log('Final URL:', url);
  console.log('Stayed on /login2?', url === 'http://localhost:5000/login2');

  const bodyText = await page.locator('body').textContent();
  console.log('Has "Welcome Back"?', bodyText?.includes('Welcome Back'));
});

import { test } from '@playwright/test';

test('Test non-lazy /test-auth-login', async ({ page }) => {
  console.log('🧪 Navigating to /test-auth-login...');
  await page.goto('http://localhost:5000/test-auth-login');
  await page.waitForTimeout(3000);

  console.log('Final URL:', page.url());
  console.log(
    'Page content includes "Test Auth Login":',
    await page.content().then((c) => c.includes('Test Auth Login'))
  );
});

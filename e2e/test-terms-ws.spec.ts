import { test } from '@playwright/test';

test('Test WebSocket on /terms page', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.log('💥 PAGE ERROR:', error.message);
  });

  console.log('🧪 Navigating to /terms...');
  await page.goto('http://localhost:5000/terms');
  await page.waitForTimeout(5000);

  console.log('Final URL:', page.url());
  console.log('Total errors:', errors.length);

  const wsErrors = errors.filter((e) => e.includes('WebSocket'));
  console.log('WebSocket errors:', wsErrors.length);
  wsErrors.forEach((e) => console.log('  -', e));
});

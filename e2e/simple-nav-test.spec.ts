import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test('Simple navigation test - just check URLs', async ({ page }) => {
  // Capture all navigation events
  const navigationLog: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigationLog.push(frame.url());
    }
  });

  console.log('1️⃣ Navigate to landing page');
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  console.log('   Current URL:', page.url());
  console.log('   Navigation log:', navigationLog);
  navigationLog.length = 0; // Clear

  console.log('\n2️⃣ Navigate to /auth/login via goto');
  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  console.log('   Current URL:', page.url());
  console.log('   Navigation log:', navigationLog);
  console.log('   Expected: /auth/login');
  console.log('   Match?', page.url() === `${BASE_URL}/auth/login`);

  // Check page content
  const bodyText = await page.locator('body').textContent();
  console.log('   Page has "Welcome Back"?', bodyText?.includes('Welcome Back'));
  console.log('   Page has "Email"?', bodyText?.includes('Email'));
});

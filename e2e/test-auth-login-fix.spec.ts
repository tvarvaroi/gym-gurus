import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test('Test /auth/login after queryClient fix', async ({ page }) => {
  console.log('🧪 Testing /auth/login with queryClient fix...');

  // Track all console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      console.log('❌ CONSOLE ERROR:', text);
    } else {
      console.log('📝 CONSOLE:', text);
    }
  });

  // Track page errors
  page.on('pageerror', (error) => {
    console.log('💥 PAGE ERROR:', error.message);
  });

  // Track navigation changes
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      console.log('🔄 NAVIGATED TO:', frame.url());
    }
  });

  // Navigate to /auth/login
  console.log('Navigating to /auth/login...');
  await page.goto(`${BASE_URL}/auth/login`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });

  // Wait a bit to see if there are any redirects
  await page.waitForTimeout(3000);

  const finalUrl = page.url();
  console.log('Final URL after 3s:', finalUrl);

  // Check if we stayed on /auth/login
  if (finalUrl.includes('/auth/login')) {
    console.log('✅ SUCCESS: Stayed on /auth/login, no redirect!');
  } else {
    console.log('❌ FAIL: Redirected to:', finalUrl);
  }

  // Check for route match log
  const hasRouteMatch = consoleMessages.some((msg) => msg.includes('[Route] /auth/login matched!'));
  console.log('Route matched:', hasRouteMatch ? 'YES ✅' : 'NO ❌');

  // Check for continuous reloads (multiple auth/user requests)
  const authUserRequests = consoleMessages.filter(
    (msg) => msg.includes('/api/auth/user') || msg.includes('/api/auth/me')
  );
  console.log('Auth API requests count:', authUserRequests.length);

  // Screenshot for debugging
  await page.screenshot({ path: 'test-auth-login-fix.png', fullPage: true });
  console.log('📸 Screenshot saved to test-auth-login-fix.png');
});

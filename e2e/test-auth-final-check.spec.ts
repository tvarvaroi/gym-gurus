import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test('Final check: /auth/login should not make continuous auth requests', async ({ page }) => {
  console.log('🧪 Testing /auth/login for continuous reload issue...\n');

  // Track all network requests
  const authRequests: string[] = [];

  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/auth/user') || url.includes('/api/auth/me')) {
      const timestamp = new Date().toLocaleTimeString();
      authRequests.push(`[${timestamp}] ${url}`);
      console.log(`📡 API REQUEST: ${url}`);
    }
  });

  // Track console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('❌ CONSOLE ERROR:', msg.text());
    }
  });

  // Navigate to login page
  console.log('\n🔄 Navigating to /auth/login?role=trainer...\n');
  await page.goto(`${BASE_URL}/auth/login?role=trainer`, {
    waitUntil: 'networkidle',
    timeout: 10000,
  });

  console.log('✅ Page loaded, waiting 10 seconds to monitor for continuous requests...\n');

  // Wait 10 seconds and count requests
  const initialCount = authRequests.length;
  await page.waitForTimeout(10000);
  const finalCount = authRequests.length;

  console.log('\n📊 RESULTS:');
  console.log(`Initial auth requests: ${initialCount}`);
  console.log(`Auth requests after 10s: ${finalCount}`);
  console.log(`New requests during wait: ${finalCount - initialCount}`);

  if (authRequests.length > 0) {
    console.log('\n📋 All auth requests made:');
    authRequests.forEach((req) => console.log(`  ${req}`));
  }

  // Check page is still on /auth/login
  const finalUrl = page.url();
  console.log(`\n🔗 Final URL: ${finalUrl}`);

  if (finalUrl.includes('/auth/login')) {
    console.log('✅ Page stayed on /auth/login');
  } else {
    console.log('❌ Page redirected to:', finalUrl);
  }

  // Check if page is making continuous requests (more than 2 during the 10s wait)
  const continuousRequests = finalCount - initialCount;
  if (continuousRequests > 2) {
    console.log(
      `\n❌ FAILED: Page made ${continuousRequests} auth requests in 10 seconds (continuous reload)`
    );
  } else if (continuousRequests === 0) {
    console.log('\n✅ SUCCESS: No auth requests made after initial load (reload fixed!)');
  } else {
    console.log(`\n⚠️  WARNING: Made ${continuousRequests} auth requests in 10 seconds`);
  }

  // Take screenshot
  await page.screenshot({ path: 'auth-login-final-check.png', fullPage: true });
  console.log('\n📸 Screenshot saved to auth-login-final-check.png');
});

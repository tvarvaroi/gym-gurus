import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test('Comprehensive error debugging', async ({ page }) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  // Capture ALL console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      consoleErrors.push(text);
      console.log('❌ CONSOLE ERROR:', text);
    } else if (type === 'warning') {
      console.log('⚠️  WARNING:', text);
    } else if (text.includes('[')) {
      console.log('📋', text);
    }
  });

  // Capture page errors (unhandled exceptions)
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
    console.log('💥 PAGE ERROR:', error.message);
    console.log('   Stack:', error.stack);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.url()} - ${failure?.errorText}`);
    console.log('🚫 REQUEST FAILED:', request.url());
    console.log('   Error:', failure?.errorText);
  });

  // Capture response errors
  page.on('response', (response) => {
    if (!response.ok() && response.status() !== 401) {
      console.log(`⚠️  Response ${response.status()} for ${response.url()}`);
    }
  });

  console.log('\n🧪 Navigating to /auth/login...\n');

  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('\n📊 FINAL SUMMARY:');
  console.log('Final URL:', page.url());
  console.log('Console errors:', consoleErrors.length);
  console.log('Page errors:', pageErrors.length);
  console.log('Failed requests:', failedRequests.length);

  if (consoleErrors.length > 0) {
    console.log('\n❌ Console Errors:');
    consoleErrors.forEach((err) => console.log('  -', err));
  }

  if (pageErrors.length > 0) {
    console.log('\n💥 Page Errors:');
    pageErrors.forEach((err) => console.log('  -', err));
  }

  if (failedRequests.length > 0) {
    console.log('\n🚫 Failed Requests:');
    failedRequests.forEach((req) => console.log('  -', req));
  }

  // Take screenshot
  await page.screenshot({ path: 'screenshots/comprehensive-debug.png', fullPage: true });
  console.log('\n📸 Screenshot saved to screenshots/comprehensive-debug.png');
});

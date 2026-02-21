import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

test('Debug: Navigate directly to login page with role', async ({ page }) => {
  // Capture console logs
  page.on('console', (msg) => console.log('🖥️ Browser console:', msg.text()));

  console.log('🔍 Navigating directly to /auth/login?role=trainer...');

  await page.goto(`${BASE_URL}/auth/login?role=trainer`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for any redirects

  const finalUrl = page.url();
  console.log('📍 Final URL:', finalUrl);

  // Take screenshot
  await page.screenshot({ path: 'screenshots/debug-login-direct.png', fullPage: true });

  // Get page title
  const title = await page.title();
  console.log('📄 Page title:', title);

  // Check if we're still on login page or redirected
  if (finalUrl.includes('/auth/login')) {
    console.log('✅ Still on login page');

    // Get all text on page
    const bodyText = await page.locator('body').textContent();
    console.log('📝 Page contains "Welcome Back"?', bodyText?.includes('Welcome Back'));
    console.log('📝 Page contains "Email"?', bodyText?.includes('Email'));
    console.log('📝 Page contains "Password"?', bodyText?.includes('Password'));
    console.log('📝 Page contains "Trainer"?', bodyText?.includes('Trainer'));
    console.log('📝 Page contains "Guru"?', bodyText?.includes('Guru'));

    // Check for role badge
    const badgeText = await page.locator('[style*="background"]').allTextContents();
    console.log('🏷️ Elements with background style:', badgeText.slice(0, 10));

    // Get all button text
    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 All buttons on page:', buttons);

    // Get all links
    const links = await page.locator('a').allTextContents();
    console.log('🔗 All links on page:', links.slice(0, 10));
  } else {
    console.log('❌ Redirected to:', finalUrl);
  }
});

test('Debug: Navigate directly to register page with role', async ({ page }) => {
  console.log('🔍 Navigating directly to /auth/register?role=client...');

  await page.goto(`${BASE_URL}/auth/register?role=client`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  console.log('📍 Final URL:', finalUrl);

  await page.screenshot({ path: 'screenshots/debug-register-direct.png', fullPage: true });

  const title = await page.title();
  console.log('📄 Page title:', title);

  if (finalUrl.includes('/auth/register')) {
    console.log('✅ Still on register page');

    const bodyText = await page.locator('body').textContent();
    console.log('📝 Page contains "Create Account"?', bodyText?.includes('Create Account'));
    console.log('📝 Page contains "Client"?', bodyText?.includes('Client'));
    console.log('📝 Page contains "Disciple"?', bodyText?.includes('Disciple'));

    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 All buttons on page:', buttons);
  } else {
    console.log('❌ Redirected to:', finalUrl);
  }
});

test('Debug: Check landing page button after selection', async ({ page }) => {
  console.log('🔍 Testing landing page role selection...');

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  console.log('📍 On landing page:', page.url());

  // Wait for page to load
  await page.waitForSelector('text=Guru', { timeout: 10000 });
  console.log('✅ Guru text found');

  // Get all buttons BEFORE clicking
  const buttonsBefore = await page.locator('button').allTextContents();
  console.log(
    '🔘 Buttons BEFORE clicking role:',
    buttonsBefore.filter((t) => t.trim())
  );

  // Click Guru card
  await page.locator('text=Guru').first().click();
  await page.waitForTimeout(1000);
  console.log('✅ Clicked Guru role');

  await page.screenshot({ path: 'screenshots/debug-landing-after-click.png', fullPage: true });

  // Get all buttons AFTER clicking
  const buttonsAfter = await page.locator('button').allTextContents();
  console.log(
    '🔘 Buttons AFTER clicking role:',
    buttonsAfter.filter((t) => t.trim())
  );

  // Check if button is visible
  const signInVisible = await page
    .locator('button:has-text("SIGN IN")')
    .isVisible()
    .catch(() => false);
  console.log('👁️ "SIGN IN" button visible?', signInVisible);

  // Try alternative selectors
  const signInAlt1 = await page
    .locator('text=SIGN IN')
    .isVisible()
    .catch(() => false);
  console.log('👁️ Text "SIGN IN" visible?', signInAlt1);

  const signInAlt2 = await page
    .locator('button', { hasText: 'SIGN IN' })
    .isVisible()
    .catch(() => false);
  console.log('👁️ Button with text "SIGN IN" visible?', signInAlt2);
});

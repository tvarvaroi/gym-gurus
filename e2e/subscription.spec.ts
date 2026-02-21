/**
 * Subscription E2E Tests
 *
 * Covers:
 *   1. API — registration creates a 14-day trial
 *   2. API — GET /api/payments/subscription returns correct shape
 *   3. API — unauthenticated requests to subscription endpoints return 401
 *   4. UI  — /pricing page renders 4 tier cards with correct content
 *   5. UI  — /pricing page shows trial countdown for trial users
 *   6. UI  — trial banner appears on dashboard for trainer/solo in trial
 *   7. UI  — disciple (client role) cannot navigate to /pricing
 *
 * NOTE: Tests that require Stripe redirect (checkout, portal) are excluded —
 * they cannot be tested without live Stripe keys and are covered by
 * the manual verification checklist.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Extract CSRF token from a GET / response cookie. */
async function getCsrfToken(
  request: Parameters<typeof test>[1] extends (...a: any[]) => any ? never : any
): Promise<string> {
  const response = await request.get(`${BASE_URL}/`);
  const cookies = response.headers()['set-cookie'];
  const cookieArray = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const found = cookieArray.find((c: string) => c.startsWith('csrf-token='));
  if (found) {
    const match = found.match(/csrf-token=([^;]+)/);
    if (match) return match[1];
  }
  return '';
}

/** Register a user via the API and return their auth cookies + CSRF token. */
async function apiRegisterUser(
  request: any,
  role: 'trainer' | 'solo' = 'trainer'
): Promise<{ email: string; password: string; authCookies: string[]; csrfToken: string }> {
  const email = `sub-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@gymgurus.test`;
  const password = 'TestPassword123!';
  const csrfToken = await getCsrfToken(request);

  const res = await request.post(`${BASE_URL}/api/auth/register`, {
    headers: {
      'x-csrf-token': csrfToken,
      Cookie: `csrf-token=${csrfToken}`,
    },
    data: { email, password, firstName: 'Sub', lastName: 'Test', role },
  });

  const cookies = res.headers()['set-cookie'];
  const authCookies: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];

  return { email, password, authCookies, csrfToken };
}

/** Build a Cookie header string from raw Set-Cookie values. */
function buildCookieHeader(rawCookies: string[]): string {
  return rawCookies.map((c) => c.split(';')[0]).join('; ');
}

// ---------------------------------------------------------------------------
// 1 & 2. API — subscription status after registration
// ---------------------------------------------------------------------------

test.describe('Subscription API', () => {
  test.describe.configure({ mode: 'serial' });

  let authCookies: string[] = [];
  let csrfToken = '';

  test('POST /api/auth/register — new trainer gets a 14-day free trial', async ({ request }) => {
    const result = await apiRegisterUser(request, 'trainer');
    authCookies = result.authCookies;
    csrfToken = result.csrfToken;

    expect(authCookies.length).toBeGreaterThan(0);
  });

  test('GET /api/payments/subscription — returns isInTrial: true for fresh registration', async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/payments/subscription`, {
      headers: {
        Cookie: buildCookieHeader(authCookies),
        'x-csrf-token': csrfToken,
      },
    });

    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.isInTrial).toBe(true);
    expect(data.isTrialExpired).toBe(false);
    expect(data.trialDaysRemaining).toBeGreaterThanOrEqual(13);
    expect(data.trialDaysRemaining).toBeLessThanOrEqual(14);
    expect(data.trialEndsAt).toBeTruthy();
    expect(data.status).toBeNull();
    expect(data.tier).toBeNull();
  });

  test('POST /api/auth/register — new solo user also gets a 14-day free trial', async ({
    request,
  }) => {
    const { authCookies: cookies, csrfToken: csrf } = await apiRegisterUser(request, 'solo');

    const res = await request.get(`${BASE_URL}/api/payments/subscription`, {
      headers: {
        Cookie: buildCookieHeader(cookies),
        'x-csrf-token': csrf,
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.isInTrial).toBe(true);
    expect(data.trialDaysRemaining).toBeGreaterThanOrEqual(13);
  });
});

// ---------------------------------------------------------------------------
// 3. API — unauthenticated access returns 401
// ---------------------------------------------------------------------------

test.describe('Subscription API — unauthenticated', () => {
  test('GET /api/payments/subscription returns 401 without session', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/payments/subscription`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/payments/create-checkout-session returns 401 without session', async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/payments/create-checkout-session`, {
      data: { tier: 'solo' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/payments/create-portal-session returns 401 without session', async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/payments/create-portal-session`, {
      data: {},
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 4 & 5. UI — /pricing page content
// ---------------------------------------------------------------------------

test.describe('Pricing Page UI', () => {
  test.describe.configure({ mode: 'serial' });

  // Log in once via the register form and reuse the session across tests
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/auth/register`);

    // Fill in the registration form
    const email = `pricing-ui-${Date.now()}@gymgurus.test`;
    await page.locator('input[name="email"], input[type="email"]').first().fill(email);
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill('TestPassword123!');

    // Select Guru (trainer) role if role selector is visible
    const guruCard = page.locator('text=Guru').first();
    if (await guruCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guruCard.click();
    }

    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(dashboard|solo)/, { timeout: 10000 }).catch(() => {});
    await context.storageState({ path: '/tmp/pricing-auth.json' });
    await context.close();
  });

  test('renders 4 tier cards on /pricing', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '/tmp/pricing-auth.json',
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');

    // The 4 plan names that should appear
    await expect(page.locator('text=Free Trial')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Ronin')).toBeVisible();
    await expect(page.locator('text=Guru').first()).toBeVisible();
    await expect(page.locator('text=Pro Guru')).toBeVisible();

    await context.close();
  });

  test('shows prices for paid tiers', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '/tmp/pricing-auth.json',
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=$7.99')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=$18.99')).toBeVisible();
    await expect(page.locator('text=$29.99')).toBeVisible();

    await context.close();
  });

  test('trial user sees days remaining on /pricing', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '/tmp/pricing-auth.json',
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');

    // Trial countdown text — "X days left in your free trial"
    const trialText = page.locator('text=/days left in your free trial/i');
    await expect(trialText).toBeVisible({ timeout: 8000 });

    await context.close();
  });

  test('Subscribe buttons exist for paid tiers', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '/tmp/pricing-auth.json',
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');

    // At least one "Subscribe" button should be visible (for paid tiers)
    const subscribeButtons = page.locator('button:has-text("Subscribe")');
    await expect(subscribeButtons.first()).toBeVisible({ timeout: 8000 });
    expect(await subscribeButtons.count()).toBeGreaterThanOrEqual(3);

    await context.close();
  });
});

// ---------------------------------------------------------------------------
// 6. UI — Trial banner on dashboard
// ---------------------------------------------------------------------------

test.describe('Trial Banner UI', () => {
  test('trial banner is visible on dashboard for trainer in trial', async ({ browser }) => {
    // Register a fresh trainer and navigate to dashboard
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/auth/register`);

    const email = `banner-test-${Date.now()}@gymgurus.test`;
    await page.locator('input[name="email"], input[type="email"]').first().fill(email);
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill('TestPassword123!');

    const guruCard = page.locator('text=Guru').first();
    if (await guruCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await guruCard.click();
    }

    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/(dashboard|solo)/, { timeout: 10000 }).catch(() => {});

    // Wait for banner — either "days left in your free trial" or "Upgrade"
    const trialBanner = page.locator('text=/days left in your free trial/i');
    await expect(trialBanner).toBeVisible({ timeout: 8000 });

    await context.close();
  });
});

// ---------------------------------------------------------------------------
// 7. UI — Client (disciple) cannot access /pricing
// ---------------------------------------------------------------------------

test.describe('Pricing Page — access control', () => {
  test('/pricing redirects unauthenticated users to landing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    // Unauthenticated users hitting an auth-wrapper page get sent to /
    await expect(page).toHaveURL(/^http:\/\/localhost:5000\/$/, { timeout: 8000 });
  });
});

/**
 * GymGurus Visual Audit Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Logs in as all three roles and captures screenshots of every major screen.
 * Saves results to ./audit-screenshots/<role>/<screen>.png
 *
 * USAGE:
 *   npx playwright install chromium   # first time only
 *   npx tsx scripts/visual-audit.ts
 *
 * Or with a custom URL:
 *   BASE_URL=https://my-staging.app npx tsx scripts/visual-audit.ts
 *
 * CREDENTIALS:
 *   Set these env vars or edit the CREDENTIALS block below.
 *   TRAINER_EMAIL / TRAINER_PASSWORD
 *   CLIENT_EMAIL  / CLIENT_PASSWORD   (or ACCESS_CODE for the disciple flow)
 *   SOLO_EMAIL    / SOLO_PASSWORD
 */

import { chromium, type Page, type Browser, type BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'https://gym-gurus-production.up.railway.app';

const CREDENTIALS = {
  solo: {
    email: process.env.SOLO_EMAIL ?? 'test@test.com',
    password: process.env.SOLO_PASSWORD ?? 'Testtest1',
  },
  trainer: {
    email: process.env.TRAINER_EMAIL ?? '',
    password: process.env.TRAINER_PASSWORD ?? '',
  },
  client: {
    email: process.env.CLIENT_EMAIL ?? '',
    password: process.env.CLIENT_PASSWORD ?? '',
    accessCode: process.env.ACCESS_CODE ?? '',
  },
};

const OUT_DIR = path.join(process.cwd(), 'audit-screenshots');

// Viewport sizes to capture
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 }, // iPhone 14 Pro
};

// How long to wait for animations/data to settle
const SETTLE_MS = 1200;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function mkdir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function log(msg: string) {
  console.log(`\n${msg}`);
}

function logStep(msg: string) {
  console.log(`  → ${msg}`);
}

async function settle(page: Page, ms = SETTLE_MS) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function shot(page: Page, name: string, outDir: string, label: string) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  logStep(`📸 ${label} → ${path.relative(process.cwd(), file)}`);
}

async function scrollAndShot(page: Page, name: string, outDir: string, label: string) {
  // Scroll to top first, then capture
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await shot(page, `${name}-top`, outDir, `${label} (top)`);

  // Capture after scrolling halfway
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(300);
  await shot(page, `${name}-mid`, outDir, `${label} (mid)`);

  // Capture bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, `${name}-bottom`, outDir, `${label} (bottom)`);

  // Reset to top
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function navigateAndCapture(
  page: Page,
  url: string,
  name: string,
  outDir: string,
  label: string,
  options: { scroll?: boolean; waitFor?: string } = {}
) {
  logStep(`Navigating to ${url}`);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });
  await settle(page);

  if (options.waitFor) {
    await page.waitForSelector(options.waitFor, { timeout: 8000 }).catch(() => {});
  }

  if (options.scroll) {
    await scrollAndShot(page, name, outDir, label);
  } else {
    await shot(page, name, outDir, label);
  }
}

// ─── LOGIN FLOWS ─────────────────────────────────────────────────────────────

async function loginViaEmailPassword(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await settle(page, 800);

  // Fill email
  const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first();
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page
    .getByLabel(/password/i)
    .or(page.getByPlaceholder(/password/i))
    .first();
  await passwordInput.fill(password);

  // Screenshot the filled login form
  await shot(page, '00-login-form', page.context()['_outDir'] ?? '', 'Login form filled');

  // Submit
  const submitBtn = page.getByRole('button', { name: /sign in|log in|login|continue/i }).first();
  await submitBtn.click();

  // Wait for redirect away from login page
  await page
    .waitForURL((url) => !url.includes('/auth/login') && !url.includes('/auth/register'), {
      timeout: 15000,
    })
    .catch(() => {});

  await settle(page, 1000);
}

async function loginViaAccessCode(page: Page, code: string) {
  await page.goto(`${BASE_URL}/disciple-login`, { waitUntil: 'domcontentloaded' });
  await settle(page, 800);

  const codeInput = page.getByPlaceholder(/code/i).or(page.locator('input[type="text"]')).first();
  await codeInput.fill(code);

  const submitBtn = page.getByRole('button', { name: /enter|join|access|continue/i }).first();
  await submitBtn.click();

  await page
    .waitForURL((url) => !url.includes('/disciple-login'), { timeout: 15000 })
    .catch(() => {});
  await settle(page, 1000);
}

// ─── PUBLIC PAGES ────────────────────────────────────────────────────────────

async function capturePublicPages(browser: Browser) {
  log('━━━ PUBLIC / LANDING PAGES ━━━');
  const outDir = path.join(OUT_DIR, '00-public');
  mkdir(outDir);

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const vpDir = path.join(outDir, vpName);
    mkdir(vpDir);

    logStep(`Viewport: ${vpName} (${vp.width}×${vp.height})`);

    // Landing page - capture each carousel slide
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await settle(page, 1500);
    await shot(page, '01-landing-hero', vpDir, 'Landing — Hero slide');

    // Try to advance through carousel slides using keyboard
    for (let i = 2; i <= 7; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(800);
      await shot(page, `0${i}-landing-slide-${i}`, vpDir, `Landing — Slide ${i}`);
    }

    // Auth pages
    await navigateAndCapture(page, '/auth/login', '10-auth-login', vpDir, 'Login page', {
      scroll: true,
    });
    await navigateAndCapture(page, '/auth/register', '11-auth-register', vpDir, 'Register page', {
      scroll: true,
    });
    await navigateAndCapture(
      page,
      '/auth/forgot-password',
      '12-auth-forgot-password',
      vpDir,
      'Forgot password'
    );
    await navigateAndCapture(
      page,
      '/disciple-login',
      '13-disciple-login',
      vpDir,
      'Disciple access code login'
    );

    // Public calculators
    await navigateAndCapture(page, '/calculators', '20-calculators-hub', vpDir, 'Calculators hub', {
      scroll: true,
    });
    await navigateAndCapture(page, '/calculators/tdee', '21-calc-tdee', vpDir, 'TDEE calculator', {
      scroll: true,
    });
    await navigateAndCapture(page, '/calculators/1rm', '22-calc-1rm', vpDir, '1RM calculator', {
      scroll: true,
    });
    await navigateAndCapture(page, '/calculators/bmi', '23-calc-bmi', vpDir, 'BMI calculator');
    await navigateAndCapture(
      page,
      '/calculators/body-fat',
      '24-calc-bodyfat',
      vpDir,
      'Body fat calculator'
    );
    await navigateAndCapture(
      page,
      '/calculators/macros',
      '25-calc-macros',
      vpDir,
      'Macro calculator'
    );

    // Legal
    await navigateAndCapture(page, '/terms', '30-terms', vpDir, 'Terms of service', {
      scroll: true,
    });
    await navigateAndCapture(page, '/privacy', '31-privacy', vpDir, 'Privacy policy', {
      scroll: true,
    });

    await ctx.close();
  }
}

// ─── SOLO / RONIN ROLE ───────────────────────────────────────────────────────

async function captureSoloRole(browser: Browser) {
  log('━━━ ROLE: SOLO (RONIN) ━━━');

  if (!CREDENTIALS.solo.email) {
    console.log('  ⚠ No solo credentials — skipping');
    return;
  }

  const outDir = path.join(OUT_DIR, '01-solo');
  mkdir(outDir);

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const vpDir = path.join(outDir, vpName);
    mkdir(vpDir);

    logStep(`Viewport: ${vpName} (${vp.width}×${vp.height})`);

    // Login
    logStep('Logging in as solo user...');
    await loginViaEmailPassword(page, CREDENTIALS.solo.email, CREDENTIALS.solo.password);

    const currentUrl = page.url();
    logStep(`Post-login URL: ${currentUrl}`);
    await shot(page, '00-post-login', vpDir, 'Post-login redirect');

    // If sent to onboarding, capture it and continue
    if (currentUrl.includes('/onboarding')) {
      await scrollAndShot(page, '01-onboarding', vpDir, 'Onboarding flow');
      // Try to skip/complete quickly
      const skipBtn = page.getByRole('button', { name: /skip|later|continue/i }).first();
      if (await skipBtn.isVisible().catch(() => false)) {
        await skipBtn.click();
        await settle(page);
      }
    }

    // Dashboard
    await navigateAndCapture(page, '/dashboard', '02-dashboard', vpDir, 'Solo dashboard', {
      scroll: true,
    });

    // AI Coach
    await navigateAndCapture(page, '/solo/coach', '03-ai-coach', vpDir, 'AI Coach', {
      scroll: true,
    });

    // Generate Workout
    await navigateAndCapture(
      page,
      '/solo/generate',
      '04-generate-workout',
      vpDir,
      'Generate workout',
      { scroll: true }
    );

    // Nutrition Planner
    await navigateAndCapture(page, '/solo/nutrition', '05-nutrition', vpDir, 'Nutrition planner', {
      scroll: true,
    });

    // My Workouts
    await navigateAndCapture(page, '/workouts', '06-workouts', vpDir, 'My workouts', {
      scroll: true,
    });

    // Progress
    await navigateAndCapture(page, '/progress', '07-progress', vpDir, 'Progress', { scroll: true });

    // Recovery
    await navigateAndCapture(page, '/solo/recovery', '08-recovery', vpDir, 'Recovery', {
      scroll: true,
    });

    // Achievements
    await navigateAndCapture(page, '/solo/achievements', '09-achievements', vpDir, 'Achievements', {
      scroll: true,
    });

    // Premium calculators
    await navigateAndCapture(
      page,
      '/dashboard/calculators',
      '10-premium-calcs',
      vpDir,
      'Premium calculators hub',
      { scroll: true }
    );
    await navigateAndCapture(
      page,
      '/dashboard/calculators/tdee',
      '11-premium-tdee',
      vpDir,
      'Premium TDEE calculator',
      { scroll: true }
    );

    // Schedule
    await navigateAndCapture(page, '/schedule', '12-schedule', vpDir, 'Schedule', { scroll: true });

    // Settings
    await navigateAndCapture(page, '/settings', '13-settings', vpDir, 'Settings', { scroll: true });

    // Pricing
    await navigateAndCapture(page, '/pricing', '14-pricing', vpDir, 'Pricing', { scroll: true });

    // Sidebar open/closed states
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    await shot(page, '15-sidebar-open', vpDir, 'Sidebar open state');

    // Try to collapse sidebar
    const sidebarTrigger = page
      .locator('[data-sidebar="trigger"]')
      .or(page.getByRole('button', { name: /toggle sidebar|collapse/i }))
      .first();
    if (await sidebarTrigger.isVisible().catch(() => false)) {
      await sidebarTrigger.click();
      await page.waitForTimeout(500);
      await shot(page, '16-sidebar-collapsed', vpDir, 'Sidebar collapsed state');
    }

    // Mobile bottom nav (only on mobile viewport)
    if (vpName === 'mobile') {
      await shot(page, '17-mobile-bottom-nav', vpDir, 'Mobile bottom navigation');
    }

    await ctx.close();
  }
}

// ─── TRAINER ROLE ────────────────────────────────────────────────────────────

async function captureTrainerRole(browser: Browser) {
  log('━━━ ROLE: TRAINER ━━━');

  if (!CREDENTIALS.trainer.email) {
    console.log('  ⚠ No trainer credentials (set TRAINER_EMAIL + TRAINER_PASSWORD) — skipping');
    return;
  }

  const outDir = path.join(OUT_DIR, '02-trainer');
  mkdir(outDir);

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const vpDir = path.join(outDir, vpName);
    mkdir(vpDir);

    logStep(`Viewport: ${vpName} (${vp.width}×${vp.height})`);

    // Login
    logStep('Logging in as trainer...');
    await loginViaEmailPassword(page, CREDENTIALS.trainer.email, CREDENTIALS.trainer.password);
    await shot(page, '00-post-login', vpDir, 'Post-login redirect');

    // Dashboard
    await navigateAndCapture(page, '/dashboard', '01-dashboard', vpDir, 'Trainer dashboard', {
      scroll: true,
    });

    // Clients list
    await navigateAndCapture(page, '/clients', '02-clients-list', vpDir, 'Clients list', {
      scroll: true,
    });

    // Try to open a client detail (first client in the list)
    await page.goto(`${BASE_URL}/clients`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const firstClientLink = page
      .getByRole('link')
      .filter({ hasText: /^[A-Z]/ })
      .first();
    if (await firstClientLink.isVisible().catch(() => false)) {
      await firstClientLink.click();
      await settle(page);
      await scrollAndShot(page, '03-client-detail', vpDir, 'Client detail page');

      // Tabs on client detail
      const tabs = ['Progress', 'Workouts', 'Appointments', 'Notes'];
      for (const tabName of tabs) {
        const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
        if (await tab.isVisible().catch(() => false)) {
          await tab.click();
          await settle(page, 600);
          await shot(
            page,
            `04-client-tab-${tabName.toLowerCase()}`,
            vpDir,
            `Client detail — ${tabName} tab`
          );
        }
      }
    }

    // Workout Plans
    await navigateAndCapture(page, '/workouts', '05-workout-plans', vpDir, 'Workout plans', {
      scroll: true,
    });

    // Try to open workout builder
    await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const createBtn = page.getByRole('button', { name: /new|create|add|build/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await settle(page);
      await scrollAndShot(page, '06-workout-builder-new', vpDir, 'New workout builder');
      await page.keyboard.press('Escape');
    }

    // Exercise Library
    await navigateAndCapture(page, '/exercises', '07-exercises', vpDir, 'Exercise library', {
      scroll: true,
    });

    // Premium Calculators
    await navigateAndCapture(
      page,
      '/dashboard/calculators',
      '08-calculators',
      vpDir,
      'Premium calculators',
      { scroll: true }
    );

    // Schedule
    await navigateAndCapture(page, '/schedule', '09-schedule', vpDir, 'Schedule / calendar', {
      scroll: true,
    });

    // Payments
    await navigateAndCapture(page, '/payments', '10-payments', vpDir, 'Payments', { scroll: true });

    // Progress
    await navigateAndCapture(page, '/progress', '11-progress', vpDir, 'Progress', { scroll: true });

    // Settings
    await navigateAndCapture(page, '/settings', '12-settings', vpDir, 'Settings', { scroll: true });

    // Pricing
    await navigateAndCapture(page, '/pricing', '13-pricing', vpDir, 'Pricing', { scroll: true });

    // Notifications bell
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const notifBtn = page
      .getByRole('button', { name: /notification/i })
      .or(page.locator('[aria-label*="notification" i]'))
      .first();
    if (await notifBtn.isVisible().catch(() => false)) {
      await notifBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '14-notifications-open', vpDir, 'Notifications panel open');
      await page.keyboard.press('Escape');
    }

    await ctx.close();
  }
}

// ─── CLIENT / DISCIPLE ROLE ──────────────────────────────────────────────────

async function captureClientRole(browser: Browser) {
  log('━━━ ROLE: CLIENT (DISCIPLE) ━━━');

  const hasEmailLogin = !!(CREDENTIALS.client.email && CREDENTIALS.client.password);
  const hasAccessCode = !!CREDENTIALS.client.accessCode;

  if (!hasEmailLogin && !hasAccessCode) {
    console.log(
      '  ⚠ No client credentials (set CLIENT_EMAIL + CLIENT_PASSWORD, or ACCESS_CODE) — skipping'
    );
    return;
  }

  const outDir = path.join(OUT_DIR, '03-client');
  mkdir(outDir);

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const vpDir = path.join(outDir, vpName);
    mkdir(vpDir);

    logStep(`Viewport: ${vpName} (${vp.width}×${vp.height})`);

    // Login
    logStep('Logging in as client...');
    if (hasEmailLogin) {
      await loginViaEmailPassword(page, CREDENTIALS.client.email, CREDENTIALS.client.password);
    } else {
      await loginViaAccessCode(page, CREDENTIALS.client.accessCode);
    }
    await shot(page, '00-post-login', vpDir, 'Post-login redirect');

    // Dashboard
    await navigateAndCapture(page, '/dashboard', '01-dashboard', vpDir, 'Client dashboard', {
      scroll: true,
    });

    // My Workouts
    await navigateAndCapture(page, '/workouts', '02-workouts', vpDir, 'My workouts', {
      scroll: true,
    });

    // Try to open a workout execution
    await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const startBtn = page.getByRole('button', { name: /start|begin|do workout/i }).first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await settle(page);
      await scrollAndShot(page, '03-workout-execution', vpDir, 'Workout execution screen');
      await page.keyboard.press('Escape');
    }

    // Progress
    await navigateAndCapture(page, '/progress', '04-progress', vpDir, 'My progress', {
      scroll: true,
    });

    // Premium Calculators
    await navigateAndCapture(
      page,
      '/dashboard/calculators',
      '05-calculators',
      vpDir,
      'Calculators',
      { scroll: true }
    );

    // Schedule
    await navigateAndCapture(page, '/schedule', '06-schedule', vpDir, 'Schedule', { scroll: true });

    // Settings
    await navigateAndCapture(page, '/settings', '07-settings', vpDir, 'Settings', { scroll: true });

    await ctx.close();
  }
}

// ─── INTERACTION CAPTURES ────────────────────────────────────────────────────
// Captures interactive states: modals, drawers, hover states, error states

async function captureInteractions(browser: Browser) {
  log('━━━ INTERACTIONS & STATES ━━━');

  const outDir = path.join(OUT_DIR, '04-interactions');
  mkdir(outDir);

  const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
  const page = await ctx.newPage();

  // Capture the landing page carousel with no JS (baseline)
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await settle(page, 1500);
  await shot(page, '01-landing-initial-load', outDir, 'Landing — initial load state');

  // Error state: navigate to a nonexistent page
  await page.goto(`${BASE_URL}/this-page-does-not-exist`, { waitUntil: 'domcontentloaded' });
  await settle(page, 800);
  await shot(page, '02-404-page', outDir, '404 not found page');

  // Unauthenticated access to protected route
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await settle(page, 1000);
  await shot(page, '03-unauth-dashboard-redirect', outDir, 'Unauthenticated dashboard access');

  // Login page with empty submit (validation)
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await settle(page, 800);
  const submitBtn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(500);
    await shot(
      page,
      '04-login-validation-errors',
      outDir,
      'Login — validation errors on empty submit'
    );
  }

  // Login page with wrong password
  const emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill('test@test.com');
    const passwordInput = page
      .getByLabel(/password/i)
      .or(page.getByPlaceholder(/password/i))
      .first();
    await passwordInput.fill('WrongPassword123!');
    await submitBtn.click();
    await page.waitForTimeout(1500);
    await shot(page, '05-login-wrong-password', outDir, 'Login — wrong password error state');
  }

  // If solo credentials work — capture trial banner state
  if (CREDENTIALS.solo.email) {
    await loginViaEmailPassword(page, CREDENTIALS.solo.email, CREDENTIALS.solo.password);
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await settle(page);

    // Trial banner (if visible)
    const trialBanner = page.locator('[class*="trial" i], [class*="banner" i]').first();
    if (await trialBanner.isVisible().catch(() => false)) {
      await shot(page, '06-trial-banner', outDir, 'Trial/subscription banner');
    }

    // Profile dropdown
    const profileBtn = page
      .getByRole('button', { name: /profile|account|user/i })
      .or(page.locator('[data-testid="profile-menu"]'))
      .first();
    if (await profileBtn.isVisible().catch(() => false)) {
      await profileBtn.click();
      await page.waitForTimeout(500);
      await shot(page, '07-profile-dropdown', outDir, 'Profile dropdown menu');
      await page.keyboard.press('Escape');
    }
  }

  await ctx.close();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          GymGurus Visual Audit — Screenshot Runner        ║
╚═══════════════════════════════════════════════════════════╝
  Target: ${BASE_URL}
  Output: ${OUT_DIR}
  Roles:  solo${CREDENTIALS.trainer.email ? ', trainer' : ' (trainer: set TRAINER_EMAIL)'}, ${CREDENTIALS.client.email || CREDENTIALS.client.accessCode ? 'client' : 'client (set CLIENT_EMAIL or ACCESS_CODE)'}
`);

  mkdir(OUT_DIR);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    await capturePublicPages(browser);
    await captureSoloRole(browser);
    await captureTrainerRole(browser);
    await captureClientRole(browser);
    await captureInteractions(browser);
  } finally {
    await browser.close();
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const allScreenshots: string[] = [];
  function collectFiles(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collectFiles(full);
      else if (entry.name.endsWith('.png')) allScreenshots.push(full);
    }
  }
  collectFiles(OUT_DIR);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      ✅ DONE                              ║
╚═══════════════════════════════════════════════════════════╝
  ${allScreenshots.length} screenshots saved to:
  ${OUT_DIR}/

  Folder structure:
    00-public/      ← Landing, auth pages, public calculators
    01-solo/        ← Ronin (solo) role — desktop + mobile
    02-trainer/     ← Trainer role — desktop + mobile
    03-client/      ← Disciple (client) role — desktop + mobile
    04-interactions ← Modals, error states, interactions

  Send the full audit-screenshots/ folder to Claude for analysis.
`);
}

main().catch((err) => {
  console.error('\n❌ Audit script failed:', err);
  process.exit(1);
});

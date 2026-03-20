/**
 * GymGurus — Disciple Role Visual Audit
 * ──────────────────────────────────────────────────────────────────────────
 * Logs in as the Disciple (client) role via access code and captures every
 * accessible surface at desktop (1440×900) and mobile (390×844) viewports.
 *
 * USAGE:
 *   npx playwright install chromium   # first time only
 *   npx tsx scripts/disciple-visual-audit.ts
 *
 * Or override credentials:
 *   ACCESS_CODE=GG-XXXX-XXXX npx tsx scripts/disciple-visual-audit.ts
 */

import { chromium, type Page, type BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL ?? 'https://gym-gurus-production.up.railway.app';
const ACCESS_CODE = process.env.ACCESS_CODE ?? 'GG-WQVD-KAJX';
const OUT_DIR = path.join(process.cwd(), 'scripts', 'visual-audit-disciple');
const SETTLE_MS = 1500;

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await shot(page, `${name}-top`, outDir, `${label} (top)`);

  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  if (scrollHeight > 1200) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);
    await shot(page, `${name}-mid`, outDir, `${label} (mid)`);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, `${name}-bottom`, outDir, `${label} (bottom)`);

  await page.evaluate(() => window.scrollTo(0, 0));
}

async function navigateAndCapture(
  page: Page,
  url: string,
  name: string,
  outDir: string,
  label: string,
  options: { scroll?: boolean; waitFor?: string; settleMs?: number } = {}
) {
  logStep(`Navigating to ${url}`);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });
  await settle(page, options.settleMs ?? SETTLE_MS);

  if (options.waitFor) {
    await page.waitForSelector(options.waitFor, { timeout: 8000 }).catch(() => {});
  }

  if (options.scroll) {
    await scrollAndShot(page, name, outDir, label);
  } else {
    await shot(page, name, outDir, label);
  }
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────

async function loginAsDisciple(page: Page, outDir: string): Promise<boolean> {
  logStep('Navigating to /disciple-login');
  await page.goto(`${BASE_URL}/disciple-login`, {
    waitUntil: 'domcontentloaded',
  });
  await settle(page, 1000);

  // Capture the empty login page
  await shot(page, '00-login-empty', outDir, 'Disciple login — empty state');

  // Fill the access code
  const codeInput = page
    .getByPlaceholder(/code|GG/i)
    .or(page.locator('input[type="text"]'))
    .first();
  await codeInput.fill(ACCESS_CODE);
  await page.waitForTimeout(400);

  // Capture filled state
  await shot(page, '01-login-filled', outDir, 'Disciple login — code filled');

  // Submit
  const submitBtn = page.getByRole('button', { name: /access|enter|continue|submit/i }).first();
  if (!(await submitBtn.isVisible().catch(() => false))) {
    logStep('❌ Could not find submit button');
    return false;
  }
  await submitBtn.click();

  // Wait for redirect away from login page
  const redirected = await page
    .waitForURL((url) => !url.toString().includes('/disciple-login'), {
      timeout: 15000,
    })
    .then(() => true)
    .catch(() => false);

  await settle(page, 1200);

  const currentUrl = page.url();
  logStep(`Post-login URL: ${currentUrl}`);

  // Capture post-login state
  await shot(page, '02-post-login', outDir, 'Post-login redirect');

  if (!redirected || currentUrl.includes('/disciple-login')) {
    logStep('❌ Login failed — still on disciple-login page');
    await shot(page, '02-login-failed', outDir, 'Login FAILED');
    return false;
  }

  logStep('✅ Login successful');
  return true;
}

// ─── CAPTURE PAGES ───────────────────────────────────────────────────────────

async function captureAllPages(page: Page, outDir: string) {
  // ── Dashboard ──────────────────────────────────────────────────────────
  log('  ── Dashboard (ClientDashboard)');
  await navigateAndCapture(page, '/dashboard', '03-dashboard', outDir, 'Client Dashboard', {
    scroll: true,
    settleMs: 2000,
  });

  // ── Workouts ───────────────────────────────────────────────────────────
  log('  ── Workouts');
  await navigateAndCapture(page, '/workouts', '04-workouts', outDir, 'My Workouts (WorkoutPlans)', {
    scroll: true,
  });

  // Try to click into a workout for execution
  const workoutCard = page.getByRole('button', { name: /start|begin|do|view/i }).first();
  if (await workoutCard.isVisible().catch(() => false)) {
    await workoutCard.click();
    await settle(page, 1500);
    await scrollAndShot(page, '05-workout-execution', outDir, 'Workout Execution');

    // Go back
    await page.goto(`${BASE_URL}/workouts`, { waitUntil: 'domcontentloaded' });
    await settle(page);
  } else {
    logStep('  (no workout start button found — empty state)');
    await shot(page, '05-workout-execution-empty', outDir, 'Workout Execution — no workouts');
  }

  // ── Progress ───────────────────────────────────────────────────────────
  log('  ── Progress');
  await navigateAndCapture(page, '/progress', '06-progress', outDir, 'Progress (client view)', {
    scroll: true,
    settleMs: 2000,
  });

  // ── Schedule ───────────────────────────────────────────────────────────
  log('  ── Schedule');
  await navigateAndCapture(page, '/schedule', '07-schedule', outDir, 'Schedule (client view)', {
    scroll: true,
    settleMs: 2000,
  });

  // Capture different schedule views (day/week/calendar/list tabs)
  const schedTabs = ['day', 'week', 'calendar', 'list'];
  for (const tabName of schedTabs) {
    const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await settle(page, 800);
      await shot(page, `07-schedule-${tabName}`, outDir, `Schedule — ${tabName} view`);
    }
  }

  // ── Premium Calculators ────────────────────────────────────────────────
  log('  ── Calculators');
  await navigateAndCapture(
    page,
    '/dashboard/calculators',
    '08-calculators',
    outDir,
    'Premium Calculators Hub',
    { scroll: true }
  );

  // ── Settings ───────────────────────────────────────────────────────────
  log('  ── Settings');
  await navigateAndCapture(page, '/settings', '09-settings', outDir, 'Settings', { scroll: true });

  // Capture settings tabs
  const settingsTabs = ['profile', 'plan', 'appearance', 'security'];
  for (const tabName of settingsTabs) {
    const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') });
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await settle(page, 600);
      await shot(page, `09-settings-${tabName}`, outDir, `Settings — ${tabName} tab`);
    }
  }

  // ── Sidebar states ─────────────────────────────────────────────────────
  log('  ── Sidebar / Navigation');
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await shot(page, '10-sidebar-open', outDir, 'Sidebar open state');

  const sidebarTrigger = page
    .locator('[data-sidebar="trigger"]')
    .or(page.getByRole('button', { name: /toggle sidebar|collapse/i }))
    .first();
  if (await sidebarTrigger.isVisible().catch(() => false)) {
    await sidebarTrigger.click();
    await page.waitForTimeout(500);
    await shot(page, '10-sidebar-collapsed', outDir, 'Sidebar collapsed state');
  }

  // ── Loading state capture ──────────────────────────────────────────────
  log('  ── Loading / Skeleton states');
  // Navigate to dashboard with cache-bust to catch loading state
  await page.evaluate(() => {
    // Clear TanStack Query cache to force refetch
    if ((window as any).__TANSTACK_QUERY_CLIENT__) {
      (window as any).__TANSTACK_QUERY_CLIENT__.clear();
    }
  });
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'commit' });
  // Capture immediately before data loads
  await page.waitForTimeout(200);
  await shot(page, '11-loading-state', outDir, 'Dashboard loading state');
  await settle(page, 2000);

  // ── Pricing page (should be hidden/blocked for clients) ────────────────
  log('  ── Access control checks');
  await navigateAndCapture(
    page,
    '/pricing',
    '12-pricing-blocked',
    outDir,
    'Pricing page (should be blocked for clients)'
  );

  // Try accessing trainer-only pages
  await navigateAndCapture(
    page,
    '/clients',
    '13-clients-blocked',
    outDir,
    'Clients page (should be blocked)'
  );
  await navigateAndCapture(
    page,
    '/exercises',
    '14-exercises-blocked',
    outDir,
    'Exercises page (should be blocked)'
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       GymGurus — Disciple Role Visual Audit                  ║
╚═══════════════════════════════════════════════════════════════╝
  Target:      ${BASE_URL}
  Access Code: ${ACCESS_CODE.slice(0, 5)}****
  Output:      ${OUT_DIR}
`);

  mkdir(OUT_DIR);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let totalScreenshots = 0;

  try {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      log(`━━━ VIEWPORT: ${vpName.toUpperCase()} (${vp.width}×${vp.height}) ━━━`);
      const vpDir = path.join(OUT_DIR, vpName);
      mkdir(vpDir);

      const ctx: BrowserContext = await browser.newContext({
        viewport: vp,
        colorScheme: 'dark',
      });
      const page = await ctx.newPage();

      // Login
      const success = await loginAsDisciple(page, vpDir);
      if (!success) {
        logStep(`⚠ Skipping ${vpName} — login failed`);
        await ctx.close();
        continue;
      }

      // Capture all pages
      await captureAllPages(page, vpDir);

      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  // Count screenshots
  function countPngs(dir: string): number {
    let count = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) count += countPngs(full);
      else if (entry.name.endsWith('.png')) count++;
    }
    return count;
  }
  totalScreenshots = countPngs(OUT_DIR);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                      ✅ DONE                                 ║
╚═══════════════════════════════════════════════════════════════╝
  ${totalScreenshots} screenshots saved to:
  ${OUT_DIR}/

  Folder structure:
    desktop/    ← 1440×900
    mobile/     ← 390×844 (iPhone 14 Pro)

  Next: Review screenshots and catalog visual issues.
`);
}

main().catch((err) => {
  console.error('\n❌ Audit script failed:', err);
  process.exit(1);
});

import { chromium, type Page, type Browser, type BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://gym-gurus-production.up.railway.app';
const OUT_DIR = 'audit/deep';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

let shotCount = 0;

async function shot(page: Page, name: string) {
  const filePath = `${OUT_DIR}/${name}.png`;
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true, type: 'png' });
  shotCount++;
  console.log(`  ✓ [${shotCount}] ${name}`);
}

async function waitReady(page: Page, ms = 800) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
}

async function login(page: Page) {
  console.log('🔑 Logging in...');
  await page.goto(`${BASE_URL}/auth/login`);
  await waitReady(page, 1500);

  // Select Ronin role
  const roninBtn = page.locator('button:has-text("Ronin")');
  if (await roninBtn.isVisible()) await roninBtn.click();
  await page.waitForTimeout(300);

  await page.fill('input[placeholder*="example"]', 'test@test.com');
  await page.fill('input[placeholder*="password" i]', 'Testtest1');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  await waitReady(page, 2000);
  console.log('  ✓ Logged in as Ronin\n');
}

// ─── Page audit functions ──────────────────────────────────────────────────

async function auditDashboard(page: Page, prefix: string) {
  console.log(`📸 Dashboard (${prefix})`);
  await page.goto(`${BASE_URL}/dashboard`);
  await waitReady(page, 1200);
  await shot(page, `dashboard/${prefix}-full`);
  await scrollToBottom(page);
  await shot(page, `dashboard/${prefix}-scrolled`);
}

async function auditWorkoutPlans(page: Page, prefix: string) {
  console.log(`📸 Workout Plans (${prefix})`);
  await page.goto(`${BASE_URL}/workouts`);
  await waitReady(page);
  await shot(page, `workout-plans/${prefix}-full`);

  // Filter chips
  const filters = ['Push', 'Legs', 'AI Coach', 'Pull'];
  for (const f of filters) {
    const chip = page.locator(`button:has-text("${f}")`).first();
    if (await chip.isVisible().catch(() => false)) {
      await chip.click();
      await page.waitForTimeout(400);
      await shot(page, `workout-plans/${prefix}-filter-${f.toLowerCase().replace(/\s/g, '-')}`);
    }
  }
  // Reset to All
  const allChip = page.locator('button:has-text("All")').first();
  if (await allChip.isVisible().catch(() => false)) await allChip.click();

  // Try three-dot menu on first workout card
  const menuBtn = page
    .locator('[role="button"]:has(svg), button:has(svg)')
    .filter({ hasText: '' })
    .first();
  // Try the more options button
  const moreBtn = page.locator('button[aria-haspopup]').first();
  if (await moreBtn.isVisible().catch(() => false)) {
    await moreBtn.click();
    await page.waitForTimeout(300);
    await shot(page, `workout-plans/${prefix}-dropdown-menu`);
    await page.keyboard.press('Escape');
  }

  await scrollToBottom(page);
  await shot(page, `workout-plans/${prefix}-scrolled`);
}

async function auditWorkoutExecution(page: Page, prefix: string) {
  console.log(`📸 Workout Execution (${prefix})`);
  // Go to workouts page to find a workout to start
  await page.goto(`${BASE_URL}/workouts`);
  await waitReady(page);

  // Click first "Start Workout" or "Start" button
  const startBtn = page.locator('button:has-text("Start"), a:has-text("Start Workout")').first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await waitReady(page, 1500);
    await shot(page, `workout-execution/${prefix}-active-exercise`);

    // Try to log a set to trigger rest timer
    const logSetBtn = page.locator('button:has-text("Log Set")').first();
    if (await logSetBtn.isVisible().catch(() => false)) {
      // Set some weight/reps first
      const plusBtns = page.locator('button:has-text("+")');
      // Click weight + a few times
      for (let i = 0; i < 5; i++) {
        const wb = plusBtns.first();
        if (await wb.isVisible().catch(() => false)) await wb.click();
      }
      // Click reps + a few times
      const repsPlus = plusBtns.nth(1);
      if (await repsPlus.isVisible().catch(() => false)) {
        for (let i = 0; i < 8; i++) await repsPlus.click();
      }
      await shot(page, `workout-execution/${prefix}-with-input`);

      await logSetBtn.click();
      await page.waitForTimeout(500);
      await shot(page, `workout-execution/${prefix}-after-log-set`);
    }

    // Navigate away — handle beforeunload dialog
    page.on('dialog', (d) => d.accept());
    await page.goto(`${BASE_URL}/dashboard`);
    await waitReady(page, 500);
  }
}

async function auditWorkoutGenerator(page: Page, prefix: string) {
  console.log(`📸 Workout Generator (${prefix})`);
  await page.goto(`${BASE_URL}/solo/generate`);
  await waitReady(page);
  await shot(page, `workout-generator/${prefix}-full`);
  await scrollToBottom(page);
  await shot(page, `workout-generator/${prefix}-scrolled`);
}

async function auditProgress(page: Page, prefix: string) {
  console.log(`📸 Progress (${prefix})`);
  await page.goto(`${BASE_URL}/progress`);
  await waitReady(page, 1200);
  await shot(page, `progress/${prefix}-full`);

  // Period toggles
  const periods = ['7D', '4W', '6M', '1Y'];
  for (const p of periods) {
    const btn = page.locator(`button:has-text("${p}")`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(500);
      await shot(page, `progress/${prefix}-period-${p.toLowerCase()}`);
    }
  }

  await scrollToBottom(page);
  await shot(page, `progress/${prefix}-scrolled`);
}

async function auditRecovery(page: Page, prefix: string) {
  console.log(`📸 Recovery (${prefix})`);
  await page.goto(`${BASE_URL}/solo/recovery`);
  await waitReady(page, 1200);
  await shot(page, `recovery/${prefix}-front`);

  // Click "Back" toggle on muscle diagram
  const backBtn = page.locator('button:has-text("Back")').first();
  if (await backBtn.isVisible().catch(() => false)) {
    await backBtn.click();
    await page.waitForTimeout(400);
    await shot(page, `recovery/${prefix}-back`);
  }

  await scrollToBottom(page);
  await shot(page, `recovery/${prefix}-scrolled`);
}

async function auditAICoach(page: Page, prefix: string) {
  console.log(`📸 AI Coach (${prefix})`);
  await page.goto(`${BASE_URL}/solo/coach`);
  await waitReady(page);
  await shot(page, `ai-coach/${prefix}-empty`);

  // Click topic tabs
  const tabs = ['Workout Tips', 'Nutrition', 'Recovery'];
  for (const tab of tabs) {
    const tabBtn = page.locator(`button:has-text("${tab}")`).first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await page.waitForTimeout(300);
      await shot(page, `ai-coach/${prefix}-tab-${tab.toLowerCase().replace(/\s/g, '-')}`);
    }
  }
}

async function auditNutrition(page: Page, prefix: string) {
  console.log(`📸 Nutrition Planner (${prefix})`);
  await page.goto(`${BASE_URL}/solo/nutrition`);
  await waitReady(page);
  await shot(page, `nutrition/${prefix}-full`);
  await scrollToBottom(page);
  await shot(page, `nutrition/${prefix}-scrolled`);
}

async function auditAchievements(page: Page, prefix: string) {
  console.log(`📸 Achievements (${prefix})`);
  await page.goto(`${BASE_URL}/solo/achievements`);
  await waitReady(page, 1200);
  await shot(page, `achievements/${prefix}-full`);

  // Category tabs
  const tabs = ['All', 'Workouts', 'Strength', 'Consistency'];
  for (const tab of tabs) {
    const tabBtn = page.locator(`button:has-text("${tab}")`).first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await page.waitForTimeout(400);
      await shot(page, `achievements/${prefix}-tab-${tab.toLowerCase()}`);
    }
  }

  await scrollToBottom(page);
  await shot(page, `achievements/${prefix}-scrolled`);
}

async function auditSchedule(page: Page, prefix: string) {
  console.log(`📸 Schedule (${prefix})`);
  await page.goto(`${BASE_URL}/schedule`);
  await waitReady(page);
  await shot(page, `schedule/${prefix}-full`);

  // Try list view toggle
  const listBtn = page.locator('button[aria-label*="list" i], button:has(svg)').nth(1);

  await scrollToBottom(page);
  await shot(page, `schedule/${prefix}-scrolled`);
}

async function auditCalculatorsHub(page: Page, prefix: string) {
  console.log(`📸 Calculators Hub (${prefix})`);
  await page.goto(`${BASE_URL}/dashboard/calculators`);
  await waitReady(page);
  await shot(page, `calculators/${prefix}-hub-full`);
  await scrollToBottom(page);
  await shot(page, `calculators/${prefix}-hub-scrolled`);
}

async function auditIndividualCalculator(page: Page, prefix: string, name: string, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await waitReady(page);
  await shot(page, `calculators/${prefix}-${name}-top`);
  await scrollToBottom(page);
  await shot(page, `calculators/${prefix}-${name}-bottom`);
}

async function auditAllCalculators(page: Page, prefix: string) {
  console.log(`📸 Individual Calculators (${prefix})`);
  const calcs = [
    { name: 'tdee', path: '/dashboard/calculators/tdee' },
    { name: 'bmi', path: '/dashboard/calculators/bmi' },
    { name: 'body-fat', path: '/dashboard/calculators/body-fat' },
    { name: 'macros', path: '/dashboard/calculators/macros' },
    { name: 'water-intake', path: '/dashboard/calculators/water-intake' },
    { name: '1rm', path: '/dashboard/calculators/1rm' },
    { name: 'plates', path: '/dashboard/calculators/plates' },
    { name: 'strength-standards', path: '/dashboard/calculators/strength-standards' },
    { name: 'vo2max', path: '/dashboard/calculators/vo2max' },
    { name: 'heart-rate-zones', path: '/dashboard/calculators/heart-rate-zones' },
    { name: 'calories-burned', path: '/dashboard/calculators/calories-burned' },
    { name: 'ideal-weight', path: '/dashboard/calculators/ideal-weight' },
  ];

  for (const calc of calcs) {
    await auditIndividualCalculator(page, prefix, calc.name, calc.path);
  }
}

async function auditSettings(page: Page, prefix: string) {
  console.log(`📸 Settings (${prefix})`);
  await page.goto(`${BASE_URL}/settings`);
  await waitReady(page);
  await shot(page, `settings/${prefix}-profile`);

  // Click through tabs
  const tabs = ['Security', 'Plan', 'Alerts', 'Danger'];
  for (const tab of tabs) {
    const tabBtn = page
      .locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`)
      .first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
      await page.waitForTimeout(400);
      await shot(page, `settings/${prefix}-tab-${tab.toLowerCase()}`);
    }
  }
}

async function auditLoadingStates(page: Page, prefix: string) {
  console.log(`📸 Loading States (${prefix})`);
  // Navigate and screenshot immediately before data loads
  const pages = [
    { name: 'dashboard', url: '/dashboard' },
    { name: 'progress', url: '/progress' },
    { name: 'achievements', url: '/solo/achievements' },
    { name: 'recovery', url: '/solo/recovery' },
  ];

  for (const p of pages) {
    await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'commit' });
    await page.waitForTimeout(100); // Capture skeleton/loading state
    await shot(page, `loading-states/${prefix}-${p.name}`);
  }
}

async function auditNavStates(page: Page, prefix: string) {
  console.log(`📸 Navigation States (${prefix})`);
  await page.goto(`${BASE_URL}/dashboard`);
  await waitReady(page);

  // Try to collapse sidebar (desktop only)
  if (prefix === 'desktop') {
    const toggleBtn = page.locator('button:has-text("Toggle")').first();
    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(400);
      await shot(page, `nav/${prefix}-sidebar-collapsed`);
      // Toggle back
      await toggleBtn.click();
      await page.waitForTimeout(400);
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Deep Visual Audit — GymGurus Ronin Role\n');

  const browser: Browser = await chromium.launch({ headless: true });

  // ── Desktop pass ──────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('  DESKTOP (1440×900)');
  console.log('═══════════════════════════════════════════\n');

  const desktopCtx: BrowserContext = await browser.newContext({
    viewport: DESKTOP,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const dPage = await desktopCtx.newPage();
  dPage.on('dialog', (d) => d.accept());
  await login(dPage);

  await auditDashboard(dPage, 'desktop');
  await auditWorkoutPlans(dPage, 'desktop');
  await auditWorkoutExecution(dPage, 'desktop');
  await auditWorkoutGenerator(dPage, 'desktop');
  await auditProgress(dPage, 'desktop');
  await auditRecovery(dPage, 'desktop');
  await auditAICoach(dPage, 'desktop');
  await auditNutrition(dPage, 'desktop');
  await auditAchievements(dPage, 'desktop');
  await auditSchedule(dPage, 'desktop');
  await auditCalculatorsHub(dPage, 'desktop');
  await auditAllCalculators(dPage, 'desktop');
  await auditSettings(dPage, 'desktop');
  await auditNavStates(dPage, 'desktop');
  await auditLoadingStates(dPage, 'desktop');

  await desktopCtx.close();

  // ── Mobile pass ───────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  MOBILE (390×844)');
  console.log('═══════════════════════════════════════════\n');

  const mobileCtx: BrowserContext = await browser.newContext({
    viewport: MOBILE,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const mPage = await mobileCtx.newPage();
  mPage.on('dialog', (d) => d.accept());
  await login(mPage);

  await auditDashboard(mPage, 'mobile');
  await auditWorkoutPlans(mPage, 'mobile');
  await auditWorkoutExecution(mPage, 'mobile');
  await auditWorkoutGenerator(mPage, 'mobile');
  await auditProgress(mPage, 'mobile');
  await auditRecovery(mPage, 'mobile');
  await auditAICoach(mPage, 'mobile');
  await auditNutrition(mPage, 'mobile');
  await auditAchievements(mPage, 'mobile');
  await auditSchedule(mPage, 'mobile');
  await auditCalculatorsHub(mPage, 'mobile');
  await auditAllCalculators(mPage, 'mobile');
  await auditSettings(mPage, 'mobile');
  await auditLoadingStates(mPage, 'mobile');

  await mobileCtx.close();
  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log(`  COMPLETE — ${shotCount} screenshots captured`);
  console.log('═══════════════════════════════════════════');
  console.log(`  Output: ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});

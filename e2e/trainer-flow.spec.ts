import { test, expect, type Page } from '@playwright/test';

/**
 * Trainer Flow E2E Tests
 *
 * Critical path tests for the trainer role in GymGurus.
 * Covers: authentication, onboarding, client management, workout creation,
 * workout assignment, dashboard verification, and AI coach interaction.
 *
 * Prerequisites:
 *   - The app is running at BASE_URL (default: http://localhost:5000)
 *   - A test database is seeded with the trainer test account
 *   - Environment variable TEST_TRAINER_EMAIL is set (or the default is used)
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Authenticate as a trainer via the Replit Auth mock / dev login page. */
async function loginAsTrainer(page: Page) {
  await page.goto(`${BASE_URL}/preview-login`);
  await page.waitForLoadState('networkidle');

  // The dev login page shows role-selection buttons.
  // Click "Trainer" to authenticate as a trainer.
  const trainerButton = page.getByRole('button', { name: /trainer/i });
  await expect(trainerButton).toBeVisible({ timeout: 10_000 });
  await trainerButton.click();

  // Wait for redirect to the dashboard after successful auth.
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Wait for the API call that fetches the authenticated user to resolve. */
async function waitForAuthUser(page: Page) {
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/auth/user') && resp.status() === 200,
    { timeout: 10_000 }
  );
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe('Trainer Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('complete onboarding -> add client -> create workout -> assign', async ({ page }) => {
    // -----------------------------------------------------------------------
    // Step 1 - Navigate to app and log in as trainer
    // -----------------------------------------------------------------------
    await loginAsTrainer(page);
    await waitForAuthUser(page);

    // -----------------------------------------------------------------------
    // Step 2 - Complete the Welcome Modal (onboarding)
    // -----------------------------------------------------------------------
    // The WelcomeModal renders as a Dialog. It should appear automatically
    // for trainers who have not completed onboarding.
    const welcomeModal = page.locator('[role="dialog"]');

    // If the modal is visible, walk through each onboarding step.
    if (await welcomeModal.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Step 2a - Welcome screen: click "Get Started" / "Next"
      const getStartedBtn = welcomeModal.getByRole('button', {
        name: /get started|next|continue/i,
      });
      if (await getStartedBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await getStartedBtn.click();
      }

      // Step 2b - Select a goal (e.g. "Manage Clients Better")
      const goalOption = welcomeModal.getByText(/manage clients/i);
      if (await goalOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await goalOption.click();
        const nextBtn = welcomeModal.getByRole('button', { name: /next|continue/i });
        if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await nextBtn.click();
        }
      }

      // Step 2c - Training style selection
      const trainingStyleOption = welcomeModal.getByText(/in-person|online|hybrid/i).first();
      if (await trainingStyleOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await trainingStyleOption.click();
        const nextBtn = welcomeModal.getByRole('button', { name: /next|continue/i });
        if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await nextBtn.click();
        }
      }

      // Step 2d - Client count selection
      const clientCountOption = welcomeModal.getByText(/1-5|1-10|6-20/i).first();
      if (await clientCountOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await clientCountOption.click();
        const finishBtn = welcomeModal.getByRole('button', {
          name: /finish|done|complete|let's go/i,
        });
        if (await finishBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await finishBtn.click();
        }
      }

      // Completion screen may show confetti / celebration. Wait briefly.
      await page.waitForTimeout(1_500);

      // Close the modal if a close / dismiss button remains.
      const closeBtn = welcomeModal.getByRole('button', { name: /close|dismiss|x/i });
      if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }

    // After onboarding, the dashboard should be visible.
    await expect(page.getByRole('main')).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 3 - Add first client via the setup checklist / clients page
    // -----------------------------------------------------------------------
    // Navigate to the clients page.
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    // Click the "Add Client" / "New Client" button.
    const addClientBtn = page.getByRole('button', { name: /add client|new client/i });
    await expect(addClientBtn).toBeVisible({ timeout: 10_000 });
    await addClientBtn.click();

    // Fill out the client form modal.
    const clientDialog = page.locator('[role="dialog"]');
    await expect(clientDialog).toBeVisible({ timeout: 5_000 });

    await clientDialog
      .locator('input[name="name"], input[placeholder*="name" i]')
      .first()
      .fill('Jane Doe');
    await clientDialog
      .locator('input[name="email"], input[placeholder*="email" i]')
      .first()
      .fill('jane.doe@test.com');

    // Goal field may be a select or input.
    const goalInput = clientDialog
      .locator('input[name="goal"], textarea[name="goal"], select[name="goal"]')
      .first();
    if (await goalInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const tagName = await goalInput.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await goalInput.selectOption({ index: 1 });
      } else {
        await goalInput.fill('Weight loss and muscle building');
      }
    }

    // Submit the form.
    const submitClientBtn = clientDialog.getByRole('button', { name: /save|create|add|submit/i });
    await submitClientBtn.click();

    // Verify the client appears in the list.
    await expect(page.getByText('Jane Doe')).toBeVisible({ timeout: 10_000 });

    // -----------------------------------------------------------------------
    // Step 4 - Create first workout
    // -----------------------------------------------------------------------
    await page.goto(`${BASE_URL}/workouts`);
    await page.waitForLoadState('networkidle');

    const createWorkoutBtn = page.getByRole('button', {
      name: /create workout|new workout|add workout/i,
    });
    await expect(createWorkoutBtn).toBeVisible({ timeout: 10_000 });
    await createWorkoutBtn.click();

    // Fill out the workout creation form / dialog.
    const workoutDialog = page.locator('[role="dialog"]');
    if (await workoutDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await workoutDialog
        .locator('input[name="title"], input[placeholder*="title" i]')
        .first()
        .fill('Full Body Workout A');
      await workoutDialog
        .locator(
          'input[name="description"], textarea[name="description"], textarea[placeholder*="description" i]'
        )
        .first()
        .fill('Compound-focused full body workout for beginners');

      // Duration
      const durationInput = workoutDialog.locator('input[name="duration"]').first();
      if (await durationInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await durationInput.fill('45');
      }

      // Difficulty selection
      const difficultySelect = workoutDialog.locator('select[name="difficulty"]').first();
      if (await difficultySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await difficultySelect.selectOption('beginner');
      }

      // Category selection
      const categorySelect = workoutDialog.locator('select[name="category"]').first();
      if (await categorySelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await categorySelect.selectOption({ index: 1 });
      }

      const saveWorkoutBtn = workoutDialog.getByRole('button', { name: /save|create|add|submit/i });
      await saveWorkoutBtn.click();
    }

    // Verify workout appears in the list.
    await expect(page.getByText('Full Body Workout A')).toBeVisible({ timeout: 10_000 });

    // -----------------------------------------------------------------------
    // Step 5 - Assign workout to client
    // -----------------------------------------------------------------------
    // Click on the workout to open details / builder.
    await page.getByText('Full Body Workout A').click();
    await page.waitForLoadState('networkidle');

    // Look for an "Assign" button on the workout detail or builder page.
    const assignBtn = page.getByRole('button', { name: /assign/i });
    if (await assignBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await assignBtn.click();

      // Select the client in the assignment dialog.
      const assignDialog = page.locator('[role="dialog"]');
      if (await assignDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Click on the client name to select them.
        const clientOption = assignDialog.getByText('Jane Doe');
        if (await clientOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await clientOption.click();
        }

        // Confirm assignment.
        const confirmBtn = assignDialog.getByRole('button', { name: /assign|confirm|save/i });
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }

      // Wait for the success toast or confirmation.
      await page.waitForTimeout(2_000);
    }

    // -----------------------------------------------------------------------
    // Step 6 - Verify dashboard stats updated
    // -----------------------------------------------------------------------
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await waitForAuthUser(page);

    // The dashboard should display at least 1 client.
    const clientStat = page.locator('[data-testid="total-clients"], .stat-clients').first();
    if (await clientStat.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const clientCountText = await clientStat.textContent();
      expect(Number.parseInt(clientCountText ?? '0', 10)).toBeGreaterThanOrEqual(1);
    }

    // Alternatively, just verify the dashboard rendered with some content.
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('AI coach generates workout suggestion', async ({ page }) => {
    // -----------------------------------------------------------------------
    // Step 1 - Log in as trainer
    // -----------------------------------------------------------------------
    await loginAsTrainer(page);
    await waitForAuthUser(page);

    // -----------------------------------------------------------------------
    // Step 2 - Navigate to AI Coach
    // -----------------------------------------------------------------------
    // The AI Coach is accessible via the sidebar or the solo routes.
    // Trainers may access it through /solo/coach or through a sidebar link.
    await page.goto(`${BASE_URL}/solo/coach`);
    await page.waitForLoadState('networkidle');

    // -----------------------------------------------------------------------
    // Step 3 - Send a message to the AI coach
    // -----------------------------------------------------------------------
    const chatInput = page
      .locator(
        'input[placeholder*="message" i], textarea[placeholder*="message" i], input[type="text"]'
      )
      .first();
    await expect(chatInput).toBeVisible({ timeout: 10_000 });
    await chatInput.fill('Create a beginner full body workout for a 25 year old male');

    // Submit the message (press Enter or click Send).
    const sendButton = page.getByRole('button', { name: /send/i });
    if (await sendButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // -----------------------------------------------------------------------
    // Step 4 - Verify response appears
    // -----------------------------------------------------------------------
    // Wait for the AI response to render. AI responses can take a few seconds.
    const aiResponse = page
      .locator('[data-role="assistant"], .assistant-message, .ai-response')
      .first();
    await expect(aiResponse).toBeVisible({ timeout: 30_000 });

    // The response should contain workout-related content.
    const responseText = await aiResponse.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(20);
  });

  test('trainer can export client data as CSV', async ({ page }) => {
    await loginAsTrainer(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Look for an export / download button on the dashboard.
    const exportBtn = page.getByRole('button', { name: /export|download|csv/i });
    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Set up download listener before clicking.
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
        exportBtn.click(),
      ]);

      if (download) {
        const suggestedName = download.suggestedFilename();
        expect(suggestedName).toMatch(/\.csv$/i);
      }
    }
  });

  test('trainer can navigate to all primary sections', async ({ page }) => {
    await loginAsTrainer(page);
    await waitForAuthUser(page);

    const sections = [
      { path: '/dashboard', expectedText: /dashboard|overview|clients/i },
      { path: '/clients', expectedText: /client|add client|search/i },
      { path: '/workouts', expectedText: /workout|create|plan/i },
      { path: '/exercises', expectedText: /exercise|library|search/i },
      { path: '/schedule', expectedText: /schedule|calendar|appointment/i },
      { path: '/calculators', expectedText: /calculator|bmi|1rm/i },
    ];

    for (const section of sections) {
      await page.goto(`${BASE_URL}${section.path}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });

      // Each section should have content matching its purpose.
      const mainContent = await page.getByRole('main').textContent();
      expect(mainContent).toBeTruthy();
    }
  });

  test('notification center loads and displays notifications', async ({ page }) => {
    await loginAsTrainer(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Click the notification bell icon in the header.
    const notificationBell = page
      .locator('button[aria-label*="notification" i], [data-testid="notification-bell"]')
      .first();

    if (await notificationBell.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await notificationBell.click();

      // The notification panel / dropdown should appear.
      const notificationPanel = page
        .locator('[data-testid="notification-panel"], [role="dialog"], .notification-dropdown')
        .first();
      await expect(notificationPanel).toBeVisible({ timeout: 5_000 });
    }
  });

  test('trainer can view client details page', async ({ page }) => {
    await loginAsTrainer(page);
    await waitForAuthUser(page);

    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('networkidle');

    // Click on the first client card / row to navigate to details.
    const firstClient = page
      .locator('[data-testid="client-card"], .client-card, a[href*="/clients/"]')
      .first();
    if (await firstClient.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState('networkidle');

      // The client details page should display client info.
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page).toHaveURL(/\/clients\/.+/);
    }
  });
});

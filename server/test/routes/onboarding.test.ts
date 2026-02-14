/**
 * Onboarding Route Tests
 *
 * Tests for:
 *   GET /api/onboarding/progress  — returns onboarding progress for user
 *   PUT /api/onboarding/progress  — updates onboarding progress fields
 *
 * The onboarding routes use secureAuth middleware and Zod validation.
 * Storage calls are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  resetFactoryCounters,
} from '../helpers';

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    getUserOnboardingProgress: vi.fn(),
    updateUserOnboardingProgress: vi.fn(),
  },
}));

import { storage } from '../../storage';

// ---------------------------------------------------------------------------
// Helper to create an authenticated trainer request
// ---------------------------------------------------------------------------

function createTrainerReq(
  overrides: {
    body?: Record<string, any>;
    params?: Record<string, string>;
    userId?: string;
  } = {}
) {
  return createMockRequest({
    user: createTestUser({ id: overrides.userId ?? 'trainer-1', role: 'trainer' }),
    body: overrides.body,
    params: overrides.params,
  }) as any;
}

// ---------------------------------------------------------------------------
// Test data factory for onboarding progress
// ---------------------------------------------------------------------------

function createTestOnboardingProgress(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? 'progress-1',
    userId: overrides.userId ?? 'trainer-1',
    welcomeModalCompleted: overrides.welcomeModalCompleted ?? false,
    selectedGoal: overrides.selectedGoal ?? null,
    addedFirstClient: overrides.addedFirstClient ?? false,
    createdFirstWorkout: overrides.createdFirstWorkout ?? false,
    assignedFirstWorkout: overrides.assignedFirstWorkout ?? false,
    scheduledFirstSession: overrides.scheduledFirstSession ?? false,
    loggedFirstProgress: overrides.loggedFirstProgress ?? false,
    completedProductTour: overrides.completedProductTour ?? false,
    dismissedFeaturePrompts: overrides.dismissedFeaturePrompts ?? [],
    onboardingCompletedAt: overrides.onboardingCompletedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-01'),
  };
}

// ---------------------------------------------------------------------------
// Handler reproductions from routes.ts
// ---------------------------------------------------------------------------

async function getOnboardingProgressHandler(req: any, res: any) {
  try {
    const userId = req.user.id as string;
    const progress = await (storage as any).getUserOnboardingProgress(userId);

    if (!progress) {
      return res.json({
        userId,
        welcomeModalCompleted: false,
        selectedGoal: null,
        addedFirstClient: false,
        createdFirstWorkout: false,
        assignedFirstWorkout: false,
        scheduledFirstSession: false,
        loggedFirstProgress: false,
        sentFirstMessage: false,
        completedProductTour: false,
        dismissedFeaturePrompts: [],
        onboardingCompletedAt: null,
      });
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch onboarding progress' });
  }
}

async function updateOnboardingProgressHandler(req: any, res: any) {
  try {
    const { insertUserOnboardingProgressSchema } = await import('@shared/schema');
    const userId = req.user.id as string;

    // Prevent userId from being overridden
    const { userId: _, ...updateData } = req.body;

    // Convert ISO string to Date if needed
    if (updateData.onboardingCompletedAt && typeof updateData.onboardingCompletedAt === 'string') {
      updateData.onboardingCompletedAt = new Date(updateData.onboardingCompletedAt);
    }

    const validatedData = insertUserOnboardingProgressSchema.partial().parse(updateData);

    const progress = await (storage as any).updateUserOnboardingProgress(userId, validatedData);
    res.json(progress);
  } catch (error: any) {
    if (error?.constructor?.name === 'ZodError' || error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid onboarding data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update onboarding progress' });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Onboarding Routes — GET /api/onboarding/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('returns default progress when no record exists for the user', async () => {
    (storage.getUserOnboardingProgress as any).mockResolvedValue(null);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getOnboardingProgressHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      userId: 'trainer-1',
      welcomeModalCompleted: false,
      selectedGoal: null,
      addedFirstClient: false,
      createdFirstWorkout: false,
      assignedFirstWorkout: false,
      scheduledFirstSession: false,
      loggedFirstProgress: false,
      sentFirstMessage: false,
      completedProductTour: false,
      dismissedFeaturePrompts: [],
      onboardingCompletedAt: null,
    });
  });

  it('returns stored progress when a record exists', async () => {
    const existing = createTestOnboardingProgress({
      userId: 'trainer-1',
      welcomeModalCompleted: true,
      selectedGoal: 'manage_clients',
      addedFirstClient: true,
      createdFirstWorkout: true,
    });
    (storage.getUserOnboardingProgress as any).mockResolvedValue(existing);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getOnboardingProgressHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(existing);
  });

  it('returns progress with all milestones completed', async () => {
    const completed = createTestOnboardingProgress({
      userId: 'trainer-1',
      welcomeModalCompleted: true,
      selectedGoal: 'save_time',
      addedFirstClient: true,
      createdFirstWorkout: true,
      assignedFirstWorkout: true,
      scheduledFirstSession: true,
      loggedFirstProgress: true,
      completedProductTour: true,
      onboardingCompletedAt: new Date('2024-02-01'),
    });
    (storage.getUserOnboardingProgress as any).mockResolvedValue(completed);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getOnboardingProgressHandler(req, res);

    const result = (res.json as any).mock.calls[0][0];
    expect(result.welcomeModalCompleted).toBe(true);
    expect(result.addedFirstClient).toBe(true);
    expect(result.createdFirstWorkout).toBe(true);
    expect(result.assignedFirstWorkout).toBe(true);
    expect(result.scheduledFirstSession).toBe(true);
    expect(result.loggedFirstProgress).toBe(true);
    expect(result.completedProductTour).toBe(true);
    expect(result.onboardingCompletedAt).toEqual(new Date('2024-02-01'));
  });

  it('uses the correct userId from the authenticated session', async () => {
    (storage.getUserOnboardingProgress as any).mockResolvedValue(null);

    const req = createTrainerReq({ userId: 'custom-user-99' });
    const res = createMockResponse();

    await getOnboardingProgressHandler(req, res);

    expect(storage.getUserOnboardingProgress).toHaveBeenCalledWith('custom-user-99');
    const result = (res.json as any).mock.calls[0][0];
    expect(result.userId).toBe('custom-user-99');
  });

  it('returns 500 when storage throws an error', async () => {
    (storage.getUserOnboardingProgress as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq();
    const res = createMockResponse();

    await getOnboardingProgressHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch onboarding progress' });
  });
});

describe('Onboarding Routes — PUT /api/onboarding/progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('updates welcomeModalCompleted field', async () => {
    const updated = createTestOnboardingProgress({
      userId: 'trainer-1',
      welcomeModalCompleted: true,
    });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(updated);

    const req = createTrainerReq({ body: { welcomeModalCompleted: true } });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(updated);
    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith(
      'trainer-1',
      expect.objectContaining({ welcomeModalCompleted: true })
    );
  });

  it('updates selectedGoal field', async () => {
    const updated = createTestOnboardingProgress({
      userId: 'trainer-1',
      selectedGoal: 'grow_clients',
    });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(updated);

    const req = createTrainerReq({ body: { selectedGoal: 'grow_clients' } });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith(
      'trainer-1',
      expect.objectContaining({ selectedGoal: 'grow_clients' })
    );
  });

  it('updates multiple fields at once', async () => {
    const updated = createTestOnboardingProgress({
      userId: 'trainer-1',
      addedFirstClient: true,
      createdFirstWorkout: true,
    });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      body: { addedFirstClient: true, createdFirstWorkout: true },
    });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith(
      'trainer-1',
      expect.objectContaining({
        addedFirstClient: true,
        createdFirstWorkout: true,
      })
    );
  });

  it('converts onboardingCompletedAt from ISO string to Date', async () => {
    const completedDate = '2024-03-15T12:00:00.000Z';
    const updated = createTestOnboardingProgress({
      userId: 'trainer-1',
      onboardingCompletedAt: new Date(completedDate),
    });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(updated);

    const req = createTrainerReq({ body: { onboardingCompletedAt: completedDate } });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    const storageCallArgs = (storage.updateUserOnboardingProgress as any).mock.calls[0][1];
    expect(storageCallArgs.onboardingCompletedAt).toBeInstanceOf(Date);
  });

  it('prevents userId from being overridden via request body', async () => {
    const updated = createTestOnboardingProgress({
      userId: 'trainer-1',
      welcomeModalCompleted: true,
    });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      body: { userId: 'attacker-id', welcomeModalCompleted: true },
    });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    // Should use session userId, not body userId
    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith(
      'trainer-1', // From session, NOT 'attacker-id'
      expect.any(Object)
    );
  });

  it('updates dismissedFeaturePrompts array', async () => {
    const updated = createTestOnboardingProgress({
      userId: 'trainer-1',
      dismissedFeaturePrompts: ['welcome_tip', 'client_suggestion'],
    });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      body: { dismissedFeaturePrompts: ['welcome_tip', 'client_suggestion'] },
    });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    const result = (res.json as any).mock.calls[0][0];
    expect(result.dismissedFeaturePrompts).toEqual(['welcome_tip', 'client_suggestion']);
  });

  it('returns 500 when storage throws a non-Zod error', async () => {
    (storage.updateUserOnboardingProgress as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq({ body: { welcomeModalCompleted: true } });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update onboarding progress' });
  });

  it('allows empty body (no-op update)', async () => {
    const existing = createTestOnboardingProgress({ userId: 'trainer-1' });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(existing);

    const req = createTrainerReq({ body: {} });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(existing);
    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith('trainer-1', {});
  });

  it('uses correct userId from different authenticated users', async () => {
    const progress = createTestOnboardingProgress({ userId: 'user-42' });
    (storage.updateUserOnboardingProgress as any).mockResolvedValue(progress);

    const req = createTrainerReq({
      body: { welcomeModalCompleted: true },
      userId: 'user-42',
    });
    const res = createMockResponse();

    await updateOnboardingProgressHandler(req, res);

    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith(
      'user-42',
      expect.any(Object)
    );
  });
});

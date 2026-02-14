/**
 * Workout Route Tests
 *
 * Tests for:
 *   GET    /api/workouts                — list workouts for trainer
 *   POST   /api/workouts                — create workout with exercises
 *   PUT    /api/workouts/:id            — update workout
 *   DELETE /api/workouts/:id            — delete workout
 *   POST   /api/workout-assignments     — assign workout to client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  createTestWorkout,
  createTestClient,
  createTestUser,
  resetFactoryCounters,
} from '../helpers';

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    getWorkout: vi.fn(),
    getWorkoutsByTrainer: vi.fn(),
    createWorkout: vi.fn(),
    updateWorkout: vi.fn(),
    deleteWorkout: vi.fn(),
    assignWorkoutToClient: vi.fn(),
    completeWorkoutAssignment: vi.fn(),
    getClientWorkouts: vi.fn(),
    getClient: vi.fn(),
    updateUserOnboardingProgress: vi.fn(),
  },
}));

import { storage } from '../../storage';

// ---------------------------------------------------------------------------
// Helper to create authenticated trainer request
// ---------------------------------------------------------------------------

function createTrainerReq(
  overrides: {
    body?: Record<string, any>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    userId?: string;
  } = {}
) {
  return createMockRequest({
    user: createTestUser({ id: overrides.userId ?? 'trainer-1', role: 'trainer' }),
    body: overrides.body,
    params: overrides.params,
    query: overrides.query,
  }) as any;
}

// ---------------------------------------------------------------------------
// Handler reproductions
// ---------------------------------------------------------------------------

async function getWorkoutsHandler(req: any, res: any) {
  try {
    const trainerId = req.user.id as string;
    const workouts = await storage.getWorkoutsByTrainer(trainerId);
    res.json(workouts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
}

async function createWorkoutHandler(req: any, res: any) {
  try {
    const { insertWorkoutSchema } = await import('@shared/schema');
    const trainerId = req.user.id as string;
    const validatedData = insertWorkoutSchema.parse({ ...req.body, trainerId });
    const workout = await storage.createWorkout(validatedData);

    try {
      await (storage as any).updateUserOnboardingProgress(trainerId, {
        createdFirstWorkout: true,
      });
    } catch (_) {}

    res.status(201).json(workout);
  } catch (error: any) {
    if (error?.constructor?.name === 'ZodError' || error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid workout data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create workout' });
  }
}

async function updateWorkoutHandler(req: any, res: any) {
  try {
    const { insertWorkoutSchema } = await import('@shared/schema');
    const { id } = req.params;
    const existingWorkout = await storage.getWorkout(id);

    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    if (existingWorkout.trainerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    const validatedUpdates = insertWorkoutSchema
      .omit({ trainerId: true })
      .partial()
      .parse(req.body);

    const workout = await storage.updateWorkout(id, validatedUpdates);
    res.json(workout);
  } catch (error: any) {
    if (error?.constructor?.name === 'ZodError' || error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid update data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update workout' });
  }
}

async function deleteWorkoutHandler(req: any, res: any) {
  try {
    const { id } = req.params;
    const existingWorkout = await storage.getWorkout(id);

    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    if (existingWorkout.trainerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    await storage.deleteWorkout(id);
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
}

async function assignWorkoutHandler(req: any, res: any) {
  try {
    const { insertWorkoutAssignmentSchema } = await import('@shared/schema');
    const validatedData = insertWorkoutAssignmentSchema.parse(req.body);

    const assignmentData = { ...validatedData };
    assignmentData.timezone = assignmentData.timezone || 'UTC';
    assignmentData.status = assignmentData.status || 'scheduled';
    assignmentData.isCustomized = assignmentData.isCustomized ?? false;

    const assignment = await storage.assignWorkoutToClient(assignmentData);

    try {
      const client = await storage.getClient(validatedData.clientId);
      if (client) {
        await (storage as any).updateUserOnboardingProgress(client.trainerId, {
          assignedFirstWorkout: true,
        });
      }
    } catch (_) {}

    res.status(201).json(assignment);
  } catch (error: any) {
    if (error?.constructor?.name === 'ZodError' || error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid assignment data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to assign workout' });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Workout Routes — GET /api/workouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('returns all workouts for the authenticated trainer', async () => {
    const workouts = [
      createTestWorkout({ id: 'w1', title: 'Push Day', trainerId: 'trainer-1' }),
      createTestWorkout({ id: 'w2', title: 'Pull Day', trainerId: 'trainer-1' }),
    ];
    (storage.getWorkoutsByTrainer as any).mockResolvedValue(workouts);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getWorkoutsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(workouts);
    expect(storage.getWorkoutsByTrainer).toHaveBeenCalledWith('trainer-1');
  });

  it('returns an empty array when trainer has no workouts', async () => {
    (storage.getWorkoutsByTrainer as any).mockResolvedValue([]);

    const req = createTrainerReq();
    const res = createMockResponse();

    await getWorkoutsHandler(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('returns 500 when storage throws', async () => {
    (storage.getWorkoutsByTrainer as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq();
    const res = createMockResponse();

    await getWorkoutsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch workouts' });
  });
});

describe('Workout Routes — POST /api/workouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('creates a workout with valid data and returns 201', async () => {
    const newWorkout = createTestWorkout({ id: 'w-new', trainerId: 'trainer-1' });
    (storage.createWorkout as any).mockResolvedValue(newWorkout);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: {
        title: 'Full Body Workout',
        description: 'A comprehensive full body session',
        duration: 60,
        difficulty: 'intermediate',
        category: 'strength',
      },
    });
    const res = createMockResponse();

    await createWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newWorkout);
    expect(storage.createWorkout).toHaveBeenCalledTimes(1);
    expect((storage.createWorkout as any).mock.calls[0][0]).toHaveProperty(
      'trainerId',
      'trainer-1'
    );
  });

  it('returns 400 for missing required fields (Zod validation)', async () => {
    const req = createTrainerReq({ body: {} });
    const res = createMockResponse();

    await createWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Invalid workout data',
        details: expect.any(Array),
      })
    );
  });

  it('returns 400 when duration is not a number', async () => {
    const req = createTrainerReq({
      body: {
        title: 'Workout',
        description: 'Desc',
        duration: 'not-a-number',
        difficulty: 'beginner',
        category: 'strength',
      },
    });
    const res = createMockResponse();

    await createWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid workout data' })
    );
  });

  it('updates onboarding progress after creating the first workout', async () => {
    const newWorkout = createTestWorkout({ id: 'w-new', trainerId: 'trainer-1' });
    (storage.createWorkout as any).mockResolvedValue(newWorkout);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: {
        title: 'Full Body',
        description: 'Session',
        duration: 60,
        difficulty: 'beginner',
        category: 'strength',
      },
    });
    const res = createMockResponse();

    await createWorkoutHandler(req, res);

    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith('trainer-1', {
      createdFirstWorkout: true,
    });
  });

  it('returns 500 when storage.createWorkout throws', async () => {
    (storage.createWorkout as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq({
      body: {
        title: 'Workout',
        description: 'Desc',
        duration: 60,
        difficulty: 'beginner',
        category: 'strength',
      },
    });
    const res = createMockResponse();

    await createWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create workout' });
  });
});

describe('Workout Routes — PUT /api/workouts/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('updates a workout belonging to the authenticated trainer', async () => {
    const existing = createTestWorkout({ id: 'w1', trainerId: 'trainer-1' });
    const updated = { ...existing, title: 'Updated Title' };
    (storage.getWorkout as any).mockResolvedValue(existing);
    (storage.updateWorkout as any).mockResolvedValue(updated);

    const req = createTrainerReq({
      params: { id: 'w1' },
      body: { title: 'Updated Title' },
    });
    const res = createMockResponse();

    await updateWorkoutHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(updated);
    expect(storage.updateWorkout).toHaveBeenCalledWith(
      'w1',
      expect.objectContaining({
        title: 'Updated Title',
      })
    );
  });

  it('returns 404 when workout does not exist', async () => {
    (storage.getWorkout as any).mockResolvedValue(undefined);

    const req = createTrainerReq({
      params: { id: 'nonexistent' },
      body: { title: 'X' },
    });
    const res = createMockResponse();

    await updateWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Workout not found' });
  });

  it('returns 403 when workout belongs to a different trainer', async () => {
    const existing = createTestWorkout({ id: 'w1', trainerId: 'other-trainer' });
    (storage.getWorkout as any).mockResolvedValue(existing);

    const req = createTrainerReq({
      params: { id: 'w1' },
      body: { title: 'Hijacked' },
    });
    const res = createMockResponse();

    await updateWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied to this workout' });
    expect(storage.updateWorkout).not.toHaveBeenCalled();
  });

  it('does not allow trainerId to be changed via update', async () => {
    const existing = createTestWorkout({ id: 'w1', trainerId: 'trainer-1' });
    (storage.getWorkout as any).mockResolvedValue(existing);
    (storage.updateWorkout as any).mockResolvedValue(existing);

    const req = createTrainerReq({
      params: { id: 'w1' },
      body: { trainerId: 'attacker', title: 'Update' },
    });
    const res = createMockResponse();

    await updateWorkoutHandler(req, res);

    const callArgs = (storage.updateWorkout as any).mock.calls[0][1];
    expect(callArgs).not.toHaveProperty('trainerId');
  });
});

describe('Workout Routes — DELETE /api/workouts/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('deletes a workout belonging to the authenticated trainer', async () => {
    const existing = createTestWorkout({ id: 'w1', trainerId: 'trainer-1' });
    (storage.getWorkout as any).mockResolvedValue(existing);
    (storage.deleteWorkout as any).mockResolvedValue(true);

    const req = createTrainerReq({ params: { id: 'w1' } });
    const res = createMockResponse();

    await deleteWorkoutHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Workout deleted successfully' });
    expect(storage.deleteWorkout).toHaveBeenCalledWith('w1');
  });

  it('returns 404 when workout does not exist', async () => {
    (storage.getWorkout as any).mockResolvedValue(undefined);

    const req = createTrainerReq({ params: { id: 'nonexistent' } });
    const res = createMockResponse();

    await deleteWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Workout not found' });
  });

  it('returns 403 when workout belongs to a different trainer', async () => {
    const existing = createTestWorkout({ id: 'w1', trainerId: 'other-trainer' });
    (storage.getWorkout as any).mockResolvedValue(existing);

    const req = createTrainerReq({ params: { id: 'w1' } });
    const res = createMockResponse();

    await deleteWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied to this workout' });
    expect(storage.deleteWorkout).not.toHaveBeenCalled();
  });

  it('returns 500 when storage throws during deletion', async () => {
    const existing = createTestWorkout({ id: 'w1', trainerId: 'trainer-1' });
    (storage.getWorkout as any).mockResolvedValue(existing);
    (storage.deleteWorkout as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq({ params: { id: 'w1' } });
    const res = createMockResponse();

    await deleteWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to delete workout' });
  });
});

describe('Workout Routes — POST /api/workout-assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFactoryCounters();
  });

  it('assigns a workout to a client and returns 201', async () => {
    const assignment = {
      id: 'a1',
      workoutId: 'w1',
      clientId: 'c1',
      assignedAt: new Date(),
      completedAt: null,
      notes: null,
      scheduledDate: null,
      scheduledTime: null,
      timezone: 'UTC',
      dayOfWeek: null,
      weekNumber: null,
      weekYear: null,
      durationMinutes: null,
      isCustomized: false,
      customTitle: null,
      customNotes: null,
      status: 'scheduled',
      cancelledAt: null,
      cancellationReason: null,
      notificationsSent: null,
    };
    const client = createTestClient({ id: 'c1', trainerId: 'trainer-1' });

    (storage.assignWorkoutToClient as any).mockResolvedValue(assignment);
    (storage.getClient as any).mockResolvedValue(client);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: {
        workoutId: 'w1',
        clientId: 'c1',
        scheduledDate: '2024-02-01',
      },
    });
    const res = createMockResponse();

    await assignWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(assignment);
    expect(storage.assignWorkoutToClient).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for missing required fields', async () => {
    const req = createTrainerReq({ body: {} });
    const res = createMockResponse();

    await assignWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid assignment data' })
    );
  });

  it('defaults timezone to UTC and status to scheduled', async () => {
    const assignment = {
      id: 'a1',
      workoutId: 'w1',
      clientId: 'c1',
      assignedAt: new Date(),
      status: 'scheduled',
      timezone: 'UTC',
    };
    const client = createTestClient({ id: 'c1' });

    (storage.assignWorkoutToClient as any).mockResolvedValue(assignment);
    (storage.getClient as any).mockResolvedValue(client);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: { workoutId: 'w1', clientId: 'c1' },
    });
    const res = createMockResponse();

    await assignWorkoutHandler(req, res);

    const callArgs = (storage.assignWorkoutToClient as any).mock.calls[0][0];
    expect(callArgs.timezone).toBe('UTC');
    expect(callArgs.status).toBe('scheduled');
    expect(callArgs.isCustomized).toBe(false);
  });

  it('updates onboarding progress after assigning first workout', async () => {
    const assignment = {
      id: 'a1',
      workoutId: 'w1',
      clientId: 'c1',
      assignedAt: new Date(),
      status: 'scheduled',
    };
    const client = createTestClient({ id: 'c1', trainerId: 'trainer-1' });

    (storage.assignWorkoutToClient as any).mockResolvedValue(assignment);
    (storage.getClient as any).mockResolvedValue(client);
    (storage.updateUserOnboardingProgress as any).mockResolvedValue({});

    const req = createTrainerReq({
      body: { workoutId: 'w1', clientId: 'c1' },
    });
    const res = createMockResponse();

    await assignWorkoutHandler(req, res);

    expect(storage.updateUserOnboardingProgress).toHaveBeenCalledWith('trainer-1', {
      assignedFirstWorkout: true,
    });
  });

  it('returns 500 when storage throws on assignment creation', async () => {
    (storage.assignWorkoutToClient as any).mockRejectedValue(new Error('DB error'));

    const req = createTrainerReq({
      body: { workoutId: 'w1', clientId: 'c1' },
    });
    const res = createMockResponse();

    await assignWorkoutHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to assign workout' });
  });
});

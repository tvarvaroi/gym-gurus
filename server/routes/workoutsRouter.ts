// Workout Management Routes
// CRUD for workouts, workout templates, and workout-exercise associations

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import { exercises, insertWorkoutSchema, insertWorkoutExerciseSchema } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { apiRateLimit, strictRateLimit } from '../middleware/rateLimiter';

const router = Router();

// GET /api/workouts - Get all workouts for authenticated trainer
router.get('/', async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const workouts = await storage.getWorkoutsByTrainer(trainerId);
    res.json(workouts);
  } catch (error) {
    // Error logged internally
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// GET /api/workouts/detail/:id - Get specific workout with exercises
router.get('/detail/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workout = await storage.getWorkout(id);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Verify workout belongs to authenticated trainer
    if (workout.trainerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    const rawExercises = await storage.getWorkoutExercises(id);

    // Join with exercises library to get names and muscle groups
    const db = await getDb();
    const enrichedExercises = await Promise.all(
      rawExercises.map(async (we) => {
        if (we.exerciseId) {
          const [libEx] = await db
            .select({
              name: exercises.name,
              muscleGroup: sql<string>`(${exercises.muscleGroups})[1]`,
            })
            .from(exercises)
            .where(eq(exercises.id, we.exerciseId))
            .limit(1);
          return { ...we, name: libEx?.name || null, muscleGroup: libEx?.muscleGroup || null };
        }
        return { ...we, name: null, muscleGroup: null };
      })
    );

    res.json({ ...workout, exercises: enrichedExercises });
  } catch (error) {
    // Error logged internally
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// POST /api/workouts - Create new workout
router.post('/', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const finalTrainerId = req.user!.id;

    const validatedData = insertWorkoutSchema.parse({ ...req.body, trainerId: finalTrainerId });
    const workout = await storage.createWorkout(validatedData);

    // Automatic milestone tracking: Mark first workout created
    try {
      await storage.updateUserOnboardingProgress(finalTrainerId, {
        createdFirstWorkout: true,
      });
    } catch (onboardingError) {
      // Don't fail workout creation if onboarding update fails
      console.warn('Failed to update onboarding progress:', onboardingError);
    }

    res.status(201).json(workout);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid workout data', details: error.errors });
    }
    console.error('❌ Failed to create workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// PUT /api/workouts/:id - Update workout
router.put('/:id', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify workout belongs to authenticated trainer
    const existingWorkout = await storage.getWorkout(id);
    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    if (existingWorkout.trainerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    // Prevent trainerId changes by omitting it from the validation schema
    const validatedUpdates = insertWorkoutSchema
      .omit({ trainerId: true })
      .partial()
      .parse(req.body);

    const workout = await storage.updateWorkout(id, validatedUpdates);
    res.json(workout);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid update data', details: error.errors });
    }
    // Error logged internally
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete('/:id', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify workout belongs to authenticated trainer
    const existingWorkout = await storage.getWorkout(id);
    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    if (existingWorkout.trainerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    const success = await storage.deleteWorkout(id);
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    // Error logged internally
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// POST /api/workouts/:id/duplicate - Duplicate a workout
router.post('/:id/duplicate', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trainerId = req.user!.id;

    // Verify workout belongs to authenticated trainer
    const existingWorkout = await storage.getWorkout(id);
    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    if (existingWorkout.trainerId !== trainerId) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    const duplicatedWorkout = await storage.duplicateWorkout(id, trainerId);
    res.json(duplicatedWorkout);
  } catch (error) {
    // Error logged internally
    res.status(500).json({ error: 'Failed to duplicate workout' });
  }
});

// POST /api/workouts/:workoutId/exercises - Add exercise to workout
router.post('/:workoutId/exercises', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { workoutId } = req.params;

    // Verify workout belongs to authenticated trainer
    const workout = await storage.getWorkout(workoutId);
    if (!workout || workout.trainerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    const validatedData = insertWorkoutExerciseSchema.parse({
      ...req.body,
      workoutId,
    });
    const workoutExercise = await storage.addExerciseToWorkout(validatedData);
    res.status(201).json(workoutExercise);
  } catch (error) {
    if (error instanceof ZodError) {
      return res
        .status(400)
        .json({ error: 'Invalid workout exercise data', details: error.errors });
    }
    // Error logged internally
    res.status(500).json({ error: 'Failed to add exercise to workout' });
  }
});

// DELETE /api/workouts/:workoutId/exercises/:exerciseId - Remove exercise from workout
router.delete(
  '/:workoutId/exercises/:exerciseId',
  strictRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { workoutId, exerciseId } = req.params;

      // Verify workout belongs to authenticated trainer
      const workout = await storage.getWorkout(workoutId);
      if (!workout || workout.trainerId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied to this workout' });
      }

      const success = await storage.removeExerciseFromWorkout(workoutId, exerciseId);
      if (!success) {
        return res.status(404).json({ error: 'Exercise not found in workout' });
      }
      res.json({ message: 'Exercise removed from workout successfully' });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to remove exercise from workout' });
    }
  }
);

// PATCH /api/workouts/:workoutId/reorder - Reorder exercise within workout
router.patch('/:workoutId/reorder', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const { workoutId } = req.params;
    const { exerciseId, direction } = req.body;

    if (!exerciseId || !['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'exerciseId and direction (up/down) are required' });
    }

    const workout = await storage.getWorkout(workoutId);
    if (!workout || workout.trainerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied to this workout' });
    }

    const success = await storage.reorderWorkoutExercises(workoutId, exerciseId, direction);
    if (!success) {
      return res.status(400).json({ error: 'Cannot move exercise in that direction' });
    }
    res.json({ message: 'Exercise reordered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder exercise' });
  }
});

export default router;

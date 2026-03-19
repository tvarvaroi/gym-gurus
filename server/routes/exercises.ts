// Exercise Library Routes
// CRUD operations for the shared exercise library

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertExerciseSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { strictRateLimit } from '../middleware/rateLimiter';

const router = Router();

// GET /api/exercises - Get all exercises
router.get('/', async (req: Request, res: Response) => {
  try {
    const exercises = await storage.getAllExercises();

    // Add caching headers for exercises (they don't change often)
    res.set({
      'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
      ETag: `W/"${exercises.length}-${Date.now()}"`,
    });

    res.json(exercises);
  } catch (error) {
    // Error logged internally
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// POST /api/exercises - Create new exercise (trainer-only)
router.post('/', strictRateLimit, async (req: Request, res: Response) => {
  try {
    // SECURITY: Exercise creation is trainer-only
    if (req.user!.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can create exercises' });
    }

    const validatedData = insertExerciseSchema.parse(req.body);
    const exercise = await storage.createExercise(validatedData);
    res.status(201).json(exercise);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid exercise data', details: error.errors });
    }
    // Error logged internally
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

export default router;

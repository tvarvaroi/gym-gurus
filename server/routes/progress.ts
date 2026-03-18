// Progress & Training Session Routes
// Client progress tracking and training session management

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { insertProgressEntrySchema, insertTrainingSessionSchema } from '@shared/schema';
import { ZodError } from 'zod';
import { requireClientOwnership } from '../middleware/auth';
import { strictRateLimit } from '../middleware/rateLimiter';

const router = Router();

// GET /api/clients/:clientId/progress - Get client progress entries
router.get(
  '/clients/:clientId/progress',
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const progress = await storage.getClientProgress(clientId, trainerId);
      res.json(progress);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }
);

// GET /api/progress/:clientId - Get client progress entries
router.get('/progress/:clientId', requireClientOwnership, async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const trainerId = req.user!.id;
    const progress = await storage.getClientProgress(clientId, trainerId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/progress-entries - Add progress entry
router.post('/progress-entries', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const validatedData = insertProgressEntrySchema.parse(req.body);

    // SECURITY: Verify client belongs to authenticated trainer
    const trainerId = req.user!.id;
    const client = await storage.getClient(validatedData.clientId, trainerId);
    if (!client) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    const entry = await storage.addProgressEntry(validatedData);
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid progress data', details: error.errors });
    }
    // Error logged internally
    res.status(500).json({ error: 'Failed to add progress entry' });
  }
});

// GET /api/clients/:clientId/sessions - Get client's training sessions
router.get(
  '/clients/:clientId/sessions',
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const sessions = await storage.getClientSessions(clientId, trainerId);
      res.json(sessions);
    } catch (error) {
      console.error('Failed to fetch client sessions:', error);
      res.status(500).json({ error: 'Failed to fetch training sessions' });
    }
  }
);

// POST /api/training-sessions - Create new training session
router.post('/training-sessions', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const validatedData = insertTrainingSessionSchema.parse({ ...req.body, trainerId });

    // SECURITY: Verify client belongs to authenticated trainer
    const client = await storage.getClient(validatedData.clientId, trainerId);
    if (!client) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    const session = await storage.createTrainingSession(validatedData);

    // Automatic milestone tracking: Mark first session scheduled
    try {
      await storage.updateUserOnboardingProgress(trainerId, {
        scheduledFirstSession: true,
      });
    } catch (onboardingError) {
      // Don't fail session creation if onboarding update fails
      console.warn('Failed to update onboarding progress:', onboardingError);
    }

    res.status(201).json(session);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid session data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create training session' });
  }
});

export default router;

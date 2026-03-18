// Client Management Routes
// Guru (trainer) client CRUD, access code management, and client notes

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import { clients, insertClientSchema } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { ZodError } from 'zod';
import { requireClientOwnership, requireSubscription } from '../middleware/auth';
import { apiRateLimit, strictRateLimit } from '../middleware/rateLimiter';
import {
  createAccessCodeForClient,
  getActiveAccessCode,
  regenerateAccessCode,
  revokeAccessCode,
} from '../services/accessCode';

const router = Router();

// GET /api/clients - Get all clients for authenticated trainer with pagination
router.get('/clients', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const clientList = await storage.getClientsByTrainer(trainerId);
    res.json(clientList);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/client/profile - Get current user's client profile (for client users)
router.get('/client/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user to check role and email
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only clients can use this endpoint
    if (user.role !== 'client') {
      return res.status(403).json({ error: 'This endpoint is for clients only' });
    }

    // Find client record by matching email using direct database query
    const db = await getDb();
    const clientRecords = await db
      .select()
      .from(clients)
      .where(and(eq(clients.email, user.email), isNull(clients.deletedAt)));

    console.log(`🔍 Looking for client with email: ${user.email}`);
    console.log(`📋 Found ${clientRecords.length} client record(s)`);

    if (clientRecords.length === 0) {
      console.log(`❌ Client profile not found for email: ${user.email}`);
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const clientRecord = clientRecords[0];
    console.log(`✅ Found client profile:`, {
      id: clientRecord.id,
      name: clientRecord.name,
      email: clientRecord.email,
    });
    res.json(clientRecord);
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ error: 'Failed to fetch client profile' });
  }
});

// GET /api/clients/detail/:clientId - Get specific client details
router.get(
  '/clients/detail/:clientId',
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const client = await storage.getClient(clientId, trainerId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  }
);

// POST /api/clients - Create new client
router.post(
  '/clients',
  requireSubscription('trainer'),
  strictRateLimit,
  async (req: Request, res: Response) => {
    try {
      const trainerId = req.user!.id;

      // Enforce 10-client limit for trainer tier (pro tier has no limit)
      const user = req.user!;
      if (user.subscriptionTier === 'trainer') {
        const existingClients = await storage.getClientsByTrainer(trainerId);
        if (existingClients.length >= 10) {
          return res.status(402).json({
            error: 'client_limit_reached',
            message:
              'Trainer plan supports up to 10 clients. Upgrade to Pro for unlimited clients.',
            limit: 10,
          });
        }
      }

      const validatedData = insertClientSchema.parse({ ...req.body, trainerId });
      const client = await storage.createClient(validatedData);

      // Automatic milestone tracking: Mark first client added
      try {
        await storage.updateUserOnboardingProgress(trainerId, {
          addedFirstClient: true,
        });
      } catch (onboardingError) {
        console.warn('Failed to update onboarding progress:', onboardingError);
      }

      // Auto-generate access code for new client
      let accessCode: string | null = null;
      try {
        accessCode = await createAccessCodeForClient(client.id, trainerId);
      } catch (codeError) {
        console.warn('Failed to generate access code for client:', codeError);
      }

      // Notify trainer about new client (async)
      import('../services/notificationService').then(({ notifyClientJoined }) => {
        notifyClientJoined(trainerId, client.name, client.id).catch(() => {});
      });

      res.status(201).json({ client, accessCode });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid client data', details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: 'Failed to create client' });
    }
  }
);

// PUT /api/clients/:clientId - Update client
router.put(
  '/clients/:clientId',
  strictRateLimit,
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      // Prevent trainerId changes by omitting it from the validation schema
      const validatedUpdates = insertClientSchema
        .omit({ trainerId: true })
        .partial()
        .parse(req.body);

      const client = await storage.updateClient(clientId, validatedUpdates, trainerId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid update data', details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: 'Failed to update client' });
    }
  }
);

// DELETE /api/clients/:clientId - Delete client
router.delete(
  '/clients/:clientId',
  strictRateLimit,
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const success = await storage.deleteClient(clientId, trainerId);
      if (!success) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json({ message: 'Client deleted successfully' });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to delete client' });
    }
  }
);

// ---- Access Code Management Routes ----

// POST /api/clients/:clientId/access-code - Generate/regenerate access code
router.post(
  '/clients/:clientId/access-code',
  strictRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const accessCode = await createAccessCodeForClient(clientId, trainerId);
      res.json({ accessCode });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate access code' });
    }
  }
);

// GET /api/clients/:clientId/access-code - Get current access code
router.get('/clients/:clientId/access-code', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const trainerId = req.user!.id;
    const code = await getActiveAccessCode(clientId, trainerId);
    res.json(
      code
        ? { accessCode: code.accessCode, lastUsedAt: code.lastUsedAt, createdAt: code.createdAt }
        : { accessCode: null }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to get access code' });
  }
});

// POST /api/clients/:clientId/access-code/regenerate - Regenerate access code
router.post(
  '/clients/:clientId/access-code/regenerate',
  strictRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const accessCode = await regenerateAccessCode(clientId, trainerId);
      if (!accessCode) {
        return res.status(403).json({ error: 'Not authorized to manage this client' });
      }
      res.json({ accessCode });
    } catch (error) {
      res.status(500).json({ error: 'Failed to regenerate access code' });
    }
  }
);

// DELETE /api/clients/:clientId/access-code - Revoke access code
router.delete(
  '/clients/:clientId/access-code',
  strictRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const success = await revokeAccessCode(clientId, trainerId);
      if (!success) {
        return res.status(403).json({ error: 'Not authorized to manage this client' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to revoke access code' });
    }
  }
);

// GET /api/clients/:clientId/notes - Get client notes
router.get(
  '/clients/:clientId/notes',
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const notes = await storage.getClientNotes(clientId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client notes' });
    }
  }
);

// POST /api/clients/:clientId/notes - Add a note to a client
router.post(
  '/clients/:clientId/notes',
  strictRateLimit,
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const { content, category = 'general' } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Note content is required' });
      }

      const note = await storage.addClientNote(clientId, trainerId, content, category);
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add client note' });
    }
  }
);

export default router;

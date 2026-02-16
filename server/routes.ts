import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { storage } from './storage';
import { getDb } from './db';
import { setupAuth, isAuthenticated, authenticateWebSocketSession, getSession } from './replitAuth';
import {
  insertUserSchema,
  insertClientSchema,
  insertExerciseSchema,
  insertWorkoutSchema,
  insertWorkoutExerciseSchema,
  insertWorkoutAssignmentSchema,
  insertProgressEntrySchema,
  insertUserOnboardingProgressSchema,
  insertTrainingSessionSchema,
  insertAppointmentSchema,
  type InsertClient,
  type InsertExercise,
  type InsertWorkout,
  type InsertWorkoutExercise,
  type InsertWorkoutAssignment,
  type InsertProgressEntry,
  type InsertUserOnboardingProgress,
  type InsertAppointment,
  clients,
  workoutAssignments,
  workouts,
  workoutExercises,
  exercises,
  users,
  userFitnessProfile,
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { startOfWeek, endOfWeek, addWeeks, format, getISOWeek, getISOWeekYear } from 'date-fns';
import {
  secureAuth,
  requireClientOwnership,
  requireTrainerOwnership,
  rateLimitWebSocket,
} from './middleware/auth';
import {
  apiRateLimit,
  generalRateLimit,
  strictRateLimit,
  authRateLimit,
  exportRateLimit,
  aiRateLimit,
  writeRateLimit,
} from './middleware/rateLimiter';
import { getMessageDeliveryStatuses } from './middleware/deliveredTracking';
import {
  getMockClients,
  getMockProgress,
  getMockSettings,
  getMockAnalytics,
  getMockDashboardStats,
} from './mockData';

// New feature route imports
import gamificationRoutes from './routes/gamification';
import calculatorRoutes from './routes/calculators';
import strengthRoutes from './routes/strength';
import recoveryRoutes from './routes/recovery';
import aiRoutes from './routes/ai';
import shoppingRoutes from './routes/shopping';
import leaderboardRoutes from './routes/leaderboards';
import notificationRoutes from './routes/notifications';
import intakeRoutes from './routes/intake';
import paymentRoutes from './routes/payments';
import soloRoutes from './routes/solo';

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup secure Replit Auth
  await setupAuth(app);

  // Apply general rate limiting to all API routes
  app.use('/api', generalRateLimit);

  // Register new feature routes with tiered rate limiting
  app.use('/api/gamification', secureAuth, apiRateLimit, gamificationRoutes);
  app.use('/api/calculators', calculatorRoutes); // Calculators are public — covered by generalRateLimit (60/min)
  app.use('/api/strength', secureAuth, apiRateLimit, strengthRoutes);
  app.use('/api/recovery', secureAuth, apiRateLimit, recoveryRoutes);
  app.use('/api/ai', secureAuth, aiRateLimit, aiRoutes); // AI: 10/min (expensive API calls)
  app.use('/api/shopping', secureAuth, apiRateLimit, shoppingRoutes);
  app.use('/api/leaderboards', secureAuth, apiRateLimit, leaderboardRoutes);
  app.use('/api/notifications', secureAuth, apiRateLimit, notificationRoutes);
  app.use('/api/intake', secureAuth, apiRateLimit, intakeRoutes);
  app.use('/api/payments', secureAuth, strictRateLimit, paymentRoutes); // Payments: strict (10/min)
  app.use('/api/solo', secureAuth, apiRateLimit, soloRoutes); // Solo user workout tracking

  // Contact form (public, rate-limited)
  app.post('/api/contact', strictRateLimit, async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
      }
      // Basic email format check
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      if (message.length > 5000) {
        return res.status(400).json({ error: 'Message is too long (max 5000 characters).' });
      }
      // Log for now — in production, store in DB or send email
      console.log(
        `[Contact Form] Name: ${name}, Email: ${email}, Message: ${message.substring(0, 100)}...`
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({ error: 'Failed to process your message. Please try again.' });
    }
  });

  // Auth routes
  // Note: No rate limiting on auth check as it's frequently called to verify session
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated - return 401 if not
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // For production, check token expiration
      if (process.env.NODE_ENV !== 'development') {
        const jwtUser = req.user as any;
        if (!jwtUser?.expires_at) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const now = Math.floor(Date.now() / 1000);
        if (now > jwtUser.expires_at) {
          return res.status(401).json({ message: 'Token expired' });
        }
      }

      // Get user ID from session
      const jwtUser = req.user as any;
      const userId = jwtUser?.claims?.sub || jwtUser?.id;

      if (!userId) {
        return res.status(401).json({ message: 'Invalid session' });
      }

      // Try to get user from database
      try {
        const user = await storage.getUser(userId);
        if (user) {
          return res.json(user);
        }
      } catch (dbError) {
        console.warn('Database unavailable, using session data:', dbError);
      }

      // Return session user data if database unavailable
      // Detect role from user ID (mock-client-* = client, mock-solo-* = solo, otherwise trainer)
      const role = userId.startsWith('mock-client-')
        ? 'client'
        : userId.startsWith('mock-solo-')
          ? 'solo'
          : 'trainer';

      res.json({
        id: userId,
        email:
          jwtUser?.claims?.email ||
          jwtUser?.email ||
          (role === 'client'
            ? 'client@example.com'
            : role === 'solo'
              ? 'solo@example.com'
              : 'trainer@example.com'),
        firstName: jwtUser?.claims?.first_name || jwtUser?.firstName || 'Demo',
        lastName:
          jwtUser?.claims?.last_name ||
          jwtUser?.lastName ||
          (role === 'client' ? 'Client' : role === 'solo' ? 'User' : 'Trainer'),
        profileImageUrl: jwtUser?.claims?.profile_image_url || jwtUser?.profileImageUrl || null,
        role: role, // Detect role from user ID
        trainerId: role === 'client' ? 'demo-trainer-123' : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error: any) {
      console.error('Auth error:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Solo User Onboarding - Save fitness profile
  app.post('/api/users/onboarding', secureAuth, writeRateLimit, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id as string;
      const { primaryGoal, experienceLevel, workoutEnvironment, availableEquipment, workoutFrequencyPerWeek } = req.body;

      if (!primaryGoal || !experienceLevel || !workoutEnvironment || !availableEquipment || !workoutFrequencyPerWeek) {
        return res.status(400).json({ error: 'All onboarding fields are required' });
      }

      const database = await getDb();

      // Upsert fitness profile
      const existing = await database
        .select()
        .from(userFitnessProfile)
        .where(eq(userFitnessProfile.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        await database
          .update(userFitnessProfile)
          .set({
            primaryGoal,
            experienceLevel,
            workoutEnvironment,
            availableEquipment,
            workoutFrequencyPerWeek,
            updatedAt: new Date(),
          })
          .where(eq(userFitnessProfile.userId, userId));
      } else {
        await database
          .insert(userFitnessProfile)
          .values({
            userId,
            primaryGoal,
            experienceLevel,
            workoutEnvironment,
            availableEquipment,
            workoutFrequencyPerWeek,
          });
      }

      // Mark onboarding as completed on user record
      await database
        .update(users)
        .set({ onboardingCompleted: true })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      res.status(500).json({ error: 'Failed to save onboarding data' });
    }
  });

  // Onboarding Progress Routes

  // GET /api/onboarding/progress - Get user's onboarding progress
  app.get('/api/onboarding/progress', secureAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id as string;
      const progress = await storage.getUserOnboardingProgress(userId);

      // If no progress exists, return default values
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
      console.error('Failed to fetch onboarding progress:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding progress' });
    }
  });

  // PUT /api/onboarding/progress - Update user's onboarding progress
  app.put('/api/onboarding/progress', secureAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id as string;

      // Prevent userId from being overridden in request body
      const { userId: _, ...updateData } = req.body;

      // Convert ISO string to Date object if onboardingCompletedAt is present
      if (
        updateData.onboardingCompletedAt &&
        typeof updateData.onboardingCompletedAt === 'string'
      ) {
        updateData.onboardingCompletedAt = new Date(updateData.onboardingCompletedAt);
      }

      const validatedData = insertUserOnboardingProgressSchema.partial().parse(updateData);

      const progress = await storage.updateUserOnboardingProgress(userId, validatedData);
      res.json(progress);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid onboarding data', details: error.errors });
      }
      console.error('Failed to update onboarding progress:', error);
      res.status(500).json({ error: 'Failed to update onboarding progress' });
    }
  });

  // Client Management Routes

  // GET /api/clients - Get all clients for authenticated trainer with pagination
  app.get('/api/clients', secureAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const clients = await storage.getClientsByTrainer(trainerId);
      res.json(clients);
    } catch (error) {
      // Return mock data when database is unavailable
      console.warn('Database unavailable, returning mock clients:', error);
      const trainerId = (req.user as any).id as string;
      const mockClients = getMockClients(trainerId);
      res.json(mockClients);
    }
  });

  // GET /api/dashboard/stats - Get dashboard statistics (secured)
  app.get('/api/dashboard/stats', secureAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const stats = await storage.getDashboardStats(trainerId);
      res.json(stats);
    } catch (error) {
      // Return mock data when database is unavailable
      console.warn('Database unavailable, returning mock dashboard stats:', error);
      const trainerId = (req.user as any).id as string;
      const mockStats = getMockDashboardStats(trainerId);
      res.json(mockStats);
    }
  });

  // GET /api/dashboard/charts - Get chart data for trainer dashboard (secured)
  app.get(
    '/api/dashboard/charts',
    secureAuth,
    apiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const trainerId = (req.user as any).id as string;
        const charts = await storage.getDashboardCharts(trainerId);
        res.json(charts);
      } catch (error) {
        console.warn('Error fetching dashboard charts:', error);
        res.json({
          weightProgressData: [],
          sessionsData: [],
          clientGrowthData: [],
          trainerStreak: 0,
          completionRate: 0,
          clientComplianceRates: [],
          performanceInsight: { metric: 'session_completion', value: 0, label: 'No data yet' },
        });
      }
    }
  );

  // REMOVED: /api/clients/:trainerId — was unauthenticated IDOR route.
  // Use GET /api/clients (secured, line 197) instead. TrainerId derived from session.

  // GET /api/client/profile - Get current user's client profile (for client users)
  app.get('/api/client/profile', secureAuth, async (req: Request, res: Response) => {
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
      const clientRecords = await db.select().from(clients).where(eq(clients.email, user.email));

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
  app.get(
    '/api/clients/detail/:clientId',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const client = await storage.getClient(clientId);
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
  app.post('/api/clients', secureAuth, strictRateLimit, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const validatedData = insertClientSchema.parse({ ...req.body, trainerId });
      const client = await storage.createClient(validatedData);

      // Automatic milestone tracking: Mark first client added
      try {
        await storage.updateUserOnboardingProgress(trainerId, {
          addedFirstClient: true,
        });
      } catch (onboardingError) {
        // Don't fail client creation if onboarding update fails
        console.warn('Failed to update onboarding progress:', onboardingError);
      }

      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Invalid client data', details: error.errors });
      }
      // Error logged internally
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  // PUT /api/clients/:clientId - Update client
  app.put(
    '/api/clients/:clientId',
    secureAuth,
    strictRateLimit,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        // Prevent trainerId changes by omitting it from the validation schema
        const validatedUpdates = insertClientSchema
          .omit({ trainerId: true })
          .partial()
          .parse(req.body);

        const client = await storage.updateClient(clientId, validatedUpdates);
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
  app.delete(
    '/api/clients/:clientId',
    secureAuth,
    strictRateLimit,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const success = await storage.deleteClient(clientId);
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

  // GET /api/clients/:clientId/notes - Get client notes
  app.get(
    '/api/clients/:clientId/notes',
    secureAuth,
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
  app.post(
    '/api/clients/:clientId/notes',
    secureAuth,
    strictRateLimit,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const trainerId = (req.user as any).id as string;
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

  // Exercise Library Routes

  // GET /api/exercises - Get all exercises
  app.get('/api/exercises', secureAuth, async (req: Request, res: Response) => {
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

  // POST /api/exercises - Create new exercise
  app.post('/api/exercises', secureAuth, strictRateLimit, async (req: Request, res: Response) => {
    try {
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

  // Workout Management Routes

  // GET /api/workouts - Get all workouts for authenticated trainer
  app.get('/api/workouts', secureAuth, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      // Fetching workouts for trainer
      const workouts = await storage.getWorkoutsByTrainer(trainerId);
      // Workouts retrieved successfully
      res.json(workouts);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to fetch workouts' });
    }
  });

  // REMOVED: /api/workouts/:trainerId — was unauthenticated IDOR route.
  // Use GET /api/workouts (secured, line 461) instead. TrainerId derived from session.

  // GET /api/workouts/detail/:id - Get specific workout with exercises
  app.get('/api/workouts/detail/:id', secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workout = await storage.getWorkout(id);
      if (!workout) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      // Verify workout belongs to authenticated trainer
      if (workout.trainerId !== (req.user as any).id) {
        return res.status(403).json({ error: 'Access denied to this workout' });
      }

      const exercises = await storage.getWorkoutExercises(id);
      res.json({ ...workout, exercises });
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to fetch workout' });
    }
  });

  // POST /api/workouts - Create new workout
  app.post('/api/workouts', secureAuth, strictRateLimit, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      console.log('🏋️ Creating workout for trainer:', trainerId);
      console.log('📝 Request body trainerId:', req.body.trainerId);

      // In development, ensure we use demo-trainer-123
      const finalTrainerId =
        process.env.NODE_ENV === 'development' ? 'demo-trainer-123' : trainerId;
      console.log('✅ Final trainerId used:', finalTrainerId);

      const validatedData = insertWorkoutSchema.parse({ ...req.body, trainerId: finalTrainerId });
      const workout = await storage.createWorkout(validatedData);
      console.log('💪 Workout created successfully:', workout);

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
  app.put('/api/workouts/:id', secureAuth, strictRateLimit, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verify workout belongs to authenticated trainer
      const existingWorkout = await storage.getWorkout(id);
      if (!existingWorkout) {
        return res.status(404).json({ error: 'Workout not found' });
      }
      if (existingWorkout.trainerId !== (req.user as any).id) {
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
  app.delete(
    '/api/workouts/:id',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Verify workout belongs to authenticated trainer
        const existingWorkout = await storage.getWorkout(id);
        if (!existingWorkout) {
          return res.status(404).json({ error: 'Workout not found' });
        }
        if (existingWorkout.trainerId !== (req.user as any).id) {
          return res.status(403).json({ error: 'Access denied to this workout' });
        }

        const success = await storage.deleteWorkout(id);
        res.json({ message: 'Workout deleted successfully' });
      } catch (error) {
        // Error logged internally
        res.status(500).json({ error: 'Failed to delete workout' });
      }
    }
  );

  // POST /api/workouts/:id/duplicate - Duplicate a workout
  app.post(
    '/api/workouts/:id/duplicate',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const trainerId = (req.user as any).id as string;

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
    }
  );

  // GET /api/workout-templates - Get predefined workout templates (secured)
  app.get(
    '/api/workout-templates',
    secureAuth,
    apiRateLimit,
    async (_req: Request, res: Response) => {
      try {
        const templates = await storage.getWorkoutTemplates();
        res.json(templates);
      } catch (error) {
        // Error logged internally
        res.status(500).json({ error: 'Failed to fetch workout templates' });
      }
    }
  );

  // Workout Exercise Routes

  // POST /api/workouts/:workoutId/exercises - Add exercise to workout
  app.post(
    '/api/workouts/:workoutId/exercises',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { workoutId } = req.params;

        // Verify workout belongs to authenticated trainer
        const workout = await storage.getWorkout(workoutId);
        if (!workout || workout.trainerId !== (req.user as any).id) {
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
    }
  );

  // DELETE /api/workouts/:workoutId/exercises/:exerciseId - Remove exercise from workout
  app.delete(
    '/api/workouts/:workoutId/exercises/:exerciseId',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { workoutId, exerciseId } = req.params;

        // Verify workout belongs to authenticated trainer
        const workout = await storage.getWorkout(workoutId);
        if (!workout || workout.trainerId !== (req.user as any).id) {
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

  // Workout Assignment Routes

  // GET /api/clients/:clientId/workouts - Get client's assigned workouts
  app.get(
    '/api/clients/:clientId/workouts',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const assignments = await storage.getClientWorkouts(clientId);
        res.json(assignments);
      } catch (error) {
        // Error logged internally
        res.status(500).json({ error: 'Failed to fetch client workouts' });
      }
    }
  );

  // GET /api/client/workouts/weekly - Get current user's (client) workouts for a specific week
  app.get('/api/client/workouts/weekly', secureAuth, async (req: Request, res: Response) => {
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

      // Find client record by matching email
      const db = await getDb();
      const clientRecords = await db.select().from(clients).where(eq(clients.email, user.email));

      if (clientRecords.length === 0) {
        return res.status(404).json({ error: 'Client profile not found' });
      }

      const client = clientRecords[0];
      const weekOffset = parseInt(req.query.weekOffset as string) || 0;

      // Calculate week start and end dates (week starts on Monday)
      const currentDate = new Date();
      const targetWeek = addWeeks(currentDate, weekOffset);
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

      // Format dates as YYYY-MM-DD
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

      // Fetch workouts for this week
      const workouts = await storage.getClientWorkoutsByWeek(client.id, weekStartStr, weekEndStr);

      console.log(`[Client Weekly Workouts]`);
      console.log(`  User Email: ${user.email}`);
      console.log(`  Client ID: ${client.id}`);
      console.log(`  Week Offset: ${weekOffset}`);
      console.log(`  Week Start: ${weekStartStr}`);
      console.log(`  Week End: ${weekEndStr}`);
      console.log(`  Workouts Found: ${workouts.length}`);

      res.json({
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        weekNumber: getISOWeek(weekStart),
        year: getISOWeekYear(weekStart),
        workouts,
      });
    } catch (error) {
      console.error('Error fetching client weekly workouts:', error);
      res.status(500).json({ error: 'Failed to fetch weekly workouts' });
    }
  });

  // GET /api/clients/:clientId/workouts/weekly - Get client's workouts for a specific week (for trainers)
  app.get(
    '/api/clients/:clientId/workouts/weekly',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const weekOffset = parseInt(req.query.weekOffset as string) || 0;

        // Calculate week start and end dates (week starts on Monday)
        const currentDate = new Date();
        const targetWeek = addWeeks(currentDate, weekOffset);
        const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

        // Format dates as YYYY-MM-DD
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

        // Fetch workouts for this week
        const workouts = await storage.getClientWorkoutsByWeek(clientId, weekStartStr, weekEndStr);

        console.log(`[Weekly Workouts Debug]`);
        console.log(`  Client ID: ${clientId}`);
        console.log(`  Week Offset: ${weekOffset}`);
        console.log(`  Week Start: ${weekStartStr}`);
        console.log(`  Week End: ${weekEndStr}`);
        console.log(`  Workouts Found: ${workouts.length}`);

        res.json({
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          weekNumber: getISOWeek(weekStart),
          year: getISOWeekYear(weekStart),
          workouts,
        });
      } catch (error) {
        console.error('Error fetching weekly workouts:', error);
        res.status(500).json({ error: 'Failed to fetch weekly workouts' });
      }
    }
  );

  // GET /api/workout-assignments/trainer - Get all scheduled workout assignments for trainer's clients (secured)
  app.get(
    '/api/workout-assignments/trainer',
    secureAuth,
    apiRateLimit,
    async (req: Request, res: Response) => {
      try {
        // SECURITY: Derive trainerId from session, not URL params
        const trainerId = (req.user as any).id as string;
        const workoutAssignments = await storage.getTrainerWorkoutAssignments(trainerId);
        res.json(workoutAssignments);
      } catch (error) {
        console.error('Error fetching trainer workout assignments:', error);
        res.status(500).json({ error: 'Failed to fetch workout assignments' });
      }
    }
  );

  // POST /api/workout-assignments - Assign workout to client
  // Supports enhanced scheduling: date, time, timezone, status, customization
  app.post(
    '/api/workout-assignments',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const validatedData = insertWorkoutAssignmentSchema.parse(req.body);

        // Validate scheduledTime format if provided (HH:MM)
        if (validatedData.scheduledTime) {
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(validatedData.scheduledTime)) {
            return res.status(400).json({
              error: "Invalid scheduledTime format. Expected HH:MM (e.g., '14:30')",
            });
          }
        }

        // Auto-calculate week fields if scheduledDate is provided
        const assignmentData = { ...validatedData };
        if (validatedData.scheduledDate) {
          const scheduledDate = new Date(validatedData.scheduledDate);
          assignmentData.dayOfWeek = scheduledDate.getDay(); // 0 = Sunday, 6 = Saturday
          assignmentData.weekNumber = getISOWeek(scheduledDate);
          assignmentData.weekYear = getISOWeekYear(scheduledDate);
        }

        // Set defaults for new fields if not provided
        assignmentData.timezone = assignmentData.timezone || 'UTC';
        assignmentData.status = assignmentData.status || 'scheduled';
        assignmentData.isCustomized = assignmentData.isCustomized ?? false;

        const assignment = await storage.assignWorkoutToClient(assignmentData);

        // Automatic milestone tracking: Mark first workout assigned
        try {
          // Get the client to find the trainer ID
          const client = await storage.getClient(validatedData.clientId);
          if (client) {
            await storage.updateUserOnboardingProgress(client.trainerId, {
              assignedFirstWorkout: true,
            });

            // Send notification to client (if they have a user account)
            try {
              const { notifyWorkoutAssigned } = await import('./services/notificationService');
              const workout = await storage.getWorkout(validatedData.workoutId);
              const user = (req as any).user;
              const trainerName = user?.firstName
                ? `${user.firstName} ${user.lastName || ''}`.trim()
                : 'Your trainer';
              if (client.email) {
                // Find client's user account by email to send notification
                const database = await getDb();
                const { users: usersTable } = await import('@shared/schema');
                const clientUser = await database
                  .select()
                  .from(usersTable)
                  .where(eq(usersTable.email, client.email))
                  .limit(1);
                if (clientUser.length > 0) {
                  await notifyWorkoutAssigned(
                    clientUser[0].id,
                    trainerName,
                    workout?.title || 'New Workout',
                    assignment.id
                  );
                }
              }
            } catch (notifError) {
              // Non-critical: don't fail assignment if notification fails
            }
          }
        } catch (onboardingError) {
          // Don't fail assignment if onboarding update fails
          console.warn('Failed to update onboarding progress:', onboardingError);
        }

        res.status(201).json(assignment);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ error: 'Invalid assignment data', details: error.errors });
        }
        // Error logged internally
        res.status(500).json({ error: 'Failed to assign workout' });
      }
    }
  );

  // GET /api/workout-assignments/:id - Get workout assignment details with exercises
  app.get('/api/workout-assignments/:id', secureAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const db = await getDb();

      // Fetch assignment with workout details
      const assignmentResults = await db
        .select({
          id: workoutAssignments.id,
          workoutId: workoutAssignments.workoutId,
          clientId: workoutAssignments.clientId,
          assignedAt: workoutAssignments.assignedAt,
          completedAt: workoutAssignments.completedAt,
          notes: workoutAssignments.notes,
          // Scheduling fields
          scheduledDate: workoutAssignments.scheduledDate,
          scheduledTime: workoutAssignments.scheduledTime,
          timezone: workoutAssignments.timezone,
          dayOfWeek: workoutAssignments.dayOfWeek,
          weekNumber: workoutAssignments.weekNumber,
          weekYear: workoutAssignments.weekYear,
          durationMinutes: workoutAssignments.durationMinutes,
          // Customization fields
          isCustomized: workoutAssignments.isCustomized,
          customTitle: workoutAssignments.customTitle,
          customNotes: workoutAssignments.customNotes,
          // Status tracking
          status: workoutAssignments.status,
          cancelledAt: workoutAssignments.cancelledAt,
          cancellationReason: workoutAssignments.cancellationReason,
          notificationsSent: workoutAssignments.notificationsSent,
          workout: {
            id: workouts.id,
            title: workouts.title,
            description: workouts.description,
            duration: workouts.duration,
            difficulty: workouts.difficulty,
            category: workouts.category,
          },
        })
        .from(workoutAssignments)
        .leftJoin(workouts, eq(workoutAssignments.workoutId, workouts.id))
        .where(eq(workoutAssignments.id, id))
        .limit(1);

      if (assignmentResults.length === 0) {
        return res.status(404).json({ error: 'Workout assignment not found' });
      }

      const assignment = assignmentResults[0];

      // Fetch exercises for this workout
      const exerciseResults = await db
        .select()
        .from(workoutExercises)
        .leftJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
        .where(eq(workoutExercises.workoutId, assignment.workoutId))
        .orderBy(workoutExercises.sortOrder);

      // Return combined data
      res.json({
        ...assignment,
        title: assignment.workout?.title || '',
        description: assignment.workout?.description || '',
        duration: assignment.workout?.duration || 0,
        difficulty: assignment.workout?.difficulty || 'beginner',
        category: assignment.workout?.category || '',
        exercises: exerciseResults.map((ex: any) => ({
          id: ex.workout_exercises.id,
          exerciseId: ex.workout_exercises.exerciseId,
          name: ex.exercises?.name || 'Exercise',
          muscleGroup: ex.exercises?.muscleGroup || 'General',
          equipment: ex.exercises?.equipment,
          instructions: ex.exercises?.instructions,
          sets: ex.workout_exercises.sets,
          reps: ex.workout_exercises.reps,
          weight: ex.workout_exercises.weight,
          restTime: ex.workout_exercises.restTime,
          sortOrder: ex.workout_exercises.sortOrder,
        })),
      });
    } catch (error) {
      console.error('Error fetching workout assignment:', error);
      res.status(500).json({ error: 'Failed to fetch workout assignment' });
    }
  });

  // PATCH /api/workout-assignments/:id - Update workout assignment (status, completion, cancellation)
  app.patch(
    '/api/workout-assignments/:id',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updates = req.body;
        const db = await getDb();

        // Validate allowed updates
        const allowedFields = [
          'status',
          'completedAt',
          'cancelledAt',
          'cancellationReason',
          'customTitle',
          'customNotes',
          'notes',
          'scheduledTime',
          'timezone',
          'scheduledDate',
          'durationMinutes',
        ];

        const updateData: any = {};
        for (const field of allowedFields) {
          if (field in updates) {
            updateData[field] = updates[field];
          }
        }

        // Auto-set timestamps based on status changes
        if (updates.status === 'completed' && !updateData.completedAt) {
          updateData.completedAt = new Date();
        }
        if (updates.status === 'cancelled' && !updateData.cancelledAt) {
          updateData.cancelledAt = new Date();
        }

        // Recalculate week fields if scheduledDate changed
        if (updates.scheduledDate) {
          const scheduledDate = new Date(updates.scheduledDate);
          updateData.dayOfWeek = scheduledDate.getDay();
          updateData.weekNumber = getISOWeek(scheduledDate);
          updateData.weekYear = getISOWeekYear(scheduledDate);
        }

        // Update the assignment
        const result = await db
          .update(workoutAssignments)
          .set(updateData)
          .where(eq(workoutAssignments.id, id))
          .returning();

        if (result.length === 0) {
          return res.status(404).json({ error: 'Workout assignment not found' });
        }

        res.json(result[0]);
      } catch (error) {
        console.error('Error updating workout assignment:', error);
        res.status(500).json({ error: 'Failed to update workout assignment' });
      }
    }
  );

  // PUT /api/workout-assignments/:id/complete - Mark workout assignment as completed
  app.put(
    '/api/workout-assignments/:id/complete',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { notes, durationMinutes, volumeKg, totalReps, totalSets, hadPersonalRecord } =
          req.body;

        // First get the assignment to verify ownership
        const assignments = await storage.getClientWorkouts(''); // We'll verify ownership differently
        const assignment = assignments.find((a) => a.id === id);
        if (!assignment) {
          return res.status(404).json({ error: 'Assignment not found' });
        }

        // Verify the client belongs to authenticated trainer
        const client = await storage.getClient(assignment.clientId);
        if (!client || client.trainerId !== (req.user as any).id) {
          return res.status(403).json({ error: 'Access denied to this assignment' });
        }

        const completedAssignment = await storage.completeWorkoutAssignment(id, notes);

        // Award XP and update gamification for the user completing the workout
        const userId = (req.user as any).id;
        let gamificationResult = null;
        try {
          const { awardWorkoutCompletionXp, updateStreak, updateWorkoutStats } =
            await import('./services/gamification/xpService');

          const xpResult = await awardWorkoutCompletionXp(
            userId,
            durationMinutes || 30,
            hadPersonalRecord || false
          );
          const streakResult = await updateStreak(userId);
          await updateWorkoutStats(
            userId,
            volumeKg || 0,
            totalReps || 0,
            totalSets || 0,
            durationMinutes || 30
          );

          gamificationResult = {
            xpAwarded: xpResult.xpAwarded,
            newLevel: xpResult.newLevel,
            leveledUp: xpResult.leveledUp,
            streak: streakResult,
          };

          // Send level-up notification if applicable
          if (xpResult.leveledUp) {
            const { notifyLevelUp } = await import('./services/notificationService');
            const { getGenZRank } = await import('./services/gamification/xpService');
            await notifyLevelUp(userId, xpResult.newLevel, getGenZRank(xpResult.newLevel));
          }

          // Send streak milestone notification if applicable
          if (streakResult.milestone) {
            const { notifyStreakMilestone } = await import('./services/notificationService');
            await notifyStreakMilestone(
              userId,
              streakResult.milestone,
              streakResult.streakXpAwarded
            );
          }
        } catch (gamificationError) {
          console.warn('Gamification update failed (non-critical):', gamificationError);
        }

        // Notify trainer that client completed workout
        try {
          const { notifyWorkoutCompleted } = await import('./services/notificationService');
          const workout = await storage.getWorkout(assignment.workoutId);
          await notifyWorkoutCompleted(
            client!.trainerId,
            client!.name,
            workout?.title || 'Workout',
            id
          );
        } catch (notifError) {
          // Non-critical
        }

        res.json({ ...completedAssignment, gamification: gamificationResult });
      } catch (error) {
        // Error logged internally
        res.status(500).json({ error: 'Failed to complete workout assignment' });
      }
    }
  );

  // GET /api/clients/:clientId/compliance - Get client workout compliance rates
  app.get(
    '/api/clients/:clientId/compliance',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const clientWorkouts = await storage.getClientWorkouts(clientId);

        const calcRate = (days: number) => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          const assigned = clientWorkouts.filter((w) => new Date(w.assignedAt) >= cutoff);
          if (assigned.length === 0) return { rate: 0, completed: 0, total: 0 };
          const completed = assigned.filter(
            (w) => w.completedAt != null || w.status === 'completed'
          );
          return {
            rate: Math.round((completed.length / assigned.length) * 100),
            completed: completed.length,
            total: assigned.length,
          };
        };

        res.json({
          rate7d: calcRate(7),
          rate30d: calcRate(30),
          rate90d: calcRate(90),
          allTime: calcRate(365 * 10),
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to calculate compliance rates' });
      }
    }
  );

  // Progress Tracking Routes

  // GET /api/clients/:clientId/progress - Get client progress entries
  app.get(
    '/api/clients/:clientId/progress',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const progress = await storage.getClientProgress(clientId);
        res.json(progress);
      } catch (error) {
        // Error logged internally
        res.status(500).json({ error: 'Failed to fetch progress' });
      }
    }
  );

  // GET /api/progress/:clientId - Get client progress entries
  app.get(
    '/api/progress/:clientId',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const progress = await storage.getClientProgress(clientId);
        res.json(progress);
      } catch (error) {
        // Return mock data when database is unavailable
        console.warn('Database unavailable, returning mock progress data:', error);
        const mockProgress = getMockProgress(req.params.clientId);
        res.json(mockProgress);
      }
    }
  );

  // POST /api/progress-entries - Add progress entry
  app.post(
    '/api/progress-entries',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const validatedData = insertProgressEntrySchema.parse(req.body);

        // Verify client belongs to authenticated trainer
        const client = await storage.getClient(validatedData.clientId);
        if (!client || client.trainerId !== (req.user as any).id) {
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
    }
  );

  // Training Sessions Routes

  // GET /api/clients/:clientId/sessions - Get client's training sessions
  app.get(
    '/api/clients/:clientId/sessions',
    secureAuth,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const sessions = await storage.getClientSessions(clientId);
        res.json(sessions);
      } catch (error) {
        console.error('Failed to fetch client sessions:', error);
        res.status(500).json({ error: 'Failed to fetch training sessions' });
      }
    }
  );

  // POST /api/training-sessions - Create new training session
  app.post(
    '/api/training-sessions',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const trainerId = (req.user as any).id as string;
        const validatedData = insertTrainingSessionSchema.parse({ ...req.body, trainerId });

        // Verify client belongs to authenticated trainer
        const client = await storage.getClient(validatedData.clientId);
        if (!client || client.trainerId !== trainerId) {
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
    }
  );

  // Settings Routes

  // GET /api/settings - Get application settings (secured)
  app.get('/api/settings', secureAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      // In a real app, you might fetch settings from database
      // For now, we'll always return mock settings
      const settings = getMockSettings();
      res.json(settings);
    } catch (error) {
      // Return mock data even on error
      console.warn('Returning mock settings:', error);
      const settings = getMockSettings();
      res.json(settings);
    }
  });

  // Analytics Routes

  // GET /api/analytics - Get analytics data (secured, trainerId from session only)
  app.get('/api/analytics', secureAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      // SECURITY: Always derive trainerId from session — never from query params
      const trainerId = (req.user as any).id as string;
      const analytics = await storage.getTrainerAnalytics(trainerId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      const trainerId = (req.user as any).id as string;
      const analytics = getMockAnalytics(trainerId);
      res.json(analytics);
    }
  });

  // REMOVED: /api/analytics/:trainerId — was IDOR-vulnerable (no ownership check).
  // Use GET /api/analytics instead. TrainerId derived from session.

  // Appointment Routes

  // GET /api/appointments - Get all appointments for authenticated trainer (secured)
  app.get('/api/appointments', secureAuth, apiRateLimit, async (req: Request, res: Response) => {
    try {
      const trainerId = (req.user as any).id as string;
      const appointments = await storage.getAppointmentsByTrainer(trainerId);
      res.json(appointments);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  });

  // GET /api/appointments/client/:clientId - Get all appointments for a client (secured + ownership)
  app.get(
    '/api/appointments/client/:clientId',
    secureAuth,
    requireClientOwnership,
    apiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const appointments = await storage.getAppointmentsByClient(clientId);
        res.json(appointments);
      } catch (error) {
        console.error('Failed to fetch client appointments:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
      }
    }
  );

  // POST /api/appointments - Create a new appointment
  app.post(
    '/api/appointments',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const trainerId = (req.user as any).id as string;

        // Extract workout assignment fields if present
        const {
          workoutId,
          workoutDuration,
          workoutCustomTitle,
          workoutCustomNotes,
          ...appointmentFields
        } = req.body;

        const validatedData = insertAppointmentSchema.parse({ ...appointmentFields, trainerId });
        const appointment = await storage.createAppointment(validatedData);

        // If workout details are provided, also create a workout assignment
        if (workoutId && workoutId.trim() !== '') {
          console.log(
            '💪 [Appointments API] Creating workout assignment for appointment:',
            appointment.id
          );

          const workoutAssignmentData = {
            workoutId,
            clientId: validatedData.clientId,
            scheduledDate: validatedData.date,
            scheduledTime: validatedData.startTime,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            durationMinutes: workoutDuration,
            customTitle: workoutCustomTitle || undefined,
            customNotes: workoutCustomNotes || undefined,
          };

          try {
            const workoutAssignment = await storage.assignWorkoutToClient(workoutAssignmentData);
            console.log('✅ [Appointments API] Workout assignment created:', workoutAssignment.id);
          } catch (workoutError) {
            console.error(
              '❌ [Appointments API] Failed to create workout assignment:',
              workoutError
            );
            // Don't fail the whole request if workout assignment fails
            // The appointment is still created successfully
          }
        }

        res.status(201).json(appointment);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ error: 'Invalid appointment data', details: error.errors });
        }
        console.error('Failed to create appointment:', error);
        res.status(500).json({ error: 'Failed to create appointment' });
      }
    }
  );

  // PUT /api/appointments/:id - Update an appointment
  app.put(
    '/api/appointments/:id',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const validatedUpdates = insertAppointmentSchema.partial().parse(req.body);
        const appointment = await storage.updateAppointment(id, validatedUpdates);

        if (!appointment) {
          return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json(appointment);
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({ error: 'Invalid appointment data', details: error.errors });
        }
        console.error('Failed to update appointment:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
      }
    }
  );

  // DELETE /api/appointments/:id - Delete an appointment
  app.delete(
    '/api/appointments/:id',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const success = await storage.deleteAppointment(id);

        if (!success) {
          return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Failed to delete appointment:', error);
        res.status(500).json({ error: 'Failed to delete appointment' });
      }
    }
  );

  const httpServer = createServer(app);

  // Secure WebSocket Server for Real-time Messaging
  // Get session store from the session middleware configuration
  const sessionMiddleware = getSession();
  const sessionStore = (sessionMiddleware as any).store;

  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    verifyClient: async (info: { req: IncomingMessage; secure: boolean; origin: string }) => {
      try {
        // Parse cookies from WebSocket handshake
        const cookies = parseCookie(info.req.headers.cookie || '');
        const sessionId = cookies['connect.sid']?.replace('s:', '').split('.')[0];

        if (!sessionId) {
          // WebSocket connection rejected: No session cookie
          return false;
        }

        // Authenticate session during handshake
        const userId = await authenticateWebSocketSession(sessionId, sessionStore);
        if (!userId) {
          // WebSocket connection rejected: Invalid session
          return false;
        }

        // Store authenticated user ID for later use
        (info.req as any).authenticatedUserId = userId;
        // WebSocket connection authenticated
        return true;
      } catch (error) {
        // WebSocket authentication error
        return false;
      }
    },
  });

  // Store authenticated WebSocket connections by room
  const authenticatedConnections = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const authenticatedUserId = (req as any).authenticatedUserId;
    // Secure WebSocket connection established

    // Store authenticated user info on WebSocket
    (ws as any).authenticatedUserId = authenticatedUserId;
    let currentRoom: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Received WebSocket message

        // Rate limit WebSocket messages per user
        if (!rateLimitWebSocket(authenticatedUserId)) {
          ws.send(
            JSON.stringify({
              type: 'error',
              data: { message: 'Rate limit exceeded. Please slow down.' },
            })
          );
          return;
        }

        // Handle different message types
        switch (message.type) {
          case 'join_room':
            try {
              const { clientId } = message.data;

              if (!clientId) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    data: { message: 'clientId is required' },
                  })
                );
                return;
              }

              // Verify client belongs to authenticated trainer (server-side verification)
              const client = await storage.getClient(clientId);
              if (!client || client.trainerId !== authenticatedUserId) {
                ws.send(
                  JSON.stringify({
                    type: 'error',
                    data: { message: 'Unauthorized access to client' },
                  })
                );
                return;
              }

              // Authentication successful - join room using server-verified trainer ID
              const roomId = `${authenticatedUserId}:${clientId}`;

              // Remove from previous room if any
              if (currentRoom && authenticatedConnections.has(currentRoom)) {
                authenticatedConnections.get(currentRoom)!.delete(ws);
                if (authenticatedConnections.get(currentRoom)!.size === 0) {
                  authenticatedConnections.delete(currentRoom);
                }
              }

              // Add to new room
              if (!authenticatedConnections.has(roomId)) {
                authenticatedConnections.set(roomId, new Set());
              }
              authenticatedConnections.get(roomId)!.add(ws);

              // Store connection details (using server-verified trainer ID)
              (ws as any).clientId = clientId;
              (ws as any).trainerId = authenticatedUserId;
              (ws as any).roomId = roomId;
              currentRoom = roomId;

              // WebSocket client joined secure room
              ws.send(
                JSON.stringify({
                  type: 'room_joined',
                  data: { roomId, clientId, trainerId: authenticatedUserId },
                })
              );
            } catch (error) {
              // Error during secure room join
              ws.send(
                JSON.stringify({
                  type: 'error',
                  data: { message: 'Failed to join room' },
                })
              );
            }
            break;

          case 'typing': {
            // Only allow typing messages from connections that have joined a room
            if (!currentRoom) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  data: { message: 'Must join room before sending typing indicator' },
                })
              );
              return;
            }

            // Broadcast typing indicator only to clients in the same room
            const roomClients = authenticatedConnections.get(currentRoom);
            if (roomClients) {
              roomClients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      type: 'typing',
                      data: message.data,
                    })
                  );
                }
              });
            }
            break;
          }

          default:
            if (!currentRoom) {
              ws.send(
                JSON.stringify({
                  type: 'error',
                  data: { message: 'Must join room first' },
                })
              );
            }
            break;
        }
      } catch (error) {
        // WebSocket message parsing error
        ws.send(
          JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' },
          })
        );
      }
    });

    ws.on('close', () => {
      // WebSocket connection closed

      // Clean up room membership
      if (currentRoom && authenticatedConnections.has(currentRoom)) {
        authenticatedConnections.get(currentRoom)!.delete(ws);
        if (authenticatedConnections.get(currentRoom)!.size === 0) {
          authenticatedConnections.delete(currentRoom);
        }
      }
    });

    ws.on('error', (error) => {
      // WebSocket error
    });
  });

  return httpServer;
}

import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { storage } from './storage';
import { getDb } from './db';
import { getUserById } from './auth';
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
import { eq, and, lt, isNull, or, desc, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { startOfWeek, endOfWeek, addWeeks, format, getISOWeek, getISOWeekYear } from 'date-fns';
import {
  secureAuth,
  requireClientOwnership,
  requireTrainerOwnership,
  rateLimitWebSocket,
  requireSubscription,
} from './middleware/auth';
import {
  apiRateLimit,
  generalRateLimit,
  strictRateLimit,
  authRateLimit,
  loginRateLimit,
  exportRateLimit,
  aiRateLimit,
  writeRateLimit,
} from './middleware/rateLimiter';
import { getMessageDeliveryStatuses } from './middleware/deliveredTracking';
import {
  getMockClients,
  getMockProgress,
  getMockAnalytics,
  getMockDashboardStats,
} from './mockData';

// New feature route imports
import authRoutes from './routes/auth';
import {
  createAccessCodeForClient,
  getActiveAccessCode,
  regenerateAccessCode,
  revokeAccessCode,
} from './services/accessCode';
import gamificationRoutes from './routes/gamification';
import calculatorRoutes from './routes/calculators';
import calculatorResultsRoutes from './routes/calculatorResults';
import strengthRoutes from './routes/strength';
import recoveryRoutes from './routes/recovery';
import aiRoutes from './routes/ai';
// import shoppingRoutes from './routes/shopping'; // Disabled - tables archived (groceryStores, shoppingLists, shoppingListItems)
import leaderboardRoutes from './routes/leaderboards';
import notificationRoutes from './routes/notifications';
import intakeRoutes from './routes/intake';
import paymentRoutes from './routes/payments';
import soloRoutes from './routes/solo';
import settingsRoutes from './routes/settings';
import uploadsRoutes from './routes/uploads';

export async function registerRoutes(app: Express): Promise<Server> {
  // Session-based authentication is set up in server/index.ts

  // ─── Health check — public, NO rate limiting, NO auth ─────────────────────
  // Railway and uptime monitors poll this to verify the service is alive.
  // Returns 200 when the DB is reachable, 503 otherwise.
  app.get('/api/health', async (_req: Request, res: Response) => {
    const start = Date.now();
    try {
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      const dbHost = (() => {
        try {
          return new URL(process.env.DATABASE_URL || '').hostname;
        } catch {
          return 'unknown';
        }
      })();
      res.json({
        status: 'ok',
        db: 'connected',
        dbHost,
        env: process.env.NODE_ENV,
        uptimeSeconds: Math.floor(process.uptime()),
        responseMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        db: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown DB error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Temporary migration endpoint to add missing workout_sessions columns
  // TODO: Remove after migration is confirmed
  app.post('/api/migrate-workout-sessions', async (_req: Request, res: Response) => {
    try {
      const { getPool } = await import('./db');
      const pool = await getPool();
      const alterStatements = [
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS workout_name varchar',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS workout_type varchar',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS planned_duration_minutes integer',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS actual_duration_minutes integer',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS total_sets integer',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS total_reps integer',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS total_volume_kg varchar',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS perceived_exertion integer',
        'ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS notes text',
      ];
      const results: string[] = [];
      for (const stmt of alterStatements) {
        await pool.query(stmt);
        results.push(stmt.split('IF NOT EXISTS ')[1] || stmt);
      }
      res.json({ status: 'ok', migrated: results });
    } catch (error) {
      res.status(500).json({
        error: 'Migration failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Apply general rate limiting to all API routes
  app.use('/api', generalRateLimit);

  // Authentication routes — GET (session checks) use the general authRateLimit (100/15min),
  // POST (login/register) gets the stricter loginRateLimit (10/15min) to prevent brute force.
  // Previously all auth routes shared a 5/15min limit which locked users out after ~5 page views.
  app.use('/api/auth', authRateLimit);
  app.post('/api/auth/login', loginRateLimit);
  app.post('/api/auth/register', loginRateLimit);
  app.post('/api/auth/forgot-password', loginRateLimit);
  app.post('/api/auth/reset-password', loginRateLimit);
  app.post('/api/auth/disciple-login', loginRateLimit);
  app.use('/api/auth', authRoutes);

  // Register new feature routes with tiered rate limiting
  app.use('/api/gamification', secureAuth, apiRateLimit, gamificationRoutes);
  app.use('/api/calculators', calculatorRoutes); // Calculators are public — covered by generalRateLimit (60/min)
  app.use('/api', secureAuth, apiRateLimit, calculatorResultsRoutes); // Premium calculator results — authenticated only
  app.use('/api/strength', secureAuth, apiRateLimit, strengthRoutes);
  app.use('/api/recovery', secureAuth, apiRateLimit, recoveryRoutes);
  app.use('/api/ai', secureAuth, aiRateLimit, aiRoutes); // AI: tier-aware usage limits enforced inside aiRoutes
  // app.use('/api/shopping', secureAuth, apiRateLimit, shoppingRoutes); // Disabled - tables archived
  app.use('/api/leaderboards', secureAuth, apiRateLimit, leaderboardRoutes);
  app.use('/api/notifications', secureAuth, apiRateLimit, notificationRoutes);
  app.use('/api/intake', secureAuth, apiRateLimit, intakeRoutes);
  app.use('/api/payments', secureAuth, strictRateLimit, paymentRoutes); // Payments: strict (10/min)
  app.use('/api/solo', secureAuth, apiRateLimit, soloRoutes); // Solo user workout tracking
  app.use('/api/settings', secureAuth, apiRateLimit, settingsRoutes); // Account settings
  app.use('/api/uploads', secureAuth, writeRateLimit, uploadsRoutes); // File uploads (R2)

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

  // Note: GET /api/auth/user is now handled inside authRoutes (server/routes/auth.ts)
  // so it runs before the global secureAuth middleware at /api.

  // Solo User Onboarding - Save fitness profile
  app.post(
    '/api/users/onboarding',
    secureAuth,
    writeRateLimit,
    async (req: Request, res: Response) => {
      try {
        const userId = (req.user as any).id as string;
        const {
          primaryGoal,
          experienceLevel,
          workoutEnvironment,
          availableEquipment,
          workoutFrequencyPerWeek,
          // New physical & health fields (all optional for backwards compatibility)
          gender,
          age,
          weightKg,
          heightCm,
          bodyFatPercentage,
          injuries,
          dietaryRestrictions,
        } = req.body;

        if (
          !primaryGoal ||
          !experienceLevel ||
          !workoutEnvironment ||
          !availableEquipment ||
          !workoutFrequencyPerWeek
        ) {
          return res.status(400).json({ error: 'All onboarding fields are required' });
        }

        const database = await getDb();

        // Compute dateOfBirth from age (Jan 1st of birth year — approximation)
        const dateOfBirth =
          age && Number.isFinite(age)
            ? new Date(new Date().getFullYear() - Math.round(age), 0, 1)
            : undefined;

        // Convert injuries array (strings) to schema format
        const injuriesFormatted =
          Array.isArray(injuries) && !injuries.includes('none')
            ? injuries.map((bodyPart: string) => ({ bodyPart, severity: 'unknown', notes: '' }))
            : [];

        // Dietary restrictions: filter out 'none' sentinel
        const dietaryPreferences =
          Array.isArray(dietaryRestrictions) && !dietaryRestrictions.includes('none')
            ? dietaryRestrictions
            : [];

        // Build the profile update payload — only include defined optional fields
        const profileFields: Record<string, unknown> = {
          primaryGoal,
          experienceLevel,
          workoutEnvironment,
          availableEquipment,
          workoutFrequencyPerWeek,
          updatedAt: new Date(),
        };
        if (gender) profileFields.gender = gender;
        if (dateOfBirth) profileFields.dateOfBirth = dateOfBirth;
        if (weightKg != null) profileFields.weightKg = String(weightKg);
        if (heightCm != null) profileFields.heightCm = String(heightCm);
        if (bodyFatPercentage != null) profileFields.bodyFatPercentage = String(bodyFatPercentage);
        if (injuries !== undefined) profileFields.injuries = injuriesFormatted;
        if (dietaryRestrictions !== undefined)
          profileFields.dietaryPreferences = dietaryPreferences;

        // Upsert fitness profile
        const existing = await database
          .select()
          .from(userFitnessProfile)
          .where(eq(userFitnessProfile.userId, userId))
          .limit(1);

        if (existing.length > 0) {
          await database
            .update(userFitnessProfile)
            .set(profileFields as any)
            .where(eq(userFitnessProfile.userId, userId));
        } else {
          await database.insert(userFitnessProfile).values({
            userId,
            ...(profileFields as any),
          });
        }

        // Mark onboarding as completed on user record
        await database.update(users).set({ onboardingCompleted: true }).where(eq(users.id, userId));

        res.json({ success: true });
      } catch (error) {
        console.error('Error saving onboarding data:', error);
        res.status(500).json({ error: 'Failed to save onboarding data' });
      }
    }
  );

  // GET /api/users/fitness-profile - Fetch current user's fitness profile
  app.get(
    '/api/users/fitness-profile',
    secureAuth,
    apiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const userId = (req.user as any).id as string;
        const database = await getDb();
        const [profile] = await database
          .select()
          .from(userFitnessProfile)
          .where(eq(userFitnessProfile.userId, userId))
          .limit(1);
        res.json(profile ?? {});
      } catch (error) {
        console.error('Error fetching fitness profile:', error);
        res.status(500).json({ error: 'Failed to fetch fitness profile' });
      }
    }
  );

  // PATCH /api/users/fitness-profile - Update physical stats (weight, height, body fat)
  app.patch(
    '/api/users/fitness-profile',
    secureAuth,
    writeRateLimit,
    async (req: Request, res: Response) => {
      try {
        const userId = (req.user as any).id as string;
        const { weightKg, heightCm, bodyFatPercentage } = req.body;
        const database = await getDb();

        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (weightKg != null && Number.isFinite(Number(weightKg)))
          updates.weightKg = String(weightKg);
        if (heightCm != null && Number.isFinite(Number(heightCm)))
          updates.heightCm = String(heightCm);
        if (bodyFatPercentage != null && Number.isFinite(Number(bodyFatPercentage)))
          updates.bodyFatPercentage = String(bodyFatPercentage);
        else if (bodyFatPercentage === null) updates.bodyFatPercentage = null;

        const existing = await database
          .select()
          .from(userFitnessProfile)
          .where(eq(userFitnessProfile.userId, userId))
          .limit(1);

        if (existing.length > 0) {
          await database
            .update(userFitnessProfile)
            .set(updates as any)
            .where(eq(userFitnessProfile.userId, userId));
        } else {
          await database.insert(userFitnessProfile).values({ userId, ...(updates as any) });
        }

        const [updated] = await database
          .select()
          .from(userFitnessProfile)
          .where(eq(userFitnessProfile.userId, userId))
          .limit(1);
        res.json(updated ?? {});
      } catch (error) {
        console.error('Error updating fitness profile:', error);
        res.status(500).json({ error: 'Failed to update fitness profile' });
      }
    }
  );

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

  // GET /api/dashboard/needs-attention - Clients needing attention (secured)
  app.get(
    '/api/dashboard/needs-attention',
    secureAuth,
    apiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const trainerId = (req.user as any).id as string;
        const database = await getDb();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Get all active clients for this trainer
        const allClients = await database
          .select()
          .from(clients)
          .where(and(eq(clients.trainerId, trainerId), eq(clients.status, 'active')));

        const alerts: Array<{
          clientId: string;
          clientName: string;
          reason: string;
          severity: 'warning' | 'urgent';
          lastSession: string | null;
        }> = [];

        for (const client of allClients) {
          // Check for inactivity (no session in 7+ days)
          if (!client.lastSession || client.lastSession < sevenDaysAgo) {
            const isUrgent = !client.lastSession || client.lastSession < fourteenDaysAgo;
            alerts.push({
              clientId: client.id,
              clientName: client.name,
              reason: !client.lastSession
                ? 'Never logged a session'
                : `No session in ${Math.floor((now.getTime() - client.lastSession.getTime()) / (24 * 60 * 60 * 1000))} days`,
              severity: isUrgent ? 'urgent' : 'warning',
              lastSession: client.lastSession?.toISOString() || null,
            });
            continue; // Only one alert per client
          }

          // Check for no upcoming session scheduled
          if (!client.nextSession || client.nextSession < now) {
            alerts.push({
              clientId: client.id,
              clientName: client.name,
              reason: 'No upcoming session scheduled',
              severity: 'warning',
              lastSession: client.lastSession?.toISOString() || null,
            });
          }
        }

        // Sort: urgent first, then warning
        alerts.sort((a, b) => {
          if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
          if (a.severity !== 'urgent' && b.severity === 'urgent') return 1;
          return 0;
        });

        res.json({ alerts: alerts.slice(0, 5) }); // Top 5 alerts
      } catch (error) {
        console.warn('Error fetching needs-attention:', error);
        res.json({ alerts: [] });
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
        const trainerId = (req.user as any).id as string;
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
  app.post(
    '/api/clients',
    secureAuth,
    requireSubscription('trainer'),
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const trainerId = (req.user as any).id as string;

        // Enforce 10-client limit for trainer tier (pro tier has no limit)
        const user = req.user as any;
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
        import('./services/notificationService').then(({ notifyClientJoined }) => {
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
  app.put(
    '/api/clients/:clientId',
    secureAuth,
    strictRateLimit,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const trainerId = (req.user as any).id as string;
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
  app.delete(
    '/api/clients/:clientId',
    secureAuth,
    strictRateLimit,
    requireClientOwnership,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const trainerId = (req.user as any).id as string;
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
  app.post(
    '/api/clients/:clientId/access-code',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const trainerId = (req.user as any).id as string;
        const accessCode = await createAccessCodeForClient(clientId, trainerId);
        res.json({ accessCode });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate access code' });
      }
    }
  );

  // GET /api/clients/:clientId/access-code - Get current access code
  app.get('/api/clients/:clientId/access-code', secureAuth, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = (req.user as any).id as string;
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
  app.post(
    '/api/clients/:clientId/access-code/regenerate',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const trainerId = (req.user as any).id as string;
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
  app.delete(
    '/api/clients/:clientId/access-code',
    secureAuth,
    strictRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { clientId } = req.params;
        const trainerId = (req.user as any).id as string;
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
  app.post('/api/workouts', secureAuth, strictRateLimit, async (req: Request, res: Response) => {
    try {
      const finalTrainerId = (req.user as any).id as string;

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

  // PATCH /api/workouts/:workoutId/reorder - Reorder exercise within workout
  app.patch(
    '/api/workouts/:workoutId/reorder',
    secureAuth,
    apiRateLimit,
    async (req: Request, res: Response) => {
      try {
        const { workoutId } = req.params;
        const { exerciseId, direction } = req.body;

        if (!exerciseId || !['up', 'down'].includes(direction)) {
          return res.status(400).json({ error: 'exerciseId and direction (up/down) are required' });
        }

        const workout = await storage.getWorkout(workoutId);
        if (!workout || workout.trainerId !== (req.user as any).id) {
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
        const trainerId = (req.user as any).id as string;
        const assignments = await storage.getClientWorkouts(clientId, trainerId);
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
      const workouts = await storage.getClientWorkoutsByWeek(
        client.id,
        weekStartStr,
        weekEndStr,
        client.trainerId
      );

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
        const trainerId = (req.user as any).id as string;
        const workouts = await storage.getClientWorkoutsByWeek(
          clientId,
          weekStartStr,
          weekEndStr,
          trainerId
        );

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

        // SECURITY: Verify client belongs to authenticated trainer
        const trainerId = (req.user as any).id as string;
        const client = await storage.getClient(validatedData.clientId, trainerId);
        if (!client) {
          return res.status(403).json({ error: 'Access denied to this client' });
        }

        const assignment = await storage.assignWorkoutToClient(assignmentData);

        // Automatic milestone tracking: Mark first workout assigned
        try {
          await storage.updateUserOnboardingProgress(trainerId, {
            assignedFirstWorkout: true,
          });

          // Send notification to client (if they have a user account)
          try {
            const { notifyWorkoutAssigned } = await import('./services/notificationService');
            const workout = await storage.getWorkout(validatedData.workoutId, trainerId);
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
          groupId: ex.workout_exercises.groupId,
          groupType: ex.workout_exercises.groupType,
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

        // SECURITY: Verify ownership by checking all assignments across trainer's clients
        const trainerId = (req.user as any).id as string;
        const assignments = await storage.getClientWorkouts(''); // TODO: Need better method to get assignment by ID
        const assignment = assignments.find((a) => a.id === id);
        if (!assignment) {
          return res.status(404).json({ error: 'Assignment not found' });
        }

        // Verify the client belongs to authenticated trainer
        const client = await storage.getClient(assignment.clientId, trainerId);
        if (!client) {
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
        const trainerId = (req.user as any).id as string;
        const clientWorkouts = await storage.getClientWorkouts(clientId, trainerId);

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
        const trainerId = (req.user as any).id as string;
        const progress = await storage.getClientProgress(clientId, trainerId);
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
        const trainerId = (req.user as any).id as string;
        const progress = await storage.getClientProgress(clientId, trainerId);
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

        // SECURITY: Verify client belongs to authenticated trainer
        const trainerId = (req.user as any).id as string;
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
        const trainerId = (req.user as any).id as string;
        const sessions = await storage.getClientSessions(clientId, trainerId);
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
    }
  );

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
      const appointmentList = await storage.getAppointmentsByTrainer(trainerId);

      // Fire session reminders for appointments starting within 1 hour (async, non-blocking)
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const apt of appointmentList) {
        if (apt.date === today && apt.status === 'scheduled' && apt.startTime) {
          const [h, m] = apt.startTime.split(':').map(Number);
          const aptMinutes = h * 60 + m;
          const diff = aptMinutes - currentMinutes;
          if (diff > 0 && diff <= 60) {
            // Session starting within 1 hour — notify trainer
            import('./services/notificationService').then(({ notifySessionReminder }) => {
              notifySessionReminder(trainerId, apt.title, apt.startTime, apt.id).catch(() => {});
            });
          }
        }
      }

      res.json(appointmentList);
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

        // Extract workout assignment fields and recurrence fields if present
        const {
          workoutId,
          workoutDuration,
          workoutCustomTitle,
          workoutCustomNotes,
          recurrencePattern,
          recurrenceEndDate,
          ...appointmentFields
        } = req.body;

        const validatedData = insertAppointmentSchema.parse({ ...appointmentFields, trainerId });

        // Generate dates for recurring appointments
        const appointmentDates: string[] = [validatedData.date];
        const pattern = recurrencePattern || 'none';

        if (pattern !== 'none' && recurrenceEndDate) {
          const startDate = new Date(validatedData.date + 'T00:00:00');
          const endDate = new Date(recurrenceEndDate + 'T00:00:00');
          const intervalDays = pattern === 'weekly' ? 7 : pattern === 'biweekly' ? 14 : 0;

          if (intervalDays > 0) {
            let nextDate = new Date(startDate);
            nextDate.setDate(nextDate.getDate() + intervalDays);
            while (nextDate <= endDate) {
              appointmentDates.push(nextDate.toISOString().split('T')[0]);
              nextDate.setDate(nextDate.getDate() + intervalDays);
            }
          } else if (pattern === 'monthly') {
            let nextDate = new Date(startDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            while (nextDate <= endDate) {
              appointmentDates.push(nextDate.toISOString().split('T')[0]);
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
          }
        }

        // Create first (parent) appointment
        const parentAppointment = await storage.createAppointment({
          ...validatedData,
          recurrencePattern: pattern !== 'none' ? pattern : undefined,
          recurrenceEndDate: recurrenceEndDate || undefined,
        });

        // Create child appointments for recurring series
        for (let i = 1; i < appointmentDates.length; i++) {
          try {
            await storage.createAppointment({
              ...validatedData,
              date: appointmentDates[i],
              recurrencePattern: pattern,
              recurrenceEndDate: recurrenceEndDate || undefined,
              parentAppointmentId: parentAppointment.id,
            });
          } catch {
            // Continue creating remaining appointments if one fails
          }
        }

        // If workout details are provided, create workout assignments for all dates
        if (workoutId && workoutId.trim() !== '') {
          for (const date of appointmentDates) {
            const workoutAssignmentData = {
              workoutId,
              clientId: validatedData.clientId,
              scheduledDate: date,
              scheduledTime: validatedData.startTime,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              durationMinutes: workoutDuration,
              customTitle: workoutCustomTitle || undefined,
              customNotes: workoutCustomNotes || undefined,
            };

            try {
              await storage.assignWorkoutToClient(workoutAssignmentData);
            } catch {
              // Don't fail the whole request if workout assignment fails
            }
          }
        }

        const totalCreated = appointmentDates.length;
        res.status(201).json({
          ...parentAppointment,
          recurringCount: totalCreated > 1 ? totalCreated : undefined,
        });
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
  // TODO: Get session store from server/index.ts for WebSocket authentication
  // For now, WebSocket session authentication is disabled
  const sessionStore = null;

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
        // TODO: Re-enable WebSocket session authentication once session store is accessible
        // For now, accepting connections without authentication (development only)
        const userId = sessionId; // Temporary: use sessionId as userId
        if (!userId) {
          // WebSocket connection rejected: No session
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

              // SECURITY: Verify client belongs to authenticated trainer (server-side verification)
              const client = await storage.getClient(clientId, authenticatedUserId);
              if (!client) {
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

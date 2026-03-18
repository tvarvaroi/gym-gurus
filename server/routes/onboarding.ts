// Onboarding & Fitness Profile Routes
// Handles user onboarding flow and fitness profile management

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import { userFitnessProfile, users, insertUserOnboardingProgressSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { writeRateLimit, apiRateLimit } from '../middleware/rateLimiter';

const router = Router();

// POST /api/users/onboarding - Save fitness profile during onboarding
router.post('/users/onboarding', writeRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      primaryGoal,
      experienceLevel,
      workoutEnvironment,
      availableEquipment,
      workoutFrequencyPerWeek,
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
    if (dietaryRestrictions !== undefined) profileFields.dietaryPreferences = dietaryPreferences;

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
});

// GET /api/users/fitness-profile - Fetch current user's fitness profile
router.get('/users/fitness-profile', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
});

// PATCH /api/users/fitness-profile - Update physical stats (weight, height, body fat)
router.patch('/users/fitness-profile', writeRateLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { weightKg, heightCm, bodyFatPercentage } = req.body;
    const database = await getDb();

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (weightKg != null && Number.isFinite(Number(weightKg))) updates.weightKg = String(weightKg);
    if (heightCm != null && Number.isFinite(Number(heightCm))) updates.heightCm = String(heightCm);
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
});

// GET /api/onboarding/progress - Get user's onboarding progress
router.get('/onboarding/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
router.put('/onboarding/progress', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Prevent userId from being overridden in request body
    const { userId: _, ...updateData } = req.body;

    // Convert ISO string to Date object if onboardingCompletedAt is present
    if (updateData.onboardingCompletedAt && typeof updateData.onboardingCompletedAt === 'string') {
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

export default router;

// Workout Assignment Routes
// Assigning workouts to clients, weekly views, completion, compliance tracking

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import {
  clients,
  workoutAssignments,
  workouts,
  workoutExercises,
  exercises,
  insertWorkoutAssignmentSchema,
} from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { ZodError } from 'zod';
import { requireClientOwnership } from '../middleware/auth';
import { apiRateLimit, strictRateLimit } from '../middleware/rateLimiter';
import { startOfWeek, endOfWeek, addWeeks, format, getISOWeek, getISOWeekYear } from 'date-fns';

const router = Router();

// GET /api/workout-templates - Get predefined workout templates (secured)
router.get('/workout-templates', apiRateLimit, async (_req: Request, res: Response) => {
  try {
    const templates = await storage.getWorkoutTemplates();
    res.json(templates);
  } catch (error) {
    // Error logged internally
    res.status(500).json({ error: 'Failed to fetch workout templates' });
  }
});

// GET /api/clients/:clientId/workouts - Get client's assigned workouts
router.get(
  '/clients/:clientId/workouts',
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const assignments = await storage.getClientWorkouts(clientId, trainerId);
      res.json(assignments);
    } catch (error) {
      // Error logged internally
      res.status(500).json({ error: 'Failed to fetch client workouts' });
    }
  }
);

// GET /api/client/workouts/weekly - Get current user's (client) workouts for a specific week
router.get('/client/workouts/weekly', async (req: Request, res: Response) => {
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
    const clientRecords = await db
      .select()
      .from(clients)
      .where(and(eq(clients.email, user.email), isNull(clients.deletedAt)));

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
    const weeklyWorkouts = await storage.getClientWorkoutsByWeek(
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
    console.log(`  Workouts Found: ${weeklyWorkouts.length}`);

    res.json({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      weekNumber: getISOWeek(weekStart),
      year: getISOWeekYear(weekStart),
      workouts: weeklyWorkouts,
    });
  } catch (error) {
    console.error('Error fetching client weekly workouts:', error);
    res.status(500).json({ error: 'Failed to fetch weekly workouts' });
  }
});

// GET /api/clients/:clientId/workouts/weekly - Get client's workouts for a specific week (for trainers)
router.get(
  '/clients/:clientId/workouts/weekly',
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
      const trainerId = req.user!.id;
      const weeklyWorkouts = await storage.getClientWorkoutsByWeek(
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
      console.log(`  Workouts Found: ${weeklyWorkouts.length}`);

      res.json({
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        weekNumber: getISOWeek(weekStart),
        year: getISOWeekYear(weekStart),
        workouts: weeklyWorkouts,
      });
    } catch (error) {
      console.error('Error fetching weekly workouts:', error);
      res.status(500).json({ error: 'Failed to fetch weekly workouts' });
    }
  }
);

// GET /api/workout-assignments/trainer - Get all scheduled workout assignments for trainer's clients (secured)
router.get('/workout-assignments/trainer', apiRateLimit, async (req: Request, res: Response) => {
  try {
    // SECURITY: Derive trainerId from session, not URL params
    const trainerId = req.user!.id;
    const assignmentList = await storage.getTrainerWorkoutAssignments(trainerId);
    res.json(assignmentList);
  } catch (error) {
    console.error('Error fetching trainer workout assignments:', error);
    res.status(500).json({ error: 'Failed to fetch workout assignments' });
  }
});

// POST /api/workout-assignments - Assign workout to client
// Supports enhanced scheduling: date, time, timezone, status, customization
router.post('/workout-assignments', strictRateLimit, async (req: Request, res: Response) => {
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
      assignmentData.dayOfWeek = scheduledDate.getDay();
      assignmentData.weekNumber = getISOWeek(scheduledDate);
      assignmentData.weekYear = getISOWeekYear(scheduledDate);
    }

    // Set defaults for new fields if not provided
    assignmentData.timezone = assignmentData.timezone || 'UTC';
    assignmentData.status = assignmentData.status || 'scheduled';
    assignmentData.isCustomized = assignmentData.isCustomized ?? false;

    // SECURITY: Verify client belongs to authenticated trainer
    const trainerId = req.user!.id;
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
        const { notifyWorkoutAssigned } = await import('../services/notificationService');
        const workout = await storage.getWorkout(validatedData.workoutId, trainerId);
        const user = req.user;
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
});

// GET /api/workout-assignments/:id - Get workout assignment details with exercises
router.get('/workout-assignments/:id', async (req: Request, res: Response) => {
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
        muscleGroup: ex.exercises?.muscleGroups?.[0] || 'General',
        muscleGroups: ex.exercises?.muscleGroups || [],
        primaryMuscles: ex.exercises?.primaryMuscles || [],
        secondaryMuscles: ex.exercises?.secondaryMuscles || [],
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
router.patch('/workout-assignments/:id', strictRateLimit, async (req: Request, res: Response) => {
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
});

// PUT /api/workout-assignments/:id/complete - Mark workout assignment as completed
router.put(
  '/workout-assignments/:id/complete',
  strictRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { notes, durationMinutes, volumeKg, totalReps, totalSets, hadPersonalRecord } =
        req.body;

      // SECURITY: Verify ownership by checking all assignments across trainer's clients
      const trainerId = req.user!.id;
      const assignmentList = await storage.getClientWorkouts(''); // TODO: Need better method to get assignment by ID
      const assignment = assignmentList.find((a) => a.id === id);
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
      const userId = req.user!.id;
      let gamificationResult = null;
      try {
        const { awardWorkoutCompletionXp, updateStreak, updateWorkoutStats } =
          await import('../services/gamification/xpService');

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
          const { notifyLevelUp } = await import('../services/notificationService');
          const { getGenZRank } = await import('../services/gamification/xpService');
          await notifyLevelUp(userId, xpResult.newLevel, getGenZRank(xpResult.newLevel));
        }

        // Send streak milestone notification if applicable
        if (streakResult.milestone) {
          const { notifyStreakMilestone } = await import('../services/notificationService');
          await notifyStreakMilestone(userId, streakResult.milestone, streakResult.streakXpAwarded);
        }
      } catch (gamificationError) {
        console.warn('Gamification update failed (non-critical):', gamificationError);
      }

      // Notify trainer that client completed workout
      try {
        const { notifyWorkoutCompleted } = await import('../services/notificationService');
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
router.get(
  '/clients/:clientId/compliance',
  requireClientOwnership,
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const trainerId = req.user!.id;
      const clientWorkouts = await storage.getClientWorkouts(clientId, trainerId);

      const calcRate = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const assigned = clientWorkouts.filter((w) => new Date(w.assignedAt) >= cutoff);
        if (assigned.length === 0) return { rate: 0, completed: 0, total: 0 };
        const completed = assigned.filter((w) => w.completedAt != null || w.status === 'completed');
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

export default router;

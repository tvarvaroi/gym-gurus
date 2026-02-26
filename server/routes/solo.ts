// Solo User Workout Tracking API Routes
// Provides workout logging, activity tracking, and dashboard stats for solo users

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import {
  workoutSessions,
  workoutSetLogs,
  exercises,
  aiGeneratedWorkouts,
  userFitnessProfile,
  userMuscleFatigue,
  userMuscleVolume,
  workoutRecoveryLog,
} from '../../shared/schema';
import { eq, and, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { startOfWeek, endOfWeek, format, addDays } from 'date-fns';

const router = Router();

// ==================== Fitness Profile ====================

// Get user's fitness profile for AI personalization
router.get('/fitness-profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await getDb();
    const profile = await database
      .select()
      .from(userFitnessProfile)
      .where(eq(userFitnessProfile.userId, userId))
      .limit(1);

    if (profile.length === 0) {
      return res.json(null);
    }

    res.json(profile[0]);
  } catch (error) {
    console.error('Error getting fitness profile:', error);
    res.status(500).json({ error: 'Failed to get fitness profile' });
  }
});

// ==================== Today's Workout ====================

// Get today's recommended workout for solo user
router.get('/today-workout', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await getDb();
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    // Check if user already has a session today
    const todaySession = await database
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, todayStart),
          lte(workoutSessions.startedAt, todayEnd)
        )
      )
      .limit(1);

    if (todaySession.length > 0) {
      // Return existing session
      const session = todaySession[0];

      // Get set logs for this session
      const setLogs = await database
        .select({
          log: workoutSetLogs,
          exercise: exercises,
        })
        .from(workoutSetLogs)
        .innerJoin(exercises, eq(workoutSetLogs.exerciseId, exercises.id))
        .where(eq(workoutSetLogs.sessionId, session.id))
        .orderBy(workoutSetLogs.createdAt);

      // Calculate total sets and volume
      const totalSets = setLogs.length;
      const totalVolume = setLogs.reduce((sum, log) => {
        const weight = Number(log.log.weightKg) || 0;
        const reps = log.log.reps || 0;
        return sum + weight * reps;
      }, 0);

      // Get unique exercises
      const exercises_done = Array.from(new Set(setLogs.map((log) => log.exercise.name)));

      return res.json({
        hasWorkoutToday: true,
        workout: {
          id: session.id,
          name: session.workoutName || "Today's Workout",
          estimatedTime: session.plannedDurationMinutes || 45,
          exercises: exercises_done,
          muscleGroups: Array.from(new Set(setLogs.map((log) => log.exercise.muscleGroup))),
          status: session.isActive ? 'in_progress' : 'completed',
          completedAt: session.endedAt,
          stats: {
            totalSets,
            totalVolume: Math.round(totalVolume),
            duration: session.endedAt
              ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
              : null,
          },
        },
      });
    }

    // No workout today - check for AI-generated recommendation
    const aiWorkout = await database
      .select()
      .from(aiGeneratedWorkouts)
      .where(eq(aiGeneratedWorkouts.userId, userId))
      .orderBy(desc(aiGeneratedWorkouts.createdAt))
      .limit(1);

    if (aiWorkout.length > 0 && aiWorkout[0].workoutData) {
      const workout = aiWorkout[0].workoutData as any;
      return res.json({
        hasWorkoutToday: false,
        suggestedWorkout: {
          id: `ai-${aiWorkout[0].id}`,
          name: workout.title || 'AI Recommended Workout',
          estimatedTime: workout.duration || 45,
          exercises: workout.exercises?.slice(0, 5).map((ex: any) => ex.name) || [],
          muscleGroups: workout.targetMuscles || [],
          source: 'ai_generated',
        },
      });
    }

    // Return generic template
    res.json({
      hasWorkoutToday: false,
      suggestedWorkout: {
        id: 'template-push',
        name: 'Push Day',
        estimatedTime: 45,
        exercises: ['Bench Press', 'Overhead Press', 'Dips', 'Lateral Raises'],
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        source: 'template',
      },
    });
  } catch (error) {
    console.error("Error getting today's workout:", error);
    res.status(500).json({ error: "Failed to get today's workout" });
  }
});

// ==================== Weekly Activity ====================

// Get weekly activity calendar (last 7 days)
router.get('/weekly-activity', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await getDb();
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

    // Get all sessions for this week
    const sessions = await database
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, weekStart),
          lte(workoutSessions.startedAt, weekEnd)
        )
      )
      .orderBy(workoutSessions.startedAt);

    // Build activity array for each day (Mon-Sun)
    const activity: boolean[] = [];
    const sessionsByDate = new Map<string, boolean>();

    sessions.forEach((session) => {
      const dateKey = format(session.startedAt, 'yyyy-MM-dd');
      sessionsByDate.set(dateKey, true);
    });

    // Generate array for 7 days
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateKey = format(date, 'yyyy-MM-dd');
      activity.push(sessionsByDate.has(dateKey));
    }

    res.json({
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      activity,
      totalWorkouts: sessions.length,
    });
  } catch (error) {
    console.error('Error getting weekly activity:', error);
    res.status(500).json({ error: 'Failed to get weekly activity' });
  }
});

// ==================== Workout Sessions ====================

// Start a new workout session
router.post('/sessions/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workoutName, plannedDurationMinutes, workoutType } = req.body;

    const database = await getDb();

    // Check if there's already an active session
    const activeSession = await database
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.isActive, true)))
      .limit(1);

    if (activeSession.length > 0) {
      return res.status(400).json({
        error: 'You already have an active workout session',
        activeSessionId: activeSession[0].id,
      });
    }

    // Create new session
    const [session] = await database
      .insert(workoutSessions)
      .values({
        userId,
        workoutName: workoutName || 'Workout',
        plannedDurationMinutes: plannedDurationMinutes || 45,
        workoutType,
        isActive: true,
      })
      .returning();

    res.status(201).json({
      session: {
        id: session.id,
        workoutName: session.workoutName,
        startedAt: session.startedAt,
        isActive: session.isActive,
      },
    });
  } catch (error) {
    console.error('Error starting workout session:', error);
    res.status(500).json({ error: 'Failed to start workout session' });
  }
});

// Log a set during active session
router.post('/sessions/:sessionId/log-set', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const { exerciseId, setNumber, weightKg, reps, rpe, restTimeSeconds, notes } = req.body;

    if (!exerciseId || !setNumber) {
      return res.status(400).json({ error: 'Exercise ID and set number required' });
    }

    const database = await getDb();

    // Verify session belongs to user and is active
    const session = await database
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
      .limit(1);

    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session[0].isActive) {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Log the set
    const [setLog] = await database
      .insert(workoutSetLogs)
      .values({
        sessionId,
        exerciseId,
        setNumber,
        weightKg: weightKg ? String(weightKg) : null,
        reps: reps || null,
        rpe: rpe || null,
        restTimeSeconds: restTimeSeconds || null,
        notes: notes || null,
      })
      .returning();

    res.status(201).json({ setLog });
  } catch (error) {
    console.error('Error logging set:', error);
    res.status(500).json({ error: 'Failed to log set' });
  }
});

// Complete a workout session
router.patch('/sessions/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const { notes, perceivedExertion } = req.body;

    const database = await getDb();

    // Verify session belongs to user
    const session = await database
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
      .limit(1);

    if (session.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all set logs for this session to calculate stats
    const setLogs = await database
      .select()
      .from(workoutSetLogs)
      .where(eq(workoutSetLogs.sessionId, sessionId));

    const totalSets = setLogs.length;
    const totalReps = setLogs.reduce((sum, log) => sum + (log.reps || 0), 0);
    const totalVolume = setLogs.reduce((sum, log) => {
      const weight = Number(log.weightKg) || 0;
      const reps = log.reps || 0;
      return sum + weight * reps;
    }, 0);

    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - session[0].startedAt.getTime()) / 60000);

    // Update session
    const [updatedSession] = await database
      .update(workoutSessions)
      .set({
        endedAt: now,
        actualDurationMinutes: durationMinutes,
        totalSets,
        totalReps,
        totalVolumeKg: String(totalVolume),
        perceivedExertion,
        notes,
        isActive: false,
      })
      .where(eq(workoutSessions.id, sessionId))
      .returning();

    // Update gamification (workout completion, volume, streak)
    try {
      const { awardWorkoutCompletionXp, updateStreak, updateWorkoutStats } =
        await import('../services/gamification/xpService');

      await awardWorkoutCompletionXp(userId, durationMinutes, false);
      await updateStreak(userId);
      await updateWorkoutStats(userId, totalVolume, totalReps, totalSets, durationMinutes);
    } catch (gamificationError) {
      console.warn('Gamification update failed (non-critical):', gamificationError);
    }

    // Update recovery fatigue system
    try {
      // Group set logs by exercise to get per-exercise stats
      const exerciseStats: Record<
        string,
        { sets: number; totalReps: number; totalVolumeKg: number }
      > = {};
      for (const log of setLogs) {
        const eid = log.exerciseId;
        if (!exerciseStats[eid]) {
          exerciseStats[eid] = { sets: 0, totalReps: 0, totalVolumeKg: 0 };
        }
        exerciseStats[eid].sets += 1;
        exerciseStats[eid].totalReps += log.reps || 0;
        exerciseStats[eid].totalVolumeKg += (Number(log.weightKg) || 0) * (log.reps || 0);
      }

      const exerciseIds = Object.keys(exerciseStats);
      if (exerciseIds.length > 0) {
        // Fetch exercises to get their muscle groups
        const exerciseRecords = await database
          .select({ id: exercises.id, muscleGroups: exercises.muscleGroups })
          .from(exercises)
          .where(inArray(exercises.id, exerciseIds));

        // Build per-muscle fatigue/volume aggregation
        const muscleData: Record<string, { sets: number; volumeKg: number; fatigue: number }> = {};

        const RECOVERY_HOURS: Record<string, number> = {
          chest: 48,
          back: 48,
          shoulders: 48,
          biceps: 36,
          triceps: 36,
          forearms: 24,
          quads: 72,
          hamstrings: 72,
          glutes: 72,
          calves: 48,
          abs: 24,
          obliques: 24,
          lower_back: 48,
          traps: 48,
          lats: 48,
        };

        for (const ex of exerciseRecords) {
          const stats = exerciseStats[ex.id];
          if (!stats || !ex.muscleGroups) continue;

          const muscles = ex.muscleGroups;
          const avgReps = stats.totalReps / Math.max(1, stats.sets);

          // First muscle = primary (1.0), rest = secondary (0.5)
          muscles.forEach((muscle, idx) => {
            const weight = idx === 0 ? 1.0 : 0.5;
            const fatigue = Math.min(100, (weight * stats.sets * avgReps * 0.7) / 1.4);

            if (!muscleData[muscle]) {
              muscleData[muscle] = { sets: 0, volumeKg: 0, fatigue: 0 };
            }
            muscleData[muscle].sets += Math.round(stats.sets * weight);
            muscleData[muscle].volumeKg += stats.totalVolumeKg * weight;
            muscleData[muscle].fatigue = Math.min(100, muscleData[muscle].fatigue + fatigue);
          });
        }

        // Build musclesWorked array for recovery log
        const musclesWorked = Object.entries(muscleData).map(([muscleGroup, data]) => ({
          muscleGroup,
          sets: data.sets,
          volumeKg: Math.round(data.volumeKg * 100) / 100,
          fatigueContribution: Math.round(data.fatigue * 100) / 100,
        }));

        // Update muscle fatigue records (upsert)
        for (const mw of musclesWorked) {
          const recoveryHours = RECOVERY_HOURS[mw.muscleGroup] || 48;
          const estimatedRecovery = new Date(now.getTime() + recoveryHours * 60 * 60 * 1000);

          const existing = await database
            .select()
            .from(userMuscleFatigue)
            .where(
              and(
                eq(userMuscleFatigue.userId, userId),
                eq(userMuscleFatigue.muscleGroup, mw.muscleGroup)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await database
              .update(userMuscleFatigue)
              .set({
                fatigueLevel: String(Math.min(100, mw.fatigueContribution)),
                lastTrainedAt: now,
                estimatedFullRecoveryAt: estimatedRecovery,
                volumeLastSession: String(mw.volumeKg),
                setsLastSession: mw.sets,
                updatedAt: now,
              })
              .where(eq(userMuscleFatigue.id, existing[0].id));
          } else {
            await database.insert(userMuscleFatigue).values({
              userId,
              muscleGroup: mw.muscleGroup,
              fatigueLevel: String(Math.min(100, mw.fatigueContribution)),
              lastTrainedAt: now,
              estimatedFullRecoveryAt: estimatedRecovery,
              volumeLastSession: String(mw.volumeKg),
              setsLastSession: mw.sets,
              avgRecoveryHours: String(recoveryHours),
            });
          }
        }

        // Update muscle volume tracking (upsert)
        for (const mw of musclesWorked) {
          const existing = await database
            .select()
            .from(userMuscleVolume)
            .where(
              and(
                eq(userMuscleVolume.userId, userId),
                eq(userMuscleVolume.muscleGroup, mw.muscleGroup)
              )
            )
            .limit(1);

          if (existing.length > 0) {
            await database
              .update(userMuscleVolume)
              .set({
                volumeThisWeekKg: sql`${userMuscleVolume.volumeThisWeekKg} + ${mw.volumeKg}`,
                setsThisWeek: sql`${userMuscleVolume.setsThisWeek} + ${mw.sets}`,
                volumeThisMonthKg: sql`${userMuscleVolume.volumeThisMonthKg} + ${mw.volumeKg}`,
                setsThisMonth: sql`${userMuscleVolume.setsThisMonth} + ${mw.sets}`,
                totalVolumeKg: sql`${userMuscleVolume.totalVolumeKg} + ${mw.volumeKg}`,
                totalSets: sql`${userMuscleVolume.totalSets} + ${mw.sets}`,
                lastUpdated: now,
              })
              .where(eq(userMuscleVolume.id, existing[0].id));
          } else {
            await database.insert(userMuscleVolume).values({
              userId,
              muscleGroup: mw.muscleGroup,
              volumeThisWeekKg: String(mw.volumeKg),
              setsThisWeek: mw.sets,
              volumeThisMonthKg: String(mw.volumeKg),
              setsThisMonth: mw.sets,
              totalVolumeKg: String(mw.volumeKg),
              totalSets: mw.sets,
            });
          }
        }

        // Log recovery entry
        await database.insert(workoutRecoveryLog).values({
          userId,
          workoutLogId: sessionId,
          musclesWorked,
          perceivedExertion: perceivedExertion || null,
        });
      }
    } catch (recoveryError) {
      console.warn('Recovery fatigue update failed (non-critical):', recoveryError);
    }

    res.json({
      session: updatedSession,
      stats: {
        durationMinutes,
        totalSets,
        totalReps,
        totalVolume: Math.round(totalVolume),
      },
    });
  } catch (error) {
    console.error('Error completing workout session:', error);
    res.status(500).json({ error: 'Failed to complete workout session' });
  }
});

// Get active session
router.get('/sessions/active', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await getDb();

    const activeSession = await database
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.isActive, true)))
      .limit(1);

    if (activeSession.length === 0) {
      return res.json({ activeSession: null });
    }

    // Get set logs
    const setLogs = await database
      .select({
        log: workoutSetLogs,
        exercise: exercises,
      })
      .from(workoutSetLogs)
      .innerJoin(exercises, eq(workoutSetLogs.exerciseId, exercises.id))
      .where(eq(workoutSetLogs.sessionId, activeSession[0].id))
      .orderBy(workoutSetLogs.createdAt);

    res.json({
      activeSession: activeSession[0],
      setLogs,
    });
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

// ==================== Dashboard Stats ====================

// Get consolidated dashboard stats for solo user
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await getDb();
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });

    // Count workouts this week
    const weekSessions = await database
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, weekStart),
          eq(workoutSessions.isActive, false) // Only completed sessions
        )
      );

    const workoutsThisWeek = weekSessions.length;

    // Calculate total volume this week
    const weeklyVolume = weekSessions.reduce((sum, session) => {
      return sum + Number(session.totalVolumeKg || 0);
    }, 0);

    res.json({
      workoutsThisWeek,
      weeklyVolumeKg: Math.round(weeklyVolume),
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

export default router;

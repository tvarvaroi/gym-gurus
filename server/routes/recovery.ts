// Recovery & Fatigue Tracking API Routes
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { userMuscleFatigue, userMuscleVolume, workoutRecoveryLog } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Muscle groups for validation
const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
  'lower_back', 'traps', 'lats'
];

// Default recovery hours by muscle group
const DEFAULT_RECOVERY_HOURS: Record<string, number> = {
  chest: 48, back: 48, shoulders: 48, biceps: 36, triceps: 36,
  forearms: 24, quads: 72, hamstrings: 72, glutes: 72, calves: 48,
  abs: 24, obliques: 24, lower_back: 48, traps: 48, lats: 48
};

// ==================== Muscle Fatigue ====================

// Get current fatigue levels for all muscle groups
router.get('/fatigue', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;

    const fatigueData = await database
      .select()
      .from(userMuscleFatigue)
      .where(eq(userMuscleFatigue.userId, userId));

    // Calculate current fatigue based on time since last workout
    const now = new Date();
    const result = fatigueData.map(f => {
      const lastTrained = f.lastTrainedAt ? new Date(f.lastTrainedAt) : null;
      const recoveryHours = Number(f.avgRecoveryHours) || DEFAULT_RECOVERY_HOURS[f.muscleGroup] || 48;

      let currentFatigue = Number(f.fatigueLevel) || 0;

      if (lastTrained) {
        const hoursSinceTraining = (now.getTime() - lastTrained.getTime()) / (1000 * 60 * 60);
        // Linear decay of fatigue
        const recoveryProgress = Math.min(1, hoursSinceTraining / recoveryHours);
        currentFatigue = Math.max(0, currentFatigue * (1 - recoveryProgress));
      }

      return {
        muscleGroup: f.muscleGroup,
        fatigueLevel: Math.round(currentFatigue),
        lastTrainedAt: f.lastTrainedAt,
        estimatedFullRecoveryAt: f.estimatedFullRecoveryAt,
        volumeLastSession: Number(f.volumeLastSession) || 0,
        setsLastSession: f.setsLastSession || 0,
        recoveryStatus: currentFatigue < 20 ? 'recovered' : currentFatigue < 50 ? 'recovering' : 'fatigued'
      };
    });

    // Add missing muscle groups with 0 fatigue
    const existingMuscles = new Set(result.map(r => r.muscleGroup));
    for (const muscle of MUSCLE_GROUPS) {
      if (!existingMuscles.has(muscle)) {
        result.push({
          muscleGroup: muscle,
          fatigueLevel: 0,
          lastTrainedAt: null,
          estimatedFullRecoveryAt: null,
          volumeLastSession: 0,
          setsLastSession: 0,
          recoveryStatus: 'recovered'
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting fatigue data:', error);
    res.status(500).json({ error: 'Failed to get fatigue data' });
  }
});

// Update fatigue after workout
router.post('/fatigue/update', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { musclesWorked } = req.body;
    // musclesWorked: Array<{ muscleGroup: string, sets: number, volumeKg: number, fatigueContribution: number }>

    if (!musclesWorked || !Array.isArray(musclesWorked)) {
      return res.status(400).json({ error: 'Muscles worked data required' });
    }

    const database = await db;
    const now = new Date();

    for (const muscle of musclesWorked) {
      const { muscleGroup, sets, volumeKg, fatigueContribution } = muscle;

      if (!MUSCLE_GROUPS.includes(muscleGroup)) {
        continue;
      }

      const recoveryHours = DEFAULT_RECOVERY_HOURS[muscleGroup] || 48;
      const estimatedRecovery = new Date(now.getTime() + recoveryHours * 60 * 60 * 1000);

      // Check if record exists
      const existing = await database
        .select()
        .from(userMuscleFatigue)
        .where(and(
          eq(userMuscleFatigue.userId, userId),
          eq(userMuscleFatigue.muscleGroup, muscleGroup)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await database
          .update(userMuscleFatigue)
          .set({
            fatigueLevel: String(Math.min(100, fatigueContribution)),
            lastTrainedAt: now,
            estimatedFullRecoveryAt: estimatedRecovery,
            volumeLastSession: String(volumeKg),
            setsLastSession: sets,
            updatedAt: now
          })
          .where(eq(userMuscleFatigue.id, existing[0].id));
      } else {
        // Insert new
        await database.insert(userMuscleFatigue).values({
          userId,
          muscleGroup,
          fatigueLevel: String(Math.min(100, fatigueContribution)),
          lastTrainedAt: now,
          estimatedFullRecoveryAt: estimatedRecovery,
          volumeLastSession: String(volumeKg),
          setsLastSession: sets,
          avgRecoveryHours: String(recoveryHours)
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating fatigue:', error);
    res.status(500).json({ error: 'Failed to update fatigue' });
  }
});

// ==================== Muscle Volume Tracking ====================

// Get weekly/monthly volume by muscle group
router.get('/volume', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;

    const volumeData = await database
      .select()
      .from(userMuscleVolume)
      .where(eq(userMuscleVolume.userId, userId));

    res.json(volumeData);
  } catch (error) {
    console.error('Error getting volume data:', error);
    res.status(500).json({ error: 'Failed to get volume data' });
  }
});

// Update volume after workout
router.post('/volume/update', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { musclesWorked } = req.body;
    // musclesWorked: Array<{ muscleGroup: string, sets: number, volumeKg: number }>

    if (!musclesWorked || !Array.isArray(musclesWorked)) {
      return res.status(400).json({ error: 'Muscles worked data required' });
    }

    const database = await db;

    for (const muscle of musclesWorked) {
      const { muscleGroup, sets, volumeKg } = muscle;

      if (!MUSCLE_GROUPS.includes(muscleGroup)) {
        continue;
      }

      // Check if record exists
      const existing = await database
        .select()
        .from(userMuscleVolume)
        .where(and(
          eq(userMuscleVolume.userId, userId),
          eq(userMuscleVolume.muscleGroup, muscleGroup)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await database
          .update(userMuscleVolume)
          .set({
            volumeThisWeekKg: sql`${userMuscleVolume.volumeThisWeekKg} + ${volumeKg}`,
            setsThisWeek: sql`${userMuscleVolume.setsThisWeek} + ${sets}`,
            volumeThisMonthKg: sql`${userMuscleVolume.volumeThisMonthKg} + ${volumeKg}`,
            setsThisMonth: sql`${userMuscleVolume.setsThisMonth} + ${sets}`,
            totalVolumeKg: sql`${userMuscleVolume.totalVolumeKg} + ${volumeKg}`,
            totalSets: sql`${userMuscleVolume.totalSets} + ${sets}`,
            lastUpdated: new Date()
          })
          .where(eq(userMuscleVolume.id, existing[0].id));
      } else {
        // Insert new
        await database.insert(userMuscleVolume).values({
          userId,
          muscleGroup,
          volumeThisWeekKg: String(volumeKg),
          setsThisWeek: sets,
          volumeThisMonthKg: String(volumeKg),
          setsThisMonth: sets,
          totalVolumeKg: String(volumeKg),
          totalSets: sets
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating volume:', error);
    res.status(500).json({ error: 'Failed to update volume' });
  }
});

// Reset weekly volume (call on Monday)
router.post('/volume/reset-weekly', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;

    await database
      .update(userMuscleVolume)
      .set({
        volumeThisWeekKg: '0',
        setsThisWeek: 0,
        lastUpdated: new Date()
      })
      .where(eq(userMuscleVolume.userId, userId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting weekly volume:', error);
    res.status(500).json({ error: 'Failed to reset weekly volume' });
  }
});

// ==================== Recovery Logs ====================

// Log recovery data after workout
router.post('/log', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workoutLogId, musclesWorked, perceivedExertion, muscleSoreness, sleepQualityLastNight } = req.body;

    const database = await db;

    await database.insert(workoutRecoveryLog).values({
      userId,
      workoutLogId,
      musclesWorked,
      perceivedExertion,
      muscleSoreness,
      sleepQualityLastNight
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error logging recovery:', error);
    res.status(500).json({ error: 'Failed to log recovery' });
  }
});

// Get recovery logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const database = await db;

    const logs = await database
      .select()
      .from(workoutRecoveryLog)
      .where(eq(workoutRecoveryLog.userId, userId))
      .orderBy(desc(workoutRecoveryLog.createdAt))
      .limit(limit);

    res.json(logs);
  } catch (error) {
    console.error('Error getting recovery logs:', error);
    res.status(500).json({ error: 'Failed to get recovery logs' });
  }
});

// ==================== Recommendations ====================

// Get workout recommendations based on recovery
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;
    const now = new Date();

    const fatigueData = await database
      .select()
      .from(userMuscleFatigue)
      .where(eq(userMuscleFatigue.userId, userId));

    // Calculate current recovery status for each muscle
    const muscleStatus = fatigueData.map(f => {
      const lastTrained = f.lastTrainedAt ? new Date(f.lastTrainedAt) : null;
      const recoveryHours = Number(f.avgRecoveryHours) || DEFAULT_RECOVERY_HOURS[f.muscleGroup] || 48;

      let recoveryProgress = 100;

      if (lastTrained) {
        const hoursSinceTraining = (now.getTime() - lastTrained.getTime()) / (1000 * 60 * 60);
        recoveryProgress = Math.min(100, (hoursSinceTraining / recoveryHours) * 100);
      }

      return {
        muscleGroup: f.muscleGroup,
        recoveryProgress: Math.round(recoveryProgress),
        isRecovered: recoveryProgress >= 80,
        lastTrained
      };
    });

    // Find muscles that are recovered and ready to train
    const readyToTrain = muscleStatus
      .filter(m => m.isRecovered)
      .map(m => m.muscleGroup);

    // Find muscles that need more rest
    const needsRest = muscleStatus
      .filter(m => !m.isRecovered)
      .map(m => ({
        muscleGroup: m.muscleGroup,
        recoveryProgress: m.recoveryProgress
      }));

    // Suggest workout type based on what's recovered
    let suggestedWorkout = 'rest';
    if (readyToTrain.includes('chest') && readyToTrain.includes('triceps')) {
      suggestedWorkout = 'push';
    } else if (readyToTrain.includes('back') && readyToTrain.includes('biceps')) {
      suggestedWorkout = 'pull';
    } else if (readyToTrain.includes('quads') && readyToTrain.includes('hamstrings')) {
      suggestedWorkout = 'legs';
    } else if (readyToTrain.length > 3) {
      suggestedWorkout = 'full_body';
    }

    res.json({
      readyToTrain,
      needsRest,
      suggestedWorkout,
      muscleStatus
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;

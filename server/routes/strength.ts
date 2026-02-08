// Strength Tracking API Routes
// Personal records, strength standards, and progress tracking

import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  personalRecords,
  personalRecordHistory,
  userStrengthStandards,
  exercises,
  userGamification,
} from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { awardPersonalRecordXp, incrementPersonalRecords } from '../services/gamification/xpService';
import { checkStrengthAchievements, checkClassificationAchievements } from '../services/gamification/achievementService';

const router = Router();

// ==================== Personal Records ====================

// Get all personal records for a user
router.get('/personal-records', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;

    const records = await database
      .select({
        pr: personalRecords,
        exercise: exercises,
      })
      .from(personalRecords)
      .innerJoin(exercises, eq(personalRecords.exerciseId, exercises.id))
      .where(eq(personalRecords.userId, userId))
      .orderBy(desc(personalRecords.achievedAt));

    res.json(records);
  } catch (error) {
    console.error('Error getting personal records:', error);
    res.status(500).json({ error: 'Failed to get personal records' });
  }
});

// Get personal record for a specific exercise
router.get('/personal-records/:exerciseId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { exerciseId } = req.params;
    const database = await db;

    const record = await database
      .select()
      .from(personalRecords)
      .where(and(eq(personalRecords.userId, userId), eq(personalRecords.exerciseId, exerciseId)))
      .limit(1);

    if (record.length === 0) {
      return res.json(null);
    }

    res.json(record[0]);
  } catch (error) {
    console.error('Error getting personal record:', error);
    res.status(500).json({ error: 'Failed to get personal record' });
  }
});

// Get personal record history for an exercise
router.get('/personal-records/:exerciseId/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { exerciseId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const database = await db;

    const history = await database
      .select()
      .from(personalRecordHistory)
      .where(and(eq(personalRecordHistory.userId, userId), eq(personalRecordHistory.exerciseId, exerciseId)))
      .orderBy(desc(personalRecordHistory.achievedAt))
      .limit(limit);

    res.json(history);
  } catch (error) {
    console.error('Error getting PR history:', error);
    res.status(500).json({ error: 'Failed to get PR history' });
  }
});

// Calculate 1RM from weight and reps (Epley formula)
function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Check and set a new personal record
router.post('/personal-records', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { exerciseId, weightKg, reps, workoutLogId, bodyweightKg } = req.body;

    if (!exerciseId || !weightKg || !reps) {
      return res.status(400).json({ error: 'Exercise ID, weight, and reps required' });
    }

    const database = await db;
    const estimated1rm = calculate1RM(weightKg, reps);
    const relativeStrength = bodyweightKg ? estimated1rm / bodyweightKg : null;

    // Check if this beats the current PR
    const currentPR = await database
      .select()
      .from(personalRecords)
      .where(and(eq(personalRecords.userId, userId), eq(personalRecords.exerciseId, exerciseId)))
      .limit(1);

    const isNewPR = currentPR.length === 0 || estimated1rm > Number(currentPR[0].estimated1rm);

    if (isNewPR) {
      // Add to history
      await database.insert(personalRecordHistory).values({
        userId,
        exerciseId,
        weightKg: String(weightKg),
        reps,
        estimated1rm: String(estimated1rm),
        bodyweightAtPr: bodyweightKg ? String(bodyweightKg) : null,
        workoutLogId,
      });

      // Update or insert current PR
      if (currentPR.length > 0) {
        await database
          .update(personalRecords)
          .set({
            weightKg: String(weightKg),
            reps,
            estimated1rm: String(estimated1rm),
            bodyweightAtPr: bodyweightKg ? String(bodyweightKg) : null,
            relativeStrength: relativeStrength ? String(relativeStrength) : null,
            workoutLogId,
            achievedAt: new Date(),
          })
          .where(eq(personalRecords.id, currentPR[0].id));
      } else {
        await database.insert(personalRecords).values({
          userId,
          exerciseId,
          weightKg: String(weightKg),
          reps,
          estimated1rm: String(estimated1rm),
          bodyweightAtPr: bodyweightKg ? String(bodyweightKg) : null,
          relativeStrength: relativeStrength ? String(relativeStrength) : null,
          workoutLogId,
        });
      }

      // Award XP for new PR
      const xpResult = await awardPersonalRecordXp(userId, exerciseId);
      await incrementPersonalRecords(userId);

      // Check for strength achievements
      const achievementResult = await checkStrengthAchievements(userId, exerciseId, estimated1rm);

      res.json({
        isNewPR: true,
        estimated1rm: Math.round(estimated1rm * 10) / 10,
        previousPR: currentPR.length > 0 ? Number(currentPR[0].estimated1rm) : null,
        improvement: currentPR.length > 0 ? estimated1rm - Number(currentPR[0].estimated1rm) : null,
        xpAwarded: xpResult.xpAwarded,
        leveledUp: xpResult.leveledUp,
        achievementsEarned: achievementResult.earned,
      });
    } else {
      res.json({
        isNewPR: false,
        estimated1rm: Math.round(estimated1rm * 10) / 10,
        currentPR: Number(currentPR[0].estimated1rm),
        difference: estimated1rm - Number(currentPR[0].estimated1rm),
      });
    }
  } catch (error) {
    console.error('Error checking personal record:', error);
    res.status(500).json({ error: 'Failed to check personal record' });
  }
});

// ==================== Strength Standards ====================

// Get user's strength standards for all exercises
router.get('/standards', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;

    const standards = await database
      .select({
        standard: userStrengthStandards,
        exercise: exercises,
      })
      .from(userStrengthStandards)
      .innerJoin(exercises, eq(userStrengthStandards.exerciseId, exercises.id))
      .where(eq(userStrengthStandards.userId, userId));

    res.json(standards);
  } catch (error) {
    console.error('Error getting strength standards:', error);
    res.status(500).json({ error: 'Failed to get strength standards' });
  }
});

// Update strength standard for an exercise
router.post('/standards/:exerciseId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { exerciseId } = req.params;
    const { current1rm, bodyweight, classification, percentile, nextLevelTarget, nextLevelClassification } =
      req.body;

    const database = await db;
    const relativeStrength = bodyweight ? current1rm / bodyweight : null;

    // Check if record exists
    const existing = await database
      .select()
      .from(userStrengthStandards)
      .where(and(eq(userStrengthStandards.userId, userId), eq(userStrengthStandards.exerciseId, exerciseId)))
      .limit(1);

    if (existing.length > 0) {
      await database
        .update(userStrengthStandards)
        .set({
          current1rm: String(current1rm),
          bodyweight: bodyweight ? String(bodyweight) : null,
          relativeStrength: relativeStrength ? String(relativeStrength) : null,
          classification,
          percentile: percentile ? String(percentile) : null,
          nextLevelTarget: nextLevelTarget ? String(nextLevelTarget) : null,
          nextLevelClassification,
          lastUpdated: new Date(),
        })
        .where(eq(userStrengthStandards.id, existing[0].id));
    } else {
      await database.insert(userStrengthStandards).values({
        userId,
        exerciseId,
        current1rm: String(current1rm),
        bodyweight: bodyweight ? String(bodyweight) : null,
        relativeStrength: relativeStrength ? String(relativeStrength) : null,
        classification,
        percentile: percentile ? String(percentile) : null,
        nextLevelTarget: nextLevelTarget ? String(nextLevelTarget) : null,
        nextLevelClassification,
      });
    }

    // Check for classification achievements
    if (classification) {
      await checkClassificationAchievements(userId, classification);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating strength standard:', error);
    res.status(500).json({ error: 'Failed to update strength standard' });
  }
});

// ==================== Strength Summary ====================

// Get overall strength summary for a user
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const database = await db;

    // Get gamification data
    const gamification = await database
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId))
      .limit(1);

    // Get all PRs
    const prs = await database
      .select()
      .from(personalRecords)
      .where(eq(personalRecords.userId, userId));

    // Get strength standards
    const standards = await database
      .select()
      .from(userStrengthStandards)
      .where(eq(userStrengthStandards.userId, userId));

    // Calculate summary stats
    const totalPRs = prs.length;
    const totalVolume = gamification[0]?.totalVolumeLiftedKg || 0;

    // Find highest classification
    const classifications = ['Untrained', 'Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
    const highestClassification =
      standards.length > 0
        ? standards.reduce((highest, s) => {
            const currentIdx = classifications.indexOf(s.classification || 'Untrained');
            const highestIdx = classifications.indexOf(highest);
            return currentIdx > highestIdx ? s.classification || 'Untrained' : highest;
          }, 'Untrained')
        : 'Untrained';

    res.json({
      totalPersonalRecords: totalPRs,
      totalVolumeLiftedKg: Number(totalVolume),
      highestClassification,
      strengthRank: gamification[0]?.rankStrength || 'Untrained',
      exercisesTracked: prs.length,
      recentPRs: prs.slice(0, 5).map((pr) => ({
        exerciseId: pr.exerciseId,
        estimated1rm: Number(pr.estimated1rm),
        achievedAt: pr.achievedAt,
      })),
    });
  } catch (error) {
    console.error('Error getting strength summary:', error);
    res.status(500).json({ error: 'Failed to get strength summary' });
  }
});

export default router;

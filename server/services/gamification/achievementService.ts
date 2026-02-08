// Achievement Service - Server-side achievement checking and awarding
import { db } from '../../db';
import {
  achievements,
  userAchievements,
  userGamification,
  personalRecords,
  userStrengthStandards,
} from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { awardXp } from './xpService';

// Check and award achievements after workout completion
export async function checkWorkoutAchievements(
  userId: string,
  workoutStats: {
    totalWorkouts: number;
    streakDays: number;
    totalVolume: number;
    totalReps: number;
    totalSets: number;
    prCount: number;
  }
): Promise<{ earned: string[]; xpAwarded: number }> {
  const database = await db;
  const earnedAchievements: string[] = [];
  let totalXp = 0;

  // Get all achievements user hasn't earned yet
  const allAchievements = await database.select().from(achievements);
  const userEarned = await database
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const earnedIds = new Set(userEarned.map((ua) => ua.achievementId));
  const unearnedAchievements = allAchievements.filter((a) => !earnedIds.has(a.id));

  for (const achievement of unearnedAchievements) {
    let earned = false;

    switch (achievement.requirementType) {
      case 'total_workouts':
        earned = workoutStats.totalWorkouts >= Number(achievement.requirementValue);
        break;
      case 'streak_days':
        earned = workoutStats.streakDays >= Number(achievement.requirementValue);
        break;
      case 'total_volume':
        earned = workoutStats.totalVolume >= Number(achievement.requirementValue);
        break;
      case 'total_reps':
        earned = workoutStats.totalReps >= Number(achievement.requirementValue);
        break;
      case 'total_sets':
        earned = workoutStats.totalSets >= Number(achievement.requirementValue);
        break;
      case 'total_prs':
        earned = workoutStats.prCount >= Number(achievement.requirementValue);
        break;
    }

    if (earned) {
      // Award achievement
      await database.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
        progress: '100',
      });

      // Award XP
      if (achievement.xpReward && achievement.xpReward > 0) {
        await awardXp(userId, achievement.xpReward, 'achievement_earned', achievement.id, 'achievement');
        totalXp += achievement.xpReward;
      }

      earnedAchievements.push(achievement.name);
    }
  }

  return { earned: earnedAchievements, xpAwarded: totalXp };
}

// Check strength-based achievements
export async function checkStrengthAchievements(
  userId: string,
  exerciseId: string,
  oneRepMax: number
): Promise<{ earned: string[]; xpAwarded: number }> {
  const database = await db;
  const earnedAchievements: string[] = [];
  let totalXp = 0;

  // Get strength achievements for this exercise
  const strengthAchievements = await database
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.requirementType, 'exercise_1rm'),
        eq(achievements.requirementExerciseId, exerciseId)
      )
    );

  // Get user's already earned achievements
  const userEarned = await database
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const earnedIds = new Set(userEarned.map((ua) => ua.achievementId));

  for (const achievement of strengthAchievements) {
    if (earnedIds.has(achievement.id)) continue;

    if (oneRepMax >= Number(achievement.requirementValue)) {
      // Award achievement
      await database.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
        progress: '100',
      });

      // Award XP
      if (achievement.xpReward && achievement.xpReward > 0) {
        await awardXp(userId, achievement.xpReward, 'achievement_earned', achievement.id, 'achievement');
        totalXp += achievement.xpReward;
      }

      earnedAchievements.push(achievement.name);
    }
  }

  return { earned: earnedAchievements, xpAwarded: totalXp };
}

// Check strength classification achievements
export async function checkClassificationAchievements(
  userId: string,
  classification: 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Elite'
): Promise<{ earned: string[]; xpAwarded: number }> {
  const database = await db;
  const earnedAchievements: string[] = [];
  let totalXp = 0;

  const classificationLevel = {
    Beginner: 1,
    Novice: 2,
    Intermediate: 3,
    Advanced: 4,
    Elite: 5,
  }[classification];

  // Get classification achievements
  const classAchievements = await database
    .select()
    .from(achievements)
    .where(eq(achievements.requirementType, 'strength_classification'));

  // Get user's already earned achievements
  const userEarned = await database
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const earnedIds = new Set(userEarned.map((ua) => ua.achievementId));

  for (const achievement of classAchievements) {
    if (earnedIds.has(achievement.id)) continue;

    if (classificationLevel >= Number(achievement.requirementValue)) {
      // Award achievement
      await database.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
        progress: '100',
      });

      // Award XP
      if (achievement.xpReward && achievement.xpReward > 0) {
        await awardXp(userId, achievement.xpReward, 'achievement_earned', achievement.id, 'achievement');
        totalXp += achievement.xpReward;
      }

      earnedAchievements.push(achievement.name);
    }
  }

  return { earned: earnedAchievements, xpAwarded: totalXp };
}

// Update achievement progress (for partial progress tracking)
export async function updateAchievementProgress(
  userId: string,
  achievementId: string,
  progress: number
): Promise<void> {
  const database = await db;

  // Check if user already has this achievement entry
  const existing = await database
    .select()
    .from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing progress
    await database
      .update(userAchievements)
      .set({ progress: String(Math.min(100, progress)) })
      .where(eq(userAchievements.id, existing[0].id));
  } else {
    // Create new progress entry
    await database.insert(userAchievements).values({
      userId,
      achievementId,
      progress: String(Math.min(100, progress)),
    });
  }
}

// Get all achievements with user's progress
export async function getUserAchievementsWithProgress(userId: string) {
  const database = await db;

  const allAchievements = await database.select().from(achievements);
  const userProgress = await database
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const progressMap = new Map(userProgress.map((up) => [up.achievementId, up]));

  return allAchievements.map((achievement) => {
    const progress = progressMap.get(achievement.id);
    return {
      ...achievement,
      earned: progress ? Number(progress.progress) >= 100 : false,
      earnedAt: progress?.earnedAt,
      progress: progress ? Number(progress.progress) : 0,
    };
  });
}

// Get user's earned achievements
export async function getUserEarnedAchievements(userId: string) {
  const database = await db;

  return database
    .select({
      achievement: achievements,
      userAchievement: userAchievements,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId));
}

// Get achievement statistics for a user
export async function getAchievementStats(userId: string) {
  const database = await db;

  const allAchievements = await database.select().from(achievements);
  const earnedAchievements = await database
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const earnedCount = earnedAchievements.filter((ua) => Number(ua.progress) >= 100).length;
  const totalXpFromAchievements = earnedAchievements.reduce((sum, ua) => {
    const achievement = allAchievements.find((a) => a.id === ua.achievementId);
    if (achievement && Number(ua.progress) >= 100) {
      return sum + (achievement.xpReward || 0);
    }
    return sum;
  }, 0);

  const categoryStats = {
    consistency: { earned: 0, total: 0 },
    strength: { earned: 0, total: 0 },
    volume: { earned: 0, total: 0 },
    exploration: { earned: 0, total: 0 },
    social: { earned: 0, total: 0 },
    nutrition: { earned: 0, total: 0 },
  };

  const earnedIds = new Set(
    earnedAchievements.filter((ua) => Number(ua.progress) >= 100).map((ua) => ua.achievementId)
  );

  for (const achievement of allAchievements) {
    const category = achievement.category as keyof typeof categoryStats;
    if (categoryStats[category]) {
      categoryStats[category].total++;
      if (earnedIds.has(achievement.id)) {
        categoryStats[category].earned++;
      }
    }
  }

  return {
    total: allAchievements.length,
    earned: earnedCount,
    percentage: Math.round((earnedCount / allAchievements.length) * 100),
    totalXpFromAchievements,
    byCategory: categoryStats,
  };
}

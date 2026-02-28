// Achievement Service - Server-side achievement checking and awarding
import { db } from '../../db';
import {
  achievements,
  userAchievements,
  userGamification,
  personalRecords,
  userStrengthStandards,
  workoutSessions,
} from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { awardXp } from './xpService';
import { ACHIEVEMENT_SEEDS } from './achievementDefinitions';

// Seed achievements into the database if table is empty (idempotent)
let seeded = false;
export async function seedAchievements(): Promise<void> {
  if (seeded) return;
  const database = await db;
  const existing = await database.select({ id: achievements.id }).from(achievements).limit(1);
  if (existing.length > 0) {
    seeded = true;
    return;
  }
  console.log('[achievements] Seeding achievement definitions...');
  await database.insert(achievements).values(
    ACHIEVEMENT_SEEDS.map((a) => ({
      name: a.name,
      description: a.description,
      category: a.category,
      requirementType: a.requirementType,
      requirementValue: a.requirementValue,
      xpReward: a.xpReward,
      badgeIcon: a.badgeIcon,
      isHidden: a.isHidden,
    }))
  );
  seeded = true;
  console.log(`[achievements] Seeded ${ACHIEVEMENT_SEEDS.length} achievements`);
}

// Compute workout stats from database for retroactive achievement checking
export async function getRetroactiveWorkoutStats(userId: string) {
  const database = await db;

  // Aggregate from completed workout sessions
  const sessionStats = await database
    .select({
      totalWorkouts: sql<number>`count(*)::int`,
      totalVolume: sql<number>`coalesce(sum(${workoutSessions.totalVolumeKg}::numeric), 0)::int`,
      totalSets: sql<number>`coalesce(sum(${workoutSessions.totalSets}), 0)::int`,
      totalReps: sql<number>`coalesce(sum(${workoutSessions.totalReps}), 0)::int`,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.isActive, false)));

  // Get streak from gamification profile
  const gamProfile = await database
    .select({ streakDays: userGamification.currentStreakDays })
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  // Count PRs
  const prStats = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(personalRecords)
    .where(eq(personalRecords.userId, userId));

  const stats = sessionStats[0] || { totalWorkouts: 0, totalVolume: 0, totalSets: 0, totalReps: 0 };
  return {
    totalWorkouts: stats.totalWorkouts || 0,
    totalVolume: stats.totalVolume || 0,
    totalSets: stats.totalSets || 0,
    totalReps: stats.totalReps || 0,
    streakDays: gamProfile[0]?.streakDays || 0,
    prCount: prStats[0]?.count || 0,
  };
}

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
        await awardXp(
          userId,
          achievement.xpReward,
          'achievement_earned',
          achievement.id,
          'achievement'
        );
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
        await awardXp(
          userId,
          achievement.xpReward,
          'achievement_earned',
          achievement.id,
          'achievement'
        );
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
        await awardXp(
          userId,
          achievement.xpReward,
          'achievement_earned',
          achievement.id,
          'achievement'
        );
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
    .where(
      and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId))
    )
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

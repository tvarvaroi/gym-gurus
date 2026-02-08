// XP Service - Server-side XP calculation and awarding
import { db } from '../../db';
import { userGamification, xpTransactions, userAchievements, achievements } from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

// XP Rewards Configuration (matching client-side)
export const XP_REWARDS = {
  WORKOUT_COMPLETED: 100,
  WORKOUT_COMPLETED_BONUS_PER_MINUTE: 1,
  WORKOUT_COMPLETED_WITH_PR: 50,
  PERSONAL_RECORD: 50,
  WEIGHT_INCREASE: 15,
  REP_INCREASE: 10,
  VOLUME_INCREASE: 5,
  STREAK_DAY_BONUS: 5,
  STREAK_MILESTONE_7_DAYS: 100,
  STREAK_MILESTONE_14_DAYS: 200,
  STREAK_MILESTONE_30_DAYS: 500,
  STREAK_MILESTONE_60_DAYS: 1000,
  STREAK_MILESTONE_100_DAYS: 2000,
  STREAK_MILESTONE_365_DAYS: 10000,
  NEW_EXERCISE_TRIED: 20,
  ALL_MUSCLE_GROUPS_WEEKLY: 200,
  CLIENT_PR_BONUS_FOR_TRAINER: 25,
  TRAINER_WORKOUT_ASSIGNED_COMPLETED: 30,
} as const;

// Level calculation (matching client-side)
export function getLevelFromXp(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 50)));
}

export function getXpForLevel(level: number): number {
  return 50 * level * level;
}

// Gen Z Rank calculation (matching client-side)
export function getGenZRank(level: number): string {
  if (level >= 200) return 'GOATED';
  if (level >= 151) return 'No Cap';
  if (level >= 101) return 'Bussin';
  if (level >= 71) return 'Fire';
  if (level >= 46) return 'Slay';
  if (level >= 26) return 'Valid';
  if (level >= 11) return 'Mid';
  return 'NPC';
}

// Initialize gamification for a new user
export async function initializeUserGamification(userId: string): Promise<void> {
  const database = await db;

  const existing = await database
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await database.insert(userGamification).values({
      userId,
      totalXp: 0,
      currentLevel: 1,
      xpToNextLevel: 50,
      rankGenZ: 'NPC',
      rankStrength: 'Untrained',
      currentStreakDays: 0,
      longestStreakDays: 0,
      totalWorkoutsCompleted: 0,
      totalVolumeLiftedKg: '0',
      totalRepsCompleted: 0,
      totalSetsCompleted: 0,
      totalWorkoutMinutes: 0,
      totalPersonalRecords: 0,
    });
  }
}

// Award XP to a user
export async function awardXp(
  userId: string,
  amount: number,
  reason: string,
  sourceId?: string,
  sourceType?: string
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const database = await db;

  // Get current gamification state
  let gamification = await database
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  // Initialize if doesn't exist
  if (gamification.length === 0) {
    await initializeUserGamification(userId);
    gamification = await database
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId))
      .limit(1);
  }

  const current = gamification[0];
  const currentLevel = current.currentLevel;
  const newXp = current.totalXp + amount;
  const newLevel = getLevelFromXp(newXp);
  const leveledUp = newLevel > currentLevel;
  const newRank = getGenZRank(newLevel);

  // Update gamification record
  await database
    .update(userGamification)
    .set({
      totalXp: newXp,
      currentLevel: newLevel,
      xpToNextLevel: getXpForLevel(newLevel + 1) - newXp,
      rankGenZ: newRank,
      updatedAt: new Date(),
    })
    .where(eq(userGamification.userId, userId));

  // Log XP transaction
  await database.insert(xpTransactions).values({
    userId,
    amount,
    reason,
    sourceId,
    sourceType,
  });

  return { newXp, newLevel, leveledUp };
}

// Award XP for completing a workout
export async function awardWorkoutCompletionXp(
  userId: string,
  workoutDurationMinutes: number,
  hadPersonalRecord: boolean
): Promise<{ xpAwarded: number; newLevel: number; leveledUp: boolean }> {
  let totalXp = XP_REWARDS.WORKOUT_COMPLETED;

  // Bonus for duration
  totalXp += workoutDurationMinutes * XP_REWARDS.WORKOUT_COMPLETED_BONUS_PER_MINUTE;

  // Bonus for PR
  if (hadPersonalRecord) {
    totalXp += XP_REWARDS.WORKOUT_COMPLETED_WITH_PR;
  }

  const result = await awardXp(userId, totalXp, 'workout_completed');

  return {
    xpAwarded: totalXp,
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
  };
}

// Award XP for personal record
export async function awardPersonalRecordXp(
  userId: string,
  exerciseId: string
): Promise<{ xpAwarded: number; newLevel: number; leveledUp: boolean }> {
  const result = await awardXp(
    userId,
    XP_REWARDS.PERSONAL_RECORD,
    'personal_record',
    exerciseId,
    'exercise'
  );

  return {
    xpAwarded: XP_REWARDS.PERSONAL_RECORD,
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
  };
}

// Update streak and award bonus XP
export async function updateStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  streakXpAwarded: number;
  milestone: number | null;
}> {
  const database = await db;

  const gamification = await database
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  if (gamification.length === 0) {
    await initializeUserGamification(userId);
    return { currentStreak: 1, longestStreak: 1, streakXpAwarded: 0, milestone: null };
  }

  const current = gamification[0];
  const lastWorkout = current.lastWorkoutDate;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let newStreak = current.currentStreakDays;
  let streakXpAwarded = 0;
  let milestone: number | null = null;

  if (lastWorkout) {
    const lastWorkoutDay = new Date(
      lastWorkout.getFullYear(),
      lastWorkout.getMonth(),
      lastWorkout.getDate()
    );
    const daysDiff = Math.floor((today.getTime() - lastWorkoutDay.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no streak change
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      newStreak += 1;

      // Award streak bonus
      streakXpAwarded = XP_REWARDS.STREAK_DAY_BONUS * newStreak;

      // Check for milestones
      const milestones = [
        { days: 7, xp: XP_REWARDS.STREAK_MILESTONE_7_DAYS },
        { days: 14, xp: XP_REWARDS.STREAK_MILESTONE_14_DAYS },
        { days: 30, xp: XP_REWARDS.STREAK_MILESTONE_30_DAYS },
        { days: 60, xp: XP_REWARDS.STREAK_MILESTONE_60_DAYS },
        { days: 100, xp: XP_REWARDS.STREAK_MILESTONE_100_DAYS },
        { days: 365, xp: XP_REWARDS.STREAK_MILESTONE_365_DAYS },
      ];

      for (const m of milestones) {
        if (newStreak === m.days) {
          streakXpAwarded += m.xp;
          milestone = m.days;
          break;
        }
      }
    } else {
      // Streak broken
      newStreak = 1;
    }
  } else {
    // First workout
    newStreak = 1;
  }

  const newLongestStreak = Math.max(newStreak, current.longestStreakDays);

  // Update database
  await database
    .update(userGamification)
    .set({
      currentStreakDays: newStreak,
      longestStreakDays: newLongestStreak,
      lastWorkoutDate: now,
      updatedAt: now,
    })
    .where(eq(userGamification.userId, userId));

  // Award streak XP if any
  if (streakXpAwarded > 0) {
    await awardXp(userId, streakXpAwarded, milestone ? `streak_milestone_${milestone}` : 'streak_bonus');
  }

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    streakXpAwarded,
    milestone,
  };
}

// Update workout stats
export async function updateWorkoutStats(
  userId: string,
  volumeKg: number,
  reps: number,
  sets: number,
  durationMinutes: number
): Promise<void> {
  const database = await db;

  await database
    .update(userGamification)
    .set({
      totalWorkoutsCompleted: sql`${userGamification.totalWorkoutsCompleted} + 1`,
      totalVolumeLiftedKg: sql`${userGamification.totalVolumeLiftedKg} + ${volumeKg}`,
      totalRepsCompleted: sql`${userGamification.totalRepsCompleted} + ${reps}`,
      totalSetsCompleted: sql`${userGamification.totalSetsCompleted} + ${sets}`,
      totalWorkoutMinutes: sql`${userGamification.totalWorkoutMinutes} + ${durationMinutes}`,
      updatedAt: new Date(),
    })
    .where(eq(userGamification.userId, userId));
}

// Increment personal records count
export async function incrementPersonalRecords(userId: string): Promise<void> {
  const database = await db;

  await database
    .update(userGamification)
    .set({
      totalPersonalRecords: sql`${userGamification.totalPersonalRecords} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(userGamification.userId, userId));
}

// Get user's gamification profile
export async function getUserGamification(userId: string) {
  const database = await db;

  const result = await database
    .select()
    .from(userGamification)
    .where(eq(userGamification.userId, userId))
    .limit(1);

  if (result.length === 0) {
    await initializeUserGamification(userId);
    return (
      await database
        .select()
        .from(userGamification)
        .where(eq(userGamification.userId, userId))
        .limit(1)
    )[0];
  }

  return result[0];
}

// Get recent XP transactions for a user
export async function getRecentXpTransactions(userId: string, limit: number = 20) {
  const database = await db;

  return database
    .select()
    .from(xpTransactions)
    .where(eq(xpTransactions.userId, userId))
    .orderBy(sql`${xpTransactions.createdAt} DESC`)
    .limit(limit);
}

// XP Rewards Configuration
// These values determine how much XP users earn for various actions

export const XP_REWARDS = {
  // Workout completion
  WORKOUT_COMPLETED: 100,
  WORKOUT_COMPLETED_BONUS_PER_MINUTE: 1,
  WORKOUT_COMPLETED_WITH_PR: 50, // Bonus if any PR set during workout

  // Progressive overload achievements
  PERSONAL_RECORD: 50,
  WEIGHT_INCREASE: 15,
  REP_INCREASE: 10,
  VOLUME_INCREASE: 5,

  // Consistency rewards
  STREAK_DAY_BONUS: 5, // Per day bonus multiplier
  STREAK_MILESTONE_7_DAYS: 100,
  STREAK_MILESTONE_14_DAYS: 200,
  STREAK_MILESTONE_30_DAYS: 500,
  STREAK_MILESTONE_60_DAYS: 1000,
  STREAK_MILESTONE_100_DAYS: 2000,
  STREAK_MILESTONE_365_DAYS: 10000,

  // Volume milestones
  VOLUME_MILESTONE_10K_KG: 100,
  VOLUME_MILESTONE_50K_KG: 250,
  VOLUME_MILESTONE_100K_KG: 500,
  VOLUME_MILESTONE_500K_KG: 2500,
  VOLUME_MILESTONE_1M_KG: 5000,

  // Exploration & variety
  NEW_EXERCISE_TRIED: 20,
  ALL_MUSCLE_GROUPS_WEEKLY: 200,
  COMPLETE_FULL_PROGRAM: 300,

  // Social & trainer rewards
  CLIENT_PR_BONUS_FOR_TRAINER: 25,
  TRAINER_WORKOUT_ASSIGNED_COMPLETED: 30,
  FIRST_CLIENT_WORKOUT: 50,

  // Form & technique
  FORM_CHECK_COMPLETED: 25,
  RECOVERY_LOG_SUBMITTED: 10,

  // Nutrition tracking
  MEAL_LOGGED: 5,
  DAILY_MACROS_HIT: 25,
  WEEKLY_NUTRITION_COMPLETE: 100,
} as const;

// Level calculation functions
export function getLevelFromXp(totalXp: number): number {
  // Using a quadratic formula: level = sqrt(totalXp / 50)
  // Level 1 requires 0 XP, Level 2 requires 50 XP, Level 10 requires 5000 XP, etc.
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 50)));
}

export function getXpForLevel(level: number): number {
  // Inverse of the level formula
  return 50 * level * level;
}

export function getXpToNextLevel(totalXp: number): { current: number; required: number; progress: number } {
  const currentLevel = getLevelFromXp(totalXp);
  const xpForCurrentLevel = getXpForLevel(currentLevel);
  const xpForNextLevel = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = totalXp - xpForCurrentLevel;
  const xpRequired = xpForNextLevel - xpForCurrentLevel;

  return {
    current: xpIntoLevel,
    required: xpRequired,
    progress: (xpIntoLevel / xpRequired) * 100,
  };
}

// Gen Z Rank System (NPC -> GOATED)
export const GEN_Z_RANKS = [
  { rank: 'NPC', minLevel: 1, emoji: '🤖', color: 'text-gray-400', description: 'Just spawned into the gym. Time to start your main character arc!' },
  { rank: 'Mid', minLevel: 11, emoji: '😐', color: 'text-gray-500', description: "You're showing up, but let's be real... room for improvement." },
  { rank: 'Valid', minLevel: 26, emoji: '✓', color: 'text-green-500', description: 'Okay, we see you! Your gains are getting noticed.' },
  { rank: 'Slay', minLevel: 46, emoji: '💅', color: 'text-pink-500', description: 'Absolutely slaying it! The gym is your runway.' },
  { rank: 'Fire', minLevel: 71, emoji: '🔥', color: 'text-red-500', description: 'Your workouts are straight fire. Keep that energy!' },
  { rank: 'Bussin', minLevel: 101, emoji: '💯', color: 'text-orange-500', description: "Your gains are bussin'! Everyone's asking for your routine." },
  { rank: 'No Cap', minLevel: 151, emoji: '🧢', color: 'text-yellow-500', description: "No cap, you're elite. Respect earned." },
  { rank: 'GOATED', minLevel: 200, emoji: '🐐', color: 'text-purple-500', description: "THE GREATEST. You've achieved legendary status." },
] as const;

export function getGenZRank(level: number): typeof GEN_Z_RANKS[number] {
  // Find the highest rank the user qualifies for
  for (let i = GEN_Z_RANKS.length - 1; i >= 0; i--) {
    if (level >= GEN_Z_RANKS[i].minLevel) {
      return GEN_Z_RANKS[i];
    }
  }
  return GEN_Z_RANKS[0];
}

// Strength Classification System
export const STRENGTH_CLASSIFICATIONS = [
  'Untrained',
  'Beginner',
  'Novice',
  'Intermediate',
  'Advanced',
  'Elite',
] as const;

export type StrengthClassification = typeof STRENGTH_CLASSIFICATIONS[number];

// Strength classification colors for UI
export const STRENGTH_COLORS: Record<StrengthClassification, string> = {
  Untrained: 'text-gray-400',
  Beginner: 'text-gray-500',
  Novice: 'text-blue-500',
  Intermediate: 'text-green-500',
  Advanced: 'text-orange-500',
  Elite: 'text-purple-500',
};

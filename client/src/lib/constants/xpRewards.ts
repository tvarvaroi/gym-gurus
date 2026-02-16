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

// Unified Rank System (Newcomer -> GOATED)
// Single source of truth for rank progression used by RankBadge, XPBar, etc.
export const RANKS = [
  { name: 'Newcomer', minLevel: 1, emoji: '🌟', color: 'text-gray-500', bgColor: 'bg-gray-100', borderColor: 'border-gray-300', description: 'Welcome to the gym! Time to start your fitness journey!' },
  { name: 'Newbie', minLevel: 5, emoji: '🌱', color: 'text-green-500', bgColor: 'bg-green-100', borderColor: 'border-green-300', description: "You're building habits. Consistency is key!" },
  { name: 'Rookie', minLevel: 10, emoji: '⭐', color: 'text-blue-500', bgColor: 'bg-blue-100', borderColor: 'border-blue-300', description: 'Getting into the groove. Your gains are starting to show!' },
  { name: 'Grinder', minLevel: 20, emoji: '💪', color: 'text-yellow-500', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-300', description: "Putting in the work day after day. That's the grind!" },
  { name: 'Beast Mode', minLevel: 30, emoji: '🔥', color: 'text-orange-500', bgColor: 'bg-orange-100', borderColor: 'border-orange-300', description: 'Your workouts are straight fire. Keep that energy!' },
  { name: 'Warrior', minLevel: 40, emoji: '⚔️', color: 'text-purple-500', bgColor: 'bg-purple-100', borderColor: 'border-purple-300', description: 'Discipline forged in iron. You train with purpose.' },
  { name: 'Champion', minLevel: 50, emoji: '🏆', color: 'text-indigo-500', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-300', description: "Everyone's asking for your routine. You lead by example." },
  { name: 'Main Character', minLevel: 60, emoji: '👑', color: 'text-pink-500', bgColor: 'bg-pink-100', borderColor: 'border-pink-300', description: 'The gym is your stage. All eyes on you.' },
  { name: 'Built Different', minLevel: 75, emoji: '💎', color: 'text-cyan-500', bgColor: 'bg-cyan-100', borderColor: 'border-cyan-300', description: "No cap, you're elite. Respect earned." },
  { name: 'GOATED', minLevel: 100, emoji: '🐐', color: 'text-amber-500', bgColor: 'bg-gradient-to-r from-amber-100 to-yellow-100', borderColor: 'border-amber-400', description: "THE GREATEST. You've achieved legendary status." },
] as const;

export type Rank = typeof RANKS[number];

// Backward compatibility
export const GEN_Z_RANKS = RANKS;

export function getRankForLevel(level: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLevel) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getNextRank(level: number): Rank | null {
  const currentRankIndex = RANKS.findIndex((r, i) =>
    level >= r.minLevel && (i === RANKS.length - 1 || level < RANKS[i + 1].minLevel)
  );
  return RANKS[currentRankIndex + 1] || null;
}

export function getLevelsToNextRank(level: number): number | null {
  const nextRank = getNextRank(level);
  if (!nextRank) return null;
  return nextRank.minLevel - level;
}

// Backward compatibility alias
export const getGenZRank = getRankForLevel;

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

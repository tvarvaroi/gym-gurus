export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji icon
  category: 'streak' | 'workout' | 'progress' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  requirement: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number; // Current progress towards achievement
}

export interface BadgeCalculationData {
  completedWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  weightLost?: number; // in kg
  progressEntries: number;
  daysActive?: number;
}

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = [
  // Streak Achievements
  {
    id: 'streak_3',
    title: 'On Fire!',
    description: 'Complete workouts for 3 days in a row',
    icon: '🔥',
    category: 'streak' as const,
    tier: 'bronze' as const,
    requirement: 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Achieve a 7-day workout streak',
    icon: '⚡',
    category: 'streak' as const,
    tier: 'silver' as const,
    requirement: 7,
  },
  {
    id: 'streak_14',
    title: 'Two Week Champion',
    description: 'Maintain a 14-day workout streak',
    icon: '💪',
    category: 'streak' as const,
    tier: 'gold' as const,
    requirement: 14,
  },
  {
    id: 'streak_30',
    title: 'Month Master',
    description: 'Complete a 30-day workout streak',
    icon: '👑',
    category: 'streak' as const,
    tier: 'platinum' as const,
    requirement: 30,
  },
  {
    id: 'streak_100',
    title: 'Century Streak',
    description: 'Achieve an incredible 100-day streak',
    icon: '💎',
    category: 'streak' as const,
    tier: 'diamond' as const,
    requirement: 100,
  },

  // Workout Completion Achievements
  {
    id: 'workout_1',
    title: 'First Step',
    description: 'Complete your first workout',
    icon: '🎯',
    category: 'workout' as const,
    tier: 'bronze' as const,
    requirement: 1,
  },
  {
    id: 'workout_10',
    title: 'Getting Started',
    description: 'Complete 10 workouts',
    icon: '🏃',
    category: 'workout' as const,
    tier: 'bronze' as const,
    requirement: 10,
  },
  {
    id: 'workout_25',
    title: 'Quarter Century',
    description: 'Complete 25 workouts',
    icon: '🎖️',
    category: 'workout' as const,
    tier: 'silver' as const,
    requirement: 25,
  },
  {
    id: 'workout_50',
    title: 'Half Century',
    description: 'Complete 50 workouts',
    icon: '🏅',
    category: 'workout' as const,
    tier: 'gold' as const,
    requirement: 50,
  },
  {
    id: 'workout_100',
    title: 'Centurion',
    description: 'Complete 100 workouts',
    icon: '🥇',
    category: 'workout' as const,
    tier: 'platinum' as const,
    requirement: 100,
  },
  {
    id: 'workout_250',
    title: 'Elite Athlete',
    description: 'Complete 250 workouts',
    icon: '🏆',
    category: 'workout' as const,
    tier: 'diamond' as const,
    requirement: 250,
  },

  // Progress Tracking Achievements
  {
    id: 'progress_5',
    title: 'Progress Tracker',
    description: 'Record 5 progress entries',
    icon: '📊',
    category: 'progress' as const,
    tier: 'bronze' as const,
    requirement: 5,
  },
  {
    id: 'progress_20',
    title: 'Data Driven',
    description: 'Record 20 progress entries',
    icon: '📈',
    category: 'progress' as const,
    tier: 'silver' as const,
    requirement: 20,
  },
  {
    id: 'progress_50',
    title: 'Metrics Master',
    description: 'Record 50 progress entries',
    icon: '📉',
    category: 'progress' as const,
    tier: 'gold' as const,
    requirement: 50,
  },

  // Milestone Achievements
  {
    id: 'complete_all',
    title: 'Perfectionist',
    description: 'Complete all assigned workouts',
    icon: '✨',
    category: 'milestone' as const,
    tier: 'gold' as const,
    requirement: 100, // 100% completion
  },
];

// Tier colors for badges
export const TIER_COLORS = {
  bronze: {
    bg: 'from-amber-700 via-amber-600 to-amber-700',
    border: 'border-amber-600/50',
    glow: 'shadow-amber-500/20',
  },
  silver: {
    bg: 'from-gray-400 via-gray-300 to-gray-400',
    border: 'border-gray-400/50',
    glow: 'shadow-gray-400/20',
  },
  gold: {
    bg: 'from-yellow-500 via-yellow-400 to-yellow-500',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-400/20',
  },
  platinum: {
    bg: 'from-blue-400 via-cyan-300 to-blue-400',
    border: 'border-cyan-400/50',
    glow: 'shadow-cyan-400/20',
  },
  diamond: {
    bg: 'from-purple-500 via-pink-400 to-purple-500',
    border: 'border-purple-400/50',
    glow: 'shadow-purple-400/20',
  },
};

/**
 * Calculate which achievements have been unlocked
 */
export function calculateAchievements(data: BadgeCalculationData): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    let unlocked = false;
    let progress = 0;

    switch (def.category) {
      case 'streak':
        progress = data.longestStreak; // Use longest streak for achievement tracking
        unlocked = data.longestStreak >= def.requirement;
        break;

      case 'workout':
        progress = data.completedWorkouts;
        unlocked = data.completedWorkouts >= def.requirement;
        break;

      case 'progress':
        progress = data.progressEntries;
        unlocked = data.progressEntries >= def.requirement;
        break;

      case 'milestone':
        if (def.id === 'complete_all') {
          const completionRate = data.totalWorkouts > 0
            ? (data.completedWorkouts / data.totalWorkouts) * 100
            : 0;
          progress = completionRate;
          unlocked = completionRate === 100 && data.totalWorkouts > 0;
        }
        break;
    }

    return {
      ...def,
      unlocked,
      progress,
      unlockedAt: unlocked ? new Date() : undefined,
    };
  });
}

/**
 * Get achievements grouped by tier
 */
export function groupAchievementsByTier(achievements: Achievement[]) {
  return {
    diamond: achievements.filter(a => a.tier === 'diamond'),
    platinum: achievements.filter(a => a.tier === 'platinum'),
    gold: achievements.filter(a => a.tier === 'gold'),
    silver: achievements.filter(a => a.tier === 'silver'),
    bronze: achievements.filter(a => a.tier === 'bronze'),
  };
}

/**
 * Get recently unlocked achievements (for celebration animations)
 */
export function getRecentlyUnlockedAchievements(
  achievements: Achievement[],
  withinHours: number = 24
): Achievement[] {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - withinHours * 60 * 60 * 1000);

  return achievements.filter(
    (achievement) =>
      achievement.unlocked &&
      achievement.unlockedAt &&
      achievement.unlockedAt >= cutoffTime
  );
}

/**
 * Get next achievement to unlock
 */
export function getNextAchievement(achievements: Achievement[]): Achievement | null {
  const locked = achievements
    .filter(a => !a.unlocked)
    .sort((a, b) => {
      // Sort by progress percentage descending
      const aProgress = a.progress || 0;
      const bProgress = b.progress || 0;
      const aPercent = (aProgress / a.requirement) * 100;
      const bPercent = (bProgress / b.requirement) * 100;
      return bPercent - aPercent;
    });

  return locked.length > 0 ? locked[0] : null;
}

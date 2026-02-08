import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import type { Achievement } from '@/components/gamification/AchievementUnlockModal';

// Types
interface UserGamification {
  userId: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  workoutsCompleted: number;
  lastWorkoutDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserAchievement {
  id: string;
  achievementId: string;
  userId: string;
  progress: number;
  completed: boolean;
  unlockedAt: string | null;
  achievement?: Achievement;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  level: number;
  username?: string;
  isCurrentUser?: boolean;
}

interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  source: string;
  description: string;
  createdAt: string;
}

// API functions
async function fetchUserGamification(userId: string): Promise<UserGamification> {
  const response = await fetch(`/api/gamification/profile/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch gamification profile');
  return response.json();
}

async function fetchUserAchievements(userId: string): Promise<UserAchievement[]> {
  const response = await fetch(`/api/gamification/achievements/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch achievements');
  return response.json();
}

async function fetchLeaderboard(
  type: string,
  period: string,
  limit = 50
): Promise<{ entries: LeaderboardEntry[] }> {
  const response = await fetch(`/api/leaderboards/${type}/${period}?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch leaderboard');
  return response.json();
}

async function fetchUserRank(
  userId: string,
  type: string,
  period: string
): Promise<{ rank: number; score: number; percentile: number }> {
  const response = await fetch(`/api/leaderboards/${type}/${period}/user/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user rank');
  return response.json();
}

async function awardXP(
  userId: string,
  amount: number,
  source: string,
  description?: string
): Promise<{ xpAwarded: number; newTotal: number; newLevel: number; leveledUp: boolean }> {
  const response = await fetch('/api/gamification/award-xp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount, source, description }),
  });
  if (!response.ok) throw new Error('Failed to award XP');
  return response.json();
}

async function checkAchievements(userId: string): Promise<{ newAchievements: Achievement[] }> {
  const response = await fetch(`/api/gamification/check-achievements/${userId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to check achievements');
  return response.json();
}

async function updateStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
  const response = await fetch(`/api/gamification/update-streak/${userId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to update streak');
  return response.json();
}

// Level calculation
export function calculateLevel(xp: number): number {
  // Formula: Level = floor(sqrt(xp / 100))
  // This means: Level 1 = 0-99 XP, Level 2 = 100-399 XP, Level 3 = 400-899 XP, etc.
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function xpForLevel(level: number): number {
  // XP needed to reach a specific level
  return Math.pow(level - 1, 2) * 100;
}

export function xpToNextLevel(currentXp: number): { current: number; needed: number; progress: number } {
  const currentLevel = calculateLevel(currentXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const xpInCurrentLevel = currentXp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;

  return {
    current: xpInCurrentLevel,
    needed: xpNeededForNextLevel,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

// Main hook
export function useGamification(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);

  // Fetch user gamification profile
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['gamification', 'profile', userId],
    queryFn: () => fetchUserGamification(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch user achievements
  const {
    data: achievements,
    isLoading: isLoadingAchievements,
    error: achievementsError,
    refetch: refetchAchievements,
  } = useQuery({
    queryKey: ['gamification', 'achievements', userId],
    queryFn: () => fetchUserAchievements(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });

  // Award XP mutation
  const awardXPMutation = useMutation({
    mutationFn: ({ amount, source, description }: { amount: number; source: string; description?: string }) =>
      awardXP(userId!, amount, source, description),
    onSuccess: (data) => {
      // Invalidate profile to refetch with new XP
      queryClient.invalidateQueries({ queryKey: ['gamification', 'profile', userId] });

      // If leveled up, trigger a celebration
      if (data.leveledUp) {
        // This could trigger a level up modal/animation
        console.log(`Level up! New level: ${data.newLevel}`);
      }
    },
  });

  // Check achievements mutation
  const checkAchievementsMutation = useMutation({
    mutationFn: () => checkAchievements(userId!),
    onSuccess: (data) => {
      if (data.newAchievements.length > 0) {
        // Add new achievements to pending queue for display
        setPendingAchievements((prev) => [...prev, ...data.newAchievements]);
        // Invalidate achievements query
        queryClient.invalidateQueries({ queryKey: ['gamification', 'achievements', userId] });
      }
    },
  });

  // Update streak mutation
  const updateStreakMutation = useMutation({
    mutationFn: () => updateStreak(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'profile', userId] });
    },
  });

  // Dismiss achievement from queue
  const dismissAchievement = useCallback((achievementId: string) => {
    setPendingAchievements((prev) => prev.filter((a) => a.id !== achievementId));
  }, []);

  // Calculate XP progress
  const xpProgress = useMemo(() => {
    if (!profile) return null;
    return xpToNextLevel(profile.totalXp);
  }, [profile]);

  // Computed values
  const completedAchievements = useMemo(() => {
    return achievements?.filter((a) => a.completed) || [];
  }, [achievements]);

  const inProgressAchievements = useMemo(() => {
    return achievements?.filter((a) => !a.completed && a.progress > 0) || [];
  }, [achievements]);

  return {
    // Profile data
    profile,
    isLoadingProfile,
    profileError,
    refetchProfile,

    // XP progress
    xpProgress,
    level: profile?.level ?? 1,
    totalXp: profile?.totalXp ?? 0,

    // Streak
    currentStreak: profile?.currentStreak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,

    // Achievements
    achievements,
    completedAchievements,
    inProgressAchievements,
    isLoadingAchievements,
    achievementsError,
    refetchAchievements,

    // Pending achievements for display
    pendingAchievements,
    dismissAchievement,

    // Mutations
    awardXP: awardXPMutation.mutate,
    isAwardingXP: awardXPMutation.isPending,
    checkAchievements: checkAchievementsMutation.mutate,
    isCheckingAchievements: checkAchievementsMutation.isPending,
    updateStreak: updateStreakMutation.mutate,
    isUpdatingStreak: updateStreakMutation.isPending,

    // Utility functions
    calculateLevel,
    xpForLevel,
    xpToNextLevel,
  };
}

// Leaderboard hook
export function useLeaderboard(type: string, period: string, userId?: string) {
  const {
    data: leaderboard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['leaderboard', type, period],
    queryFn: () => fetchLeaderboard(type, period),
    staleTime: 60 * 1000, // 1 minute
  });

  const {
    data: userRank,
    isLoading: isLoadingRank,
    error: rankError,
  } = useQuery({
    queryKey: ['leaderboard', type, period, 'user', userId],
    queryFn: () => fetchUserRank(userId!, type, period),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return {
    entries: leaderboard?.entries || [],
    userRank,
    isLoading,
    isLoadingRank,
    error,
    rankError,
    refetch,
  };
}

export default useGamification;

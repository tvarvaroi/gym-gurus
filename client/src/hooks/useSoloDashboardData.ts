import { useQuery } from '@tanstack/react-query';

export function useSoloDashboardData() {
  const soloStats = useQuery<any>({
    queryKey: ['/api/solo/stats'],
    retry: false,
    staleTime: 2 * 60 * 1000,
  });

  const gamification = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const strengthSummary = useQuery<any>({
    queryKey: ['/api/strength/summary'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const fitnessProfile = useQuery<any>({
    queryKey: ['/api/solo/fitness-profile'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const fatigueData = useQuery<any[]>({
    queryKey: ['/api/recovery/fatigue'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const weeklyActivity = useQuery<any>({
    queryKey: ['/api/solo/weekly-activity'],
    retry: false,
    staleTime: 2 * 60 * 1000,
  });

  const progress = useQuery<any>({
    queryKey: ['/api/solo/progress'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const xpHistory = useQuery<any[]>({
    queryKey: ['/api/gamification/xp/history'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const mealPlans = useQuery<any[]>({
    queryKey: ['/api/solo/meal-plans'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isInitialLoading = soloStats.isLoading && gamification.isLoading;
  const hasError = soloStats.error;

  // Per-section loading states for inline skeletons
  const weeklyLoading =
    soloStats.isLoading ||
    strengthSummary.isLoading ||
    gamification.isLoading ||
    progress.isLoading ||
    weeklyActivity.isLoading;
  const recoveryLoading = fatigueData.isLoading || fitnessProfile.isLoading;
  const activityLoading = progress.isLoading || xpHistory.isLoading || mealPlans.isLoading;

  return {
    soloStats: soloStats.data,
    gamification: gamification.data,
    strengthSummary: strengthSummary.data,
    fitnessProfile: fitnessProfile.data,
    fatigueData: fatigueData.data,
    weeklyActivity: weeklyActivity.data,
    progress: progress.data,
    xpHistory: xpHistory.data,
    mealPlans: mealPlans.data,
    isInitialLoading,
    hasError,
    weeklyLoading,
    recoveryLoading,
    activityLoading,
  };
}

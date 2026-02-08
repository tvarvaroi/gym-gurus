import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

// Types
export interface MuscleFatigue {
  id: string;
  oderId: string;
  muscleGroup: string;
  fatigueLevel: number; // 0-100
  lastWorkedAt: string | null;
  estimatedRecoveryAt: string | null;
  setsPerformed: number;
  volumeLogged: number;
  createdAt: string;
  updatedAt: string;
}

export interface MuscleVolume {
  id: string;
  oderId: string;
  muscleGroup: string;
  weekNumber: number;
  weekYear: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  avgIntensity: number;
  createdAt: string;
}

export interface RecoveryRecommendation {
  muscleGroup: string;
  status: 'recovered' | 'recovering' | 'fatigued' | 'overtrained';
  fatigueLevel: number;
  hoursUntilRecovered: number;
  recommendation: string;
  canTrain: boolean;
}

export interface WorkoutRecoveryLog {
  id: string;
  userId: string;
  workoutId: string;
  perceivedExertion: number; // RPE 1-10
  sleepQuality: number; // 1-5
  muscleScores: number; // 1-10
  overallRecovery: number; // Calculated
  notes: string | null;
  loggedAt: string;
}

// Recovery status colors and thresholds
export const RECOVERY_STATUS = {
  recovered: { threshold: 20, color: 'green', label: 'Fully Recovered' },
  recovering: { threshold: 50, color: 'yellow', label: 'Recovering' },
  fatigued: { threshold: 80, color: 'orange', label: 'Fatigued' },
  overtrained: { threshold: 100, color: 'red', label: 'Overtrained' },
} as const;

// Calculate recovery status from fatigue level
export function getRecoveryStatus(fatigueLevel: number): keyof typeof RECOVERY_STATUS {
  if (fatigueLevel <= RECOVERY_STATUS.recovered.threshold) return 'recovered';
  if (fatigueLevel <= RECOVERY_STATUS.recovering.threshold) return 'recovering';
  if (fatigueLevel <= RECOVERY_STATUS.fatigued.threshold) return 'fatigued';
  return 'overtrained';
}

// Calculate estimated hours until recovery
export function getHoursUntilRecovered(fatigueLevel: number, baseRecoveryHours = 48): number {
  // Simple linear model: more fatigue = more recovery time
  return Math.round((fatigueLevel / 100) * baseRecoveryHours);
}

// API functions
async function fetchMuscleFatigue(userId: string): Promise<MuscleFatigue[]> {
  const response = await fetch(`/api/recovery/fatigue/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch muscle fatigue');
  return response.json();
}

async function fetchMuscleVolume(userId: string, weeks = 4): Promise<MuscleVolume[]> {
  const response = await fetch(`/api/recovery/volume/${userId}?weeks=${weeks}`);
  if (!response.ok) throw new Error('Failed to fetch muscle volume');
  return response.json();
}

async function fetchRecoveryRecommendations(userId: string): Promise<RecoveryRecommendation[]> {
  const response = await fetch(`/api/recovery/recommendations/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch recommendations');
  return response.json();
}

async function logWorkoutRecovery(
  userId: string,
  workoutId: string,
  data: { perceivedExertion: number; sleepQuality: number; muscleScores: number; notes?: string }
): Promise<WorkoutRecoveryLog> {
  const response = await fetch('/api/recovery/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, workoutId, ...data }),
  });
  if (!response.ok) throw new Error('Failed to log recovery');
  return response.json();
}

async function updateMuscleFatigue(
  userId: string,
  muscleGroup: string,
  fatigueIncrease: number,
  setsPerformed: number,
  volumeLogged: number
): Promise<MuscleFatigue> {
  const response = await fetch('/api/recovery/fatigue/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      muscleGroup,
      fatigueIncrease,
      setsPerformed,
      volumeLogged,
    }),
  });
  if (!response.ok) throw new Error('Failed to update muscle fatigue');
  return response.json();
}

// Main hook
export function useRecovery(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch muscle fatigue data
  const {
    data: muscleFatigue,
    isLoading: isLoadingFatigue,
    error: fatigueError,
    refetch: refetchFatigue,
  } = useQuery({
    queryKey: ['recovery', 'fatigue', userId],
    queryFn: () => fetchMuscleFatigue(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch muscle volume data
  const {
    data: muscleVolume,
    isLoading: isLoadingVolume,
    error: volumeError,
    refetch: refetchVolume,
  } = useQuery({
    queryKey: ['recovery', 'volume', userId],
    queryFn: () => fetchMuscleVolume(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch recovery recommendations
  const {
    data: recommendations,
    isLoading: isLoadingRecommendations,
    error: recommendationsError,
    refetch: refetchRecommendations,
  } = useQuery({
    queryKey: ['recovery', 'recommendations', userId],
    queryFn: () => fetchRecoveryRecommendations(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Log workout recovery mutation
  const logRecoveryMutation = useMutation({
    mutationFn: ({
      workoutId,
      data,
    }: {
      workoutId: string;
      data: { perceivedExertion: number; sleepQuality: number; muscleScores: number; notes?: string };
    }) => logWorkoutRecovery(userId!, workoutId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery', 'fatigue', userId] });
      queryClient.invalidateQueries({ queryKey: ['recovery', 'recommendations', userId] });
    },
  });

  // Update muscle fatigue mutation
  const updateFatigueMutation = useMutation({
    mutationFn: ({
      muscleGroup,
      fatigueIncrease,
      setsPerformed,
      volumeLogged,
    }: {
      muscleGroup: string;
      fatigueIncrease: number;
      setsPerformed: number;
      volumeLogged: number;
    }) => updateMuscleFatigue(userId!, muscleGroup, fatigueIncrease, setsPerformed, volumeLogged),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery', 'fatigue', userId] });
      queryClient.invalidateQueries({ queryKey: ['recovery', 'volume', userId] });
      queryClient.invalidateQueries({ queryKey: ['recovery', 'recommendations', userId] });
    },
  });

  // Computed values
  const fatigueByMuscle = useMemo(() => {
    if (!muscleFatigue) return {};
    return muscleFatigue.reduce(
      (acc, item) => {
        acc[item.muscleGroup] = item;
        return acc;
      },
      {} as Record<string, MuscleFatigue>
    );
  }, [muscleFatigue]);

  const overallFatigue = useMemo(() => {
    if (!muscleFatigue || muscleFatigue.length === 0) return 0;
    const total = muscleFatigue.reduce((sum, item) => sum + item.fatigueLevel, 0);
    return Math.round(total / muscleFatigue.length);
  }, [muscleFatigue]);

  const mostFatiguedMuscles = useMemo(() => {
    if (!muscleFatigue) return [];
    return [...muscleFatigue]
      .sort((a, b) => b.fatigueLevel - a.fatigueLevel)
      .slice(0, 3);
  }, [muscleFatigue]);

  const recoveredMuscles = useMemo(() => {
    if (!muscleFatigue) return [];
    return muscleFatigue.filter(
      (m) => getRecoveryStatus(m.fatigueLevel) === 'recovered'
    );
  }, [muscleFatigue]);

  const canTrainMuscles = useMemo(() => {
    if (!recommendations) return [];
    return recommendations.filter((r) => r.canTrain).map((r) => r.muscleGroup);
  }, [recommendations]);

  // Weekly volume by muscle
  const weeklyVolumeByMuscle = useMemo(() => {
    if (!muscleVolume) return {};
    return muscleVolume.reduce(
      (acc, item) => {
        if (!acc[item.muscleGroup]) {
          acc[item.muscleGroup] = [];
        }
        acc[item.muscleGroup].push(item);
        return acc;
      },
      {} as Record<string, MuscleVolume[]>
    );
  }, [muscleVolume]);

  return {
    // Fatigue data
    muscleFatigue,
    fatigueByMuscle,
    overallFatigue,
    mostFatiguedMuscles,
    recoveredMuscles,
    isLoadingFatigue,
    fatigueError,
    refetchFatigue,

    // Volume data
    muscleVolume,
    weeklyVolumeByMuscle,
    isLoadingVolume,
    volumeError,
    refetchVolume,

    // Recommendations
    recommendations,
    canTrainMuscles,
    isLoadingRecommendations,
    recommendationsError,
    refetchRecommendations,

    // Mutations
    logRecovery: logRecoveryMutation.mutate,
    isLoggingRecovery: logRecoveryMutation.isPending,
    updateFatigue: updateFatigueMutation.mutate,
    isUpdatingFatigue: updateFatigueMutation.isPending,

    // Utility functions
    getRecoveryStatus,
    getHoursUntilRecovered,
    RECOVERY_STATUS,
  };
}

export default useRecovery;

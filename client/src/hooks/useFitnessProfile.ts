import { useQuery } from '@tanstack/react-query';

interface FitnessProfile {
  weightKg: number | null;
  heightCm: number | null;
  gender: 'male' | 'female' | null;
  age: number | null;
  activityLevel: string | null;
  bodyFatPercentage: number | null;
  primaryGoal: string | null;
  dailyCalorieTarget: number | null;
  proteinTargetGrams: number | null;
  isLoaded: boolean;
}

export function useFitnessProfile(): FitnessProfile {
  const { data, isFetched } = useQuery<Record<string, unknown>>({
    queryKey: ['/api/users/fitness-profile'],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const profile = data as Record<string, unknown> | undefined;

  let age: number | null = null;
  if (profile?.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth as string);
    age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    if (age <= 0 || age >= 120) age = null;
  }

  return {
    weightKg: profile?.weightKg ? Number(profile.weightKg) : null,
    heightCm: profile?.heightCm ? Number(profile.heightCm) : null,
    gender: profile?.gender === 'male' || profile?.gender === 'female' ? profile.gender : null,
    age,
    activityLevel: (profile?.activityLevel as string) || null,
    bodyFatPercentage: profile?.bodyFatPercentage ? Number(profile.bodyFatPercentage) : null,
    primaryGoal: (profile?.primaryGoal as string) || null,
    dailyCalorieTarget: profile?.dailyCalorieTarget ? Number(profile.dailyCalorieTarget) : null,
    proteinTargetGrams: profile?.proteinTargetGrams ? Number(profile.proteinTargetGrams) : null,
    isLoaded: isFetched,
  };
}

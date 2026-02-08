// Muscle Groups and Exercise Mapping for GymGurus
// Used for recovery tracking, volume analytics, and exercise categorization

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
  'lower_back',
  'traps',
  'lats',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

// Muscle group display names
export const MUSCLE_GROUP_DISPLAY_NAMES: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  abs: 'Abs',
  obliques: 'Obliques',
  lower_back: 'Lower Back',
  traps: 'Traps',
  lats: 'Lats',
};

// Muscle group colors for charts/UI
export const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  chest: '#ef4444', // red
  back: '#3b82f6', // blue
  shoulders: '#f97316', // orange
  biceps: '#22c55e', // green
  triceps: '#a855f7', // purple
  forearms: '#eab308', // yellow
  quads: '#ec4899', // pink
  hamstrings: '#06b6d4', // cyan
  glutes: '#f43f5e', // rose
  calves: '#14b8a6', // teal
  abs: '#8b5cf6', // violet
  obliques: '#84cc16', // lime
  lower_back: '#64748b', // slate
  traps: '#0ea5e9', // sky
  lats: '#6366f1', // indigo
};

// Default recovery hours for each muscle group
export const MUSCLE_RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest: 48,
  back: 48,
  shoulders: 48,
  biceps: 36,
  triceps: 36,
  forearms: 24,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  calves: 48,
  abs: 24,
  obliques: 24,
  lower_back: 48,
  traps: 48,
  lats: 48,
};

// Major compound exercise to muscle group mapping
// Primary muscles are weighted at 1.0, secondary at 0.5, tertiary at 0.25
export interface ExerciseMuscleMapping {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary?: MuscleGroup[];
}

export const COMPOUND_EXERCISE_MUSCLES: Record<string, ExerciseMuscleMapping> = {
  // Chest exercises
  bench_press: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  incline_bench_press: { primary: ['chest'], secondary: ['shoulders', 'triceps'] },
  decline_bench_press: { primary: ['chest'], secondary: ['triceps'] },
  dumbbell_press: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  push_up: { primary: ['chest'], secondary: ['triceps', 'shoulders'], tertiary: ['abs'] },
  chest_fly: { primary: ['chest'], secondary: [] },
  cable_crossover: { primary: ['chest'], secondary: [] },

  // Back exercises
  deadlift: { primary: ['back', 'hamstrings', 'glutes'], secondary: ['quads', 'forearms', 'traps'], tertiary: ['abs', 'lower_back'] },
  barbell_row: { primary: ['back', 'lats'], secondary: ['biceps', 'traps'], tertiary: ['forearms'] },
  pull_up: { primary: ['lats', 'back'], secondary: ['biceps'], tertiary: ['forearms', 'abs'] },
  chin_up: { primary: ['lats', 'biceps'], secondary: ['back'], tertiary: ['forearms'] },
  lat_pulldown: { primary: ['lats'], secondary: ['biceps', 'back'] },
  seated_row: { primary: ['back', 'lats'], secondary: ['biceps', 'traps'] },
  t_bar_row: { primary: ['back', 'lats'], secondary: ['biceps', 'traps'] },

  // Shoulder exercises
  overhead_press: { primary: ['shoulders'], secondary: ['triceps'], tertiary: ['traps', 'abs'] },
  military_press: { primary: ['shoulders'], secondary: ['triceps', 'traps'] },
  lateral_raise: { primary: ['shoulders'], secondary: [] },
  front_raise: { primary: ['shoulders'], secondary: [] },
  rear_delt_fly: { primary: ['shoulders'], secondary: ['back'] },
  arnold_press: { primary: ['shoulders'], secondary: ['triceps'] },
  face_pull: { primary: ['shoulders', 'traps'], secondary: ['back'] },

  // Leg exercises
  squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings'], tertiary: ['abs', 'lower_back'] },
  front_squat: { primary: ['quads'], secondary: ['glutes'], tertiary: ['abs'] },
  leg_press: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  lunge: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  romanian_deadlift: { primary: ['hamstrings', 'glutes'], secondary: ['lower_back'] },
  leg_curl: { primary: ['hamstrings'], secondary: [] },
  leg_extension: { primary: ['quads'], secondary: [] },
  hip_thrust: { primary: ['glutes'], secondary: ['hamstrings'] },
  calf_raise: { primary: ['calves'], secondary: [] },

  // Arm exercises
  bicep_curl: { primary: ['biceps'], secondary: ['forearms'] },
  hammer_curl: { primary: ['biceps'], secondary: ['forearms'] },
  preacher_curl: { primary: ['biceps'], secondary: [] },
  tricep_extension: { primary: ['triceps'], secondary: [] },
  tricep_dip: { primary: ['triceps'], secondary: ['chest', 'shoulders'] },
  skull_crusher: { primary: ['triceps'], secondary: [] },
  close_grip_bench: { primary: ['triceps'], secondary: ['chest'] },

  // Core exercises
  plank: { primary: ['abs'], secondary: ['obliques', 'lower_back'] },
  crunch: { primary: ['abs'], secondary: [] },
  russian_twist: { primary: ['obliques'], secondary: ['abs'] },
  leg_raise: { primary: ['abs'], secondary: [] },
  cable_crunch: { primary: ['abs'], secondary: [] },
  ab_wheel: { primary: ['abs'], secondary: ['shoulders', 'lats'] },
  back_extension: { primary: ['lower_back'], secondary: ['glutes', 'hamstrings'] },
};

// Get muscle groups for an exercise (returns all muscles with their importance weights)
export function getExerciseMuscles(exerciseName: string): { muscle: MuscleGroup; weight: number }[] {
  const normalized = exerciseName.toLowerCase().replace(/[^a-z]/g, '_');
  const mapping = COMPOUND_EXERCISE_MUSCLES[normalized];

  if (!mapping) {
    return [];
  }

  const result: { muscle: MuscleGroup; weight: number }[] = [];

  mapping.primary.forEach(muscle => {
    result.push({ muscle, weight: 1.0 });
  });

  mapping.secondary.forEach(muscle => {
    result.push({ muscle, weight: 0.5 });
  });

  mapping.tertiary?.forEach(muscle => {
    result.push({ muscle, weight: 0.25 });
  });

  return result;
}

// Calculate fatigue contribution for a set
export function calculateFatigueContribution(
  muscleWeight: number,
  sets: number,
  reps: number,
  intensity: number = 0.7 // Default 70% intensity
): number {
  // Base fatigue formula: weight * sets * reps * intensity
  // Normalized to a 0-100 scale where 10 sets of 10 at 70% = ~50% fatigue
  const baseFatigue = muscleWeight * sets * reps * intensity;
  return Math.min(100, baseFatigue / 1.4); // Cap at 100
}

// Body region groupings for UI display
export const BODY_REGIONS = {
  upper_push: ['chest', 'shoulders', 'triceps'] as MuscleGroup[],
  upper_pull: ['back', 'lats', 'biceps', 'traps', 'forearms'] as MuscleGroup[],
  core: ['abs', 'obliques', 'lower_back'] as MuscleGroup[],
  lower: ['quads', 'hamstrings', 'glutes', 'calves'] as MuscleGroup[],
};

export type BodyRegion = keyof typeof BODY_REGIONS;

export const BODY_REGION_NAMES: Record<BodyRegion, string> = {
  upper_push: 'Upper Body (Push)',
  upper_pull: 'Upper Body (Pull)',
  core: 'Core',
  lower: 'Lower Body',
};

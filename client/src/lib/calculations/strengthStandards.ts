// Strength Standards Calculator
// Based on data from StrengthLevel.com (153M+ lifts analyzed)

import { StrengthClassification, STRENGTH_COLORS } from '../constants/xpRewards';

// Strength standards as body weight multipliers
// [beginner, novice, intermediate, advanced, elite]
// These are 1RM values relative to bodyweight

interface StrengthStandardsData {
  [bodyweight: number]: [number, number, number, number, number];
}

interface ExerciseStandards {
  male: StrengthStandardsData;
  female: StrengthStandardsData;
}

export const STRENGTH_STANDARDS: Record<string, ExerciseStandards> = {
  // Bench Press
  bench_press: {
    male: {
      50: [0.50, 0.75, 1.00, 1.25, 1.50],
      60: [0.50, 0.75, 1.00, 1.25, 1.50],
      70: [0.55, 0.80, 1.10, 1.35, 1.60],
      80: [0.60, 0.85, 1.15, 1.40, 1.70],
      90: [0.65, 0.90, 1.20, 1.45, 1.75],
      100: [0.65, 0.90, 1.20, 1.50, 1.80],
      110: [0.65, 0.90, 1.20, 1.50, 1.80],
      120: [0.60, 0.85, 1.15, 1.45, 1.75],
      130: [0.55, 0.80, 1.10, 1.40, 1.70],
    },
    female: {
      40: [0.25, 0.40, 0.55, 0.75, 0.95],
      45: [0.28, 0.43, 0.60, 0.80, 1.00],
      50: [0.30, 0.45, 0.65, 0.85, 1.10],
      55: [0.32, 0.48, 0.68, 0.88, 1.13],
      60: [0.35, 0.50, 0.70, 0.90, 1.15],
      65: [0.35, 0.50, 0.72, 0.95, 1.20],
      70: [0.35, 0.50, 0.75, 1.00, 1.25],
      75: [0.35, 0.50, 0.72, 0.97, 1.22],
      80: [0.32, 0.47, 0.67, 0.92, 1.17],
    },
  },

  // Squat
  squat: {
    male: {
      50: [0.70, 0.95, 1.40, 1.90, 2.40],
      60: [0.75, 1.00, 1.50, 2.00, 2.50],
      70: [0.80, 1.10, 1.60, 2.10, 2.60],
      80: [0.85, 1.15, 1.65, 2.15, 2.65],
      90: [0.90, 1.20, 1.70, 2.20, 2.70],
      100: [0.90, 1.20, 1.75, 2.25, 2.75],
      110: [0.90, 1.20, 1.75, 2.25, 2.75],
      120: [0.85, 1.15, 1.70, 2.20, 2.70],
      130: [0.80, 1.10, 1.65, 2.15, 2.65],
    },
    female: {
      40: [0.45, 0.65, 0.90, 1.25, 1.60],
      45: [0.48, 0.70, 0.95, 1.32, 1.67],
      50: [0.50, 0.75, 1.00, 1.40, 1.75],
      55: [0.53, 0.78, 1.07, 1.45, 1.80],
      60: [0.55, 0.80, 1.12, 1.50, 1.85],
      65: [0.58, 0.83, 1.17, 1.53, 1.88],
      70: [0.60, 0.85, 1.20, 1.55, 1.90],
      75: [0.58, 0.83, 1.15, 1.50, 1.85],
      80: [0.55, 0.80, 1.10, 1.45, 1.80],
    },
  },

  // Deadlift
  deadlift: {
    male: {
      50: [0.85, 1.20, 1.70, 2.20, 2.70],
      60: [0.90, 1.25, 1.75, 2.25, 2.75],
      70: [0.95, 1.30, 1.85, 2.35, 2.85],
      80: [1.00, 1.40, 1.90, 2.40, 2.95],
      90: [1.05, 1.45, 2.00, 2.50, 3.00],
      100: [1.05, 1.45, 2.00, 2.50, 3.00],
      110: [1.05, 1.45, 2.00, 2.50, 3.00],
      120: [1.00, 1.40, 1.95, 2.45, 2.95],
      130: [0.95, 1.35, 1.90, 2.40, 2.90],
    },
    female: {
      40: [0.55, 0.80, 1.15, 1.50, 1.90],
      45: [0.58, 0.85, 1.20, 1.55, 1.95],
      50: [0.60, 0.90, 1.25, 1.60, 2.00],
      55: [0.63, 0.93, 1.28, 1.63, 2.03],
      60: [0.65, 0.95, 1.30, 1.65, 2.05],
      65: [0.68, 0.98, 1.35, 1.70, 2.10],
      70: [0.70, 1.00, 1.40, 1.75, 2.15],
      75: [0.68, 0.98, 1.35, 1.70, 2.10],
      80: [0.65, 0.95, 1.30, 1.65, 2.05],
    },
  },

  // Overhead Press
  overhead_press: {
    male: {
      50: [0.30, 0.45, 0.60, 0.80, 1.00],
      60: [0.35, 0.50, 0.70, 0.90, 1.10],
      70: [0.40, 0.55, 0.75, 0.95, 1.15],
      80: [0.40, 0.55, 0.80, 1.00, 1.20],
      90: [0.45, 0.60, 0.80, 1.00, 1.25],
      100: [0.45, 0.60, 0.80, 1.00, 1.25],
      110: [0.45, 0.60, 0.80, 1.00, 1.25],
      120: [0.40, 0.55, 0.75, 0.95, 1.20],
      130: [0.35, 0.50, 0.70, 0.90, 1.15],
    },
    female: {
      40: [0.18, 0.27, 0.40, 0.55, 0.70],
      45: [0.19, 0.28, 0.42, 0.57, 0.72],
      50: [0.20, 0.30, 0.45, 0.60, 0.75],
      55: [0.21, 0.31, 0.46, 0.61, 0.76],
      60: [0.22, 0.32, 0.48, 0.63, 0.78],
      65: [0.23, 0.33, 0.49, 0.64, 0.80],
      70: [0.25, 0.35, 0.50, 0.65, 0.82],
      75: [0.24, 0.34, 0.49, 0.64, 0.80],
      80: [0.22, 0.32, 0.47, 0.62, 0.77],
    },
  },

  // Barbell Row
  barbell_row: {
    male: {
      50: [0.40, 0.60, 0.85, 1.10, 1.35],
      60: [0.45, 0.65, 0.90, 1.15, 1.40],
      70: [0.50, 0.70, 0.95, 1.20, 1.50],
      80: [0.50, 0.72, 1.00, 1.25, 1.55],
      90: [0.55, 0.75, 1.02, 1.30, 1.60],
      100: [0.55, 0.75, 1.05, 1.32, 1.62],
      110: [0.55, 0.75, 1.05, 1.32, 1.62],
      120: [0.52, 0.72, 1.00, 1.27, 1.57],
      130: [0.48, 0.68, 0.95, 1.22, 1.52],
    },
    female: {
      40: [0.25, 0.40, 0.55, 0.75, 0.95],
      45: [0.27, 0.42, 0.58, 0.78, 0.98],
      50: [0.28, 0.45, 0.62, 0.82, 1.02],
      55: [0.30, 0.47, 0.65, 0.85, 1.05],
      60: [0.32, 0.48, 0.67, 0.87, 1.08],
      65: [0.33, 0.50, 0.68, 0.90, 1.10],
      70: [0.35, 0.52, 0.70, 0.92, 1.12],
      75: [0.33, 0.50, 0.68, 0.90, 1.10],
      80: [0.32, 0.48, 0.65, 0.87, 1.07],
    },
  },
};

// Helper function to find closest bodyweight in standards
function findClosestBodyweight(standards: StrengthStandardsData, bodyweight: number): number {
  const weights = Object.keys(standards).map(Number);
  return weights.reduce((prev, curr) =>
    Math.abs(curr - bodyweight) < Math.abs(prev - bodyweight) ? curr : prev
  );
}

// Interpolate between two bodyweight values for more accurate standards
function interpolateStandards(
  standards: StrengthStandardsData,
  bodyweight: number
): [number, number, number, number, number] {
  const weights = Object.keys(standards).map(Number).sort((a, b) => a - b);

  // If bodyweight is below minimum, return minimum
  if (bodyweight <= weights[0]) {
    return standards[weights[0]];
  }

  // If bodyweight is above maximum, return maximum
  if (bodyweight >= weights[weights.length - 1]) {
    return standards[weights[weights.length - 1]];
  }

  // Find surrounding weights for interpolation
  let lowerWeight = weights[0];
  let upperWeight = weights[1];

  for (let i = 0; i < weights.length - 1; i++) {
    if (bodyweight >= weights[i] && bodyweight <= weights[i + 1]) {
      lowerWeight = weights[i];
      upperWeight = weights[i + 1];
      break;
    }
  }

  // Linear interpolation
  const ratio = (bodyweight - lowerWeight) / (upperWeight - lowerWeight);
  const lowerStandards = standards[lowerWeight];
  const upperStandards = standards[upperWeight];

  return lowerStandards.map((val, idx) =>
    val + (upperStandards[idx] - val) * ratio
  ) as [number, number, number, number, number];
}

export interface StrengthClassificationResult {
  classification: StrengthClassification;
  percentile: number;
  relativeStrength: number;
  nextLevelTarget: number | null;
  nextLevelClassification: StrengthClassification | null;
  progressToNext: number; // 0-100 percentage
  color: string;
}

export function getStrengthClassification(
  exercise: string,
  gender: 'male' | 'female',
  bodyweightKg: number,
  oneRepMax: number
): StrengthClassificationResult {
  const exerciseKey = exercise.toLowerCase().replace(/\s+/g, '_');
  const exerciseStandards = STRENGTH_STANDARDS[exerciseKey];

  // Default result for unknown exercises
  if (!exerciseStandards) {
    return {
      classification: 'Untrained',
      percentile: 0,
      relativeStrength: oneRepMax / bodyweightKg,
      nextLevelTarget: null,
      nextLevelClassification: null,
      progressToNext: 0,
      color: STRENGTH_COLORS['Untrained'],
    };
  }

  const genderStandards = exerciseStandards[gender];
  const standards = interpolateStandards(genderStandards, bodyweightKg);
  const relativeStrength = oneRepMax / bodyweightKg;

  const [beginner, novice, intermediate, advanced, elite] = standards;

  let classification: StrengthClassification;
  let percentile: number;
  let nextLevelTarget: number | null;
  let nextLevelClassification: StrengthClassification | null;
  let progressToNext: number;

  if (relativeStrength >= elite) {
    classification = 'Elite';
    percentile = 95 + Math.min(4.9, ((relativeStrength - elite) / elite) * 10);
    nextLevelTarget = null;
    nextLevelClassification = null;
    progressToNext = 100;
  } else if (relativeStrength >= advanced) {
    classification = 'Advanced';
    percentile = 80 + ((relativeStrength - advanced) / (elite - advanced)) * 15;
    nextLevelTarget = elite * bodyweightKg;
    nextLevelClassification = 'Elite';
    progressToNext = ((relativeStrength - advanced) / (elite - advanced)) * 100;
  } else if (relativeStrength >= intermediate) {
    classification = 'Intermediate';
    percentile = 50 + ((relativeStrength - intermediate) / (advanced - intermediate)) * 30;
    nextLevelTarget = advanced * bodyweightKg;
    nextLevelClassification = 'Advanced';
    progressToNext = ((relativeStrength - intermediate) / (advanced - intermediate)) * 100;
  } else if (relativeStrength >= novice) {
    classification = 'Novice';
    percentile = 20 + ((relativeStrength - novice) / (intermediate - novice)) * 30;
    nextLevelTarget = intermediate * bodyweightKg;
    nextLevelClassification = 'Intermediate';
    progressToNext = ((relativeStrength - novice) / (intermediate - novice)) * 100;
  } else if (relativeStrength >= beginner) {
    classification = 'Beginner';
    percentile = 5 + ((relativeStrength - beginner) / (novice - beginner)) * 15;
    nextLevelTarget = novice * bodyweightKg;
    nextLevelClassification = 'Novice';
    progressToNext = ((relativeStrength - beginner) / (novice - beginner)) * 100;
  } else {
    classification = 'Untrained';
    percentile = Math.max(0, (relativeStrength / beginner) * 5);
    nextLevelTarget = beginner * bodyweightKg;
    nextLevelClassification = 'Beginner';
    progressToNext = (relativeStrength / beginner) * 100;
  }

  return {
    classification,
    percentile: Math.min(99.9, Math.max(0, percentile)),
    relativeStrength: Math.round(relativeStrength * 100) / 100,
    nextLevelTarget: nextLevelTarget ? Math.round(nextLevelTarget * 10) / 10 : null,
    nextLevelClassification,
    progressToNext: Math.min(100, Math.max(0, progressToNext)),
    color: STRENGTH_COLORS[classification],
  };
}

// Get all strength standards for an exercise (for displaying in UI)
export function getExerciseStandards(
  exercise: string,
  gender: 'male' | 'female',
  bodyweightKg: number
): { level: StrengthClassification; weight: number }[] {
  const exerciseKey = exercise.toLowerCase().replace(/\s+/g, '_');
  const exerciseStandards = STRENGTH_STANDARDS[exerciseKey];

  if (!exerciseStandards) {
    return [];
  }

  const genderStandards = exerciseStandards[gender];
  const standards = interpolateStandards(genderStandards, bodyweightKg);

  return [
    { level: 'Beginner', weight: Math.round(standards[0] * bodyweightKg * 10) / 10 },
    { level: 'Novice', weight: Math.round(standards[1] * bodyweightKg * 10) / 10 },
    { level: 'Intermediate', weight: Math.round(standards[2] * bodyweightKg * 10) / 10 },
    { level: 'Advanced', weight: Math.round(standards[3] * bodyweightKg * 10) / 10 },
    { level: 'Elite', weight: Math.round(standards[4] * bodyweightKg * 10) / 10 },
  ];
}

// List of exercises that have strength standards
export const EXERCISES_WITH_STANDARDS = Object.keys(STRENGTH_STANDARDS);

// Re-export types and colors for convenience
export { type StrengthClassification, STRENGTH_COLORS } from '../constants/xpRewards';

// Classification info for UI display
export const STRENGTH_CLASSIFICATIONS: Record<string, { label: string; percentile: string; description: string }> = {
  untrained: { label: 'Untrained', percentile: '<5%', description: 'Just starting out' },
  beginner: { label: 'Beginner', percentile: '5-20%', description: 'Basic training foundations' },
  novice: { label: 'Novice', percentile: '20-50%', description: 'Consistent training for 3-6 months' },
  intermediate: { label: 'Intermediate', percentile: '50-80%', description: '1-2 years of serious training' },
  advanced: { label: 'Advanced', percentile: '80-95%', description: 'Multiple years of dedicated training' },
  elite: { label: 'Elite', percentile: '>95%', description: 'Competition level strength' },
};

// Classification colors for UI
export const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string }> = {
  untrained: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300' },
  beginner: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  novice: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  intermediate: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  advanced: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
  elite: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
};

// Alias for getExerciseStandards to match expected import name
export function getStrengthStandardsForWeight(
  exercise: string,
  bodyweightKg: number,
  gender: 'male' | 'female'
): Record<string, number> {
  const standards = getExerciseStandards(exercise, gender, bodyweightKg);
  const result: Record<string, number> = {};
  standards.forEach(s => {
    result[s.level.toLowerCase()] = s.weight;
  });
  return result;
}

// Calculate a 0-100 strength score based on classification
export function calculateStrengthScore(
  exercise: string,
  oneRepMax: number,
  bodyweightKg: number,
  gender: 'male' | 'female'
): number {
  const result = getStrengthClassification(exercise, gender, bodyweightKg, oneRepMax);

  // Map classification + progress to 0-100 score
  const classificationScores: Record<string, number> = {
    'Untrained': 0,
    'Beginner': 15,
    'Novice': 35,
    'Intermediate': 55,
    'Advanced': 75,
    'Elite': 95,
  };

  const baseScore = classificationScores[result.classification] || 0;
  const progressBonus = (result.progressToNext / 100) * 20; // Up to 20 points for progress

  return Math.min(100, Math.round(baseScore + progressBonus));
}

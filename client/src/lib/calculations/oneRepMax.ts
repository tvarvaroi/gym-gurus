// One Rep Max (1RM) Calculator
// Multiple formulas for accurate estimation

export type OneRMFormula = 'epley' | 'brzycki' | 'lombardi' | 'mayhew' | 'oconner' | 'wathen' | 'average';

export interface OneRMResult {
  formula: OneRMFormula;
  value: number;
}

export interface AllOneRMResults {
  epley: number;
  brzycki: number;
  lombardi: number;
  mayhew: number;
  oconner: number;
  wathen: number;
  average: number;
  min: number;
  max: number;
}

// Epley Formula: 1RM = weight × (1 + reps/30)
export function epley(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// Brzycki Formula: 1RM = weight × (36 / (37 - reps))
export function brzycki(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  if (reps >= 37) return weight * 10; // Prevent division by zero, cap at high reps
  return weight * (36 / (37 - reps));
}

// Lombardi Formula: 1RM = weight × reps^0.1
export function lombardi(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return weight * Math.pow(reps, 0.1);
}

// Mayhew Formula: 1RM = 100 × weight / (52.2 + 41.9 × e^(-0.055 × reps))
export function mayhew(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return (100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps));
}

// O'Conner Formula: 1RM = weight × (1 + 0.025 × reps)
export function oconner(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return weight * (1 + 0.025 * reps);
}

// Wathen Formula: 1RM = 100 × weight / (48.8 + 53.8 × e^(-0.075 × reps))
export function wathen(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps === 1) return weight;
  return (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps));
}

// Calculate 1RM using a specific formula
export function calculate1RM(weight: number, reps: number, formula: OneRMFormula = 'epley'): number {
  if (weight <= 0 || reps <= 0) return 0;

  switch (formula) {
    case 'epley':
      return Math.round(epley(weight, reps) * 10) / 10;
    case 'brzycki':
      return Math.round(brzycki(weight, reps) * 10) / 10;
    case 'lombardi':
      return Math.round(lombardi(weight, reps) * 10) / 10;
    case 'mayhew':
      return Math.round(mayhew(weight, reps) * 10) / 10;
    case 'oconner':
      return Math.round(oconner(weight, reps) * 10) / 10;
    case 'wathen':
      return Math.round(wathen(weight, reps) * 10) / 10;
    case 'average':
      return Math.round(calculateAll1RM(weight, reps).average * 10) / 10;
    default:
      return Math.round(epley(weight, reps) * 10) / 10;
  }
}

// Calculate 1RM using all formulas
export function calculateAll1RM(weight: number, reps: number): AllOneRMResults {
  if (weight <= 0 || reps <= 0) {
    return {
      epley: 0,
      brzycki: 0,
      lombardi: 0,
      mayhew: 0,
      oconner: 0,
      wathen: 0,
      average: 0,
      min: 0,
      max: 0,
    };
  }

  const results = {
    epley: epley(weight, reps),
    brzycki: brzycki(weight, reps),
    lombardi: lombardi(weight, reps),
    mayhew: mayhew(weight, reps),
    oconner: oconner(weight, reps),
    wathen: wathen(weight, reps),
  };

  const values = Object.values(results);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

  return {
    ...Object.fromEntries(
      Object.entries(results).map(([key, val]) => [key, Math.round(val * 10) / 10])
    ) as typeof results,
    average: Math.round(avg * 10) / 10,
    min: Math.round(Math.min(...values) * 10) / 10,
    max: Math.round(Math.max(...values) * 10) / 10,
  };
}

// Calculate weight for target reps from 1RM
export function calculateWeightFromRM(oneRM: number, targetReps: number, formula: OneRMFormula = 'epley'): number {
  if (oneRM <= 0 || targetReps <= 0) return 0;
  if (targetReps === 1) return oneRM;

  // Inverse formulas
  switch (formula) {
    case 'epley':
      // weight = 1RM / (1 + reps/30)
      return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
    case 'brzycki':
      // weight = 1RM × (37 - reps) / 36
      return Math.round((oneRM * (37 - targetReps) / 36) * 10) / 10;
    case 'lombardi':
      // weight = 1RM / reps^0.1
      return Math.round((oneRM / Math.pow(targetReps, 0.1)) * 10) / 10;
    case 'oconner':
      // weight = 1RM / (1 + 0.025 × reps)
      return Math.round((oneRM / (1 + 0.025 * targetReps)) * 10) / 10;
    default:
      return Math.round((oneRM / (1 + targetReps / 30)) * 10) / 10;
  }
}

// Generate rep max table from 1RM
export function generateRepMaxTable(oneRM: number, formula: OneRMFormula = 'epley'): { reps: number; weight: number; percentage: number }[] {
  const table = [];
  const repRanges = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

  for (const reps of repRanges) {
    const weight = calculateWeightFromRM(oneRM, reps, formula);
    const percentage = Math.round((weight / oneRM) * 100);
    table.push({ reps, weight, percentage });
  }

  return table;
}

// Percentage-based rep recommendations
export const PERCENTAGE_CHART: { percentage: number; reps: string; use: string }[] = [
  { percentage: 100, reps: '1', use: 'Max effort, testing' },
  { percentage: 95, reps: '2', use: 'Strength, peaking' },
  { percentage: 90, reps: '3-4', use: 'Strength' },
  { percentage: 85, reps: '5-6', use: 'Strength/Power' },
  { percentage: 80, reps: '7-8', use: 'Strength/Hypertrophy' },
  { percentage: 75, reps: '8-10', use: 'Hypertrophy' },
  { percentage: 70, reps: '10-12', use: 'Hypertrophy' },
  { percentage: 65, reps: '12-15', use: 'Hypertrophy/Endurance' },
  { percentage: 60, reps: '15-20', use: 'Endurance' },
  { percentage: 50, reps: '20+', use: 'Warm-up, Endurance' },
];

// Formula descriptions for UI
export const FORMULA_INFO: Record<OneRMFormula, { name: string; description: string; bestFor: string }> = {
  epley: {
    name: 'Epley',
    description: 'Most widely used formula. Simple and reliable for moderate rep ranges.',
    bestFor: 'General use, 5-10 reps',
  },
  brzycki: {
    name: 'Brzycki',
    description: 'Accurate for lower rep ranges. Can be less reliable for high reps.',
    bestFor: 'Lower rep ranges (1-6)',
  },
  lombardi: {
    name: 'Lombardi',
    description: 'Uses exponential calculation. Good for intermediate rep ranges.',
    bestFor: 'Moderate reps (6-12)',
  },
  mayhew: {
    name: 'Mayhew',
    description: 'Developed using football players. Good for athletes.',
    bestFor: 'Athletes, varied rep ranges',
  },
  oconner: {
    name: "O'Conner",
    description: 'Simple linear formula. Conservative estimates.',
    bestFor: 'Conservative estimates',
  },
  wathen: {
    name: 'Wathen',
    description: 'Based on exponential decay. Often considered most accurate.',
    bestFor: 'Higher accuracy, any rep range',
  },
  average: {
    name: 'Average',
    description: 'Averages all formulas for balanced estimate.',
    bestFor: 'Best overall estimate',
  },
};

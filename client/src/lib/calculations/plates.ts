// Smart Plates Calculator
// Calculates exact plates needed to load a barbell to target weight

export type WeightUnit = 'kg' | 'lbs';

// Standard plate sets
export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
export const STANDARD_PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

// Olympic plates (with color coding)
export const OLYMPIC_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1, 0.5];

// Barbell weights
export const BARBELL_WEIGHTS = {
  kg: {
    olympic: 20,
    womens: 15,
    training: 15,
    ez_bar: 10,
    trap_bar: 25,
  },
  lbs: {
    olympic: 45,
    womens: 35,
    training: 35,
    ez_bar: 25,
    trap_bar: 55,
  },
};

export type BarbellType = keyof typeof BARBELL_WEIGHTS.kg;

export interface PlateResult {
  plate: number;
  count: number;
}

export interface PlateCalculationResult {
  targetWeight: number;
  actualWeight: number;
  barbellWeight: number;
  weightPerSide: number;
  platesPerSide: PlateResult[];
  totalPlates: PlateResult[];
  difference: number;
  isExact: boolean;
  unit: WeightUnit;
}

// Plate colors for visual display (Olympic standard)
export const PLATE_COLORS_KG: Record<number, { bg: string; text: string; name: string }> = {
  25: { bg: 'bg-red-500', text: 'text-white', name: 'Red' },
  20: { bg: 'bg-blue-500', text: 'text-white', name: 'Blue' },
  15: { bg: 'bg-yellow-400', text: 'text-black', name: 'Yellow' },
  10: { bg: 'bg-green-500', text: 'text-white', name: 'Green' },
  5: { bg: 'bg-white border-2 border-gray-400', text: 'text-black', name: 'White' },
  2.5: { bg: 'bg-red-300', text: 'text-black', name: 'Light Red' },
  2: { bg: 'bg-blue-300', text: 'text-black', name: 'Light Blue' },
  1.5: { bg: 'bg-yellow-300', text: 'text-black', name: 'Light Yellow' },
  1.25: { bg: 'bg-gray-300', text: 'text-black', name: 'Silver' },
  1: { bg: 'bg-green-300', text: 'text-black', name: 'Light Green' },
  0.5: { bg: 'bg-gray-400', text: 'text-white', name: 'Gray' },
};

export const PLATE_COLORS_LBS: Record<number, { bg: string; text: string; name: string }> = {
  45: { bg: 'bg-blue-500', text: 'text-white', name: 'Blue' },
  35: { bg: 'bg-yellow-400', text: 'text-black', name: 'Yellow' },
  25: { bg: 'bg-green-500', text: 'text-white', name: 'Green' },
  10: { bg: 'bg-white border-2 border-gray-400', text: 'text-black', name: 'White' },
  5: { bg: 'bg-red-300', text: 'text-black', name: 'Light Red' },
  2.5: { bg: 'bg-gray-400', text: 'text-white', name: 'Gray' },
};

// Get plate visual height based on weight (for barbell visualization)
export function getPlateHeight(weight: number, unit: WeightUnit = 'kg'): number {
  const maxHeight = 120;
  const minHeight = 30;
  const maxWeight = unit === 'kg' ? 25 : 45;

  // Non-linear scaling for better visual representation
  const ratio = Math.sqrt(weight / maxWeight);
  return Math.max(minHeight, ratio * maxHeight);
}

// Get plate width based on weight (for barbell visualization)
export function getPlateWidth(weight: number): number {
  // Heavier plates are slightly wider
  const baseWidth = 12;
  const maxWidth = 20;
  const scale = Math.min(1, weight / 25);
  return baseWidth + scale * (maxWidth - baseWidth);
}

// Calculate plates needed for a target weight
export function calculatePlates(
  targetWeight: number,
  unit: WeightUnit = 'kg',
  barbellType: BarbellType = 'olympic',
  availablePlates?: number[]
): PlateCalculationResult {
  const barbellWeight = BARBELL_WEIGHTS[unit][barbellType];
  const plates = availablePlates || (unit === 'kg' ? STANDARD_PLATES_KG : STANDARD_PLATES_LBS);

  // Weight to distribute on plates (total minus barbell, divided by 2 for per-side)
  let weightToLoad = (targetWeight - barbellWeight) / 2;

  if (weightToLoad <= 0) {
    return {
      targetWeight,
      actualWeight: barbellWeight,
      barbellWeight,
      weightPerSide: 0,
      platesPerSide: [],
      totalPlates: [],
      difference: targetWeight - barbellWeight,
      isExact: targetWeight === barbellWeight,
      unit,
    };
  }

  const platesPerSide: PlateResult[] = [];
  let remainingWeight = weightToLoad;

  // Greedy algorithm to find plates
  for (const plate of plates.sort((a, b) => b - a)) {
    if (remainingWeight >= plate) {
      const count = Math.floor(remainingWeight / plate);
      if (count > 0) {
        platesPerSide.push({ plate, count });
        remainingWeight -= count * plate;
      }
    }
  }

  // Calculate actual loaded weight
  const actualPerSide = platesPerSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const actualWeight = barbellWeight + actualPerSide * 2;

  // Total plates (both sides)
  const totalPlates = platesPerSide.map(p => ({ plate: p.plate, count: p.count * 2 }));

  return {
    targetWeight,
    actualWeight,
    barbellWeight,
    weightPerSide: actualPerSide,
    platesPerSide,
    totalPlates,
    difference: targetWeight - actualWeight,
    isExact: Math.abs(targetWeight - actualWeight) < 0.01,
    unit,
  };
}

// Format plates as a readable string
export function formatPlatesString(platesPerSide: PlateResult[], unit: WeightUnit): string {
  if (platesPerSide.length === 0) return 'Empty bar';

  return platesPerSide
    .map(p => `${p.count}×${p.plate}${unit}`)
    .join(' + ');
}

// Get all possible weights that can be made with available plates
export function getPossibleWeights(
  unit: WeightUnit = 'kg',
  barbellType: BarbellType = 'olympic',
  maxWeight: number = 300,
  availablePlates?: number[]
): number[] {
  const barbellWeight = BARBELL_WEIGHTS[unit][barbellType];
  const plates = availablePlates || (unit === 'kg' ? STANDARD_PLATES_KG : STANDARD_PLATES_LBS);

  const weights = new Set<number>([barbellWeight]);

  // Generate combinations (simplified - just increments)
  const smallestPlate = Math.min(...plates);
  const increment = smallestPlate * 2; // Both sides

  for (let w = barbellWeight + increment; w <= maxWeight; w += increment) {
    const result = calculatePlates(w, unit, barbellType, plates);
    if (result.isExact) {
      weights.add(result.actualWeight);
    }
  }

  return Array.from(weights).sort((a, b) => a - b);
}

// Suggest next weight increment based on current weight and available plates
export function suggestNextWeight(
  currentWeight: number,
  direction: 'up' | 'down' = 'up',
  unit: WeightUnit = 'kg',
  barbellType: BarbellType = 'olympic'
): number {
  const plates = unit === 'kg' ? STANDARD_PLATES_KG : STANDARD_PLATES_LBS;
  const smallestPlate = Math.min(...plates);
  const increment = smallestPlate * 2;

  if (direction === 'up') {
    return currentWeight + increment;
  } else {
    return Math.max(BARBELL_WEIGHTS[unit][barbellType], currentWeight - increment);
  }
}

// Convert between units
export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;

  const kgToLbs = 2.20462;

  if (from === 'kg' && to === 'lbs') {
    return Math.round(weight * kgToLbs * 10) / 10;
  } else {
    return Math.round((weight / kgToLbs) * 10) / 10;
  }
}

// Get warmup pyramid
export function getWarmupPyramid(workingWeight: number, unit: WeightUnit = 'kg'): { weight: number; reps: number; percentage: number }[] {
  const barbellWeight = BARBELL_WEIGHTS[unit].olympic;

  return [
    { weight: barbellWeight, reps: 10, percentage: Math.round((barbellWeight / workingWeight) * 100) },
    { weight: Math.round(workingWeight * 0.4), reps: 8, percentage: 40 },
    { weight: Math.round(workingWeight * 0.6), reps: 5, percentage: 60 },
    { weight: Math.round(workingWeight * 0.8), reps: 3, percentage: 80 },
    { weight: Math.round(workingWeight * 0.9), reps: 1, percentage: 90 },
  ].filter(set => set.weight >= barbellWeight);
}

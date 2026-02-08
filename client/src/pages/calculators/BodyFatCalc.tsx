import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Percent, Ruler, Info } from 'lucide-react';

type Gender = 'male' | 'female';

interface BodyFatResult {
  bodyFat: number;
  category: string;
  leanMass: number;
  fatMass: number;
  color: string;
  bgColor: string;
}

// Navy Method body fat calculation
function calculateBodyFatNavy(
  gender: Gender,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipsCm?: number
): number {
  if (gender === 'male') {
    // Male formula: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    const bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
    return Math.max(0, bodyFat);
  } else {
    // Female formula: 495 / (1.29579 - 0.35004 * log10(waist + hips - neck) + 0.22100 * log10(height)) - 450
    const bodyFat =
      495 / (1.29579 - 0.35004 * Math.log10(waistCm + (hipsCm || 0) - neckCm) + 0.221 * Math.log10(heightCm)) - 450;
    return Math.max(0, bodyFat);
  }
}

function getBodyFatCategory(gender: Gender, bodyFat: number): { category: string; color: string; bgColor: string } {
  if (gender === 'male') {
    if (bodyFat < 6) return { category: 'Essential Fat', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (bodyFat < 14) return { category: 'Athletes', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (bodyFat < 18) return { category: 'Fitness', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (bodyFat < 25) return { category: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { category: 'Obese', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  } else {
    if (bodyFat < 14) return { category: 'Essential Fat', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (bodyFat < 21) return { category: 'Athletes', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (bodyFat < 25) return { category: 'Fitness', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (bodyFat < 32) return { category: 'Average', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { category: 'Obese', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  }
}

const BODY_FAT_RANGES = {
  male: [
    { category: 'Essential Fat', range: '2-5%', description: 'Minimum for survival' },
    { category: 'Athletes', range: '6-13%', description: 'Competition bodybuilders, elite athletes' },
    { category: 'Fitness', range: '14-17%', description: 'Fit and lean' },
    { category: 'Average', range: '18-24%', description: 'Healthy range for most men' },
    { category: 'Obese', range: '25%+', description: 'Above healthy range' },
  ],
  female: [
    { category: 'Essential Fat', range: '10-13%', description: 'Minimum for survival' },
    { category: 'Athletes', range: '14-20%', description: 'Competition athletes' },
    { category: 'Fitness', range: '21-24%', description: 'Fit and lean' },
    { category: 'Average', range: '25-31%', description: 'Healthy range for most women' },
    { category: 'Obese', range: '32%+', description: 'Above healthy range' },
  ],
};

export function BodyFatCalculator() {
  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(75);
  const [waist, setWaist] = useState(85);
  const [neck, setNeck] = useState(38);
  const [hips, setHips] = useState(95);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  // Convert to metric if imperial
  const heightCm = unit === 'imperial' ? height * 2.54 : height;
  const weightKg = unit === 'imperial' ? weight * 0.453592 : weight;
  const waistCm = unit === 'imperial' ? waist * 2.54 : waist;
  const neckCm = unit === 'imperial' ? neck * 2.54 : neck;
  const hipsCm = unit === 'imperial' ? hips * 2.54 : hips;

  const result = useMemo((): BodyFatResult => {
    const bodyFat = calculateBodyFatNavy(gender, heightCm, waistCm, neckCm, gender === 'female' ? hipsCm : undefined);
    const { category, color, bgColor } = getBodyFatCategory(gender, bodyFat);
    const fatMass = (bodyFat / 100) * weightKg;
    const leanMass = weightKg - fatMass;

    return { bodyFat, category, leanMass, fatMass, color, bgColor };
  }, [gender, heightCm, weightKg, waistCm, neckCm, hipsCm]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Percent className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Body Fat Calculator</h1>
          <p className="text-muted-foreground">U.S. Navy Method</p>
        </div>
      </div>

      {/* Unit Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setUnit('metric')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            unit === 'metric' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}
        >
          Metric (cm/kg)
        </button>
        <button
          onClick={() => setUnit('imperial')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            unit === 'imperial' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}
        >
          Imperial (in/lbs)
        </button>
      </div>

      {/* Input Form */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        {/* Gender */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Gender</label>
          <div className="flex gap-2">
            <button
              onClick={() => setGender('male')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                gender === 'male' ? 'bg-blue-500 text-white' : 'bg-secondary'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setGender('female')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                gender === 'female' ? 'bg-pink-500 text-white' : 'bg-secondary'
              }`}
            >
              Female
            </button>
          </div>
        </div>

        {/* Measurements */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Height ({unit === 'metric' ? 'cm' : 'in'})
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Weight ({unit === 'metric' ? 'kg' : 'lbs'})
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Neck ({unit === 'metric' ? 'cm' : 'in'})
            </label>
            <input
              type="number"
              value={neck}
              onChange={(e) => setNeck(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
              step={0.5}
            />
            <p className="text-xs text-muted-foreground mt-1">Measure at narrowest point</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Waist ({unit === 'metric' ? 'cm' : 'in'})
            </label>
            <input
              type="number"
              value={waist}
              onChange={(e) => setWaist(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
              step={0.5}
            />
            <p className="text-xs text-muted-foreground mt-1">Measure at navel level</p>
          </div>
          {gender === 'female' && (
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Hips ({unit === 'metric' ? 'cm' : 'in'})
              </label>
              <input
                type="number"
                value={hips}
                onChange={(e) => setHips(Number(e.target.value))}
                className="w-full p-3 border rounded-lg bg-background"
                step={0.5}
              />
              <p className="text-xs text-muted-foreground mt-1">Measure at widest point</p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <motion.div
        className={`rounded-xl p-6 mb-6 ${result.bgColor}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={result.bodyFat.toFixed(1)}
      >
        <div className="text-center mb-6">
          <p className="text-sm opacity-70 mb-1">Estimated Body Fat</p>
          <p className={`text-6xl font-bold ${result.color}`}>{result.bodyFat.toFixed(1)}%</p>
          <p className={`text-xl font-medium ${result.color} mt-2`}>{result.category}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Lean Mass</p>
            <p className="text-2xl font-bold">{result.leanMass.toFixed(1)} kg</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Fat Mass</p>
            <p className="text-2xl font-bold">{result.fatMass.toFixed(1)} kg</p>
          </div>
        </div>
      </motion.div>

      {/* Body composition bar */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold mb-4">Body Composition</h3>
        <div className="h-8 rounded-full overflow-hidden flex">
          <motion.div
            className="bg-blue-500 flex items-center justify-center text-white text-sm font-medium"
            initial={{ width: 0 }}
            animate={{ width: `${100 - result.bodyFat}%` }}
            transition={{ duration: 0.5 }}
          >
            {(100 - result.bodyFat).toFixed(0)}% Lean
          </motion.div>
          <motion.div
            className="bg-yellow-500 flex items-center justify-center text-white text-sm font-medium"
            initial={{ width: 0 }}
            animate={{ width: `${result.bodyFat}%` }}
            transition={{ duration: 0.5 }}
          >
            {result.bodyFat.toFixed(0)}% Fat
          </motion.div>
        </div>
      </div>

      {/* Body Fat Ranges */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4">Body Fat Categories ({gender === 'male' ? 'Men' : 'Women'})</h3>
        <div className="space-y-2">
          {BODY_FAT_RANGES[gender].map((range) => (
            <div
              key={range.category}
              className={`p-3 rounded-lg ${result.category === range.category ? result.bgColor : 'bg-secondary/30'}`}
            >
              <div className="flex justify-between items-center">
                <span className={result.category === range.category ? result.color + ' font-medium' : ''}>
                  {range.category}
                </span>
                <span className="text-sm text-muted-foreground">{range.range}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{range.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="text-blue-700 dark:text-blue-300">
          <strong>Measurement Tips:</strong> Take measurements in the morning, before eating, with relaxed muscles.
          The Navy method is accurate within 3-4% for most people.
        </p>
      </div>
    </div>
  );
}

export default BodyFatCalculator;

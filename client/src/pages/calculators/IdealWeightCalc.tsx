import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Scale, Ruler, User, Target, TrendingUp, Info } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';

type Gender = 'male' | 'female';
type HeightUnit = 'cm' | 'ft';
type WeightUnit = 'kg' | 'lbs';

// Ideal weight formulas
const FORMULAS = {
  devine: {
    name: 'Devine (1974)',
    description: 'Most commonly used in clinical settings',
    male: (heightCm: number) => 50 + 2.3 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 45.5 + 2.3 * (heightCm / 2.54 - 60),
  },
  robinson: {
    name: 'Robinson (1983)',
    description: 'Modified Devine formula',
    male: (heightCm: number) => 52 + 1.9 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 49 + 1.7 * (heightCm / 2.54 - 60),
  },
  miller: {
    name: 'Miller (1983)',
    description: 'Tends to give lower estimates',
    male: (heightCm: number) => 56.2 + 1.41 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 53.1 + 1.36 * (heightCm / 2.54 - 60),
  },
  hamwi: {
    name: 'Hamwi (1964)',
    description: 'One of the original IBW formulas',
    male: (heightCm: number) => 48 + 2.7 * (heightCm / 2.54 - 60),
    female: (heightCm: number) => 45.5 + 2.2 * (heightCm / 2.54 - 60),
  },
  broca: {
    name: 'Broca Index',
    description: 'Simple formula: height - 100',
    male: (heightCm: number) => (heightCm - 100) * 0.9,
    female: (heightCm: number) => (heightCm - 100) * 0.85,
  },
};

// BMI-based healthy weight range
function getBMIWeightRange(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: 18.5 * heightM * heightM, // Lower healthy BMI
    max: 24.9 * heightM * heightM, // Upper healthy BMI
  };
}

export function IdealWeightCalculator() {
  useSEO({
    title: 'Ideal Weight Calculator - Find Your Healthy Weight',
    description:
      'Free ideal weight calculator using multiple scientific formulas. Find your healthy weight range based on height, gender, and frame size.',
    canonical: 'https://gymgurus.com/calculators/ideal-weight',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Ideal Weight Calculator - Find Your Healthy Weight',
      url: 'https://gymgurus.com/calculators/ideal-weight',
      description:
        'Free ideal weight calculator using multiple scientific formulas. Find your healthy weight range based on height, gender, and frame size.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const [gender, setGender] = useState<Gender>('male');
  const [height, setHeight] = useState(170);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [currentWeight, setCurrentWeight] = useState<number | undefined>(undefined);

  // For feet/inches input
  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(7);

  const heightCm = useMemo(() => {
    if (heightUnit === 'ft') {
      return (feet * 12 + inches) * 2.54;
    }
    return height;
  }, [height, heightUnit, feet, inches]);

  const results = useMemo(() => {
    if (heightCm < 137) return null; // Formulas not valid below ~4'6"

    const formulaResults = Object.entries(FORMULAS).map(([key, formula]) => {
      const idealKg = formula[gender](heightCm);
      return {
        key,
        name: formula.name,
        description: formula.description,
        idealKg: Math.max(0, idealKg),
        idealLbs: Math.max(0, idealKg * 2.20462),
      };
    });

    const bmiRange = getBMIWeightRange(heightCm);
    const averageIdeal =
      formulaResults.reduce((sum, r) => sum + r.idealKg, 0) / formulaResults.length;

    return {
      formulas: formulaResults,
      bmiRange: {
        minKg: bmiRange.min,
        maxKg: bmiRange.max,
        minLbs: bmiRange.min * 2.20462,
        maxLbs: bmiRange.max * 2.20462,
      },
      averageIdeal: {
        kg: averageIdeal,
        lbs: averageIdeal * 2.20462,
      },
    };
  }, [heightCm, gender]);

  const difference = useMemo(() => {
    if (!currentWeight || !results) return null;
    const currentKg = weightUnit === 'lbs' ? currentWeight / 2.20462 : currentWeight;
    const diff = currentKg - results.averageIdeal.kg;
    return {
      kg: diff,
      lbs: diff * 2.20462,
      percentage: (diff / results.averageIdeal.kg) * 100,
    };
  }, [currentWeight, results, weightUnit]);

  const displayWeight = (kg: number) => {
    return weightUnit === 'kg' ? `${kg.toFixed(1)} kg` : `${(kg * 2.20462).toFixed(1)} lbs`;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Target className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Ideal Body Weight</h1>
          <p className="text-muted-foreground">
            Calculate your ideal weight using multiple formulas
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        {/* Gender */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <User className="w-4 h-4" />
            Gender
          </label>
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

        {/* Height */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Ruler className="w-4 h-4" />
            Height
          </label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setHeightUnit('cm')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                heightUnit === 'cm' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              cm
            </button>
            <button
              onClick={() => setHeightUnit('ft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                heightUnit === 'ft' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              ft/in
            </button>
          </div>
          {heightUnit === 'cm' ? (
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background text-lg"
              min={100}
              max={250}
              placeholder="Height in cm"
            />
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={feet}
                  onChange={(e) => setFeet(Number(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-background text-lg"
                  min={4}
                  max={8}
                />
                <span className="text-sm text-muted-foreground">feet</span>
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={inches}
                  onChange={(e) => setInches(Number(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-background text-lg"
                  min={0}
                  max={11}
                />
                <span className="text-sm text-muted-foreground">inches</span>
              </div>
            </div>
          )}
        </div>

        {/* Current Weight (Optional) */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="w-4 h-4" />
            Current Weight (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={currentWeight || ''}
              onChange={(e) =>
                setCurrentWeight(e.target.value ? Number(e.target.value) : undefined)
              }
              className="flex-1 p-3 border rounded-lg bg-background"
              placeholder="Enter current weight"
              min={1}
            />
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
              className="p-3 border rounded-lg bg-background"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
      </div>

      {results && (
        <>
          {/* Average Result */}
          <motion.div
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={`${heightCm}-${gender}`}
          >
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Average Ideal Weight</p>
              <p className="text-4xl font-bold text-primary mb-1">
                {displayWeight(results.averageIdeal.kg)}
              </p>
              <p className="text-sm text-muted-foreground">
                Healthy BMI Range: {displayWeight(results.bmiRange.minKg)} -{' '}
                {displayWeight(results.bmiRange.maxKg)}
              </p>
            </div>

            {/* Difference from current */}
            {difference && (
              <div
                className={`mt-4 p-3 rounded-lg ${Math.abs(difference.percentage) < 5 ? 'bg-green-500/20' : 'bg-background/50'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className={`w-5 h-5 ${difference.kg > 0 ? '' : 'rotate-180'}`} />
                  <span className="font-medium">
                    {difference.kg > 0 ? '+' : ''}
                    {displayWeight(difference.kg)} ({difference.percentage.toFixed(1)}%)
                    {Math.abs(difference.percentage) < 5 && " - You're at a healthy weight!"}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Formula Comparison */}
          <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Formula Comparison
            </h3>
            <div className="space-y-4">
              {results.formulas.map((formula) => {
                const inRange =
                  formula.idealKg >= results.bmiRange.minKg &&
                  formula.idealKg <= results.bmiRange.maxKg;
                return (
                  <motion.div
                    key={formula.key}
                    className="p-4 bg-secondary/50 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{formula.name}</p>
                        <p className="text-xs text-muted-foreground">{formula.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{displayWeight(formula.idealKg)}</p>
                        {inRange && (
                          <span className="text-xs text-green-500">Within healthy BMI</span>
                        )}
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <div
                        className="absolute h-full bg-green-400/50 rounded-full"
                        style={{
                          left: `${((results.bmiRange.minKg - 40) / 80) * 100}%`,
                          width: `${((results.bmiRange.maxKg - results.bmiRange.minKg) / 80) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute w-3 h-3 bg-blue-500 rounded-full -top-0.5"
                        style={{
                          left: `${Math.min(100, Math.max(0, ((formula.idealKg - 40) / 80) * 100))}%`,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* BMI Range Visual */}
          <div className="bg-card rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Healthy Weight Range (BMI 18.5-24.9)</h3>
            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Minimum</p>
                <p className="text-xl font-bold text-green-600">
                  {displayWeight(results.bmiRange.minKg)}
                </p>
              </div>
              <div className="flex-1 mx-4 h-2 bg-gradient-to-r from-green-300 via-green-500 to-green-300 rounded-full" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Maximum</p>
                <p className="text-xl font-bold text-green-600">
                  {displayWeight(results.bmiRange.maxKg)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg flex gap-3">
        <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About These Formulas</p>
          <p>
            Ideal body weight formulas provide estimates based on height and gender. They don't
            account for muscle mass, body composition, or frame size. Athletes and muscular
            individuals may have a healthy weight above these estimates. Consult a healthcare
            provider for personalized advice.
          </p>
        </div>
      </div>
      <RelatedCalculators currentPath="/calculators/ideal-weight" />
    </div>
  );
}

export default IdealWeightCalculator;

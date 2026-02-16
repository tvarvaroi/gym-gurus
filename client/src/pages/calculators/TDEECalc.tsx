import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Activity, Scale, Ruler, Target } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadCapturePopup } from '@/components/LeadCapturePopup';

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'athlete';
type Goal = 'cut' | 'maintain' | 'lean_bulk' | 'bulk';

interface ActivityOption {
  value: ActivityLevel;
  label: string;
  description: string;
  multiplier: number;
}

const ACTIVITY_LEVELS: ActivityOption[] = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Office job, little exercise',
    multiplier: 1.2,
  },
  { value: 'light', label: 'Light', description: '1-2 workouts/week', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderate', description: '3-4 workouts/week', multiplier: 1.55 },
  { value: 'active', label: 'Active', description: '5-6 workouts/week', multiplier: 1.725 },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Daily intense training',
    multiplier: 1.9,
  },
  { value: 'athlete', label: 'Athlete', description: '2x daily training', multiplier: 2.1 },
];

const GOALS: { value: Goal; label: string; adjustment: number; description: string }[] = [
  { value: 'cut', label: 'Fat Loss', adjustment: -500, description: '~0.5kg/week loss' },
  { value: 'maintain', label: 'Maintain', adjustment: 0, description: 'Stay at current weight' },
  { value: 'lean_bulk', label: 'Lean Bulk', adjustment: 250, description: '~0.25kg/week gain' },
  { value: 'bulk', label: 'Bulk', adjustment: 500, description: '~0.5kg/week gain' },
];

// Mifflin-St Jeor formula (most accurate)
function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateMacros(
  calories: number,
  weight: number,
  goal: Goal
): { protein: number; carbs: number; fat: number } {
  // Protein: 1.6-2.2g per kg body weight depending on goal
  let proteinMultiplier = 2.0;
  if (goal === 'cut') proteinMultiplier = 2.2; // Higher protein during cut
  if (goal === 'bulk') proteinMultiplier = 1.8; // Slightly lower during bulk

  const protein = Math.round(weight * proteinMultiplier);
  const proteinCalories = protein * 4;

  // Fat: 0.8-1g per kg body weight
  const fat = Math.round(weight * 0.9);
  const fatCalories = fat * 9;

  // Carbs: remainder
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round(Math.max(0, carbCalories / 4));

  return { protein, carbs, fat };
}

export function TDEECalculator() {
  useSEO({
    title: 'TDEE Calculator - Total Daily Energy Expenditure',
    description:
      'Free TDEE calculator using the Mifflin-St Jeor equation. Calculate your daily calorie needs based on age, weight, height, and activity level.',
    canonical: 'https://gymgurus.com/calculators/tdee',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'TDEE Calculator - Total Daily Energy Expenditure',
      url: 'https://gymgurus.com/calculators/tdee',
      description:
        'Free TDEE calculator using the Mifflin-St Jeor equation. Calculate your daily calorie needs based on age, weight, height, and activity level.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  // Convert units for calculation
  const weightKg = unit === 'imperial' ? weight * 0.453592 : weight;
  const heightCm = unit === 'imperial' ? height * 2.54 : height;

  const results = useMemo(() => {
    const bmr = calculateBMR(weightKg, heightCm, age, gender);
    const activityMultiplier =
      ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.multiplier || 1.55;
    const tdee = Math.round(bmr * activityMultiplier);

    const goalInfo = GOALS.find((g) => g.value === goal);
    const targetCalories = tdee + (goalInfo?.adjustment || 0);

    const macros = calculateMacros(targetCalories, weightKg, goal);

    return {
      bmr: Math.round(bmr),
      tdee,
      targetCalories,
      macros,
    };
  }, [weightKg, heightCm, age, gender, activityLevel, goal]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        showHome={false}
        items={[
          { label: 'All Calculators', href: '/calculators' },
          { label: 'TDEE Calculator' },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">TDEE Calculator</h1>
          <p className="text-muted-foreground">Calculate your daily calorie needs</p>
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
          Metric (kg/cm)
        </button>
        <button
          onClick={() => setUnit('imperial')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            unit === 'imperial' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          }`}
        >
          Imperial (lbs/in)
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

        {/* Age */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Age</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={15}
              max={80}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="flex-1"
            />
            <span className="font-bold text-xl w-16 text-center">{age}</span>
          </div>
        </div>

        {/* Weight */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="w-4 h-4" />
            Weight ({unit === 'metric' ? 'kg' : 'lbs'})
          </label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full p-3 border rounded-lg bg-background"
            min={30}
            max={unit === 'metric' ? 200 : 440}
          />
        </div>

        {/* Height */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Ruler className="w-4 h-4" />
            Height ({unit === 'metric' ? 'cm' : 'inches'})
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full p-3 border rounded-lg bg-background"
            min={unit === 'metric' ? 100 : 40}
            max={unit === 'metric' ? 250 : 100}
          />
        </div>

        {/* Activity Level */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Activity className="w-4 h-4" />
            Activity Level
          </label>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setActivityLevel(level.value)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  activityLevel === level.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <div className="font-medium">{level.label}</div>
                <div
                  className={`text-sm ${activityLevel === level.value ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  {level.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Target className="w-4 h-4" />
            Goal
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  goal === g.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <div className="font-medium">{g.label}</div>
                <div
                  className={`text-xs ${goal === g.value ? 'opacity-80' : 'text-muted-foreground'}`}
                >
                  {g.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <motion.div
        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={`${results.targetCalories}-${goal}`}
      >
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Daily Calorie Target</p>
          <p className="text-6xl font-bold text-primary">{results.targetCalories}</p>
          <p className="text-muted-foreground">calories/day</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">BMR</p>
            <p className="font-bold text-lg">{results.bmr}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">TDEE</p>
            <p className="font-bold text-lg">{results.tdee}</p>
          </div>
        </div>
      </motion.div>

      {/* Macros */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Suggested Macros</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-red-600">{results.macros.protein}g</span>
            </div>
            <p className="font-medium">Protein</p>
            <p className="text-xs text-muted-foreground">{results.macros.protein * 4} cal</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-yellow-600">{results.macros.carbs}g</span>
            </div>
            <p className="font-medium">Carbs</p>
            <p className="text-xs text-muted-foreground">{results.macros.carbs * 4} cal</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-600">{results.macros.fat}g</span>
            </div>
            <p className="font-medium">Fat</p>
            <p className="text-xs text-muted-foreground">{results.macros.fat * 9} cal</p>
          </div>
        </div>

        {/* Macro distribution bar */}
        <div className="mt-4 h-4 rounded-full overflow-hidden flex">
          <div
            className="bg-red-500"
            style={{ width: `${((results.macros.protein * 4) / results.targetCalories) * 100}%` }}
          />
          <div
            className="bg-yellow-500"
            style={{ width: `${((results.macros.carbs * 4) / results.targetCalories) * 100}%` }}
          />
          <div
            className="bg-green-500"
            style={{ width: `${((results.macros.fat * 9) / results.targetCalories) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>
            {Math.round(((results.macros.protein * 4) / results.targetCalories) * 100)}% protein
          </span>
          <span>
            {Math.round(((results.macros.carbs * 4) / results.targetCalories) * 100)}% carbs
          </span>
          <span>{Math.round(((results.macros.fat * 9) / results.targetCalories) * 100)}% fat</span>
        </div>
      </div>

      {/* Info Note */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> These are estimates using the Mifflin-St Jeor formula. Individual
          needs may vary based on metabolism, body composition, and other factors. Adjust based on
          your actual progress.
        </p>
      </div>
      <RelatedCalculators currentPath="/calculators/tdee" />
      <LeadCapturePopup trigger="calculator-result" calculationComplete={!!results} />
    </div>
  );
}

export default TDEECalculator;

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Target, Scale, Activity } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'cut' | 'maintain' | 'lean_bulk' | 'bulk';
type DietType = 'balanced' | 'low_carb' | 'high_carb' | 'keto' | 'high_protein';

interface MacroResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  cut: -500,
  maintain: 0,
  lean_bulk: 250,
  bulk: 500,
};

const DIET_MACROS: Record<
  DietType,
  { protein: number; carbs: number; fat: number; label: string }
> = {
  balanced: { protein: 0.3, carbs: 0.4, fat: 0.3, label: 'Balanced (30/40/30)' },
  low_carb: { protein: 0.35, carbs: 0.25, fat: 0.4, label: 'Low Carb (35/25/40)' },
  high_carb: { protein: 0.25, carbs: 0.55, fat: 0.2, label: 'High Carb (25/55/20)' },
  keto: { protein: 0.25, carbs: 0.05, fat: 0.7, label: 'Keto (25/5/70)' },
  high_protein: { protein: 0.4, carbs: 0.35, fat: 0.25, label: 'High Protein (40/35/25)' },
};

function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  // Mifflin-St Jeor formula
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

function calculateMacros(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  dietType: DietType
): MacroResult {
  const bmr = calculateBMR(gender, weightKg, heightCm, age);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  const calories = Math.round(tdee + GOAL_ADJUSTMENTS[goal]);

  const macroRatios = DIET_MACROS[dietType];

  const proteinCalories = calories * macroRatios.protein;
  const carbsCalories = calories * macroRatios.carbs;
  const fatCalories = calories * macroRatios.fat;

  return {
    calories,
    protein: Math.round(proteinCalories / 4), // 4 cal per gram
    carbs: Math.round(carbsCalories / 4), // 4 cal per gram
    fat: Math.round(fatCalories / 9), // 9 cal per gram
    proteinCalories: Math.round(proteinCalories),
    carbsCalories: Math.round(carbsCalories),
    fatCalories: Math.round(fatCalories),
  };
}

export function MacroCalculator() {
  useSEO({
    title: 'Macro Calculator - Calculate Your Daily Macros',
    description:
      'Free macro calculator. Calculate your optimal protein, carbs, and fat intake based on your goals (lose fat, maintain, or build muscle).',
    canonical: 'https://gymgurus.com/calculators/macros',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Macro Calculator - Calculate Your Daily Macros',
      url: 'https://gymgurus.com/calculators/macros',
      description:
        'Free macro calculator. Calculate your optimal protein, carbs, and fat intake based on your goals (lose fat, maintain, or build muscle).',
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
  const [dietType, setDietType] = useState<DietType>('balanced');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  const weightKg = unit === 'imperial' ? weight * 0.453592 : weight;
  const heightCm = unit === 'imperial' ? height * 2.54 : height;

  const result = useMemo(
    () => calculateMacros(gender, weightKg, heightCm, age, activityLevel, goal, dietType),
    [gender, weightKg, heightCm, age, activityLevel, goal, dietType]
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Macro Calculator</h1>
          <p className="text-muted-foreground">Calculate your daily macronutrients</p>
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

        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
              min={15}
              max={80}
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
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Height ({unit === 'metric' ? 'cm' : 'in'})
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full p-3 border rounded-lg bg-background"
              min={1}
            />
          </div>
        </div>

        {/* Activity Level */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Activity className="w-4 h-4" />
            Activity Level
          </label>
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
            className="w-full p-3 border rounded-lg bg-background"
          >
            <option value="sedentary">Sedentary (office job, little exercise)</option>
            <option value="light">Light (1-2 workouts/week)</option>
            <option value="moderate">Moderate (3-4 workouts/week)</option>
            <option value="active">Active (5-6 workouts/week)</option>
            <option value="very_active">Very Active (daily intense training)</option>
          </select>
        </div>

        {/* Goal */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Target className="w-4 h-4" />
            Goal
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'cut', label: 'Fat Loss', desc: '-500 cal' },
              { value: 'maintain', label: 'Maintain', desc: '0 cal' },
              { value: 'lean_bulk', label: 'Lean Bulk', desc: '+250 cal' },
              { value: 'bulk', label: 'Bulk', desc: '+500 cal' },
            ].map((g) => (
              <button
                key={g.value}
                onClick={() => setGoal(g.value as Goal)}
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
                  {g.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Diet Type */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="w-4 h-4" />
            Diet Type
          </label>
          <select
            value={dietType}
            onChange={(e) => setDietType(e.target.value as DietType)}
            className="w-full p-3 border rounded-lg bg-background"
          >
            {Object.entries(DIET_MACROS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <motion.div
        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={`${result.calories}-${dietType}`}
      >
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Daily Calories</p>
          <p className="text-5xl font-bold text-primary">{result.calories}</p>
        </div>

        {/* Macro Circles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-red-100 flex items-center justify-center">
              <div>
                <span className="text-2xl font-bold text-red-600">{result.protein}g</span>
              </div>
            </div>
            <p className="font-medium">Protein</p>
            <p className="text-xs text-muted-foreground">{result.proteinCalories} cal</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-yellow-100 flex items-center justify-center">
              <div>
                <span className="text-2xl font-bold text-yellow-600">{result.carbs}g</span>
              </div>
            </div>
            <p className="font-medium">Carbs</p>
            <p className="text-xs text-muted-foreground">{result.carbsCalories} cal</p>
          </div>
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
              <div>
                <span className="text-2xl font-bold text-green-600">{result.fat}g</span>
              </div>
            </div>
            <p className="font-medium">Fat</p>
            <p className="text-xs text-muted-foreground">{result.fatCalories} cal</p>
          </div>
        </div>

        {/* Macro Bar */}
        <div className="h-6 rounded-full overflow-hidden flex">
          <div
            className="bg-red-500"
            style={{ width: `${(result.proteinCalories / result.calories) * 100}%` }}
          />
          <div
            className="bg-yellow-500"
            style={{ width: `${(result.carbsCalories / result.calories) * 100}%` }}
          />
          <div
            className="bg-green-500"
            style={{ width: `${(result.fatCalories / result.calories) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{Math.round((result.proteinCalories / result.calories) * 100)}% protein</span>
          <span>{Math.round((result.carbsCalories / result.calories) * 100)}% carbs</span>
          <span>{Math.round((result.fatCalories / result.calories) * 100)}% fat</span>
        </div>
      </motion.div>

      {/* Per Meal Breakdown */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Per Meal (3 meals/day)</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{Math.round(result.calories / 3)}</p>
            <p className="text-sm text-muted-foreground">Calories</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{Math.round(result.protein / 3)}g</p>
            <p className="text-sm text-muted-foreground">Protein</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">{Math.round(result.carbs / 3)}g</p>
            <p className="text-sm text-muted-foreground">Carbs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{Math.round(result.fat / 3)}g</p>
            <p className="text-sm text-muted-foreground">Fat</p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
        <p className="text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> These are starting points. Adjust based on your progress. If not
          losing weight, reduce by 100-200 calories. If energy is low during workouts, add more
          carbs around training.
        </p>
      </div>
      <RelatedCalculators currentPath="/calculators/macros" />
    </div>
  );
}

export default MacroCalculator;

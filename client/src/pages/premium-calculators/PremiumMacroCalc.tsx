import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Apple } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'cut' | 'maintain' | 'lean_bulk' | 'bulk';
type DietType = 'balanced' | 'low_carb' | 'high_carb' | 'keto' | 'high_protein';

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

function calculateBMR(gender: Gender, weight: number, height: number, age: number): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateMacros(
  gender: Gender,
  weight: number,
  height: number,
  age: number,
  activityLevel: ActivityLevel,
  goal: Goal,
  dietType: DietType
) {
  const bmr = calculateBMR(gender, weight, height, age);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
  const calories = Math.round(tdee + GOAL_ADJUSTMENTS[goal]);

  const macroRatios = DIET_MACROS[dietType];
  const proteinCalories = calories * macroRatios.protein;
  const carbsCalories = calories * macroRatios.carbs;
  const fatCalories = calories * macroRatios.fat;

  return {
    calories,
    protein: Math.round(proteinCalories / 4),
    carbs: Math.round(carbsCalories / 4),
    fat: Math.round(fatCalories / 9),
    proteinCalories: Math.round(proteinCalories),
    carbsCalories: Math.round(carbsCalories),
    fatCalories: Math.round(fatCalories),
  };
}

export default function PremiumMacroCalc() {
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [dietType, setDietType] = useState<DietType>('balanced');

  const results = useMemo(
    () => calculateMacros(gender, weight, height, age, activityLevel, goal, dietType),
    [gender, weight, height, age, activityLevel, goal, dietType]
  );

  const inputs = { gender, age, weight, height, activityLevel, goal, dietType };
  const hasResults = weight > 0 && height > 0 && age > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="macros"
      title="Macro Calculator"
      description="Calculate your optimal macronutrient distribution"
      icon={<Apple className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Gender */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Gender</label>
          <div className="grid grid-cols-2 gap-3">
            {(['male', 'female'] as Gender[]).map((g) => (
              <motion.button
                key={g}
                onClick={() => setGender(g)}
                whileHover={{ scale: 1.02 }}
                className={`py-3 rounded-xl font-medium transition-all ${
                  gender === g ? 'premium-button' : 'bg-card border border-border'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Age, Weight, Height */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Age</label>
            <input
              type="range"
              min="15"
              max="80"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>15</span>
              <span className="font-bold text-primary">{age}</span>
              <span>80</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Weight (kg)</label>
            <input
              type="range"
              min="40"
              max="200"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>40</span>
              <span className="font-bold text-primary">{weight}</span>
              <span>200</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Height (cm)</label>
            <input
              type="range"
              min="140"
              max="220"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="premium-slider w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>140</span>
              <span className="font-bold text-primary">{height}</span>
              <span>220</span>
            </div>
          </div>
        </div>

        {/* Activity Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Activity Level</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { value: 'sedentary', label: 'Sedentary', desc: 'Little exercise' },
              { value: 'light', label: 'Light', desc: '1-2 workouts/week' },
              { value: 'moderate', label: 'Moderate', desc: '3-4 workouts/week' },
              { value: 'active', label: 'Active', desc: '5-6 workouts/week' },
              { value: 'very_active', label: 'Very Active', desc: 'Daily training' },
            ].map((level) => (
              <motion.button
                key={level.value}
                onClick={() => setActivityLevel(level.value as ActivityLevel)}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-xl text-left transition-all ${
                  activityLevel === level.value
                    ? 'premium-gradient-bg-strong border-2 border-primary'
                    : 'bg-card border border-border'
                }`}
              >
                <div className="font-medium text-sm">{level.label}</div>
                <div className="text-xs text-muted-foreground">{level.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Goal</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'cut', label: 'Fat Loss', desc: '-500 cal' },
              { value: 'maintain', label: 'Maintain', desc: '0 cal' },
              { value: 'lean_bulk', label: 'Lean Bulk', desc: '+250 cal' },
              { value: 'bulk', label: 'Bulk', desc: '+500 cal' },
            ].map((g) => (
              <motion.button
                key={g.value}
                onClick={() => setGoal(g.value as Goal)}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-xl text-center transition-all ${
                  goal === g.value
                    ? 'premium-gradient-bg-strong border-2 border-primary'
                    : 'bg-card border border-border'
                }`}
              >
                <div className="font-medium text-sm">{g.label}</div>
                <div className="text-xs text-muted-foreground">{g.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Diet Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Diet Type</label>
          <select
            value={dietType}
            onChange={(e) => setDietType(e.target.value as DietType)}
            className="w-full p-3 rounded-xl border border-border bg-card"
          >
            {Object.entries(DIET_MACROS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div className="space-y-6">
          <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
            <p className="text-sm text-muted-foreground mb-2">Daily Calories</p>
            <p
              className="text-6xl font-light gradient-text"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {results.calories}
            </p>
          </motion.div>

          {/* Macro Circles */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div className="premium-card text-center" whileHover={{ scale: 1.05 }}>
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-red-600 dark:text-red-300">
                  {results.protein}g
                </span>
              </div>
              <p className="font-medium">Protein</p>
              <p className="text-xs text-muted-foreground">{results.proteinCalories} cal</p>
            </motion.div>

            <motion.div className="premium-card text-center" whileHover={{ scale: 1.05 }}>
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">
                  {results.carbs}g
                </span>
              </div>
              <p className="font-medium">Carbs</p>
              <p className="text-xs text-muted-foreground">{results.carbsCalories} cal</p>
            </motion.div>

            <motion.div className="premium-card text-center" whileHover={{ scale: 1.05 }}>
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600 dark:text-green-300">
                  {results.fat}g
                </span>
              </div>
              <p className="font-medium">Fat</p>
              <p className="text-xs text-muted-foreground">{results.fatCalories} cal</p>
            </motion.div>
          </div>

          {/* Macro Bar */}
          <div className="premium-card">
            <div className="h-6 rounded-full overflow-hidden flex">
              <div
                className="bg-red-500"
                style={{ width: `${(results.proteinCalories / results.calories) * 100}%` }}
              />
              <div
                className="bg-yellow-500"
                style={{ width: `${(results.carbsCalories / results.calories) * 100}%` }}
              />
              <div
                className="bg-green-500"
                style={{ width: `${(results.fatCalories / results.calories) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{Math.round((results.proteinCalories / results.calories) * 100)}% P</span>
              <span>{Math.round((results.carbsCalories / results.calories) * 100)}% C</span>
              <span>{Math.round((results.fatCalories / results.calories) * 100)}% F</span>
            </div>
          </div>

          {/* Per Meal */}
          <div className="premium-card">
            <h4 className="font-semibold mb-4">Per Meal (3 meals/day)</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(results.calories / 3)}
                </p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {Math.round(results.protein / 3)}g
                </p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {Math.round(results.carbs / 3)}g
                </p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{Math.round(results.fat / 3)}g</p>
                <p className="text-xs text-muted-foreground">Fat</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}

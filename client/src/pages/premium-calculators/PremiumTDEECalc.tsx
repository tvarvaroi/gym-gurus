import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'athlete';
type Goal = 'cut' | 'maintain' | 'lean_bulk' | 'bulk';

const ACTIVITY_LEVELS = [
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

const GOALS = [
  { value: 'cut', label: 'Fat Loss', adjustment: -500, description: '~0.5kg/week loss' },
  { value: 'maintain', label: 'Maintain', adjustment: 0, description: 'Stay at current weight' },
  { value: 'lean_bulk', label: 'Lean Bulk', adjustment: 250, description: '~0.25kg/week gain' },
  { value: 'bulk', label: 'Bulk', adjustment: 500, description: '~0.5kg/week gain' },
];

// Calculation functions (same as public version)
function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calculateMacros(calories: number, weight: number, goal: Goal) {
  let proteinMultiplier = 2.0;
  if (goal === 'cut') proteinMultiplier = 2.2;
  if (goal === 'bulk') proteinMultiplier = 1.8;

  const protein = Math.round(weight * proteinMultiplier);
  const proteinCalories = protein * 4;
  const fat = Math.round(weight * 0.9);
  const fatCalories = fat * 9;
  const carbCalories = calories - proteinCalories - fatCalories;
  const carbs = Math.round(Math.max(0, carbCalories / 4));

  return { protein, carbs, fat };
}

export default function PremiumTDEECalc() {
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');

  const results = useMemo(() => {
    const bmr = calculateBMR(weight, height, age, gender);
    const activityMultiplier =
      ACTIVITY_LEVELS.find((a) => a.value === activityLevel)?.multiplier || 1.55;
    const tdee = Math.round(bmr * activityMultiplier);
    const goalAdjustment = GOALS.find((g) => g.value === goal)?.adjustment || 0;
    const adjustedCalories = tdee + goalAdjustment;
    const macros = calculateMacros(adjustedCalories, weight, goal);

    return { bmr: Math.round(bmr), tdee, adjustedCalories, macros };
  }, [weight, height, age, gender, activityLevel, goal]);

  const inputs = { gender, age, weight, height, activityLevel, goal };
  const hasResults = weight > 0 && height > 0 && age > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="tdee"
      title="TDEE Calculator"
      description="Calculate your Total Daily Energy Expenditure with premium insights"
      icon={<Calculator className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* Gender Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              {(['male', 'female'] as Gender[]).map((g) => (
                <motion.button
                  key={g}
                  onClick={() => setGender(g)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`py-3 px-4 rounded-xl font-medium transition-all ${
                    gender === g
                      ? 'premium-button'
                      : 'bg-card hover:bg-card/80 border border-border'
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Age, Weight, Height Sliders */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Age */}
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

            {/* Weight */}
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

            {/* Height */}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ACTIVITY_LEVELS.map((level) => (
                <motion.button
                  key={level.value}
                  onClick={() => setActivityLevel(level.value as ActivityLevel)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-xl text-left transition-all ${
                    activityLevel === level.value
                      ? 'premium-gradient-bg-strong border-2 border-primary'
                      : 'bg-card hover:bg-card/80 border border-border'
                  }`}
                >
                  <div className="font-medium text-sm">{level.label}</div>
                  <div className="text-xs text-muted-foreground">{level.description}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Goal</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GOALS.map((g) => (
                <motion.button
                  key={g.value}
                  onClick={() => setGoal(g.value as Goal)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-xl text-center transition-all ${
                    goal === g.value
                      ? 'premium-gradient-bg-strong border-2 border-primary'
                      : 'bg-card hover:bg-card/80 border border-border'
                  }`}
                >
                  <div className="font-medium text-sm">{g.label}</div>
                  <div className="text-xs text-muted-foreground">{g.description}</div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Your Results</h3>

          <div className="grid md:grid-cols-3 gap-4">
            {/* BMR */}
            <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
              <p className="text-sm text-muted-foreground mb-2">Basal Metabolic Rate</p>
              <p
                className="text-5xl font-light gradient-text"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {results.bmr}
              </p>
              <p className="text-xs text-muted-foreground mt-2">calories/day at rest</p>
            </motion.div>

            {/* TDEE */}
            <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
              <p className="text-sm text-muted-foreground mb-2">TDEE</p>
              <p
                className="text-5xl font-light gradient-text"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {results.tdee}
              </p>
              <p className="text-xs text-muted-foreground mt-2">maintenance calories</p>
            </motion.div>

            {/* Adjusted for Goal */}
            <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
              <p className="text-sm text-muted-foreground mb-2">Target Calories</p>
              <p
                className="text-5xl font-light gradient-text"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {results.adjustedCalories}
              </p>
              <p className="text-xs text-muted-foreground mt-2">for your goal</p>
            </motion.div>
          </div>

          {/* Macro Breakdown */}
          <div className="premium-card">
            <h4 className="font-semibold mb-4">Macro Breakdown</h4>
            <div className="space-y-4">
              {/* Protein */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm text-primary font-bold">{results.macros.protein}g</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    style={{
                      width: `${((results.macros.protein * 4) / results.adjustedCalories) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Carbs */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Carbs</span>
                  <span className="text-sm text-primary font-bold">{results.macros.carbs}g</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    style={{
                      width: `${((results.macros.carbs * 4) / results.adjustedCalories) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Fat */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Fat</span>
                  <span className="text-sm text-primary font-bold">{results.macros.fat}g</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    style={{
                      width: `${((results.macros.fat * 9) / results.adjustedCalories) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}

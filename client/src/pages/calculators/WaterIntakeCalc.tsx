import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Scale, Activity, Sun, ThermometerSun, Coffee, Beer, Info } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';
import { Breadcrumbs } from '@/components/Breadcrumbs';

type WeightUnit = 'kg' | 'lbs';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'athlete';
type Climate = 'cold' | 'moderate' | 'hot' | 'very_hot';

const ACTIVITY_LEVELS = {
  sedentary: { name: 'Sedentary', description: 'Little to no exercise', multiplier: 1.0 },
  light: { name: 'Lightly Active', description: 'Light exercise 1-3 days/week', multiplier: 1.1 },
  moderate: {
    name: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    multiplier: 1.2,
  },
  active: { name: 'Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.3 },
  very_active: {
    name: 'Very Active',
    description: 'Very hard exercise + physical job',
    multiplier: 1.4,
  },
  athlete: { name: 'Athlete', description: 'Training 2x/day or extreme activity', multiplier: 1.5 },
};

const CLIMATE_FACTORS = {
  cold: { name: 'Cold', description: 'Below 10°C / 50°F', multiplier: 0.95, icon: '❄️' },
  moderate: { name: 'Moderate', description: '10-25°C / 50-77°F', multiplier: 1.0, icon: '🌤️' },
  hot: { name: 'Hot', description: '25-35°C / 77-95°F', multiplier: 1.15, icon: '☀️' },
  very_hot: { name: 'Very Hot', description: 'Above 35°C / 95°F', multiplier: 1.3, icon: '🔥' },
};

export function WaterIntakeCalculator() {
  useSEO({
    title: 'Water Intake Calculator - Daily Hydration Guide',
    description:
      'Free water intake calculator. Calculate how much water you should drink daily based on your weight, activity level, and climate.',
    canonical: 'https://gymgurus.com/calculators/water-intake',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Water Intake Calculator - Daily Hydration Guide',
      url: 'https://gymgurus.com/calculators/water-intake',
      description:
        'Free water intake calculator. Calculate how much water you should drink daily based on your weight, activity level, and climate.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const [weight, setWeight] = useState(70);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [climate, setClimate] = useState<Climate>('moderate');
  const [caffeineServings, setCaffeineServings] = useState(2);
  const [alcoholServings, setAlcoholServings] = useState(0);

  const weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;

  const results = useMemo(() => {
    // Base water intake: 30-35ml per kg of body weight
    const baseIntake = weightKg * 33; // Using 33ml as middle ground

    // Apply activity multiplier
    const activityMultiplied = baseIntake * ACTIVITY_LEVELS[activityLevel].multiplier;

    // Apply climate multiplier
    const climateMultiplied = activityMultiplied * CLIMATE_FACTORS[climate].multiplier;

    // Add extra water for caffeine (150ml per serving to compensate for diuretic effect)
    const caffeineExtra = caffeineServings * 150;

    // Add extra water for alcohol (250ml per serving)
    const alcoholExtra = alcoholServings * 250;

    const totalMl = climateMultiplied + caffeineExtra + alcoholExtra;
    const totalLiters = totalMl / 1000;
    const totalOunces = totalMl * 0.033814;
    const totalCups = totalMl / 237; // 8oz cups

    return {
      totalMl: Math.round(totalMl),
      totalLiters: totalLiters.toFixed(1),
      totalOunces: Math.round(totalOunces),
      totalCups: Math.round(totalCups),
      baseIntake: Math.round(baseIntake),
      activityBonus: Math.round(activityMultiplied - baseIntake),
      climateBonus: Math.round(climateMultiplied - activityMultiplied),
      caffeineExtra: caffeineExtra,
      alcoholExtra: alcoholExtra,
      glasses: Math.round(totalMl / 250), // 250ml glasses
    };
  }, [weightKg, activityLevel, climate, caffeineServings, alcoholServings]);

  // Calculate hourly intake (assuming 16 waking hours)
  const hourlyIntake = useMemo(() => {
    const wakingHours = 16;
    return Math.round(results.totalMl / wakingHours);
  }, [results.totalMl]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        showHome={false}
        items={[
          { label: 'All Calculators', href: '/calculators' },
          { label: 'Water Intake Calculator' },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-cyan-500/10 rounded-xl">
          <Droplets className="w-8 h-8 text-cyan-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Daily Water Intake</h1>
          <p className="text-muted-foreground">Calculate your optimal hydration needs</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        {/* Weight */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Scale className="w-4 h-4" />
            Body Weight
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="flex-1 p-3 border rounded-lg bg-background text-lg font-bold"
              min={30}
              max={300}
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

        {/* Activity Level */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Activity className="w-4 h-4" />
            Activity Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
              <button
                key={key}
                onClick={() => setActivityLevel(key as ActivityLevel)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  activityLevel === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <p className="font-medium text-sm">{level.name}</p>
                <p className="text-xs opacity-70">{level.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Climate */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <ThermometerSun className="w-4 h-4" />
            Climate / Environment
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CLIMATE_FACTORS).map(([key, climate]) => (
              <button
                key={key}
                onClick={() => setClimate(key as Climate)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  climate === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                <span className="text-2xl block mb-1">{climate.icon}</span>
                <p className="font-medium text-sm">{climate.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Caffeine & Alcohol */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Coffee className="w-4 h-4" />
              Caffeine (cups/day)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCaffeineServings(Math.max(0, caffeineServings - 1))}
                className="p-2 rounded-lg bg-secondary"
              >
                -
              </button>
              <span className="flex-1 text-center text-xl font-bold">{caffeineServings}</span>
              <button
                onClick={() => setCaffeineServings(Math.min(10, caffeineServings + 1))}
                className="p-2 rounded-lg bg-secondary"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Beer className="w-4 h-4" />
              Alcohol (drinks/day)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAlcoholServings(Math.max(0, alcoholServings - 1))}
                className="p-2 rounded-lg bg-secondary"
              >
                -
              </button>
              <span className="flex-1 text-center text-xl font-bold">{alcoholServings}</span>
              <button
                onClick={() => setAlcoholServings(Math.min(10, alcoholServings + 1))}
                className="p-2 rounded-lg bg-secondary"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <motion.div
        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={results.totalMl}
      >
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Daily Water Intake</p>
          <p className="text-5xl font-bold text-primary mb-2">{results.totalLiters}L</p>
          <p className="text-lg text-muted-foreground">
            {results.totalMl} ml / {results.totalOunces} oz
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-background/50 rounded-lg">
            <Droplets className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{results.glasses}</p>
            <p className="text-xs text-muted-foreground">glasses (250ml)</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg">
            <Sun className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{hourlyIntake}</p>
            <p className="text-xs text-muted-foreground">ml per hour</p>
          </div>
          <div className="p-3 bg-background/50 rounded-lg">
            <Activity className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{results.totalCups}</p>
            <p className="text-xs text-muted-foreground">cups (8oz)</p>
          </div>
        </div>
      </motion.div>

      {/* Breakdown */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Intake Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Base requirement', value: results.baseIntake, color: 'bg-cyan-500' },
            { label: 'Activity bonus', value: results.activityBonus, color: 'bg-green-500' },
            { label: 'Climate adjustment', value: results.climateBonus, color: 'bg-orange-500' },
            { label: 'Caffeine compensation', value: results.caffeineExtra, color: 'bg-amber-500' },
            { label: 'Alcohol compensation', value: results.alcoholExtra, color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="font-medium">
                {item.value > 0 ? `+${item.value}` : item.value} ml
              </span>
            </div>
          ))}
          <div className="pt-3 mt-3 border-t flex justify-between font-bold">
            <span>Total</span>
            <span>{results.totalMl} ml</span>
          </div>
        </div>
      </div>

      {/* Hydration Schedule */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h3 className="font-bold text-lg mb-4">Suggested Hydration Schedule</h3>
        <div className="space-y-2">
          {[
            {
              time: '6:00 AM',
              event: 'Wake up',
              amount: Math.round(results.totalMl * 0.1),
              note: 'Start your day hydrated',
            },
            {
              time: '8:00 AM',
              event: 'Breakfast',
              amount: Math.round(results.totalMl * 0.12),
              note: 'With your morning meal',
            },
            {
              time: '10:00 AM',
              event: 'Mid-morning',
              amount: Math.round(results.totalMl * 0.12),
              note: 'Stay consistent',
            },
            {
              time: '12:00 PM',
              event: 'Lunch',
              amount: Math.round(results.totalMl * 0.15),
              note: 'Before and during lunch',
            },
            {
              time: '2:00 PM',
              event: 'Afternoon',
              amount: Math.round(results.totalMl * 0.12),
              note: 'Beat the afternoon slump',
            },
            {
              time: '4:00 PM',
              event: 'Pre-workout',
              amount: Math.round(results.totalMl * 0.12),
              note: 'If exercising',
            },
            {
              time: '6:00 PM',
              event: 'Dinner',
              amount: Math.round(results.totalMl * 0.12),
              note: 'With your evening meal',
            },
            {
              time: '8:00 PM',
              event: 'Evening',
              amount: Math.round(results.totalMl * 0.08),
              note: 'Slow down before bed',
            },
          ].map((slot, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-2 hover:bg-secondary/50 rounded-lg"
            >
              <div className="w-16 text-sm font-medium text-muted-foreground">{slot.time}</div>
              <div className="flex-1">
                <p className="font-medium text-sm">{slot.event}</p>
                <p className="text-xs text-muted-foreground">{slot.note}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-cyan-500">{slot.amount} ml</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4">Hydration Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span>💧</span>
            <span>Drink a glass of water first thing in the morning</span>
          </li>
          <li className="flex gap-2">
            <span>🍋</span>
            <span>Add lemon or cucumber for flavor variety</span>
          </li>
          <li className="flex gap-2">
            <span>⏰</span>
            <span>Set reminders to drink water throughout the day</span>
          </li>
          <li className="flex gap-2">
            <span>🏃</span>
            <span>Drink extra 500ml for every hour of exercise</span>
          </li>
          <li className="flex gap-2">
            <span>🥤</span>
            <span>Keep a water bottle visible at your desk</span>
          </li>
          <li className="flex gap-2">
            <span>🍉</span>
            <span>Eat water-rich foods (cucumber, watermelon, oranges)</span>
          </li>
        </ul>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg flex gap-3">
        <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p>
            Water needs vary by individual. This calculator provides general guidelines based on
            weight, activity, and environment. Listen to your body - thirst, urine color (aim for
            pale yellow), and energy levels are good indicators of hydration status.
          </p>
        </div>
      </div>
      <RelatedCalculators currentPath="/calculators/water-intake" />
    </div>
  );
}

export default WaterIntakeCalculator;

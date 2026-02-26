import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Scale, Activity, ThermometerSun, Coffee, Beer } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';
import { useFitnessProfile } from '@/hooks/useFitnessProfile';

type WeightUnit = 'kg' | 'lbs';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'athlete';
type Climate = 'cold' | 'moderate' | 'hot' | 'very_hot';

const ACTIVITY_LEVELS = {
  sedentary: { name: 'Sedentary', multiplier: 1.0 },
  light: { name: 'Lightly Active', multiplier: 1.1 },
  moderate: { name: 'Moderately Active', multiplier: 1.2 },
  active: { name: 'Active', multiplier: 1.3 },
  very_active: { name: 'Very Active', multiplier: 1.4 },
  athlete: { name: 'Athlete', multiplier: 1.5 },
};

const CLIMATE_FACTORS = {
  cold: { name: 'Cold', multiplier: 0.95, icon: '❄️' },
  moderate: { name: 'Moderate', multiplier: 1.0, icon: '🌤️' },
  hot: { name: 'Hot', multiplier: 1.15, icon: '☀️' },
  very_hot: { name: 'Very Hot', multiplier: 1.3, icon: '🔥' },
};

export default function PremiumWaterIntakeCalc() {
  const profile = useFitnessProfile();
  const [weight, setWeight] = useState(70);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [climate, setClimate] = useState<Climate>('moderate');
  const [caffeineServings, setCaffeineServings] = useState(2);
  const [alcoholServings, setAlcoholServings] = useState(0);

  useEffect(() => {
    if (!profile.isLoaded) return;
    if (profile.weightKg) setWeight(Math.round(profile.weightKg));
  }, [profile.isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;

  const results = useMemo(() => {
    const baseIntake = weightKg * 33;
    const activityMultiplied = baseIntake * ACTIVITY_LEVELS[activityLevel].multiplier;
    const climateMultiplied = activityMultiplied * CLIMATE_FACTORS[climate].multiplier;
    const caffeineExtra = caffeineServings * 150;
    const alcoholExtra = alcoholServings * 250;

    const totalMl = climateMultiplied + caffeineExtra + alcoholExtra;
    const totalLiters = totalMl / 1000;
    const totalOunces = totalMl * 0.033814;
    const totalCups = totalMl / 237;

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
      glasses: Math.round(totalMl / 250),
    };
  }, [weightKg, activityLevel, climate, caffeineServings, alcoholServings]);

  const hourlyIntake = useMemo(() => {
    const wakingHours = 16;
    return Math.round(results.totalMl / wakingHours);
  }, [results.totalMl]);

  const inputs = { weight, weightUnit, activityLevel, climate, caffeineServings, alcoholServings };
  const hasResults = weight > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="water-intake"
      title="Water Intake Calculator"
      description="Optimize your hydration with personalized recommendations"
      icon={<Droplets className="w-8 h-8" />}
      inputs={inputs}
      results={results}
      hasResults={hasResults}
    >
      <motion.div variants={fadeInUp} className="space-y-8">
        {/* Weight Input */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Scale className="w-4 h-4" />
            Body Weight
          </label>
          <input
            type="range"
            min={weightUnit === 'kg' ? 40 : 90}
            max={weightUnit === 'kg' ? 150 : 330}
            step={weightUnit === 'kg' ? 1 : 2}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="premium-slider w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{weightUnit === 'kg' ? 40 : 90}</span>
            <span className="font-bold text-primary">
              {weight} {weightUnit}
            </span>
            <span>{weightUnit === 'kg' ? 150 : 330}</span>
          </div>
        </div>

        {/* Unit Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => setWeightUnit('kg')}
            whileHover={{ scale: 1.02 }}
            className={`py-3 rounded-xl font-medium transition-all ${
              weightUnit === 'kg' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Kilograms (kg)
          </motion.button>
          <motion.button
            onClick={() => setWeightUnit('lbs')}
            whileHover={{ scale: 1.02 }}
            className={`py-3 rounded-xl font-medium transition-all ${
              weightUnit === 'lbs' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Pounds (lbs)
          </motion.button>
        </div>

        {/* Activity Level */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4" />
            Activity Level
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
              <motion.button
                key={key}
                onClick={() => setActivityLevel(key as ActivityLevel)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl text-center transition-all ${
                  activityLevel === key
                    ? 'premium-gradient-bg-strong border-2 border-primary'
                    : 'bg-card hover:bg-card/80 border border-border'
                }`}
              >
                <div className="font-medium text-sm">{level.name}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Climate */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <ThermometerSun className="w-4 h-4" />
            Climate / Environment
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(CLIMATE_FACTORS).map(([key, climateInfo]) => (
              <motion.button
                key={key}
                onClick={() => setClimate(key as Climate)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-xl text-center transition-all ${
                  climate === key
                    ? 'premium-gradient-bg-strong border-2 border-primary'
                    : 'bg-card hover:bg-card/80 border border-border'
                }`}
              >
                <span className="text-2xl block mb-1">{climateInfo.icon}</span>
                <p className="font-medium text-sm">{climateInfo.name}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Caffeine & Alcohol */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Coffee className="w-4 h-4" />
              Caffeine (cups/day)
            </label>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setCaffeineServings(Math.max(0, caffeineServings - 1))}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-card border border-border font-bold"
              >
                -
              </motion.button>
              <span className="flex-1 text-center text-xl font-bold">{caffeineServings}</span>
              <motion.button
                onClick={() => setCaffeineServings(Math.min(10, caffeineServings + 1))}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-card border border-border font-bold"
              >
                +
              </motion.button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Beer className="w-4 h-4" />
              Alcohol (drinks/day)
            </label>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setAlcoholServings(Math.max(0, alcoholServings - 1))}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-card border border-border font-bold"
              >
                -
              </motion.button>
              <span className="flex-1 text-center text-xl font-bold">{alcoholServings}</span>
              <motion.button
                onClick={() => setAlcoholServings(Math.min(10, alcoholServings + 1))}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-card border border-border font-bold"
              >
                +
              </motion.button>
            </div>
          </div>
        </div>

        {/* Results */}
        <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
          <p className="text-sm text-muted-foreground mb-2">Daily Water Intake</p>
          <p
            className="text-6xl font-light gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {results.totalLiters}L
          </p>
          <p className="text-lg text-muted-foreground mt-2">
            {results.totalMl} ml / {results.totalOunces} oz
          </p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="premium-card text-center">
            <Droplets className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold">{results.glasses}</p>
            <p className="text-xs text-muted-foreground">glasses (250ml)</p>
          </div>
          <div className="premium-card text-center">
            <Activity className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold">{hourlyIntake}</p>
            <p className="text-xs text-muted-foreground">ml per hour</p>
          </div>
          <div className="premium-card text-center">
            <Scale className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
            <p className="text-2xl font-bold">{results.totalCups}</p>
            <p className="text-xs text-muted-foreground">cups (8oz)</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4">Intake Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: 'Base requirement', value: results.baseIntake, color: 'bg-cyan-500' },
              { label: 'Activity bonus', value: results.activityBonus, color: 'bg-green-500' },
              { label: 'Climate adjustment', value: results.climateBonus, color: 'bg-orange-500' },
              {
                label: 'Caffeine compensation',
                value: results.caffeineExtra,
                color: 'bg-amber-500',
              },
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
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}

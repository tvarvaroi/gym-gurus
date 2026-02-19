import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Scale, Dumbbell } from 'lucide-react';
import { PremiumCalculatorWrapper } from '@/components/PremiumCalculatorWrapper';
import { fadeInUp } from '@/lib/premiumAnimations';

const EXERCISE_CATEGORIES = {
  strength: {
    name: 'Strength Training',
    exercises: [
      { name: 'Weight lifting (general)', met: 3.5 },
      { name: 'Weight lifting (vigorous)', met: 6.0 },
      { name: 'Circuit training', met: 8.0 },
      { name: 'Calisthenics (moderate)', met: 3.8 },
      { name: 'Calisthenics (vigorous)', met: 8.0 },
      { name: 'CrossFit', met: 8.0 },
      { name: 'Kettlebell workout', met: 9.8 },
    ],
  },
  cardio: {
    name: 'Cardio',
    exercises: [
      { name: 'Walking (3 mph)', met: 3.5 },
      { name: 'Walking (4 mph)', met: 5.0 },
      { name: 'Running (5 mph)', met: 8.3 },
      { name: 'Running (6 mph)', met: 9.8 },
      { name: 'Running (7 mph)', met: 11.0 },
      { name: 'Running (8 mph)', met: 11.8 },
      { name: 'Sprinting', met: 23.0 },
      { name: 'Stair climbing', met: 9.0 },
      { name: 'Jump rope (moderate)', met: 11.8 },
    ],
  },
  cycling: {
    name: 'Cycling',
    exercises: [
      { name: 'Cycling (10-12 mph)', met: 6.8 },
      { name: 'Cycling (12-14 mph)', met: 8.0 },
      { name: 'Cycling (14-16 mph)', met: 10.0 },
      { name: 'Cycling (16-19 mph)', met: 12.0 },
      { name: 'Stationary bike (moderate)', met: 7.0 },
      { name: 'Stationary bike (vigorous)', met: 10.5 },
      { name: 'Spin class', met: 8.5 },
    ],
  },
  sports: {
    name: 'Sports',
    exercises: [
      { name: 'Basketball (game)', met: 8.0 },
      { name: 'Soccer (casual)', met: 7.0 },
      { name: 'Soccer (competitive)', met: 10.0 },
      { name: 'Tennis (singles)', met: 8.0 },
      { name: 'Swimming (moderate)', met: 5.8 },
      { name: 'Swimming (vigorous)', met: 9.8 },
      { name: 'Rowing machine', met: 7.0 },
      { name: 'Boxing (sparring)', met: 9.0 },
      { name: 'HIIT', met: 12.0 },
    ],
  },
};

type Unit = 'kg' | 'lbs';

export default function PremiumCaloriesBurnedCalc() {
  const [weight, setWeight] = useState(70);
  const [unit, setUnit] = useState<Unit>('kg');
  const [duration, setDuration] = useState(60);
  const [selectedCategory, setSelectedCategory] = useState<string>('strength');
  const [selectedExercise, setSelectedExercise] = useState(
    EXERCISE_CATEGORIES.strength.exercises[0]
  );

  const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;

  const caloriesBurned = useMemo(() => {
    const hours = duration / 60;
    return Math.round(selectedExercise.met * weightKg * hours);
  }, [selectedExercise.met, weightKg, duration]);

  const caloriesPerMinute = useMemo(() => {
    return (selectedExercise.met * weightKg) / 60;
  }, [selectedExercise.met, weightKg]);

  const timeToBurn = useMemo(() => {
    const minutesPer100 = 100 / caloriesPerMinute;
    const minutesPer500 = 500 / caloriesPerMinute;
    const minutesPer1000 = 1000 / caloriesPerMinute;
    return {
      burn100: Math.round(minutesPer100),
      burn500: Math.round(minutesPer500),
      burn1000: Math.round(minutesPer1000),
    };
  }, [caloriesPerMinute]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const exercises = EXERCISE_CATEGORIES[category as keyof typeof EXERCISE_CATEGORIES].exercises;
    setSelectedExercise(exercises[0]);
  };

  const inputs = {
    weight,
    unit,
    duration,
    selectedCategory,
    selectedExercise: selectedExercise.name,
  };
  const results = { caloriesBurned, caloriesPerMinute, timeToBurn };
  const hasResults = weight > 0 && duration > 0;

  return (
    <PremiumCalculatorWrapper
      calculatorType="calories-burned"
      title="Calories Burned Calculator"
      description="Track your calorie expenditure during exercise"
      icon={<Flame className="w-8 h-8" />}
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
            min={unit === 'kg' ? 40 : 90}
            max={unit === 'kg' ? 150 : 330}
            step={unit === 'kg' ? 1 : 2}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="premium-slider w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{unit === 'kg' ? 40 : 90}</span>
            <span className="font-bold text-primary">
              {weight} {unit}
            </span>
            <span>{unit === 'kg' ? 150 : 330}</span>
          </div>
        </div>

        {/* Unit Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={() => setUnit('kg')}
            whileHover={{ scale: 1.02 }}
            className={`py-3 rounded-xl font-medium transition-all ${
              unit === 'kg' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Kilograms (kg)
          </motion.button>
          <motion.button
            onClick={() => setUnit('lbs')}
            whileHover={{ scale: 1.02 }}
            className={`py-3 rounded-xl font-medium transition-all ${
              unit === 'lbs' ? 'premium-button' : 'bg-card border border-border'
            }`}
          >
            Pounds (lbs)
          </motion.button>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Duration (minutes)
          </label>
          <input
            type="range"
            min="5"
            max="180"
            step="5"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="premium-slider w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>5</span>
            <span className="font-bold text-primary">{duration} min</span>
            <span>180</span>
          </div>
        </div>

        {/* Exercise Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Exercise Category</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(EXERCISE_CATEGORIES).map(([key, category]) => (
              <motion.button
                key={key}
                onClick={() => handleCategoryChange(key)}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-xl font-medium transition-all ${
                  selectedCategory === key
                    ? 'premium-gradient-bg-strong border-2 border-primary'
                    : 'bg-card hover:bg-card/80 border border-border'
                }`}
              >
                {category.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Exercise Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Exercise</label>
          <select
            value={selectedExercise.name}
            onChange={(e) => {
              const exercise = EXERCISE_CATEGORIES[
                selectedCategory as keyof typeof EXERCISE_CATEGORIES
              ].exercises.find((ex) => ex.name === e.target.value);
              if (exercise) setSelectedExercise(exercise);
            }}
            className="w-full p-3 rounded-xl border border-border bg-card"
          >
            {EXERCISE_CATEGORIES[
              selectedCategory as keyof typeof EXERCISE_CATEGORIES
            ].exercises.map((exercise) => (
              <option key={exercise.name} value={exercise.name}>
                {exercise.name} (MET: {exercise.met})
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        <motion.div className="premium-card premium-glow text-center" whileHover={{ y: -4 }}>
          <p className="text-sm text-muted-foreground mb-2">Estimated Calories Burned</p>
          <p
            className="text-6xl font-light gradient-text"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {caloriesBurned}
          </p>
          <p className="text-lg text-muted-foreground mt-2">calories</p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Per Minute</p>
              <p className="font-bold text-lg">{caloriesPerMinute.toFixed(1)} cal</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MET Value</p>
              <p className="font-bold text-lg">{selectedExercise.met}</p>
            </div>
          </div>
        </motion.div>

        {/* Time to Burn Goals */}
        <div className="premium-card">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time to Burn
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { calories: 100, time: timeToBurn.burn100 },
              { calories: 500, time: timeToBurn.burn500 },
              { calories: 1000, time: timeToBurn.burn1000 },
            ].map(({ calories, time }) => (
              <div key={calories} className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold text-orange-500">{time}</p>
                <p className="text-xs text-muted-foreground">min for</p>
                <p className="font-medium">{calories} cal</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </PremiumCalculatorWrapper>
  );
}

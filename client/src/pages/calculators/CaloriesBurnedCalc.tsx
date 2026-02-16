import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Activity, Scale, Dumbbell, Bike, PersonStanding, Heart } from 'lucide-react';
import { useSEO } from '@/lib/seo';
import RelatedCalculators from '@/components/RelatedCalculators';
import { Breadcrumbs } from '@/components/Breadcrumbs';

// MET values for common exercises (Metabolic Equivalent of Task)
const EXERCISE_CATEGORIES = {
  strength: {
    name: 'Strength Training',
    icon: Dumbbell,
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
    icon: Heart,
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
      { name: 'Jump rope (fast)', met: 12.3 },
    ],
  },
  cycling: {
    name: 'Cycling',
    icon: Bike,
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
    icon: Activity,
    exercises: [
      { name: 'Basketball (game)', met: 8.0 },
      { name: 'Soccer (casual)', met: 7.0 },
      { name: 'Soccer (competitive)', met: 10.0 },
      { name: 'Tennis (singles)', met: 8.0 },
      { name: 'Tennis (doubles)', met: 6.0 },
      { name: 'Swimming (moderate)', met: 5.8 },
      { name: 'Swimming (vigorous)', met: 9.8 },
      { name: 'Rowing machine', met: 7.0 },
      { name: 'Boxing (sparring)', met: 9.0 },
      { name: 'HIIT', met: 12.0 },
    ],
  },
  flexibility: {
    name: 'Flexibility & Low Impact',
    icon: PersonStanding,
    exercises: [
      { name: 'Yoga (hatha)', met: 2.5 },
      { name: 'Yoga (power/vinyasa)', met: 4.0 },
      { name: 'Pilates', met: 3.0 },
      { name: 'Stretching', met: 2.3 },
      { name: 'Tai Chi', met: 3.0 },
      { name: 'Walking (slow)', met: 2.5 },
    ],
  },
};

type Unit = 'kg' | 'lbs';

export function CaloriesBurnedCalculator() {
  useSEO({
    title: 'Calories Burned Calculator - Exercise Calorie Counter',
    description:
      'Free calories burned calculator. Estimate how many calories you burn during different exercises and activities based on duration and body weight.',
    canonical: 'https://gymgurus.com/calculators/calories-burned',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Calories Burned Calculator - Exercise Calorie Counter',
      url: 'https://gymgurus.com/calculators/calories-burned',
      description:
        'Free calories burned calculator. Estimate how many calories you burn during different exercises and activities based on duration and body weight.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  const [weight, setWeight] = useState(70);
  const [unit, setUnit] = useState<Unit>('kg');
  const [duration, setDuration] = useState(60);
  const [selectedCategory, setSelectedCategory] = useState<string>('strength');
  const [selectedExercise, setSelectedExercise] = useState(
    EXERCISE_CATEGORIES.strength.exercises[0]
  );

  const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;

  // Calories burned formula: Calories = MET × Weight (kg) × Duration (hours)
  const caloriesBurned = useMemo(() => {
    const hours = duration / 60;
    return Math.round(selectedExercise.met * weightKg * hours);
  }, [selectedExercise.met, weightKg, duration]);

  // Calculate calories per minute
  const caloriesPerMinute = useMemo(() => {
    return (selectedExercise.met * weightKg) / 60;
  }, [selectedExercise.met, weightKg]);

  // Calculate how long to burn certain calorie amounts
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        showHome={false}
        items={[
          { label: 'All Calculators', href: '/calculators' },
          { label: 'Calories Burned Calculator' },
        ]}
      />
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-orange-500/10 rounded-xl">
          <Flame className="w-8 h-8 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Calories Burned</h1>
          <p className="text-muted-foreground">Calculate calories burned during exercise</p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        {/* Weight Input */}
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
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="p-3 border rounded-lg bg-background"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>

        {/* Duration Input */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Clock className="w-4 h-4" />
            Duration (minutes)
          </label>
          <input
            type="range"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={5}
            max={180}
            step={5}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-1">
            <span>5 min</span>
            <span className="font-bold text-foreground">{duration} minutes</span>
            <span>180 min</span>
          </div>
        </div>

        {/* Exercise Category */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Activity className="w-4 h-4" />
            Exercise Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(EXERCISE_CATEGORIES).map(([key, category]) => {
              const Icon = category.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryChange(key)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedCategory === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercise Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Select Exercise</label>
          <select
            value={selectedExercise.name}
            onChange={(e) => {
              const exercise = EXERCISE_CATEGORIES[
                selectedCategory as keyof typeof EXERCISE_CATEGORIES
              ].exercises.find((ex) => ex.name === e.target.value);
              if (exercise) setSelectedExercise(exercise);
            }}
            className="w-full p-3 border rounded-lg bg-background"
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
      </div>

      {/* Results */}
      <motion.div
        className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        key={`${caloriesBurned}-${selectedExercise.name}`}
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Estimated Calories Burned</p>
          <p className="text-5xl font-bold text-primary mb-2">{caloriesBurned}</p>
          <p className="text-lg text-muted-foreground">calories</p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Per Minute</p>
              <p className="font-bold">{caloriesPerMinute.toFixed(1)} cal</p>
            </div>
            <div>
              <p className="text-muted-foreground">MET Value</p>
              <p className="font-bold">{selectedExercise.met}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Time to Burn Goals */}
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
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

      {/* Exercise Comparison */}
      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-4">Calorie Comparison ({duration} min)</h3>
        <div className="space-y-3">
          {Object.values(EXERCISE_CATEGORIES)
            .flatMap((cat) => cat.exercises)
            .sort((a, b) => b.met - a.met)
            .slice(0, 8)
            .map((exercise) => {
              const calories = Math.round((exercise.met * weightKg * duration) / 60);
              const maxCalories = Math.round((23 * weightKg * duration) / 60); // Sprinting is max MET
              const percentage = (calories / maxCalories) * 100;

              return (
                <div key={exercise.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span
                      className={
                        exercise.name === selectedExercise.name ? 'font-bold text-orange-500' : ''
                      }
                    >
                      {exercise.name}
                    </span>
                    <span className="font-medium">{calories} cal</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        exercise.name === selectedExercise.name ? 'bg-orange-500' : 'bg-primary/60'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Calorie estimates are based on MET (Metabolic Equivalent of Task)
          values. Actual calories burned may vary based on intensity, fitness level, age, and
          individual metabolism. Formula: Calories = MET x Weight (kg) x Duration (hours)
        </p>
      </div>
      <RelatedCalculators currentPath="/calculators/calories-burned" />
    </div>
  );
}

export default CaloriesBurnedCalculator;

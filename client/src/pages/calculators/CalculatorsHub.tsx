import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Calculator,
  Dumbbell,
  Scale,
  Trophy,
  Flame,
  Heart,
  Activity,
  Percent,
  Utensils,
  Droplets,
  Target,
  Zap,
} from 'lucide-react';

interface CalculatorCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  bgColor: string;
}

const CALCULATORS: CalculatorCard[] = [
  {
    title: '1RM Calculator',
    description: 'Estimate your one-rep max from any weight and rep count',
    icon: <Dumbbell className="w-8 h-8" />,
    path: '/calculators/1rm',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    title: 'Plates Calculator',
    description: 'See exactly what plates to load on the bar',
    icon: <Calculator className="w-8 h-8" />,
    path: '/calculators/plates',
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    title: 'TDEE Calculator',
    description: 'Calculate your daily calorie needs and macros',
    icon: <Flame className="w-8 h-8" />,
    path: '/calculators/tdee',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    title: 'Strength Standards',
    description: 'See how your lifts compare to others',
    icon: <Trophy className="w-8 h-8" />,
    path: '/calculators/strength-standards',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    title: 'BMI Calculator',
    description: 'Calculate your Body Mass Index',
    icon: <Scale className="w-8 h-8" />,
    path: '/calculators/bmi',
    color: 'text-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
  },
  {
    title: 'Body Fat Calculator',
    description: 'Estimate body fat using the Navy method',
    icon: <Percent className="w-8 h-8" />,
    path: '/calculators/body-fat',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    title: 'Macro Calculator',
    description: 'Calculate your protein, carbs, and fat targets',
    icon: <Utensils className="w-8 h-8" />,
    path: '/calculators/macros',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  {
    title: 'VO2 Max Estimator',
    description: 'Estimate your cardiovascular fitness level',
    icon: <Activity className="w-8 h-8" />,
    path: '/calculators/vo2max',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  {
    title: 'Heart Rate Zones',
    description: 'Calculate your training heart rate zones',
    icon: <Heart className="w-8 h-8" />,
    path: '/calculators/heart-rate-zones',
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    title: 'Calories Burned',
    description: 'Calculate calories burned during any exercise',
    icon: <Zap className="w-8 h-8" />,
    path: '/calculators/calories-burned',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    title: 'Ideal Body Weight',
    description: 'Calculate your ideal weight using multiple formulas',
    icon: <Target className="w-8 h-8" />,
    path: '/calculators/ideal-weight',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    title: 'Water Intake',
    description: 'Calculate your daily water needs based on activity',
    icon: <Droplets className="w-8 h-8" />,
    path: '/calculators/water-intake',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
];

export function CalculatorsHub() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 mb-4"
        >
          <div className="p-4 bg-primary/10 rounded-2xl">
            <Calculator className="w-10 h-10 text-primary" />
          </div>
        </motion.div>
        <h1 className="text-3xl font-bold mb-2">Fitness Calculators</h1>
        <p className="text-muted-foreground text-lg">
          Tools to help you train smarter and track your progress
        </p>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CALCULATORS.map((calc, index) => (
          <motion.div
            key={calc.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={calc.path}>
              <a className="block">
                <div className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer border border-transparent hover:border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${calc.bgColor}`}>
                      <div className={calc.color}>{calc.icon}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{calc.title}</h3>
                      <p className="text-muted-foreground text-sm">{calc.description}</p>
                    </div>
                  </div>
                </div>
              </a>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6"
      >
        <h2 className="font-bold text-lg mb-4">Quick Reference</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">1.5x</p>
            <p className="text-xs text-muted-foreground">Intermediate Squat</p>
            <p className="text-xs text-muted-foreground">(bodyweight multiplier)</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">1.25x</p>
            <p className="text-xs text-muted-foreground">Intermediate Bench</p>
            <p className="text-xs text-muted-foreground">(bodyweight multiplier)</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">2x</p>
            <p className="text-xs text-muted-foreground">Intermediate Deadlift</p>
            <p className="text-xs text-muted-foreground">(bodyweight multiplier)</p>
          </div>
          <div className="bg-background/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">0.75x</p>
            <p className="text-xs text-muted-foreground">Intermediate OHP</p>
            <p className="text-xs text-muted-foreground">(bodyweight multiplier)</p>
          </div>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Pro Tip: 1RM Testing</h3>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Use the 1RM calculator to estimate your max without the injury risk of actually lifting it.
            Most accurate with 3-5 rep sets.
          </p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
          <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
            Pro Tip: Loading the Bar
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            Use the plates calculator to avoid doing math in the gym. It shows you exactly which plates
            to load on each side.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CalculatorsHub;

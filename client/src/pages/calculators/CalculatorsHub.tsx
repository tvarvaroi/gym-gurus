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
import { useSEO } from '@/lib/seo';

interface CalculatorCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const CALCULATORS: CalculatorCard[] = [
  {
    title: '1RM Calculator',
    description: 'Estimate your one-rep max from any weight and rep count',
    icon: <Dumbbell className="w-8 h-8" />,
    path: '/calculators/1rm',
  },
  {
    title: 'Plates Calculator',
    description: 'See exactly what plates to load on the bar',
    icon: <Calculator className="w-8 h-8" />,
    path: '/calculators/plates',
  },
  {
    title: 'TDEE Calculator',
    description: 'Calculate your daily calorie needs and macros',
    icon: <Flame className="w-8 h-8" />,
    path: '/calculators/tdee',
  },
  {
    title: 'Strength Standards',
    description: 'See how your lifts compare to others',
    icon: <Trophy className="w-8 h-8" />,
    path: '/calculators/strength-standards',
  },
  {
    title: 'BMI Calculator',
    description: 'Calculate your Body Mass Index',
    icon: <Scale className="w-8 h-8" />,
    path: '/calculators/bmi',
  },
  {
    title: 'Body Fat Calculator',
    description: 'Estimate body fat using the Navy method',
    icon: <Percent className="w-8 h-8" />,
    path: '/calculators/body-fat',
  },
  {
    title: 'Macro Calculator',
    description: 'Calculate your protein, carbs, and fat targets',
    icon: <Utensils className="w-8 h-8" />,
    path: '/calculators/macros',
  },
  {
    title: 'VO2 Max Estimator',
    description: 'Estimate your cardiovascular fitness level',
    icon: <Activity className="w-8 h-8" />,
    path: '/calculators/vo2max',
  },
  {
    title: 'Heart Rate Zones',
    description: 'Calculate your training heart rate zones',
    icon: <Heart className="w-8 h-8" />,
    path: '/calculators/heart-rate-zones',
  },
  {
    title: 'Calories Burned',
    description: 'Calculate calories burned during any exercise',
    icon: <Zap className="w-8 h-8" />,
    path: '/calculators/calories-burned',
  },
  {
    title: 'Ideal Body Weight',
    description: 'Calculate your ideal weight using multiple formulas',
    icon: <Target className="w-8 h-8" />,
    path: '/calculators/ideal-weight',
  },
  {
    title: 'Water Intake',
    description: 'Calculate your daily water needs based on activity',
    icon: <Droplets className="w-8 h-8" />,
    path: '/calculators/water-intake',
  },
];

export function CalculatorsHub() {
  useSEO({
    title: 'Free Fitness Calculators - BMI, 1RM, TDEE, Macros & More',
    description:
      '12 free fitness calculators: BMI, One Rep Max, TDEE, Body Fat, Macros, Strength Standards, Plates, VO2 Max, Heart Rate Zones, and more. No signup required.',
    canonical: 'https://gymgurus.com/calculators',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Free Fitness Calculators - BMI, 1RM, TDEE, Macros & More',
      url: 'https://gymgurus.com/calculators',
      description:
        '12 free fitness calculators: BMI, One Rep Max, TDEE, Body Fat, Macros, Strength Standards, Plates, VO2 Max, Heart Rate Zones, and more. No signup required.',
      applicationCategory: 'HealthApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  });

  return (
    <div className="dark min-h-screen" style={{ background: '#0a0a0a', color: '#f2f2f2' }}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-in fade-in slide-in-from-top-3 duration-300">
          <div
            className="p-2 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)' }}
          >
            <Calculator className="h-7 w-7" style={{ color: '#c9a84c' }} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extralight tracking-tight font-['Playfair_Display']">
              Fitness{' '}
              <span
                className="font-light"
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Calculators
              </span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(242,242,242,0.5)' }}>
              Tools to help you train smarter and track your progress
            </p>
          </div>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CALCULATORS.map((calc) => (
            <div key={calc.path} className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <Link href={calc.path}>
                <a className="block">
                  <div
                    className="rounded-2xl p-6 transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        'rgba(201,168,76,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        'rgba(255,255,255,0.08)';
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: 'rgba(201,168,76,0.10)' }}
                      >
                        <div style={{ color: '#c9a84c' }}>{calc.icon}</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1" style={{ color: '#f2f2f2' }}>
                          {calc.title}
                        </h3>
                        <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>
                          {calc.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              </Link>
            </div>
          ))}
        </div>

        {/* Quick Stats Section */}
        <div
          className="mt-8 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-3 duration-300"
          style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)' }}
        >
          <h2 className="font-bold text-lg mb-4" style={{ color: '#f2f2f2' }}>
            Quick Reference
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '1.5x', label: 'Intermediate Squat', sub: '(bodyweight multiplier)' },
              { value: '1.25x', label: 'Intermediate Bench', sub: '(bodyweight multiplier)' },
              { value: '2x', label: 'Intermediate Deadlift', sub: '(bodyweight multiplier)' },
              { value: '0.75x', label: 'Intermediate OHP', sub: '(bodyweight multiplier)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <p className="text-2xl font-bold" style={{ color: '#c9a84c' }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(242,242,242,0.5)' }}>
                  {stat.label}
                </p>
                <p className="text-xs" style={{ color: 'rgba(242,242,242,0.35)' }}>
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="font-medium mb-2" style={{ color: '#c9a84c' }}>
              Pro Tip: 1RM Testing
            </h3>
            <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>
              Use the 1RM calculator to estimate your max without the injury risk of actually
              lifting it. Most accurate with 3-5 rep sets.
            </p>
          </div>
          <div
            className="p-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="font-medium mb-2" style={{ color: '#c9a84c' }}>
              Pro Tip: Loading the Bar
            </h3>
            <p className="text-sm" style={{ color: 'rgba(242,242,242,0.5)' }}>
              Use the plates calculator to avoid doing math in the gym. It shows you exactly which
              plates to load on each side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalculatorsHub;

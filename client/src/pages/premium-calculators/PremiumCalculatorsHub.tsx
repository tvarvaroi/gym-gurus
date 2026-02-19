import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  Star,
  Clock,
  Activity,
  Heart,
  Zap,
  Scale,
  Dumbbell,
} from 'lucide-react';
import { Link } from 'wouter';
import { useUser } from '@/contexts/UserContext';
import { LuxuryCard } from '@/components/LuxuryCard';
import { useQuery } from '@tanstack/react-query';
import { fadeInUp, staggerContainer } from '@/lib/premiumAnimations';
import { useSEO } from '@/lib/seo';

const calculators = [
  {
    id: 'tdee',
    name: 'TDEE Calculator',
    icon: '🔥',
    category: 'Nutrition',
    description: 'Total Daily Energy Expenditure',
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    id: 'bmi',
    name: 'BMI Calculator',
    icon: '⚖️',
    category: 'Body Metrics',
    description: 'Body Mass Index',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'body-fat',
    name: 'Body Fat Calculator',
    icon: '📊',
    category: 'Body Metrics',
    description: 'Body fat percentage',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 'macros',
    name: 'Macro Calculator',
    icon: '🍎',
    category: 'Nutrition',
    description: 'Macronutrient breakdown',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
  {
    id: '1rm',
    name: 'One Rep Max',
    icon: '💪',
    category: 'Strength',
    description: '1RM estimator',
    gradient: 'from-red-500/20 to-orange-500/20',
  },
  {
    id: 'plates',
    name: 'Plate Calculator',
    icon: '🏋️',
    category: 'Strength',
    description: 'Barbell plate loader',
    gradient: 'from-gray-500/20 to-slate-500/20',
  },
  {
    id: 'strength-standards',
    name: 'Strength Standards',
    icon: '📈',
    category: 'Strength',
    description: 'Compare your lifts',
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
  {
    id: 'vo2max',
    name: 'VO2 Max',
    icon: '🫁',
    category: 'Cardio',
    description: 'Aerobic fitness',
    gradient: 'from-sky-500/20 to-blue-500/20',
  },
  {
    id: 'heart-rate-zones',
    name: 'Heart Rate Zones',
    icon: '❤️',
    category: 'Cardio',
    description: 'Training zones',
    gradient: 'from-rose-500/20 to-red-500/20',
  },
  {
    id: 'calories-burned',
    name: 'Calories Burned',
    icon: '🔥',
    category: 'Activity',
    description: 'Exercise calorie counter',
    gradient: 'from-orange-500/20 to-amber-500/20',
  },
  {
    id: 'ideal-weight',
    name: 'Ideal Weight',
    icon: '🎯',
    category: 'Body Metrics',
    description: 'Healthy weight range',
    gradient: 'from-teal-500/20 to-cyan-500/20',
  },
  {
    id: 'water-intake',
    name: 'Water Intake',
    icon: '💧',
    category: 'Nutrition',
    description: 'Hydration guide',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
];

export default function PremiumCalculatorsHub() {
  const { user } = useUser();

  useSEO({
    title: 'Premium Calculators | GymGurus',
    description: 'Access premium fitness calculators with saved results and progress tracking',
    robots: 'noindex, nofollow', // Authenticated page - don't index
  });

  // Fetch all saved results
  const { data: allResults = [] } = useQuery({
    queryKey: ['/api/calculator-results'],
    enabled: !!user,
  });

  // Get recent results (last 5)
  const recentResults = allResults.slice(0, 5);

  // Get favorited calculators
  const favoriteResults = allResults.filter((r: any) => r.isFavorite);

  return (
    <motion.div
      className="max-w-7xl mx-auto p-6 space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Hero Section */}
      <motion.div variants={fadeInUp} className="text-center space-y-4">
        <h1
          className="text-5xl md:text-6xl font-light gradient-text"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Premium Calculators
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Track your progress with saved results and personalized insights
        </p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LuxuryCard
          icon={<Calculator className="w-5 h-5" />}
          title="Total Calculations"
          hover={false}
        >
          <p className="text-4xl font-light gradient-text mt-2">{allResults.length}</p>
        </LuxuryCard>

        <LuxuryCard icon={<Star className="w-5 h-5" />} title="Favorites" hover={false}>
          <p className="text-4xl font-light gradient-text mt-2">{favoriteResults.length}</p>
        </LuxuryCard>

        <LuxuryCard icon={<TrendingUp className="w-5 h-5" />} title="This Week" hover={false}>
          <p className="text-4xl font-light gradient-text mt-2">
            {
              allResults.filter((r: any) => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(r.createdAt) > weekAgo;
              }).length
            }
          </p>
        </LuxuryCard>
      </motion.div>

      {/* Recent Results & Favorites */}
      {(recentResults.length > 0 || favoriteResults.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Results */}
          {recentResults.length > 0 && (
            <motion.div variants={fadeInUp}>
              <LuxuryCard title="Recent Results" icon={<Clock className="w-5 h-5" />} hover={false}>
                <div className="space-y-3 mt-4">
                  {recentResults.map((result: any) => (
                    <Link key={result.id} href={`/dashboard/calculators/${result.calculatorType}`}>
                      <div className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize">
                              {result.calculatorType.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(result.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Activity className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </LuxuryCard>
            </motion.div>
          )}

          {/* Favorites */}
          {favoriteResults.length > 0 && (
            <motion.div variants={fadeInUp}>
              <LuxuryCard
                title="Favorite Calculators"
                icon={<Star className="w-5 h-5" />}
                hover={false}
              >
                <div className="space-y-3 mt-4">
                  {favoriteResults.slice(0, 5).map((result: any) => (
                    <Link key={result.id} href={`/dashboard/calculators/${result.calculatorType}`}>
                      <div className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium capitalize flex items-center gap-2">
                              <Star className="w-3 h-3 fill-primary text-primary" />
                              {result.calculatorType.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Last used: {new Date(result.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </LuxuryCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Calculator Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">All Calculators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calculators.map((calc, index) => (
            <Link key={calc.id} href={`/dashboard/calculators/${calc.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8, scale: 1.03 }}
                className={`p-6 rounded-xl cursor-pointer premium-card relative overflow-hidden group`}
              >
                {/* Background gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${calc.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div className="relative">
                  <div className="text-5xl mb-3">{calc.icon}</div>
                  <div className="mb-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {calc.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{calc.name}</h3>
                  <p className="text-sm text-muted-foreground">{calc.description}</p>

                  {/* Show if user has saved results for this calculator */}
                  {allResults.some((r: any) => r.calculatorType === calc.id) && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-primary">
                      <TrendingUp className="w-3 h-3" />
                      <span>
                        {allResults.filter((r: any) => r.calculatorType === calc.id).length} saved
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

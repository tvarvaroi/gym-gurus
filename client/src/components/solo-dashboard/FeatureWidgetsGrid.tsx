import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Bot,
  Zap,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  Trophy,
  Calculator,
  Calendar,
  Heart,
  Settings,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const FEATURES = [
  { title: 'AI Coach', description: 'Chat with your AI trainer', icon: Bot, href: '/solo/coach' },
  {
    title: 'Generate Workout',
    description: 'AI-powered workout plan',
    icon: Zap,
    href: '/solo/generate',
  },
  { title: 'My Workouts', description: 'Browse saved workouts', icon: Dumbbell, href: '/workouts' },
  {
    title: 'Nutrition',
    description: 'Meal plans & tracking',
    icon: UtensilsCrossed,
    href: '/solo/nutrition',
  },
  { title: 'Progress', description: 'Track your journey', icon: TrendingUp, href: '/progress' },
  {
    title: 'Achievements',
    description: 'Badges & milestones',
    icon: Trophy,
    href: '/solo/achievements',
  },
  {
    title: 'Calculators',
    description: 'BMI, TDEE, 1RM tools',
    icon: Calculator,
    href: '/dashboard/calculators',
  },
  { title: 'Schedule', description: 'Plan your week', icon: Calendar, href: '/schedule' },
  { title: 'Recovery', description: 'Muscle recovery status', icon: Heart, href: '/solo/recovery' },
  { title: 'Settings', description: 'Profile & preferences', icon: Settings, href: '/settings' },
] as const;

export function FeatureWidgetsGrid() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div>
      <h3 className="font-bold text-lg mb-4">Quick Access</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const motionProps = prefersReducedMotion
            ? {}
            : {
                initial: { opacity: 0, y: 16 },
                animate: { opacity: 1, y: 0 },
                transition: { delay: 0.4 + index * 0.04, duration: 0.3 },
                whileHover: { y: -4, transition: { duration: 0.15 } },
              };

          return (
            <Link key={feature.title} href={feature.href}>
              <motion.a
                {...motionProps}
                className="block bg-card rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer group"
              >
                <div className="p-2 bg-primary/10 rounded-lg w-fit mb-2 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm truncate">{feature.title}</p>
                <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
              </motion.a>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

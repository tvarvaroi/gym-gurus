import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const FEATURES = [
  { title: 'AI Coach', description: 'Chat with your AI trainer', href: '/solo/coach' },
  { title: 'Generate Workout', description: 'AI-powered workout plan', href: '/solo/generate' },
  { title: 'My Workouts', description: 'Browse saved workouts', href: '/workouts' },
  { title: 'Nutrition', description: 'Meal plans & tracking', href: '/solo/nutrition' },
  { title: 'Progress', description: 'Track your journey', href: '/progress' },
  { title: 'Calculators', description: 'BMI, TDEE, 1RM tools', href: '/dashboard/calculators' },
] as const;

export function FeatureWidgetsGrid() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {FEATURES.map((feature, index) => {
        const motionProps = prefersReducedMotion
          ? {}
          : {
              initial: { opacity: 0, y: 8 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.2 + index * 0.03, duration: 0.3 },
            };

        return (
          <Link key={feature.title} href={feature.href}>
            <motion.a
              {...motionProps}
              className="flex items-center justify-between bg-card rounded-2xl px-4 py-3.5 border border-border/20 hover:border-primary/30 transition-colors cursor-pointer group"
            >
              <div>
                <p className="font-semibold text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground/60">{feature.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
            </motion.a>
          </Link>
        );
      })}
    </div>
  );
}

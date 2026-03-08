import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatVolume } from '@/lib/format';

interface QuickStatsProps {
  stats: any;
  strengthSummary: any;
  gamification: any;
}

export function QuickStats({ stats, strengthSummary, gamification }: QuickStatsProps) {
  const prefersReducedMotion = useReducedMotion();

  const workoutsThisWeek = stats?.workoutsThisWeek || 0;
  const weeklyVolume = stats?.weeklyVolumeKg || 0;
  const streak = gamification?.currentStreakDays || 0;
  const totalPRs = strengthSummary?.totalPersonalRecords || 0;

  const items = [
    { value: workoutsThisWeek, label: 'Workouts', sub: 'this week', href: '/progress' },
    { value: formatVolume(weeklyVolume), label: 'Volume', sub: 'kg', href: '/progress' },
    { value: streak, label: 'Streak', sub: 'days', href: '/solo/achievements' },
    { value: totalPRs, label: 'PRs', sub: 'all time', href: '/progress' },
  ];

  const animProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: 0.05 } };

  return (
    <motion.div {...animProps}>
      {/* Mobile: horizontal scroll strip with fade hint */}
      <div className="relative md:hidden">
        <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
          {items.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="snap-start flex-shrink-0 w-[120px] bg-card rounded-2xl border border-border/20 p-3 cursor-pointer hover:border-primary/30 transition-colors">
                <span className="text-2xl font-bold tabular-nums leading-none block">
                  {item.value}
                </span>
                <span className="text-[11px] tracking-wider text-muted-foreground/50 font-medium block mt-1.5">
                  {item.label}
                </span>
                <span className="text-[10px] text-muted-foreground/50 block">{item.sub}</span>
              </div>
            </Link>
          ))}
        </div>
        {/* Swipe affordance fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent" />
      </div>

      {/* Desktop: 4-column grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link key={item.label} href={item.href}>
            <div className="bg-card rounded-2xl border border-border/20 p-4 cursor-pointer hover:border-primary/30 transition-colors group">
              <span className="text-3xl font-bold tabular-nums leading-none block group-hover:text-primary transition-colors">
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground/60 mt-1.5 block">{item.label}</span>
              <span className="text-[11px] text-muted-foreground/30 block">{item.sub}</span>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

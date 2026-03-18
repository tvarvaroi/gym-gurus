import { Link } from 'wouter';
import { formatVolume, volumeHasAbbreviation } from '@/lib/format';
import { NumberTicker } from '@/components/ui/number-ticker';

interface QuickStatsProps {
  stats: any;
  strengthSummary: any;
  gamification: any;
}

export function QuickStats({ stats, strengthSummary, gamification }: QuickStatsProps) {
  const workoutsThisWeek = stats?.workoutsThisWeek || 0;
  const weeklyVolume = stats?.weeklyVolumeKg || 0;
  const streak = gamification?.currentStreakDays || 0;
  const totalPRs = strengthSummary?.totalPersonalRecords || 0;

  const items = [
    {
      numericValue: workoutsThisWeek,
      displayValue: null,
      label: 'Workouts',
      sub: 'this week',
      href: '/progress',
    },
    {
      numericValue: null,
      displayValue: formatVolume(weeklyVolume),
      label: 'Volume',
      sub: volumeHasAbbreviation(weeklyVolume) ? '' : 'kg',
      href: '/progress',
    },
    {
      numericValue: streak,
      displayValue: null,
      label: 'Streak',
      sub: 'days',
      href: '/solo/achievements',
    },
    {
      numericValue: totalPRs,
      displayValue: null,
      label: 'PRs',
      sub: 'all time',
      href: '/progress',
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      {/* Mobile: horizontal scroll strip with fade hint */}
      <div className="relative md:hidden">
        <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
          {items.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className="snap-start flex-shrink-0 w-[120px] bg-card rounded-2xl border border-border/20 p-3 cursor-pointer hover:border-primary/30 transition-colors">
                <span className="text-2xl font-bold leading-none block">
                  {item.numericValue !== null ? (
                    <NumberTicker value={item.numericValue} className="text-2xl font-bold" />
                  ) : (
                    <span className="tabular-nums">{item.displayValue}</span>
                  )}
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
              <span className="text-3xl font-bold leading-none block group-hover:text-primary transition-colors">
                {item.numericValue !== null ? (
                  <NumberTicker
                    value={item.numericValue}
                    className="text-3xl font-bold group-hover:text-primary transition-colors"
                  />
                ) : (
                  <span className="tabular-nums">{item.displayValue}</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground/60 mt-1.5 block">{item.label}</span>
              <span className="text-[11px] text-muted-foreground/30 block">{item.sub}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

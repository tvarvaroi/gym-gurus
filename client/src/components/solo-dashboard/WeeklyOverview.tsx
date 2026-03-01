import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface WeeklyOverviewProps {
  stats: any;
  strengthSummary: any;
  gamification: any;
  progress: any;
  weeklyActivity: any;
  loading?: boolean;
}

// Consolidated Stats Card — one card, four numbers
function ConsolidatedStats({
  workoutsThisWeek,
  weeklyVolume,
  streak,
  totalPRs,
}: {
  workoutsThisWeek: number;
  weeklyVolume: number;
  streak: number;
  totalPRs: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  const stats = [
    {
      value: workoutsThisWeek,
      label: 'Workouts',
      sub: 'this week',
    },
    {
      value: weeklyVolume > 1000 ? `${(weeklyVolume / 1000).toFixed(1)}k` : weeklyVolume,
      label: 'Volume',
      sub: 'kg lifted',
    },
    {
      value: streak,
      label: 'Streak',
      sub: (
        <span className="flex items-center gap-0.5 justify-center md:justify-start">
          {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
            <span key={i} className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          ))}
          {streak === 0 && <span>days</span>}
        </span>
      ),
    },
    {
      value: totalPRs,
      label: 'PRs',
      sub: 'all time',
    },
  ];

  return (
    <motion.div {...animProps} className="bg-card rounded-2xl border border-border/20 p-6">
      <div className="grid grid-cols-2 md:flex md:items-center md:justify-between gap-6 md:gap-0">
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex items-center gap-0 md:gap-8">
            {index > 0 && <div className="hidden md:block h-14 w-px bg-border/30" />}
            <div className="flex flex-col items-center md:items-start md:pl-8 first:md:pl-0">
              <span className="text-3xl md:text-4xl font-bold tabular-nums leading-none">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground/60 mt-1">{stat.label}</span>
              <span className="text-[11px] text-muted-foreground/40 mt-0.5">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Volume Chart — AreaChart with gradient fill
function VolumeChart({ weeklyData }: { weeklyData: any[] }) {
  const prefersReducedMotion = useReducedMotion();
  if (!weeklyData || weeklyData.length === 0) return null;

  const chartData = weeklyData.slice(-8).map((w: any) => ({
    week: w.week || w.label || '',
    volume: Math.round(w.volume || w.totalVolume || 0),
  }));

  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
  const avg = Math.round(totalVolume / chartData.length);

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.05 },
      };

  return (
    <motion.div {...animProps} className="bg-card rounded-2xl p-4 border border-border/20">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            Weekly Volume
          </p>
          <p className="text-3xl font-bold tabular-nums leading-tight">
            {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume}
            <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
          </p>
        </div>
        <Link href="/progress">
          <a className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 transition-colors">
            View All <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>
      <div className="h-[220px] md:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
            />
            <ReferenceLine
              y={avg}
              strokeDasharray="4 4"
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#volumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// Calendar Strip — clean bar indicators
function CalendarStrip({ weeklyActivity }: { weeklyActivity: any }) {
  const prefersReducedMotion = useReducedMotion();
  const days = weeklyActivity?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const richDays: { day: string; date: string; status: string }[] = weeklyActivity?.richDays || [];
  const totalWorkouts = weeklyActivity?.totalWorkouts || 0;
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.1 },
      };

  return (
    <motion.div {...animProps} className="bg-card rounded-2xl p-4 border border-border/20">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          This Week
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {totalWorkouts} workout{totalWorkouts === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex justify-between">
        {days.map((day: string, index: number) => {
          const status = richDays[index]?.status || 'rest';
          const isToday = index === todayIndex;

          return (
            <div
              key={day}
              className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl ${
                isToday ? 'bg-primary/5' : ''
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-wider ${
                  isToday ? 'font-bold text-primary' : 'text-muted-foreground/60'
                }`}
              >
                {day}
              </span>
              <span
                className={`text-sm tabular-nums ${isToday ? 'font-bold' : 'text-muted-foreground'}`}
              >
                {weekDates[index]}
              </span>
              <div
                className={`h-1 w-6 rounded-full ${
                  status === 'completed'
                    ? 'bg-green-500'
                    : status === 'today_pending'
                      ? 'bg-primary/40'
                      : 'bg-transparent'
                }`}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function WeeklyOverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-card rounded-2xl p-6 border border-border/20 h-28" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl p-4 border border-border/20 h-[320px]" />
        <div className="bg-card rounded-2xl p-4 border border-border/20">
          <div className="h-4 w-24 bg-muted rounded mb-4" />
          <div className="flex justify-between">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-6 h-3 bg-muted rounded" />
                <div className="w-6 h-4 bg-muted rounded" />
                <div className="w-6 h-1 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyOverview({
  stats,
  strengthSummary,
  gamification,
  progress,
  weeklyActivity,
  loading,
}: WeeklyOverviewProps) {
  if (loading) return <WeeklyOverviewSkeleton />;

  const workoutsThisWeek = stats?.workoutsThisWeek || 0;
  const weeklyVolume = stats?.weeklyVolumeKg || 0;
  const totalPRs = strengthSummary?.totalPersonalRecords || 0;
  const streak = gamification?.currentStreakDays || 0;
  const weeklyData = progress?.weeklyData;

  return (
    <div className="space-y-4">
      <ConsolidatedStats
        workoutsThisWeek={workoutsThisWeek}
        weeklyVolume={weeklyVolume}
        streak={streak}
        totalPRs={totalPRs}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeklyData && weeklyData.length > 0 ? (
          <VolumeChart weeklyData={weeklyData} />
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-border/20 flex items-center justify-center h-[320px]">
            <p className="text-sm text-muted-foreground">Complete workouts to see volume trends</p>
          </div>
        )}
        <CalendarStrip weeklyActivity={weeklyActivity} />
      </div>
    </div>
  );
}

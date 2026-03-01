import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { formatVolume } from '@/lib/format';
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
      value: formatVolume(weeklyVolume),
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
            {formatVolume(totalVolume)}
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

// Helper: workout type → color-coded background class
function getTypeBgColor(type: string | null): string {
  switch (type?.toLowerCase()) {
    case 'push':
      return 'bg-red-500/60';
    case 'pull':
      return 'bg-blue-500/60';
    case 'legs':
      return 'bg-green-500/60';
    case 'upper':
      return 'bg-amber-500/60';
    case 'lower':
      return 'bg-teal-500/60';
    case 'full':
    case 'full_body':
      return 'bg-purple-500/60';
    default:
      return 'bg-primary/40';
  }
}

// Helper: truncate workout name to fit small cards
function abbreviateWorkoutName(name: string | null): string {
  if (!name) return 'Workout';
  const words = name.split(' ');
  if (words.length <= 2 && name.length <= 12) return name;
  const short = words.slice(0, 2).join(' ');
  return short.length > 12 ? short.slice(0, 11) + '\u2026' : short;
}

// Helper: compact duration display
function formatCompactDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

// Weekly Training Log — full-height data-dense 7-column day cards
function WeeklyTrainingLog({ weeklyActivity }: { weeklyActivity: any }) {
  const prefersReducedMotion = useReducedMotion();
  const richDays: any[] = weeklyActivity?.richDays || [];
  const totalWorkouts = weeklyActivity?.totalWorkouts || 0;
  const weekSummary = weeklyActivity?.weekSummary;

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

  const hasAnyWorkouts = totalWorkouts > 0;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.1 },
      };

  return (
    <motion.div
      {...animProps}
      className="bg-card rounded-2xl p-5 md:p-6 border border-border/20 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-medium">
          This Week
        </span>
        <span className="text-xs text-muted-foreground/40 tabular-nums">
          {totalWorkouts} workout{totalWorkouts === 1 ? '' : 's'}
        </span>
      </div>

      {/* Day columns — takes ALL remaining space */}
      <div className="flex-1 overflow-x-auto -mx-5 px-5 md:-mx-6 md:px-6">
        <div className="flex md:grid md:grid-cols-7 gap-1 h-full min-w-max md:min-w-0">
          {Array.from({ length: 7 }).map((_, i) => {
            const richDay = richDays[i];
            const dayName = richDay?.day || dayNames[i];
            const status = richDay?.status || 'rest';
            const sessions: any[] = richDay?.sessions || [];
            const isToday = i === todayIndex;
            const hasWorkout = status === 'completed' && sessions.length > 0;
            const primarySession = sessions[0];

            return (
              <div
                key={i}
                className={`rounded-xl p-2 min-w-[64px] flex-shrink-0 md:min-w-0 md:flex-shrink flex flex-col items-center ${
                  isToday
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : hasWorkout
                      ? 'bg-white/[0.03] border border-white/[0.06]'
                      : ''
                }`}
              >
                {/* Day name */}
                <span
                  className={`text-[11px] uppercase tracking-wider ${
                    isToday ? 'text-primary font-bold' : 'text-muted-foreground/40'
                  }`}
                >
                  {dayName}
                </span>

                {/* Date — large */}
                <span
                  className={`text-lg font-bold mt-1 tabular-nums ${
                    isToday
                      ? 'text-primary'
                      : hasWorkout
                        ? 'text-foreground'
                        : 'text-muted-foreground/20'
                  }`}
                >
                  {weekDates[i]}
                </span>

                {/* Spacer + content fills remaining vertical space */}
                <div className="flex-1 flex flex-col justify-center w-full mt-2">
                  {hasWorkout && primarySession ? (
                    <>
                      {/* Color bar for workout type */}
                      <div
                        className={`h-1.5 rounded-full w-full mb-2 ${getTypeBgColor(primarySession.workoutType)}`}
                      />

                      {/* Workout name */}
                      <span className="text-xs font-medium text-foreground/80 text-center leading-tight">
                        {abbreviateWorkoutName(primarySession.workoutName)}
                      </span>

                      {/* Volume — hero number */}
                      {primarySession.volume > 0 && (
                        <>
                          <span className="text-sm font-bold text-foreground text-center mt-1 tabular-nums">
                            {formatVolume(primarySession.volume)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/30 text-center">
                            kg
                          </span>
                        </>
                      )}

                      {/* Duration */}
                      {primarySession.duration != null && primarySession.duration > 0 && (
                        <span className="text-xs text-muted-foreground/50 text-center mt-1">
                          {primarySession.duration} min
                        </span>
                      )}

                      {/* Sets x Reps */}
                      {(primarySession.sets || primarySession.reps) && (
                        <span className="text-[11px] text-muted-foreground/35 text-center mt-0.5 tabular-nums">
                          {primarySession.sets || 0} sets &middot; {primarySession.reps || 0} reps
                        </span>
                      )}

                      {/* Multiple sessions indicator */}
                      {sessions.length > 1 && (
                        <span className="text-[11px] text-primary/50 text-center mt-1 font-medium">
                          +{sessions.length - 1} more
                        </span>
                      )}
                    </>
                  ) : isToday && status === 'today_pending' ? (
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse mb-1" />
                      <span className="text-xs text-primary/40">Planned</span>
                    </div>
                  ) : status === 'planned' ? (
                    <span className="text-xs text-muted-foreground/25 text-center">Planned</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/15 text-center">Rest</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Week summary — bottom bar */}
      {weekSummary && weekSummary.totalVolume > 0 ? (
        <div className="mt-4 pt-3 border-t border-border/10">
          <div className="grid grid-cols-5 gap-1">
            <div className="text-center">
              <span className="text-base font-bold tabular-nums">{totalWorkouts}</span>
              <span className="text-[10px] text-muted-foreground/30 block">sessions</span>
            </div>
            <div className="text-center">
              <span className="text-base font-bold tabular-nums">{weekSummary.totalSets || 0}</span>
              <span className="text-[10px] text-muted-foreground/30 block">sets</span>
            </div>
            <div className="text-center">
              <span className="text-base font-bold tabular-nums">
                {formatVolume(weekSummary.totalVolume)}
              </span>
              <span className="text-[10px] text-muted-foreground/30 block">kg vol</span>
            </div>
            <div className="text-center">
              <span className="text-base font-bold tabular-nums">
                {weekSummary.totalDuration || 0}
              </span>
              <span className="text-[10px] text-muted-foreground/30 block">min</span>
            </div>
            <div className="text-center">
              <span className="text-base font-bold tabular-nums">
                {weekSummary.avgRPE || '\u2014'}
              </span>
              <span className="text-[10px] text-muted-foreground/30 block">RPE</span>
            </div>
          </div>
        </div>
      ) : (
        !hasAnyWorkouts && (
          <div className="mt-4 pt-3 border-t border-border/10 text-center">
            <p className="text-xs text-muted-foreground/50">
              No workouts this week yet — start one to fill this board!
            </p>
          </div>
        )
      )}
    </motion.div>
  );
}

function WeeklyOverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-card rounded-2xl p-6 border border-border/20 h-28" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="bg-card rounded-2xl p-4 border border-border/20 h-[320px]" />
        <div className="bg-card rounded-2xl p-5 md:p-6 border border-border/20 h-full flex flex-col">
          <div className="h-3 w-20 bg-muted rounded mb-4" />
          <div className="flex-1 grid grid-cols-7 gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="rounded-xl bg-muted/30 p-2 flex flex-col items-center gap-2">
                <div className="h-3 w-6 bg-muted rounded" />
                <div className="h-5 w-5 bg-muted rounded" />
                <div className="flex-1 w-full space-y-1.5 mt-1">
                  <div className="h-1.5 w-full bg-muted rounded-full" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded mx-auto" />
                  <div className="h-3 w-full bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border/10">
            <div className="grid grid-cols-5 gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="h-4 w-6 bg-muted rounded" />
                  <div className="h-2 w-8 bg-muted rounded" />
                </div>
              ))}
            </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {weeklyData && weeklyData.length > 0 ? (
          <VolumeChart weeklyData={weeklyData} />
        ) : (
          <div className="bg-card rounded-2xl p-4 border border-border/20 flex items-center justify-center h-[320px]">
            <p className="text-sm text-muted-foreground">Complete workouts to see volume trends</p>
          </div>
        )}
        <WeeklyTrainingLog weeklyActivity={weeklyActivity} />
      </div>
    </div>
  );
}

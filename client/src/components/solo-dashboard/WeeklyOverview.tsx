import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { Flame, Dumbbell, Target, Trophy, Calendar, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface WeeklyOverviewProps {
  stats: any;
  strengthSummary: any;
  gamification: any;
  progress: any;
  weeklyActivity: any;
  loading?: boolean;
}

// Stat Card sub-component
function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
  delay: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { delay },
        whileHover: { y: -2, transition: { duration: 0.15 } },
      };

  return (
    <motion.div {...motionProps} className="bg-card rounded-xl p-4 border border-border/50">
      <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/60">{subtext}</p>
    </motion.div>
  );
}

// Volume Chart
function VolumeChart({ weeklyData }: { weeklyData: any[] }) {
  if (!weeklyData || weeklyData.length === 0) return null;

  // Take last 8 weeks, format for chart
  const chartData = weeklyData.slice(-8).map((w: any) => ({
    week: w.week || w.label || '',
    volume: Math.round(w.volume || w.totalVolume || 0),
  }));

  return (
    <div className="bg-card rounded-xl p-4 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          Weekly Volume
        </h4>
        <Link href="/progress">
          <a className="text-xs text-primary hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-3 h-3" />
          </a>
        </Link>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
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
          <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={
                  index === chartData.length - 1 ? 'hsl(271, 81%, 56%)' : 'hsl(271, 81%, 56% / 0.4)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Calendar Strip
function CalendarStrip({ weeklyActivity }: { weeklyActivity: any }) {
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

  return (
    <div className="bg-card rounded-xl p-4 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          This Week
        </h4>
        <span className="text-xs text-muted-foreground">
          {totalWorkouts} workout{totalWorkouts === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex justify-between">
        {days.map((day: string, index: number) => {
          const status = richDays[index]?.status || 'rest';
          const circleClass =
            status === 'completed'
              ? 'bg-green-500 text-white'
              : status === 'today_pending'
                ? 'border-2 border-green-500 bg-transparent text-green-500 animate-pulse'
                : status === 'planned'
                  ? 'border-2 border-primary/40 bg-transparent text-primary/60'
                  : index <= todayIndex
                    ? 'bg-secondary text-muted-foreground'
                    : 'bg-secondary/50 text-muted-foreground/50';
          return (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[10px] ${
                  index === todayIndex ? 'font-bold text-primary' : 'text-muted-foreground'
                }`}
              >
                {day}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${circleClass}`}
              >
                {status === 'completed' ? '✓' : weekDates[index]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyOverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl p-4 border border-border/50">
            <div className="w-9 h-9 bg-muted rounded-lg mb-3" />
            <div className="h-7 w-12 bg-muted rounded mb-1" />
            <div className="h-3 w-16 bg-muted rounded mb-1" />
            <div className="h-3 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border/50 h-[230px]" />
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <div className="h-4 w-24 bg-muted rounded mb-4" />
          <div className="flex justify-between">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-6 h-3 bg-muted rounded" />
                <div className="w-8 h-8 bg-muted rounded-full" />
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
      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          label="This Week"
          value={workoutsThisWeek}
          subtext={workoutsThisWeek === 1 ? 'workout' : 'workouts'}
          color="bg-orange-500/10"
          delay={0.15}
        />
        <StatCard
          icon={<Dumbbell className="w-4 h-4 text-blue-500" />}
          label="Volume"
          value={weeklyVolume > 1000 ? `${(weeklyVolume / 1000).toFixed(1)}k` : weeklyVolume}
          subtext="kg lifted"
          color="bg-blue-500/10"
          delay={0.2}
        />
        <StatCard
          icon={<Target className="w-4 h-4 text-green-500" />}
          label="Streak"
          value={streak}
          subtext="days"
          color="bg-green-500/10"
          delay={0.25}
        />
        <StatCard
          icon={<Trophy className="w-4 h-4 text-amber-500" />}
          label="PRs"
          value={totalPRs}
          subtext="all time"
          color="bg-amber-500/10"
          delay={0.3}
        />
      </div>

      {/* Volume Chart + Calendar side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weeklyData && weeklyData.length > 0 ? (
          <VolumeChart weeklyData={weeklyData} />
        ) : (
          <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center justify-center h-[230px]">
            <p className="text-sm text-muted-foreground">Complete workouts to see volume trends</p>
          </div>
        )}
        <CalendarStrip weeklyActivity={weeklyActivity} />
      </div>
    </div>
  );
}

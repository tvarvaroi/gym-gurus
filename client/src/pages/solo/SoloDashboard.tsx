import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Dumbbell,
  Trophy,
  TrendingUp,
  Calendar,
  Target,
  Flame,
  Bot,
  Heart,
  Sparkles,
  Zap,
  ChevronRight,
  Activity,
  Clock,
  Play,
  Heart as HeartPulse,
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { QueryErrorState } from '@/components/query-states/QueryErrorState';

// Quick Action Card
function QuickActionCard({
  icon,
  title,
  description,
  href,
  gradient,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <Link href={href}>
      <motion.a
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay }}
        className={`block ${gradient} text-white rounded-xl p-4 hover:scale-105 transition-all cursor-pointer shadow-lg`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
          <div>
            <h3 className="font-bold text-sm mb-0.5">{title}</h3>
            <p className="text-xs text-white/80">{description}</p>
          </div>
        </div>
      </motion.a>
    </Link>
  );
}

// Stat Card
function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border/50">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/60">{subtext}</p>
    </div>
  );
}

// Today's Workout Card
function TodaysWorkoutCard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/solo/today-workout'],
    retry: false,
    staleTime: 60 * 1000, // 1 minute
  });

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30 h-64 flex items-center justify-center"
      >
        <div className="text-center">
          <Dumbbell className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading workout...</p>
        </div>
      </motion.div>
    );
  }

  const workout = data?.workout || data?.suggestedWorkout;
  const hasWorkoutToday = data?.hasWorkoutToday;
  const isCompleted = workout?.status === 'completed';
  const isInProgress = workout?.status === 'in_progress';

  if (!workout) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30"
      >
        <div className="text-center py-8">
          <Dumbbell className="w-12 h-12 text-primary/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No workout planned for today</p>
          <Link href="/solo/generate">
            <a className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <Sparkles className="w-4 h-4" />
              Generate Workout with AI
            </a>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-6 border ${
        isCompleted
          ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30'
          : 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {isCompleted ? '✓ Completed Today' : isInProgress ? '⏱ In Progress' : "Today's Workout"}
          </p>
          <h2 className="text-xl font-bold">{workout.name}</h2>
        </div>
        <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-500/20' : 'bg-primary/20'}`}>
          <Dumbbell className={`w-6 h-6 ${isCompleted ? 'text-green-500' : 'text-primary'}`} />
        </div>
      </div>

      {isCompleted && workout.stats ? (
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div className="bg-card/50 rounded-lg p-2 text-center">
            <p className="font-bold">{workout.stats.duration}min</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="bg-card/50 rounded-lg p-2 text-center">
            <p className="font-bold">{workout.stats.totalSets}</p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </div>
          <div className="bg-card/50 rounded-lg p-2 text-center">
            <p className="font-bold">{workout.stats.totalVolume}kg</p>
            <p className="text-xs text-muted-foreground">Volume</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span>{workout.exercises?.length || workout.exercises} exercises</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>~{workout.estimatedTime} min</span>
            </div>
          </div>

          {workout.muscleGroups && workout.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {workout.muscleGroups.slice(0, 4).map((muscle: string) => (
                <span
                  key={muscle}
                  className="px-2 py-1 bg-primary/20 rounded-full text-xs font-medium capitalize"
                >
                  {muscle}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {!isCompleted && (
        <Link href="/workouts">
          <a className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
            <Play className="w-5 h-5" />
            {isInProgress ? 'Continue Workout' : 'Start Workout'}
          </a>
        </Link>
      )}
    </motion.div>
  );
}

// Gamification Summary Card
function GamificationCard() {
  const { data: gamification, isLoading } = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const stats = {
    level: gamification?.currentLevel || 1,
    xp: gamification?.totalXp || 0,
    xpToNext: gamification?.xpToNextLevel || 50,
    streak: gamification?.currentStreakDays || 0,
    rank: gamification?.rankGenZ || 'NPC',
    rankEmoji:
      gamification?.rankGenZ === 'GOATED'
        ? '🐐'
        : gamification?.rankGenZ === 'No Cap'
          ? '🧢'
          : gamification?.rankGenZ === 'Bussin'
            ? '💯'
            : gamification?.rankGenZ === 'Fire'
              ? '🔥'
              : gamification?.rankGenZ === 'Slay'
                ? '💅'
                : gamification?.rankGenZ === 'Valid'
                  ? '✓'
                  : gamification?.rankGenZ === 'Mid'
                    ? '😐'
                    : '🤖',
  };

  const xpProgress = stats.xpToNext > 0 ? (stats.xp / (stats.xp + stats.xpToNext)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Your Progress
        </h3>
        <Link href="/solo/achievements">
          <a className="text-sm text-primary hover:underline">View All</a>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Trophy className="w-8 h-8 text-yellow-500 animate-pulse" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.level}</p>
              <p className="text-xs text-muted-foreground">Level</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-500">{stats.streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-2xl">{stats.rankEmoji}</p>
              <p className="text-xs text-muted-foreground">{stats.rank}</p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">XP Progress</span>
              <span className="font-medium">
                {stats.xp} / {stats.xp + stats.xpToNext}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// Recovery Status Card (Mini version)
function RecoveryStatusCard() {
  const { data: fatigueData, isLoading } = useQuery<any>({
    queryKey: ['/api/recovery/fatigue'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Get top 4 muscle groups by recovery status
  const muscleStatus =
    fatigueData
      ?.filter((m: any) => m.fatigueLevel > 0 || m.lastTrainedAt)
      .sort((a: any, b: any) => {
        // Prioritize recently trained muscles
        if (!a.lastTrainedAt && !b.lastTrainedAt) return 0;
        if (!a.lastTrainedAt) return 1;
        if (!b.lastTrainedAt) return -1;
        return new Date(b.lastTrainedAt).getTime() - new Date(a.lastTrainedAt).getTime();
      })
      .slice(0, 4)
      .map((m: any) => {
        const recovery = 100 - m.fatigueLevel;
        return {
          name: m.muscleGroup.charAt(0).toUpperCase() + m.muscleGroup.slice(1),
          recovery,
          color:
            recovery >= 80
              ? 'bg-green-500'
              : recovery >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500',
        };
      }) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-500" />
          Recovery Status
        </h3>
        <Link href="/solo/recovery">
          <a className="text-sm text-primary hover:underline">Full View</a>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <HeartPulse className="w-8 h-8 text-rose-500 animate-pulse" />
        </div>
      ) : muscleStatus.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>No recovery data yet</p>
          <p className="text-xs mt-1">Complete a workout to track recovery</p>
        </div>
      ) : (
        <div className="space-y-3">
          {muscleStatus.map((muscle: any) => (
            <div key={muscle.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{muscle.name}</span>
                <span className="text-muted-foreground">{muscle.recovery}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${muscle.color} rounded-full transition-all duration-500`}
                  style={{ width: `${muscle.recovery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Weekly Activity Overview
function WeeklyActivityCard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/solo/weekly-activity'],
    retry: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const days = data?.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activity = data?.activity || [false, false, false, false, false, false, false];
  const totalWorkouts = data?.totalWorkouts || 0;
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const todayIndex = today === 0 ? 6 : today - 1; // Convert to Monday-based index

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          This Week
        </h3>
        <span className="text-sm text-muted-foreground">
          {isLoading ? '...' : `${totalWorkouts} workouts`}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-between">
          {[...Array(7)].map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 bg-secondary/50 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-between">
          {days.map((day, index) => (
            <div key={day} className="flex flex-col items-center gap-2">
              <span
                className={`text-xs ${
                  index === todayIndex ? 'font-bold text-primary' : 'text-muted-foreground'
                }`}
              >
                {day}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  activity[index]
                    ? 'bg-green-500 text-white'
                    : index <= todayIndex
                      ? 'bg-secondary text-muted-foreground'
                      : 'bg-secondary/50 text-muted-foreground/50'
                }`}
              >
                {activity[index] ? '✓' : index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// AI Coach Suggestion Card
function AICoachSuggestion() {
  const { data: gamification } = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
  });

  const { data: strengthSummary } = useQuery<any>({
    queryKey: ['/api/strength/summary'],
    retry: false,
  });

  const { data: aiInsights, isLoading } = useQuery<any>({
    queryKey: ['/api/ai/progress-insights'],
    queryFn: async () => {
      const response = await fetch('/api/ai/progress-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workoutsThisWeek: gamification?.totalWorkoutsCompleted || 0,
          currentStreak: gamification?.currentStreakDays || 0,
          totalVolume: strengthSummary?.totalVolumeLiftedKg || 0,
          recentPRs: strengthSummary?.recentPRs || [],
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
    enabled: !!gamification || !!strengthSummary,
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const suggestion = {
    message:
      aiInsights?.insights ||
      aiInsights?.message ||
      "Keep up the great work! Consistency is key to reaching your fitness goals.",
    action: 'Chat with AI Coach',
    actionHref: '/solo/coach',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-xl p-6 border border-violet-500/30"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-500/20 rounded-lg">
          {isLoading ? (
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          ) : (
            <Sparkles className="w-5 h-5 text-violet-400" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AI Coach Suggestion
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {isLoading ? 'Analyzing your progress...' : suggestion.message}
          </p>
          <Link href={suggestion.actionHref}>
            <a className="inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300">
              {suggestion.action}
              <ChevronRight className="w-4 h-4" />
            </a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// Main Solo Dashboard Component
export function SoloDashboard() {
  const { user } = useUser();

  // Fetch dashboard stats
  const { data: soloStats, error: statsError } = useQuery<any>({
    queryKey: ['/api/solo/stats'],
    retry: false,
    staleTime: 2 * 60 * 1000,
  });

  const { data: strengthSummary } = useQuery<any>({
    queryKey: ['/api/strength/summary'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: gamification } = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (statsError) {
    return <QueryErrorState error={statsError} onRetry={() => window.location.reload()} />;
  }

  // Calculate stats with fallbacks
  const workoutsThisWeek = soloStats?.workoutsThisWeek || 0;
  const weeklyVolume = soloStats?.weeklyVolumeKg || 0;
  const totalPRs = strengthSummary?.totalPersonalRecords || 0;
  const streak = gamification?.currentStreakDays || 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h1 className="text-2xl font-bold">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! 💪
        </h1>
        <p className="text-muted-foreground">Ready to crush your workout today?</p>
      </motion.div>

      {/* Today's Workout */}
      <TodaysWorkoutCard />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <QuickActionCard
          icon={<Bot className="w-6 h-6" />}
          title="AI Coach"
          description="Get personalized advice"
          href="/solo/coach"
          gradient="bg-gradient-to-br from-violet-600 to-purple-600"
          delay={0.1}
        />
        <QuickActionCard
          icon={<Zap className="w-6 h-6" />}
          title="Generate Workout"
          description="AI-powered workout"
          href="/solo/generate"
          gradient="bg-gradient-to-br from-cyan-600 to-blue-600"
          delay={0.15}
        />
        <QuickActionCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="My Progress"
          description="View achievements"
          href="/solo/achievements"
          gradient="bg-gradient-to-br from-green-600 to-emerald-600"
          delay={0.2}
        />
        <QuickActionCard
          icon={<Heart className="w-6 h-6" />}
          title="Recovery"
          description="Track muscle recovery"
          href="/solo/recovery"
          gradient="bg-gradient-to-br from-rose-600 to-pink-600"
          delay={0.25}
        />
      </div>

      {/* AI Coach Suggestion */}
      <AICoachSuggestion />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="This Week"
          value={workoutsThisWeek}
          subtext="workouts"
          color="bg-orange-500/10"
        />
        <StatCard
          icon={<Dumbbell className="w-5 h-5 text-blue-500" />}
          label="Volume"
          value={weeklyVolume > 1000 ? `${(weeklyVolume / 1000).toFixed(1)}k` : weeklyVolume}
          subtext="kg lifted"
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-yellow-500" />}
          label="PRs"
          value={totalPRs}
          subtext="all time"
          color="bg-yellow-500/10"
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-green-500" />}
          label="Streak"
          value={streak}
          subtext="days"
          color="bg-green-500/10"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        <GamificationCard />
        <RecoveryStatusCard />
      </div>

      {/* Weekly Activity */}
      <WeeklyActivityCard />
    </div>
  );
}

export default SoloDashboard;

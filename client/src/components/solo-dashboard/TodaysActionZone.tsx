import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, Sparkles, Bot, Play, Activity, Clock, ChevronRight, Zap } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// Build a contextual coaching suggestion based on workout history and recovery
function getContextualSuggestion(ctx: {
  fatigueData?: Array<{
    muscleGroup: string;
    fatigueLevel: number;
    recoveryStatus: string;
    lastTrainedAt: string | null;
  }>;
  totalWorkouts?: number;
  hasWorkoutToday?: boolean;
  lastWorkoutDate?: string | null;
  streak?: number;
}): { message: string; action: string; actionHref: string } {
  const defaultAction = { action: 'Chat with AI Coach', actionHref: '/solo/coach' };

  if (!ctx.totalWorkouts || ctx.totalWorkouts === 0) {
    return {
      message: 'Ready to start your fitness journey? Generate your first AI-powered workout!',
      action: 'Generate Workout',
      actionHref: '/solo/generate',
    };
  }

  if (ctx.hasWorkoutToday) {
    return {
      message:
        'Great workout today! Make sure to stay hydrated and get enough protein for recovery.',
      action: 'View Recovery',
      actionHref: '/solo/recovery',
    };
  }

  if (ctx.lastWorkoutDate) {
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(ctx.lastWorkoutDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLast >= 3) {
      return {
        message: `It's been ${daysSinceLast} days since your last workout. A quick session can help maintain your momentum!`,
        action: 'Start Workout',
        actionHref: '/solo/generate',
      };
    }
  }

  const fatigueData = ctx.fatigueData;
  if (fatigueData && fatigueData.length > 0) {
    const recovered = fatigueData.filter((m) => m.recoveryStatus === 'recovered');
    const fatigued = fatigueData.filter((m) => m.recoveryStatus === 'fatigued');
    const recovering = fatigueData.filter((m) => m.recoveryStatus === 'recovering');
    const formatName = (g: string) => g.replace(/_/g, ' ');

    if (fatigued.length >= 5) {
      return {
        message: `${fatigued.length} muscle groups are still fatigued. Consider a rest day or light cardio to aid recovery.`,
        action: 'View Recovery',
        actionHref: '/solo/recovery',
      };
    }

    if (recovered.length > 0 && fatigued.length > 0) {
      const readyMuscles = recovered
        .slice(0, 3)
        .map((m) => formatName(m.muscleGroup))
        .join(', ');
      const fatiguedMuscles = fatigued
        .slice(0, 2)
        .map((m) => formatName(m.muscleGroup))
        .join(', ');
      return {
        message: `Your ${readyMuscles} are recovered and ready to train. Let ${fatiguedMuscles} rest a bit longer.`,
        action: 'View Recovery',
        actionHref: '/solo/recovery',
      };
    }

    if (fatigued.length === 0 && recovering.length === 0 && recovered.length > 0) {
      return {
        message: 'All muscle groups are fully recovered. Great time for your next workout!',
        action: 'Start Workout',
        actionHref: '/solo/generate',
      };
    }

    if (recovering.length > 0) {
      return {
        message: `${recovering.length} muscle group${recovering.length === 1 ? ' is' : 's are'} recovering. A light session or active recovery could help.`,
        ...defaultAction,
      };
    }
  }

  if (ctx.streak && ctx.streak >= 3) {
    return {
      message: `${ctx.streak}-day streak! Keep the momentum going with today's workout.`,
      action: 'Generate Workout',
      actionHref: '/solo/generate',
    };
  }

  return {
    message: 'Keep up the great work! Consistency is key to reaching your fitness goals.',
    ...defaultAction,
  };
}

// Today's Workout Card — self-contained with own query
function TodaysWorkoutCard() {
  const prefersReducedMotion = useReducedMotion();
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/solo/today-workout'],
    retry: false,
    staleTime: 60 * 1000,
  });

  const animProps = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

  if (isLoading) {
    return (
      <motion.div
        {...animProps}
        className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30 h-52 flex items-center justify-center"
      >
        <div className="text-center">
          <Dumbbell className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading workout...</p>
        </div>
      </motion.div>
    );
  }

  const workout = data?.workout || data?.suggestedWorkout;
  const isCompleted = workout?.status === 'completed';
  const isInProgress = workout?.status === 'in_progress';

  if (!workout) {
    return (
      <motion.div
        {...animProps}
        className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30"
      >
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-5 h-5 text-primary" />
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            No Workout Planned
          </p>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Based on your recovery, generate a smart workout.
        </p>
        <Link href="/solo/generate">
          <a className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5" />
            Generate Workout
          </a>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      {...animProps}
      className={`rounded-xl p-6 border ${
        isCompleted
          ? 'bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30'
          : 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {isCompleted ? 'Completed Today' : isInProgress ? 'In Progress' : "Today's Workout"}
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
              <span>
                {Array.isArray(workout.exercises)
                  ? workout.exercises.length
                  : workout.exercises || 0}{' '}
                exercises
              </span>
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
        <Link
          href={
            workout.workoutId || workout.source === 'saved'
              ? `/workout-execution/${workout.workoutId || workout.id}`
              : '/workouts'
          }
        >
          <motion.a
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-xl text-lg font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 cursor-pointer"
          >
            <Play className="w-5 h-5" />
            {isInProgress ? 'Continue Workout' : 'Start Workout'}
          </motion.a>
        </Link>
      )}
    </motion.div>
  );
}

// AI Coach Suggestion Card — self-contained with own queries
function AICoachSuggestionCard() {
  const prefersReducedMotion = useReducedMotion();
  const { data: gamification } = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
  });
  const { data: strengthSummary } = useQuery<any>({
    queryKey: ['/api/strength/summary'],
    retry: false,
  });
  const { data: fatigueData } = useQuery<any[]>({
    queryKey: ['/api/recovery/fatigue'],
    retry: false,
  });
  const { data: soloStats } = useQuery<any>({
    queryKey: ['/api/solo/stats'],
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
  const { data: todayWorkout } = useQuery<any>({
    queryKey: ['/api/solo/today-workout'],
    retry: false,
    staleTime: 60 * 1000,
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
    staleTime: 10 * 60 * 1000,
  });

  const rawInsight = aiInsights?.insights ?? aiInsights?.message ?? null;
  const contextualSuggestion = getContextualSuggestion({
    fatigueData: fatigueData ?? undefined,
    totalWorkouts: gamification?.totalWorkoutsCompleted || soloStats?.totalWorkouts || 0,
    hasWorkoutToday: todayWorkout?.workout?.status === 'completed',
    lastWorkoutDate: soloStats?.lastWorkoutDate || null,
    streak: gamification?.currentStreakDays || 0,
  });
  const suggestion =
    typeof rawInsight === 'string'
      ? { message: rawInsight, action: 'Chat with AI Coach', actionHref: '/solo/coach' }
      : contextualSuggestion;

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.1 },
      };

  return (
    <motion.div
      {...animProps}
      className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-xl p-6 border border-primary/20 h-full flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-primary/20 rounded-lg">
          {isLoading ? (
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Bot className="w-4 h-4 text-primary" />
          )}
        </div>
        <h3 className="font-bold text-sm">AI Coach Tip</h3>
      </div>
      <p className="text-sm text-muted-foreground flex-1 mb-3">
        {isLoading ? 'Analyzing your progress...' : `"${suggestion.message}"`}
      </p>
      <Link href={suggestion.actionHref}>
        <a className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
          {suggestion.action}
          <ChevronRight className="w-4 h-4" />
        </a>
      </Link>
    </motion.div>
  );
}

export function TodaysActionZone() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="md:col-span-3">
        <TodaysWorkoutCard />
      </div>
      <div className="md:col-span-2">
        <AICoachSuggestionCard />
      </div>
    </div>
  );
}

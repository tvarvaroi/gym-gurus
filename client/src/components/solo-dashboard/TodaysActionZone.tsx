import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, Play, ChevronRight } from 'lucide-react';
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
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  if (isLoading) {
    return (
      <motion.div
        {...animProps}
        className="bg-card rounded-2xl p-6 border border-border/20 h-48 flex items-center justify-center"
      >
        <div className="text-center">
          <Dumbbell className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-pulse" />
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
      <motion.div {...animProps} className="bg-card rounded-2xl p-6 border border-border/20">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">
          No Workout Planned
        </p>
        <p className="text-muted-foreground text-sm mb-5">
          Based on your recovery, generate a smart workout.
        </p>
        <Link href="/solo/generate">
          <motion.a
            whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Generate Workout
          </motion.a>
        </Link>
      </motion.div>
    );
  }

  const exerciseCount = Array.isArray(workout.exercises)
    ? workout.exercises.length
    : workout.exercises || 0;
  const muscleText =
    workout.muscleGroups && workout.muscleGroups.length > 0
      ? workout.muscleGroups
          .slice(0, 4)
          .map((m: string) => m.replace(/_/g, ' '))
          .join(' \u00B7 ')
      : null;

  return (
    <motion.div
      {...animProps}
      className={`rounded-2xl p-6 border ${
        isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border/20'
      }`}
    >
      {/* Label + meta row */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          {isCompleted ? 'Completed Today' : isInProgress ? 'In Progress' : "Today's Workout"}
        </p>
        {!isCompleted && (
          <span className="text-xs text-muted-foreground">
            {exerciseCount} exercises{' '}
            {workout.estimatedTime ? `\u00B7 ~${workout.estimatedTime} min` : ''}
          </span>
        )}
      </div>

      {/* Workout name */}
      <h2 className="text-xl font-bold mb-2">{workout.name}</h2>

      {/* Completed stats */}
      {isCompleted && workout.stats ? (
        <div className="flex gap-6 mb-4 text-sm">
          <div>
            <span className="font-bold tabular-nums">{workout.stats.duration}</span>
            <span className="text-muted-foreground ml-1">min</span>
          </div>
          <div>
            <span className="font-bold tabular-nums">{workout.stats.totalSets}</span>
            <span className="text-muted-foreground ml-1">sets</span>
          </div>
          <div>
            <span className="font-bold tabular-nums">{workout.stats.totalVolume}</span>
            <span className="text-muted-foreground ml-1">kg</span>
          </div>
        </div>
      ) : (
        <>
          {/* Muscle groups as middot-joined text */}
          {muscleText && (
            <p className="text-sm text-muted-foreground capitalize mb-4">{muscleText}</p>
          )}
        </>
      )}

      {/* Start / Continue button */}
      {!isCompleted && (
        <Link
          href={
            workout.workoutId || workout.source === 'saved'
              ? `/workout-execution/${workout.workoutId || workout.id}`
              : '/workouts'
          }
        >
          <motion.a
            whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Play className="w-5 h-5" />
            {isInProgress ? 'Continue Workout' : 'Start Workout'}
          </motion.a>
        </Link>
      )}
    </motion.div>
  );
}

// AI Coach Suggestion — inline text, not a card
function AICoachSuggestion() {
  const prefersReducedMotion = useReducedMotion();
  const { data: gamification } = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: strengthSummary } = useQuery<any>({
    queryKey: ['/api/strength/summary'],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const { data: fatigueData } = useQuery<any[]>({
    queryKey: ['/api/recovery/fatigue'],
    retry: false,
    staleTime: 5 * 60 * 1000,
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

  // Hide entirely while loading
  if (isLoading) return null;

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
      ? { message: rawInsight, action: 'Ask AI Coach', actionHref: '/solo/coach' }
      : contextualSuggestion;

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { delay: 0.15 },
      };

  return (
    <motion.p {...animProps} className="text-sm text-muted-foreground">
      {suggestion.message}{' '}
      <Link href={suggestion.actionHref}>
        <a className="inline-flex items-center gap-0.5 text-primary font-medium hover:text-primary/80 transition-colors">
          {suggestion.action}
          <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </Link>
    </motion.p>
  );
}

export function TodaysActionZone() {
  return (
    <div className="space-y-3">
      <TodaysWorkoutCard />
      <AICoachSuggestion />
    </div>
  );
}

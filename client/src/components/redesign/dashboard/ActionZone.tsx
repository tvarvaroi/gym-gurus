import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, Play, ChevronRight } from 'lucide-react';
import { ActionButton } from '@/components/ui/premium';

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
      message: 'Great workout today! Stay hydrated and get enough protein for recovery.',
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
        message: `It's been ${daysSinceLast} days since your last workout. A quick session can help maintain momentum!`,
        action: 'Generate Workout',
        actionHref: '/solo/generate',
      };
    }
  }
  const fatigueData = ctx.fatigueData;
  if (fatigueData && fatigueData.length > 0) {
    const recovered = fatigueData.filter((m) => m.recoveryStatus === 'recovered');
    const fatigued = fatigueData.filter((m) => m.recoveryStatus === 'fatigued');
    if (fatigued.length >= 5) {
      return {
        message: `${fatigued.length} muscle groups are still fatigued. Consider a rest day or light cardio.`,
        action: 'View Recovery',
        actionHref: '/solo/recovery',
      };
    }
    if (recovered.length > 0 && fatigued.length > 0) {
      const ready = recovered
        .slice(0, 3)
        .map((m) => m.muscleGroup.replace(/_/g, ' '))
        .join(', ');
      return {
        message: `Your ${ready} are recovered and ready to train.`,
        action: 'View Recovery',
        actionHref: '/solo/recovery',
      };
    }
    if (fatigued.length === 0 && recovered.length > 0) {
      return {
        message: 'All muscle groups are fully recovered. Great time for your next workout!',
        action: 'Generate Workout',
        actionHref: '/solo/generate',
      };
    }
  }
  if (ctx.streak && ctx.streak >= 3) {
    return {
      message: `${ctx.streak}-day streak! Keep the momentum going.`,
      action: 'Generate Workout',
      actionHref: '/solo/generate',
    };
  }
  return {
    message: 'Keep up the great work! Consistency is key to reaching your goals.',
    ...defaultAction,
  };
}

export function ActionZone() {
  const { data: todayWorkout, isLoading } = useQuery<any>({
    queryKey: ['/api/solo/today-workout'],
    retry: false,
    staleTime: 60 * 1000,
  });
  const { data: gamification } = useQuery<any>({
    queryKey: ['/api/gamification/profile'],
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

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-5 border border-border/20 flex items-center justify-center min-h-[100px] animate-in fade-in duration-300">
        <Dumbbell className="w-5 h-5 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  const workout = todayWorkout?.workout || todayWorkout?.suggestedWorkout;
  const isCompleted = workout?.status === 'completed';
  const isInProgress = workout?.status === 'in_progress';

  const exerciseCount =
    workout?.exerciseCount || (Array.isArray(workout?.exercises) ? workout.exercises.length : 0);
  const muscleText = workout?.muscleGroups
    ?.slice(0, 4)
    .map((m: string) => m.replace(/_/g, ' '))
    .join(' · ');

  const suggestion = getContextualSuggestion({
    fatigueData: fatigueData ?? undefined,
    totalWorkouts: gamification?.totalWorkoutsCompleted || soloStats?.totalWorkouts || 0,
    hasWorkoutToday: workout?.status === 'completed',
    lastWorkoutDate: soloStats?.lastWorkoutDate || null,
    streak: gamification?.currentStreakDays || 0,
  });

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div
        className={`rounded-2xl p-4 md:p-5 border ${isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-card border-border/20'}`}
      >
        {workout ? (
          <>
            {/* Label row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                {isCompleted ? 'Completed Today' : isInProgress ? 'In Progress' : "Today's Workout"}
              </span>
              {!isCompleted && exerciseCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {exerciseCount} exercises
                  {workout.estimatedTime ? ` · ~${workout.estimatedTime} min` : ''}
                </span>
              )}
            </div>

            {/* Workout name */}
            <h2 className="text-lg md:text-xl font-bold mb-2">{workout.name}</h2>

            {/* Completed stats */}
            {isCompleted && workout.stats ? (
              <div className="flex gap-5 mb-3 text-sm">
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
            ) : muscleText ? (
              <p className="text-sm text-muted-foreground capitalize mb-3">{muscleText}</p>
            ) : null}

            {/* CTA */}
            {!isCompleted && (
              <Link
                href={
                  workout.workoutId || workout.source === 'saved'
                    ? `/workout-execution/${workout.workoutId || workout.id}`
                    : '/workouts'
                }
              >
                <ActionButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Play className="w-5 h-5" />}
                >
                  {isInProgress ? 'Continue Workout' : 'Start Workout'}
                </ActionButton>
              </Link>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">
              No Workout Planned
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a smart workout based on your recovery.
            </p>
            <Link href="/solo/generate">
              <ActionButton variant="primary" size="lg" fullWidth>
                Generate Workout
              </ActionButton>
            </Link>
          </>
        )}
      </div>

      {/* AI suggestion line */}
      <p className="text-sm text-muted-foreground px-1">
        {suggestion.message}{' '}
        <Link href={suggestion.actionHref}>
          <div className="inline-flex items-center gap-0.5 text-primary font-medium hover:text-primary/80 transition-colors cursor-pointer">
            {suggestion.action}
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </p>
    </div>
  );
}

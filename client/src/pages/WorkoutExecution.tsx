import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatVolume, volumeHasAbbreviation } from '@/lib/format';
import { useUser } from '@/contexts/UserContext';
import {
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Timer,
  Dumbbell,
  Flame,
  Star,
  Zap,
  ListChecks,
  Share2,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { SetRow } from '@/components/redesign/execution/SetRow';
import { RestTimerOverlay } from '@/components/redesign/execution/RestTimerOverlay';
import { CompletionSheet } from '@/components/redesign/execution/CompletionSheet';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface SetLog {
  setNumber: number;
  weight: number; // stored in user's selected unit
  reps: number;
  completed: boolean;
  completedAt?: Date;
}

interface ExerciseSession {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  targetSets: number;
  targetReps: string;
  sets: SetLog[];
  restSeconds: number;
  status: 'pending' | 'in_progress' | 'completed';
}

interface WorkoutSession {
  workoutId: string;
  workoutTitle: string;
  startedAt: Date;
  exercises: ExerciseSession[];
  status: 'active' | 'completed';
}

type WeightUnit = 'kg' | 'lbs';

interface PreviousPerformanceData {
  unit: WeightUnit;
  exercises: Record<string, { weight: number; reps: number }[]>;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS & UTILS
// ═══════════════════════════════════════════════════════════

const lbsToKg = (lbs: number) => Math.round((lbs / 2.20462) * 10) / 10;

const ISOLATION_KEYWORDS = [
  'dumbbell',
  'cable',
  'lateral',
  'curl',
  'extension',
  'fly',
  'raise',
  'kickback',
  'pulldown',
  'pushdown',
];

function isIsolation(name: string): boolean {
  const lower = name.toLowerCase();
  return ISOLATION_KEYWORDS.some((kw) => lower.includes(kw));
}

function getWeightStep(exerciseName: string, unit: WeightUnit): number {
  if (unit === 'lbs') return isIsolation(exerciseName) ? 2.5 : 5;
  return isIsolation(exerciseName) ? 1 : 2.5;
}

function getDefaultRest(exerciseName: string): number {
  return isIsolation(exerciseName) ? 60 : 120;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function estimateCalories(durationMinutes: number, totalSets = 0): number {
  const durationBased = Math.round(durationMinutes * 7);
  const setsBased = totalSets * 8; // ~8 kcal per set floor
  return Math.max(durationBased, setsBased);
}

function getMuscleStyle(muscle: string): string {
  const m = muscle.toLowerCase().replace(/_/g, ' ');
  if (m.includes('chest')) return 'bg-red-500/15 text-red-400 border border-red-500/20';
  if (m.includes('back') || m.includes('lat'))
    return 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
  if (m.includes('shoulder') || m.includes('delt'))
    return 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
  if (m.includes('leg') || m.includes('quad') || m.includes('hamstring') || m.includes('calf'))
    return 'bg-green-500/15 text-green-400 border border-green-500/20';
  if (m.includes('bicep')) return 'bg-purple-500/15 text-purple-400 border border-purple-500/20';
  if (m.includes('tricep')) return 'bg-violet-500/15 text-violet-400 border border-violet-500/20';
  if (m.includes('core') || m.includes('ab'))
    return 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20';
  if (m.includes('glute')) return 'bg-pink-500/15 text-pink-400 border border-pink-500/20';
  return 'bg-white/10 text-neutral-400 border border-white/10';
}

function getMuscleAccent(muscle: string): string {
  const m = muscle.toLowerCase().replace(/_/g, ' ');
  if (m.includes('chest')) return 'border-l-red-500';
  if (m.includes('back') || m.includes('lat')) return 'border-l-blue-500';
  if (m.includes('shoulder') || m.includes('delt')) return 'border-l-orange-500';
  if (m.includes('leg') || m.includes('quad') || m.includes('hamstring') || m.includes('calf'))
    return 'border-l-green-500';
  if (m.includes('bicep')) return 'border-l-purple-500';
  if (m.includes('tricep')) return 'border-l-violet-500';
  if (m.includes('core') || m.includes('ab')) return 'border-l-yellow-500';
  if (m.includes('glute')) return 'border-l-pink-500';
  return 'border-l-neutral-500';
}

function getMuscleColor(muscle: string): string {
  const m = muscle.toLowerCase().replace(/_/g, ' ');
  if (m.includes('chest')) return 'bg-red-500';
  if (m.includes('back') || m.includes('lat')) return 'bg-blue-500';
  if (m.includes('shoulder') || m.includes('delt')) return 'bg-orange-500';
  if (m.includes('leg') || m.includes('quad') || m.includes('hamstring') || m.includes('calf'))
    return 'bg-green-500';
  if (m.includes('bicep')) return 'bg-purple-500';
  if (m.includes('tricep')) return 'bg-violet-500';
  if (m.includes('core') || m.includes('ab')) return 'bg-yellow-500';
  if (m.includes('glute')) return 'bg-pink-500';
  return 'bg-neutral-500';
}

function formatMuscleGroup(group: string): string {
  return group.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function abbreviateExerciseName(name: string): string {
  return name
    .replace(/^(barbell|cable|machine)\s+/i, '')
    .replace(/^dumbbell\s+/i, 'DB ')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');
}

// ═══════════════════════════════════════════════════════════
// ANIMATED COUNTER (for summary screen)
// ═══════════════════════════════════════════════════════════

function AnimatedNumber({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function WorkoutExecution() {
  const params = useParams();
  const workoutId = params.id as string;
  const [, setLocationRaw] = useLocation();
  const { isClient } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ─── State ───
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [showCompletion, setShowCompletion] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showEarlyFinishDialog, setShowEarlyFinishDialog] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<any>(null);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [restDuration, setRestDuration] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [previousPerformance, setPreviousPerformance] = useState<PreviousPerformanceData | null>(
    null
  );
  const [showConfetti, setShowConfetti] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  // ─── Refs ───
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const storageKey = `workout-session-${workoutId}`;

  // ─── Navigation guard ───
  const setLocation = useCallback(
    (path: string) => {
      const hasProgress = session?.exercises.some((ex) => ex.sets.some((s) => s.completed));
      if (hasProgress && !showCompletion && path !== `/workout-execution/${workoutId}`) {
        setShowExitDialog(true);
      } else {
        setLocationRaw(path);
      }
    },
    [session, showCompletion, workoutId, setLocationRaw]
  );

  // ─── Persist session to sessionStorage ───
  useEffect(() => {
    if (!session || showCompletion) return;
    const hasProgress = session.exercises.some((ex) => ex.sets.some((s) => s.completed));
    if (!hasProgress) return;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ session, currentExerciseIndex, elapsedSeconds, weightUnit })
    );
  }, [session, currentExerciseIndex, elapsedSeconds, weightUnit, showCompletion, storageKey]);

  useEffect(() => {
    if (showCompletion) sessionStorage.removeItem(storageKey);
  }, [showCompletion, storageKey]);

  // ─── beforeunload guard ───
  useEffect(() => {
    if (session && !showCompletion) {
      const handler = (e: Event) => {
        e.preventDefault();
        // @ts-expect-error returnValue exists on BeforeUnloadEvent
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [session, showCompletion]);

  // ─── Workout duration timer ───
  useEffect(() => {
    if (session && !showCompletion) {
      durationTimerRef.current = setInterval(() => {
        setElapsedSeconds((p) => p + 1);
      }, 1000);
      return () => {
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      };
    }
  }, [session, showCompletion]);

  // ─── Rest timer ───
  useEffect(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    if (restTimeLeft > 0) {
      restTimerRef.current = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    };
  }, [restTimeLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss rest timer 3s after reaching 0
  const restJustFinished = restTimeLeft === 0 && restDuration > 0;
  useEffect(() => {
    if (restJustFinished) {
      const t = setTimeout(() => setRestDuration(0), 3000);
      return () => clearTimeout(t);
    }
  }, [restJustFinished]);

  // ─── Stop confetti after 3 seconds ───
  useEffect(() => {
    if (showCompletion && showConfetti) {
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showCompletion, showConfetti]);

  // ─── Load previous performance from localStorage ───
  useEffect(() => {
    try {
      const prevData = localStorage.getItem(`prev-perf-${workoutId}`);
      if (prevData) {
        setPreviousPerformance(JSON.parse(prevData));
      }
    } catch {
      // ignore localStorage errors
    }
  }, [workoutId]);

  // ═══════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════

  const fetchUrl = isClient
    ? `/api/workout-assignments/${workoutId}`
    : `/api/workouts/detail/${workoutId}`;

  const {
    data: workout,
    isLoading,
    error: workoutError,
  } = useQuery({
    queryKey: [fetchUrl],
    queryFn: async () => {
      const response = await fetch(fetchUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch workout');
      return response.json();
    },
  });

  // ═══════════════════════════════════════════════════════════
  // SESSION INIT
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (workout && !session) {
      // Check for saved session
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.session?.workoutId === workoutId) {
            setSavedSessionData(parsed);
            setShowResumeDialog(true);
            return;
          }
        } catch {
          sessionStorage.removeItem(storageKey);
        }
      }

      initializeSession(workout);
    }
  }, [workout, session, workoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  function initializeSession(workoutData: any) {
    const rawExercises = workoutData.exercises || [];
    if (rawExercises.length === 0) {
      toast({
        title: 'No exercises found',
        description: 'This workout has no exercises. Edit it first.',
        variant: 'destructive',
      });
      setLocationRaw('/workouts');
      return;
    }

    const exercises: ExerciseSession[] = rawExercises.map((ex: any, index: number) => {
      const name = ex.name || ex.exerciseName || ex.title || 'Exercise';
      const numSets = Math.max(1, Number(ex.sets) || Number(ex.numSets) || 3);
      return {
        exerciseId: ex.exerciseId || ex.id || `exercise-${index}`,
        exerciseName: name,
        muscleGroup: ex.muscleGroup || ex.targetMuscle || ex.category || 'General',
        targetSets: numSets,
        targetReps: String(ex.reps || ex.targetReps || '10'),
        restSeconds: getDefaultRest(name),
        sets: Array.from({ length: numSets }, (_, i) => ({
          setNumber: i + 1,
          weight: 0,
          reps: 0,
          completed: false,
        })),
        status: index === 0 ? 'in_progress' : ('pending' as const),
      };
    });

    // Pre-fill weights from previous performance
    try {
      const prevData = localStorage.getItem(`prev-perf-${workoutId}`);
      if (prevData) {
        const parsed: PreviousPerformanceData = JSON.parse(prevData);
        const prevExercises = parsed.exercises || {};
        for (const ex of exercises) {
          const prev = prevExercises[ex.exerciseName];
          if (prev) {
            for (let i = 0; i < ex.sets.length; i++) {
              const prevSet = prev[i] || prev[prev.length - 1];
              if (prevSet) {
                ex.sets[i].weight = prevSet.weight;
              }
            }
          }
        }
      }
    } catch {
      // ignore localStorage errors
    }

    setSession({
      workoutId,
      workoutTitle: workoutData.title || 'Workout',
      startedAt: new Date(),
      exercises,
      status: 'active',
    });
    setCurrentExerciseIndex(0);
    setElapsedSeconds(0);
  }

  // ═══════════════════════════════════════════════════════════
  // SET OPERATIONS
  // ═══════════════════════════════════════════════════════════

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, exercises: [...prev.exercises] };
        next.exercises[exIdx] = {
          ...next.exercises[exIdx],
          sets: [...next.exercises[exIdx].sets],
        };
        next.exercises[exIdx].sets[setIdx] = {
          ...next.exercises[exIdx].sets[setIdx],
          [field]: Math.max(0, value),
        };
        return next;
      });
    },
    []
  );

  const toggleSetComplete = useCallback(
    (exIdx: number, setIdx: number) => {
      if (!session) return;
      const set = session.exercises[exIdx].sets[setIdx];

      // If uncompleting a set
      if (set.completed) {
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, exercises: [...prev.exercises] };
          next.exercises[exIdx] = {
            ...next.exercises[exIdx],
            sets: [...next.exercises[exIdx].sets],
            status: 'in_progress',
          };
          next.exercises[exIdx].sets[setIdx] = {
            ...next.exercises[exIdx].sets[setIdx],
            completed: false,
            completedAt: undefined,
          };
          return next;
        });
        return;
      }

      // Completing a set — validate
      if (!set.weight || !set.reps) {
        toast({
          title: 'Missing Data',
          description: 'Enter weight and reps before completing the set.',
          variant: 'destructive',
        });
        return;
      }

      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, exercises: [...prev.exercises] };
        const exercise = { ...next.exercises[exIdx], sets: [...next.exercises[exIdx].sets] };
        exercise.sets[setIdx] = {
          ...exercise.sets[setIdx],
          completed: true,
          completedAt: new Date(),
        };

        // Auto-fill next set
        const nextSetIdx = setIdx + 1;
        if (nextSetIdx < exercise.sets.length && !exercise.sets[nextSetIdx].completed) {
          exercise.sets[nextSetIdx] = {
            ...exercise.sets[nextSetIdx],
            weight: exercise.sets[nextSetIdx].weight || set.weight,
            reps: exercise.sets[nextSetIdx].reps || set.reps,
          };
        }

        // Check if exercise complete
        const allDone = exercise.sets.every((s) => s.completed);
        if (allDone) {
          exercise.status = 'completed';
        }

        next.exercises[exIdx] = exercise;
        return next;
      });

      // Check if exercise is now complete
      const updatedExercise = session.exercises[exIdx];
      const willComplete =
        updatedExercise.sets.filter((s) => s.completed).length === updatedExercise.sets.length - 1;

      if (willComplete) {
        // Last set of this exercise
        if (exIdx < session.exercises.length - 1) {
          toast({ title: 'Exercise Complete!', description: 'Moving to next exercise...' });
          setTimeout(() => {
            setCurrentExerciseIndex(exIdx + 1);
            setSession((prev) => {
              if (!prev) return prev;
              const next = { ...prev, exercises: [...prev.exercises] };
              if (next.exercises[exIdx + 1]) {
                next.exercises[exIdx + 1] = { ...next.exercises[exIdx + 1], status: 'in_progress' };
              }
              return next;
            });
          }, 300);
        } else {
          // Last exercise complete — finish workout
          setTimeout(() => finishWorkout(), 300);
          return;
        }
      } else {
        // Start rest timer
        const restSec = session.exercises[exIdx].restSeconds;
        setRestTimeLeft(restSec);
        setRestDuration(restSec);
      }
    },
    [session, toast] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ─── Rest timer controls ───
  const skipRest = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setRestTimeLeft(0);
    setRestDuration(0);
  }, []);

  const addRestTime = useCallback(() => {
    setRestTimeLeft((p) => p + 30);
    setRestDuration((p) => p + 30);
  }, []);

  // ─── Exercise navigation ───
  const goToExercise = useCallback(
    (idx: number) => {
      if (!session || idx < 0 || idx >= session.exercises.length) return;
      setCurrentExerciseIndex(idx);
      if (session.exercises[idx].status === 'pending') {
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, exercises: [...prev.exercises] };
          next.exercises[idx] = { ...next.exercises[idx], status: 'in_progress' };
          return next;
        });
      }
      setShowExerciseList(false);
    },
    [session]
  );

  // ─── Touch swipe ───
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!session) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) {
        if (diff > 0 && currentExerciseIndex < session.exercises.length - 1) {
          goToExercise(currentExerciseIndex + 1);
        } else if (diff < 0 && currentExerciseIndex > 0) {
          goToExercise(currentExerciseIndex - 1);
        }
      }
    },
    [session, currentExerciseIndex, goToExercise]
  );

  // ─── Finish workout ───
  const finishWorkout = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, status: 'completed' };
    });
    setShowCompletion(true);
  }, []);

  const handleFinishClick = useCallback(() => {
    if (!session) return;
    const completedCount = session.exercises.filter((e) => e.status === 'completed').length;
    const total = session.exercises.length;
    if (completedCount / total < 0.5) {
      setShowEarlyFinishDialog(true);
    } else {
      finishWorkout();
    }
  }, [session, finishWorkout]);

  // ═══════════════════════════════════════════════════════════
  // SAVE MUTATION
  // ═══════════════════════════════════════════════════════════

  const saveWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;

      if (isClient) {
        return apiRequest('PUT', `/api/workout-assignments/${workoutId}/complete`, {
          notes: 'Workout completed via execution interface',
        });
      }

      const durationMinutes = Math.round(elapsedSeconds / 60) || 1;
      const res = await apiRequest('PUT', `/api/solo/workouts/${workoutId}/complete-solo`, {
        notes: 'Workout completed via execution interface',
        durationMinutes,
        exercises: session.exercises.map((ex) => ({
          exerciseName: ex.exerciseName,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets
            .filter((s) => s.completed)
            .map((s) => ({
              weight: weightUnit === 'lbs' ? lbsToKg(s.weight) : s.weight,
              reps: s.reps,
            })),
        })),
      });
      return res;
    },
    onSuccess: async (res) => {
      try {
        const data = await res?.json();
        if (data?.gamification?.xpAwarded) {
          setXpAwarded(data.gamification.xpAwarded);
        }
      } catch {
        // response may already be consumed
      }

      // Save performance for next time (hints + pre-fill)
      try {
        if (session) {
          const perfData: PreviousPerformanceData = {
            unit: weightUnit,
            exercises: {},
          };
          for (const ex of session.exercises) {
            const completedSets = ex.sets.filter((s) => s.completed);
            if (completedSets.length > 0) {
              perfData.exercises[ex.exerciseName] = completedSets.map((s) => ({
                weight: s.weight,
                reps: s.reps,
              }));
            }
          }
          localStorage.setItem(`prev-perf-${workoutId}`, JSON.stringify(perfData));
        }
      } catch {
        // ignore localStorage errors
      }

      queryClient.invalidateQueries({ queryKey: ['/api/client/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recovery/fatigue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/solo/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/solo/today-workout'] });
      setTimeout(() => setLocationRaw('/dashboard'), 3000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save workout',
        variant: 'destructive',
      });
    },
  });

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  const currentExercise = session?.exercises[currentExerciseIndex];
  const totalExercises = session?.exercises.length || 0;
  const completedExercises = session?.exercises.filter((e) => e.status === 'completed').length || 0;

  const allCompletedSets =
    session?.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0) || 0;
  const allTotalSets = session?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
  const overallProgress = allTotalSets > 0 ? (allCompletedSets / allTotalSets) * 100 : 0;

  const totalVolume = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.completed)
          .reduce((s, set) => {
            const w = weightUnit === 'lbs' ? lbsToKg(set.weight) : set.weight;
            return s + w * set.reps;
          }, 0),
      0
    );
  }, [session, weightUnit]);

  const currentSetIndex = currentExercise
    ? currentExercise.sets.findIndex((s) => !s.completed)
    : -1;

  // Unique muscles worked
  const musclesWorked = useMemo(() => {
    if (!session) return [];
    return [
      ...new Set(
        session.exercises
          .filter((e) => e.sets.some((s) => s.completed))
          .map((e) => e.muscleGroup.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      ),
    ];
  }, [session]);

  // PR detection: compare current best weight per exercise vs previous performance
  const personalRecords = useMemo(() => {
    if (!session || !previousPerformance) return [];
    const prs: { exerciseName: string; newWeight: number; previousWeight: number }[] = [];
    for (const ex of session.exercises) {
      const completedSets = ex.sets.filter((s) => s.completed);
      if (completedSets.length === 0) continue;
      const bestWeight = Math.max(...completedSets.map((s) => s.weight));
      const prevSets = previousPerformance.exercises[ex.exerciseName];
      if (prevSets && prevSets.length > 0) {
        const prevBest = Math.max(...prevSets.map((s) => s.weight));
        if (bestWeight > prevBest) {
          prs.push({
            exerciseName: ex.exerciseName,
            newWeight: bestWeight,
            previousWeight: prevBest,
          });
        }
      }
    }
    return prs;
  }, [session, previousPerformance]);

  // ═══════════════════════════════════════════════════════════
  // RENDER: Loading
  // ═══════════════════════════════════════════════════════════

  if (workoutError) {
    return createPortal(
      <div className="fixed inset-0 z-[200] min-h-screen flex items-center justify-center bg-[#0A0A0A] p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <X className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-medium text-white">Failed to load workout</h2>
          <p className="text-sm text-neutral-400">{(workoutError as Error).message}</p>
          <Button variant="outline" onClick={() => setLocationRaw('/workouts')}>
            Back to Workouts
          </Button>
        </div>
      </div>,
      document.body
    );
  }

  if (isLoading || !session) {
    return createPortal(
      <div className="fixed inset-0 z-[200] min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#c9a855]/30 border-t-[#c9a855] rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-neutral-500 text-sm">Loading workout...</p>
        </div>
      </div>,
      document.body
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Summary Screen
  // ═══════════════════════════════════════════════════════════

  if (showCompletion) {
    return createPortal(
      <CompletionSheet
        workoutTitle={session.workoutTitle}
        elapsedSeconds={elapsedSeconds}
        totalVolume={totalVolume}
        completedSets={allCompletedSets}
        totalSets={allTotalSets}
        weightUnit={weightUnit}
        exercises={session.exercises}
        personalRecords={personalRecords}
        musclesWorked={musclesWorked}
        xpAwarded={xpAwarded}
        isSaving={saveWorkoutMutation.isPending}
        isSaved={saveWorkoutMutation.isSuccess}
        onSave={() => saveWorkoutMutation.mutate()}
        onShare={() => toast({ title: 'Coming soon!', description: 'Share your results with friends.' })}
      />,
      document.body
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Main Workout View
  // ═══════════════════════════════════════════════════════════

  const isRestVisible = restTimeLeft > 0 || restJustFinished;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0A] text-white select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Sticky Top Bar ── */}
      <div className="flex-none py-3 px-4 bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-transparent z-30">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowExitDialog(true)}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors flex-none active:scale-95"
            aria-label="Exit workout"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
          <div className="flex-1 min-w-0 mx-3 text-center">
            <h1 className="text-base font-bold truncate">{session.workoutTitle}</h1>
            <p className="text-[11px] text-muted-foreground">
              Exercise {currentExerciseIndex + 1} of {totalExercises}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            {/* Weight unit pill */}
            <div className="flex rounded-md overflow-hidden">
              <button
                onClick={() => setWeightUnit('kg')}
                className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  weightUnit === 'kg' ? 'bg-[#c9a855] text-black' : 'bg-white/5 text-neutral-500'
                }`}
              >
                KG
              </button>
              <button
                onClick={() => setWeightUnit('lbs')}
                className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                  weightUnit === 'lbs' ? 'bg-[#c9a855] text-black' : 'bg-white/5 text-neutral-500'
                }`}
              >
                LBS
              </button>
            </div>
            <span className="text-xl font-mono tabular-nums text-[#c9a855] min-w-[56px] text-right font-bold">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Progress bar with glow */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#c9a855] rounded-full"
            initial={false}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
            style={{ boxShadow: '0 0 8px rgba(201,168,85,0.4)' }}
          />
        </div>

        {/* Live stats row */}
        <div className="flex items-center justify-between mt-2 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3" />
            {formatVolume(Math.round(totalVolume))}
            {!volumeHasAbbreviation(Math.round(totalVolume)) ? ` ${weightUnit}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            {allCompletedSets}/{allTotalSets} sets
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3" />~
            {estimateCalories(Math.round(elapsedSeconds / 60), allCompletedSets)} kcal
          </span>
        </div>
      </div>

      {/* ── Exercise Navigation Strip ── */}
      <div className="flex-none px-3 py-2 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 min-w-max">
          {session.exercises.map((ex, i) => {
            const isActive = i === currentExerciseIndex;
            const isDone = ex.status === 'completed';
            return (
              <button
                key={i}
                ref={(el) => {
                  if (isActive && el)
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                onClick={() => goToExercise(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#c9a855]/15 text-[#c9a855] border border-[#c9a855]/30'
                    : isDone
                      ? 'bg-green-500/10 text-green-500/70 border border-green-500/20'
                      : 'bg-white/[0.03] text-neutral-500 border border-white/5'
                }`}
                aria-label={`Go to exercise ${i + 1}: ${ex.exerciseName}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-none ${
                    isActive
                      ? 'bg-[#c9a855] text-black'
                      : isDone
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-neutral-500'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                </span>
                {abbreviateExerciseName(ex.exerciseName)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-20 relative">
        <AnimatePresence mode="wait">
          {currentExercise && (
            <motion.div
              key={currentExerciseIndex}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 sm:px-4 pt-3"
            >
              {/* Exercise header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getMuscleStyle(currentExercise.muscleGroup)}`}
                  >
                    {formatMuscleGroup(currentExercise.muscleGroup)}
                  </span>
                </div>
                <h2 className="text-2xl font-bold leading-tight">{currentExercise.exerciseName}</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  {currentExercise.sets.length} sets &times; {currentExercise.targetReps} reps
                  &middot; {currentExercise.restSeconds}s rest
                </p>
              </div>

              {/* Previous performance block */}
              {previousPerformance?.exercises?.[currentExercise.exerciseName] && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                    Previous
                  </span>
                  <span className="text-xs text-neutral-300 tabular-nums">
                    {previousPerformance.exercises[currentExercise.exerciseName]
                      .map((prev) => `${prev.weight}${previousPerformance.unit}×${prev.reps}`)
                      .join('  ·  ')}
                  </span>
                </div>
              )}

              {/* Set cards */}
              <div className="space-y-3">
                {currentExercise.sets.map((set, sIdx) => {
                  const isActive = sIdx === currentSetIndex;
                  const isUpcoming = !set.completed && !isActive;
                  const step = getWeightStep(currentExercise.exerciseName, weightUnit);

                  return (
                    <SetRow
                      key={sIdx}
                      set={set}
                      isActive={isActive}
                      isUpcoming={isUpcoming}
                      weightUnit={weightUnit}
                      weightStep={step}
                      onUpdateWeight={(value) => updateSet(currentExerciseIndex, sIdx, 'weight', value)}
                      onUpdateReps={(value) => updateSet(currentExerciseIndex, sIdx, 'reps', value)}
                      onToggleComplete={() => toggleSetComplete(currentExerciseIndex, sIdx)}
                    />
                  );
                })}
              </div>

              {/* Next exercise button (after all sets done) */}
              {currentExercise.status === 'completed' &&
                currentExerciseIndex < totalExercises - 1 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => goToExercise(currentExerciseIndex + 1)}
                    className="mt-4 w-full h-12 rounded-xl bg-[#c9a855]/10 border border-[#c9a855]/30 text-[#c9a855] font-bold flex items-center justify-center gap-2"
                    aria-label="Go to next exercise"
                  >
                    Next Exercise <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}

              {/* Up Next preview — fills dead space */}
              {currentExerciseIndex < totalExercises - 1 && (
                <div className="mt-6 mx-1 px-4 py-5 border-t border-white/[0.04]">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                    Up Next
                  </span>
                  <p className="text-sm font-medium text-neutral-400 mt-1.5">
                    {session.exercises[currentExerciseIndex + 1]?.exerciseName}
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {session.exercises[currentExerciseIndex + 1]?.sets?.length} sets
                    {session.exercises[currentExerciseIndex + 1]?.restSeconds
                      ? ` · ${session.exercises[currentExerciseIndex + 1]?.restSeconds}s rest`
                      : ''}
                  </p>
                </div>
              )}

              {/* Session progress — last exercise completed */}
              {currentExerciseIndex === totalExercises - 1 &&
                currentExercise.status === 'completed' && (
                  <div className="mt-6 mx-1 px-4 py-5 border-t border-white/[0.04] text-center">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                      Session Progress
                    </span>
                    <div className="flex justify-center gap-6 mt-3">
                      <div className="text-center">
                        <span className="text-lg font-bold tabular-nums">{allCompletedSets}</span>
                        <span className="text-[10px] text-neutral-600 block">sets done</span>
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-bold tabular-nums">
                          {Math.round(totalVolume).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-neutral-600 block">kg lifted</span>
                      </div>
                    </div>
                  </div>
                )}

              {/* spacer for bottom bar */}
              <div className="h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Rest Timer Overlay ── */}
      <AnimatePresence>
        <RestTimerOverlay
          restTimeLeft={restTimeLeft}
          restDuration={restDuration}
          restJustFinished={restJustFinished}
          nextSetInfo={
            currentExercise && currentSetIndex >= 0 && currentSetIndex < currentExercise.sets.length - 1
              ? { setNumber: currentSetIndex + 2, totalSets: currentExercise.sets.length }
              : null
          }
          nextExerciseInfo={
            currentExercise &&
            (currentSetIndex < 0 || currentSetIndex >= currentExercise.sets.length - 1) &&
            currentExerciseIndex < totalExercises - 1
              ? {
                  name: session.exercises[currentExerciseIndex + 1]?.exerciseName,
                  sets: session.exercises[currentExerciseIndex + 1]?.sets.length,
                  reps: session.exercises[currentExerciseIndex + 1]?.targetReps,
                }
              : null
          }
          onAddTime={addRestTime}
          onSkip={skipRest}
        />
      </AnimatePresence>

      {/* ── Sticky Bottom Bar ── */}
      <div className="flex-none h-[72px] flex items-center justify-between px-4 border-t border-white/5 bg-[#0A0A0A]/95 backdrop-blur-md z-30 gap-2">
        {/* Exercise list */}
        <button
          onClick={() => setShowExerciseList(true)}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 transition-colors flex-none active:scale-95"
          aria-label="View exercise list"
        >
          <ListChecks className="w-5 h-5" />
        </button>

        {/* Prev */}
        <button
          onClick={() => currentExerciseIndex > 0 && goToExercise(currentExerciseIndex - 1)}
          disabled={currentExerciseIndex === 0}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 transition-colors flex-none disabled:opacity-30 active:scale-95"
          aria-label="Previous exercise"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next */}
        <button
          onClick={() =>
            currentExerciseIndex < totalExercises - 1 && goToExercise(currentExerciseIndex + 1)
          }
          disabled={currentExerciseIndex >= totalExercises - 1}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 transition-colors flex-none disabled:opacity-30 active:scale-95"
          aria-label="Next exercise"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="flex-1" />

        {/* Finish */}
        <button
          onClick={handleFinishClick}
          className={`h-12 px-6 rounded-xl font-bold text-sm transition-all flex-none active:scale-95 ${
            overallProgress >= 100
              ? 'bg-[#c9a855] text-black'
              : overallProgress >= 50
                ? 'bg-[#c9a855] text-black'
                : 'border border-white/20 text-neutral-400 hover:border-white/40'
          }`}
          style={
            overallProgress >= 100
              ? { boxShadow: '0 0 20px rgba(201,168,85,0.4), 0 0 40px rgba(201,168,85,0.2)' }
              : undefined
          }
          aria-label="Finish workout"
        >
          {overallProgress >= 100 ? 'Finish Workout' : 'Finish'}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DIALOGS                                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Exit confirmation */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="bg-neutral-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle>End workout?</DialogTitle>
            <DialogDescription>Your progress will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowExitDialog(false)}>
              Continue Workout
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                sessionStorage.removeItem(storageKey);
                setLocationRaw('/workouts');
              }}
            >
              End Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early finish confirmation */}
      <Dialog open={showEarlyFinishDialog} onOpenChange={setShowEarlyFinishDialog}>
        <DialogContent className="bg-neutral-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle>Finish early?</DialogTitle>
            <DialogDescription>
              You&apos;ve completed {completedExercises} of {totalExercises} exercises. Finish now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowEarlyFinishDialog(false)}
            >
              Keep Going
            </Button>
            <Button
              className="flex-1 bg-[#c9a855] text-black hover:bg-[#b89745]"
              onClick={() => {
                setShowEarlyFinishDialog(false);
                finishWorkout();
              }}
            >
              Finish Workout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume session dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="bg-neutral-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle>Resume workout?</DialogTitle>
            <DialogDescription>
              You have an in-progress session for this workout. Would you like to resume or start
              fresh?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowResumeDialog(false);
                sessionStorage.removeItem(storageKey);
                if (workout) initializeSession(workout);
              }}
            >
              Start Fresh
            </Button>
            <Button
              className="flex-1 bg-[#c9a855] text-black hover:bg-[#b89745]"
              onClick={() => {
                if (savedSessionData) {
                  setSession({
                    ...savedSessionData.session,
                    startedAt: new Date(savedSessionData.session.startedAt),
                  });
                  setCurrentExerciseIndex(savedSessionData.currentExerciseIndex || 0);
                  setElapsedSeconds(savedSessionData.elapsedSeconds || 0);
                  if (savedSessionData.weightUnit) setWeightUnit(savedSessionData.weightUnit);
                }
                setShowResumeDialog(false);
              }}
            >
              Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise list bottom sheet */}
      <AnimatePresence>
        {showExerciseList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowExerciseList(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 rounded-t-2xl border-t border-white/10 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h3 className="font-semibold">Exercises</h3>
                <button
                  onClick={() => setShowExerciseList(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                  aria-label="Close exercise list"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-2 space-y-1">
                {session.exercises.map((ex, i) => {
                  const completedCount = ex.sets.filter((s) => s.completed).length;
                  const pct = Math.round((completedCount / ex.sets.length) * 100);
                  return (
                    <button
                      key={i}
                      onClick={() => goToExercise(i)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors ${
                        i === currentExerciseIndex ? 'bg-[#c9a855]/10' : 'hover:bg-white/5'
                      }`}
                      aria-label={`Go to ${ex.exerciseName}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-none text-xs font-bold ${
                          ex.status === 'completed'
                            ? 'bg-green-500 text-white'
                            : i === currentExerciseIndex
                              ? 'bg-[#c9a855] text-black'
                              : 'bg-white/10 text-neutral-500'
                        }`}
                      >
                        {ex.status === 'completed' ? (
                          <Check className="w-4 h-4" strokeWidth={3} />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-none ${getMuscleColor(ex.muscleGroup)}`}
                          />
                          <p
                            className={`text-sm font-medium truncate ${
                              ex.status === 'completed' ? 'text-neutral-500' : 'text-white'
                            }`}
                          >
                            {ex.exerciseName}
                          </p>
                        </div>
                        <p className="text-xs text-neutral-600 ml-4">
                          {completedCount}/{ex.sets.length} sets
                          {pct > 0 && pct < 100 ? ` · ${pct}%` : ''}
                        </p>
                      </div>
                      {i === currentExerciseIndex && (
                        <ChevronRight className="w-4 h-4 text-[#c9a855] flex-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}

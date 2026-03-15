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
import { X, Check, ChevronRight, Dumbbell, Flame, ListChecks } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
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
        onShare={() =>
          toast({ title: 'Coming soon!', description: 'Share your results with friends.' })
        }
      />,
      document.body
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Main Workout View
  // ═══════════════════════════════════════════════════════════

  const isRestVisible = restTimeLeft > 0 || restJustFinished;

  // Segmented progress data — one segment per set across entire workout
  const progressSegments = session.exercises.flatMap((ex, exIdx) =>
    ex.sets.map((set, setIdx) => ({
      completed: set.completed,
      isCurrent: exIdx === currentExerciseIndex && setIdx === currentSetIndex,
    }))
  );

  // Active set for input area
  const activeSet =
    currentExercise && currentSetIndex >= 0 && currentSetIndex < currentExercise.sets.length
      ? currentExercise.sets[currentSetIndex]
      : null;

  const activeStep = currentExercise
    ? getWeightStep(currentExercise.exerciseName, weightUnit)
    : 2.5;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0A] text-white select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Segmented Progress Bar ── */}
      <div className="flex-none pt-3 px-3">
        <div className="flex gap-[3px]">
          {progressSegments.map((seg, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                seg.completed
                  ? 'bg-primary'
                  : seg.isCurrent
                    ? 'bg-primary/50 animate-pulse'
                    : 'bg-white/[0.08]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Header: Block Label + Timer ── */}
      <div className="flex-none flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExitDialog(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Exit workout"
          >
            <X className="w-4 h-4 text-neutral-600" />
          </button>
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Ex {currentExerciseIndex + 1}/{totalExercises}
          </span>
          <span className="text-neutral-700">·</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            Set{' '}
            {currentSetIndex >= 0
              ? currentSetIndex + 1
              : currentExercise?.sets.filter((s) => s.completed).length || 0}
            /{currentExercise?.sets.length || 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden">
            <button
              onClick={() => setWeightUnit('kg')}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                weightUnit === 'kg'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-neutral-500'
              }`}
            >
              KG
            </button>
            <button
              onClick={() => setWeightUnit('lbs')}
              className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${
                weightUnit === 'lbs'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-neutral-500'
              }`}
            >
              LBS
            </button>
          </div>
          <span className="text-lg font-mono tabular-nums text-primary min-w-[56px] text-right font-bold">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* ── Live Stats Row ── */}
      <div className="flex-none flex items-center justify-between px-4 pb-2 text-[11px] text-neutral-500">
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

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-4 relative">
        <AnimatePresence mode="wait">
          {currentExercise && (
            <motion.div
              key={currentExerciseIndex}
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pt-2"
            >
              {/* Muscle group pill */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/20">
                  {formatMuscleGroup(currentExercise.muscleGroup)}
                </span>
              </div>

              {/* Exercise name — Playfair Display */}
              <h2 className="text-3xl font-bold font-['Playfair_Display'] leading-tight text-white">
                {currentExercise.exerciseName}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                {currentExercise.sets.length} sets &times; {currentExercise.targetReps} reps
                &middot; {currentExercise.restSeconds}s rest
              </p>

              {/* Exercise Illustration Zone */}
              <div
                className="mt-4 h-28 rounded-2xl relative overflow-hidden border border-white/[0.04]"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, rgba(255,255,255,0.02) 100%)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Dumbbell className="w-14 h-14 text-primary/15" />
                </div>
                <div className="absolute bottom-2.5 left-3 flex flex-wrap gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${getMuscleStyle(currentExercise.muscleGroup)}`}
                  >
                    {formatMuscleGroup(currentExercise.muscleGroup)}
                  </span>
                </div>
              </div>

              {/* Previous performance */}
              {previousPerformance?.exercises?.[currentExercise.exerciseName] && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Previous
                  </span>
                  <span className="text-xs text-neutral-300 ml-2 tabular-nums">
                    {previousPerformance.exercises[currentExercise.exerciseName]
                      .map((prev) => `${prev.weight}${previousPerformance.unit}×${prev.reps}`)
                      .join('  ·  ')}
                  </span>
                </div>
              )}

              {/* ── Sets Grid ── */}
              <div className="mt-5">
                <div
                  className={`grid gap-2 ${currentExercise.sets.length <= 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}
                >
                  {currentExercise.sets.map((set, sIdx) => {
                    const isActiveSet = sIdx === currentSetIndex;
                    return (
                      <button
                        key={sIdx}
                        onClick={() => {
                          if (set.completed) {
                            toggleSetComplete(currentExerciseIndex, sIdx);
                          }
                        }}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border ${
                          set.completed
                            ? 'bg-green-500/10 border-green-500/20'
                            : isActiveSet
                              ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                              : 'bg-white/[0.02] border-white/[0.06]'
                        }`}
                      >
                        {set.completed ? (
                          <>
                            <Check className="w-4 h-4 text-green-500 mb-0.5" strokeWidth={3} />
                            <span className="text-[8px] text-green-500/70 tabular-nums leading-tight">
                              {set.weight}
                              {weightUnit}&times;{set.reps}
                            </span>
                          </>
                        ) : isActiveSet ? (
                          <>
                            <span className="text-[10px] font-bold text-primary uppercase">
                              Now
                            </span>
                            <span className="text-[9px] text-primary/50">Set {sIdx + 1}</span>
                          </>
                        ) : (
                          <span className="text-sm text-neutral-600 font-medium">{sIdx + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Active Set Input ── */}
              {activeSet && !activeSet.completed && (
                <div className="mt-4 rounded-2xl p-4 bg-primary/[0.04] border border-primary/15">
                  <div className="flex items-center justify-around">
                    {/* Weight */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
                        Weight ({weightUnit})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            updateSet(
                              currentExerciseIndex,
                              currentSetIndex,
                              'weight',
                              activeSet.weight - activeStep
                            )
                          }
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all"
                          aria-label={`Decrease weight by ${activeStep}`}
                        >
                          <span className="text-lg font-light">&minus;</span>
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={activeSet.weight || ''}
                          onChange={(e) =>
                            updateSet(
                              currentExerciseIndex,
                              currentSetIndex,
                              'weight',
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-16 h-12 text-center text-xl font-bold bg-transparent border-b-2 border-white/[0.06] focus:border-primary outline-none tabular-nums text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                          aria-label="Weight"
                        />
                        <button
                          onClick={() =>
                            updateSet(
                              currentExerciseIndex,
                              currentSetIndex,
                              'weight',
                              activeSet.weight + activeStep
                            )
                          }
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all"
                          aria-label={`Increase weight by ${activeStep}`}
                        >
                          <span className="text-lg font-light">+</span>
                        </button>
                      </div>
                    </div>

                    <div className="h-14 w-px bg-white/[0.06]" />

                    {/* Reps */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
                        Reps
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            updateSet(
                              currentExerciseIndex,
                              currentSetIndex,
                              'reps',
                              activeSet.reps - 1
                            )
                          }
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all"
                          aria-label="Decrease reps"
                        >
                          <span className="text-lg font-light">&minus;</span>
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={activeSet.reps || ''}
                          onChange={(e) =>
                            updateSet(
                              currentExerciseIndex,
                              currentSetIndex,
                              'reps',
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-14 h-12 text-center text-xl font-bold bg-transparent border-b-2 border-white/[0.06] focus:border-primary outline-none tabular-nums text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                          aria-label="Reps"
                        />
                        <button
                          onClick={() =>
                            updateSet(
                              currentExerciseIndex,
                              currentSetIndex,
                              'reps',
                              activeSet.reps + 1
                            )
                          }
                          className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all"
                          aria-label="Increase reps"
                        >
                          <span className="text-lg font-light">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Exercise Preview Strip */}
              {currentExerciseIndex < totalExercises - 1 && (
                <button
                  onClick={() => goToExercise(currentExerciseIndex + 1)}
                  className="mt-6 w-full px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-600 block">
                        Up Next
                      </span>
                      <p className="text-sm font-medium text-neutral-400 mt-1">
                        {session.exercises[currentExerciseIndex + 1]?.exerciseName}
                      </p>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {session.exercises[currentExerciseIndex + 1]?.sets?.length} sets
                        {session.exercises[currentExerciseIndex + 1]?.restSeconds
                          ? ` · ${session.exercises[currentExerciseIndex + 1]?.restSeconds}s rest`
                          : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-600 flex-none" />
                  </div>
                </button>
              )}

              {/* Session progress — last exercise completed */}
              {currentExerciseIndex === totalExercises - 1 &&
                currentExercise.status === 'completed' && (
                  <div className="mt-6 px-4 py-5 text-center">
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
            currentExercise &&
            currentSetIndex >= 0 &&
            currentSetIndex < currentExercise.sets.length - 1
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

      {/* ── Fixed Bottom: Log Set ── */}
      <div className="flex-none px-4 pb-4 pt-2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-30">
        {activeSet && !activeSet.completed ? (
          <button
            onClick={() => toggleSetComplete(currentExerciseIndex, currentSetIndex)}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            aria-label="Log this set"
          >
            <Check className="w-5 h-5" strokeWidth={3} />
            Log Set
          </button>
        ) : currentExercise?.status === 'completed' && currentExerciseIndex < totalExercises - 1 ? (
          <button
            onClick={() => goToExercise(currentExerciseIndex + 1)}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            aria-label="Next exercise"
          >
            Next Exercise <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleFinishClick}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={
              overallProgress >= 100
                ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.4)' }
                : undefined
            }
            aria-label="Finish workout"
          >
            {overallProgress >= 100 ? 'Finish Workout' : 'Finish'}
          </button>
        )}
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={() => setShowExerciseList(true)}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors py-1 flex items-center gap-1"
            aria-label="View all exercises"
          >
            <ListChecks className="w-3 h-3" />
            All Exercises
          </button>
          {overallProgress > 0 && overallProgress < 100 && (
            <>
              <span className="text-neutral-700">&middot;</span>
              <button
                onClick={handleFinishClick}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors py-1"
              >
                Finish Early
              </button>
            </>
          )}
        </div>
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

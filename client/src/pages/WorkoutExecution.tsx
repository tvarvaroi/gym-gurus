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
} from 'lucide-react';

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
      setTimeout(() => setLocationRaw('/workouts'), 3000);
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
    const durationMin = Math.round(elapsedSeconds / 60) || 1;
    const cals = estimateCalories(durationMin, allCompletedSets);

    return createPortal(
      <div className="fixed inset-0 z-[200] bg-[#0A0A0A] text-white overflow-y-auto">
        {/* CSS confetti */}
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          .confetti-piece {
            position: absolute;
            width: 8px;
            height: 8px;
            top: -10px;
            animation: confetti-fall linear forwards;
          }
          @keyframes gold-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes pulse-gold {
            0%, 100% { box-shadow: 0 0 20px rgba(201,168,85,0.3); }
            50% { box-shadow: 0 0 40px rgba(201,168,85,0.6); }
          }
        `}</style>

        {/* Confetti pieces */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece rounded-sm"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['#c9a855', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'][i % 5],
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
              width: `${6 + Math.random() * 6}px`,
              height: `${6 + Math.random() * 6}px`,
            }}
          />
        ))}

        <div className="relative z-10 max-w-lg mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="text-center pt-8"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', damping: 12 }}
              className="mb-6 inline-block"
            >
              <div
                className="w-20 h-20 rounded-full bg-[#c9a855]/20 flex items-center justify-center"
                style={{ animation: 'pulse-gold 2s ease-in-out infinite' }}
              >
                <Trophy className="w-10 h-10 text-[#c9a855]" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold mb-1">Workout Complete!</h1>
            <p className="text-neutral-400">{session.workoutTitle}</p>
          </motion.div>

          {/* Stats grid */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Timer className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
              <p className="text-xs text-neutral-500">Duration</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Dumbbell className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                <AnimatedNumber value={Math.round(totalVolume)} suffix=" kg" />
              </p>
              <p className="text-xs text-neutral-500">Volume</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Check className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {allCompletedSets}/{allTotalSets}
              </p>
              <p className="text-xs text-neutral-500">Sets</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                <AnimatedNumber value={cals} />
              </p>
              <p className="text-xs text-neutral-500">Est. kcal</p>
            </div>
          </motion.div>

          {/* Exercise breakdown */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-2"
          >
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
              Exercise Breakdown
            </h3>
            {session.exercises.map((ex, i) => {
              const completedSets = ex.sets.filter((s) => s.completed);
              if (completedSets.length === 0) return null;
              const weights = completedSets.map((s) => `${s.weight}${weightUnit}`);
              const reps = completedSets.map((s) => s.reps);
              const mainWeight = completedSets[0]?.weight || 0;
              return (
                <div key={i} className="bg-white/5 rounded-lg px-4 py-3 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{ex.exerciseName}</span>
                    <span className="text-xs text-neutral-500">
                      {completedSets.length}/{ex.sets.length} sets
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {mainWeight}
                    {weightUnit} x {reps.join(', ')}
                  </p>
                </div>
              );
            })}
          </motion.div>

          {/* Muscles worked */}
          {musclesWorked.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Muscles Worked
              </h3>
              <div className="flex flex-wrap gap-2">
                {musclesWorked.map((m) => (
                  <span
                    key={m}
                    className="px-3 py-1 bg-[#c9a855]/10 text-[#c9a855] rounded-full text-xs font-medium border border-[#c9a855]/20"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* XP earned */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
            className="text-center py-4"
          >
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#c9a855]/30"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(201,168,85,0.1), transparent)',
                backgroundSize: '200% 100%',
                animation: 'gold-shimmer 3s linear infinite',
              }}
            >
              <Star className="w-5 h-5 text-[#c9a855]" />
              <span className="text-[#c9a855] font-bold">
                {xpAwarded > 0 ? (
                  <>
                    +<AnimatedNumber value={xpAwarded} /> XP
                  </>
                ) : (
                  <>~{allCompletedSets * 5} XP</>
                )}
              </span>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-3 pb-8"
          >
            <button
              onClick={() => saveWorkoutMutation.mutate()}
              disabled={saveWorkoutMutation.isPending || saveWorkoutMutation.isSuccess}
              className="w-full h-14 rounded-xl bg-[#c9a855] hover:bg-[#b89745] text-black font-semibold text-base transition-colors disabled:opacity-50"
              aria-label="Save workout and exit"
            >
              {saveWorkoutMutation.isPending
                ? 'Saving...'
                : saveWorkoutMutation.isSuccess
                  ? 'Saved! Redirecting...'
                  : 'Save & Exit'}
            </button>
            {saveWorkoutMutation.isSuccess && (
              <p className="text-center text-sm text-neutral-500">Redirecting...</p>
            )}
          </motion.div>
        </div>
      </div>,
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
      <div className="flex-none h-14 flex items-center justify-between px-3 border-b border-white/5 bg-[#0A0A0A]/95 backdrop-blur-sm z-30">
        <button
          onClick={() => setShowExitDialog(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Exit workout"
        >
          <X className="w-5 h-5 text-neutral-400" />
        </button>
        <h1 className="text-sm font-semibold truncate max-w-[50%]">{session.workoutTitle}</h1>
        <span className="text-lg font-mono tabular-nums text-[#c9a855] min-w-[52px] text-right">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* ── Progress Bar ── */}
      <div className="flex-none px-4 pt-2 pb-1">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#c9a855] rounded-full"
            initial={false}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-neutral-500 mt-1.5">
          Exercise {currentExerciseIndex + 1} of {totalExercises}
          {currentExercise && currentSetIndex >= 0 && (
            <>
              {' '}
              &middot; Set {currentSetIndex + 1} of {currentExercise.sets.length}
            </>
          )}
        </p>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-20">
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
                <h2 className="text-xl font-bold leading-tight">{currentExercise.exerciseName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-500">
                    {currentExercise.muscleGroup
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="text-xs text-neutral-600">·</span>
                  <span className="text-xs text-neutral-600">
                    Rest: {currentExercise.restSeconds}s
                  </span>
                </div>
              </div>

              {/* Weight unit toggle */}
              <div className="flex items-center justify-end mb-3 gap-1">
                <button
                  onClick={() => setWeightUnit('kg')}
                  className={`px-3 py-1 rounded-l-md text-xs font-medium transition-colors ${
                    weightUnit === 'kg'
                      ? 'bg-[#c9a855] text-black'
                      : 'bg-white/5 text-neutral-500 hover:bg-white/10'
                  }`}
                  aria-label="Use kilograms"
                >
                  KG
                </button>
                <button
                  onClick={() => setWeightUnit('lbs')}
                  className={`px-3 py-1 rounded-r-md text-xs font-medium transition-colors ${
                    weightUnit === 'lbs'
                      ? 'bg-[#c9a855] text-black'
                      : 'bg-white/5 text-neutral-500 hover:bg-white/10'
                  }`}
                  aria-label="Use pounds"
                >
                  LBS
                </button>
              </div>

              {/* Set header row */}
              <div className="grid grid-cols-[32px_1fr_1fr_48px] gap-1.5 mb-1 px-1">
                <span className="text-[10px] text-neutral-600 uppercase">Set</span>
                <span className="text-[10px] text-neutral-600 uppercase text-center">
                  Weight ({weightUnit})
                </span>
                <span className="text-[10px] text-neutral-600 uppercase text-center">Reps</span>
                <span />
              </div>

              {/* Set rows */}
              <div className="space-y-2">
                {currentExercise.sets.map((set, sIdx) => {
                  const isActive = sIdx === currentSetIndex;
                  const step = getWeightStep(currentExercise.exerciseName, weightUnit);

                  const prevSets = previousPerformance?.exercises?.[currentExercise.exerciseName];
                  const prevSet = prevSets?.[sIdx] || prevSets?.[prevSets.length - 1];
                  const prevUnit = previousPerformance?.unit || 'kg';

                  return (
                    <motion.div
                      key={sIdx}
                      initial={false}
                      animate={{
                        opacity: set.completed ? 0.6 : 1,
                        scale: isActive ? 1 : 0.98,
                      }}
                      className={`grid grid-cols-[32px_1fr_1fr_48px] gap-1.5 items-center rounded-xl px-2 py-2 transition-colors ${
                        set.completed
                          ? 'bg-green-500/5 border border-green-500/20'
                          : isActive
                            ? 'bg-white/5 border border-[#c9a855]/30'
                            : 'bg-white/[0.02] border border-white/5'
                      }`}
                    >
                      {/* Set number */}
                      <span
                        className={`text-sm font-bold text-center ${
                          set.completed
                            ? 'text-green-500'
                            : isActive
                              ? 'text-[#c9a855]'
                              : 'text-neutral-600'
                        }`}
                      >
                        {set.setNumber}
                      </span>

                      {/* Weight input with steppers */}
                      <div className="flex flex-col items-center min-w-0">
                        <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0">
                          <button
                            onClick={() =>
                              updateSet(currentExerciseIndex, sIdx, 'weight', set.weight - step)
                            }
                            className="w-7 sm:w-8 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
                            aria-label={`Decrease weight by ${step} ${weightUnit}`}
                            disabled={set.completed}
                          >
                            <span className="text-base font-light">-</span>
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={set.weight || ''}
                            onChange={(e) =>
                              updateSet(
                                currentExerciseIndex,
                                sIdx,
                                'weight',
                                Number(e.target.value) || 0
                              )
                            }
                            disabled={set.completed}
                            className="w-11 sm:w-14 h-10 text-center text-base sm:text-lg font-bold bg-transparent border-b-2 border-white/10 focus:border-[#c9a855] outline-none tabular-nums text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                            aria-label={`Weight for set ${set.setNumber}`}
                          />
                          <button
                            onClick={() =>
                              updateSet(currentExerciseIndex, sIdx, 'weight', set.weight + step)
                            }
                            className="w-7 sm:w-8 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
                            aria-label={`Increase weight by ${step} ${weightUnit}`}
                            disabled={set.completed}
                          >
                            <span className="text-base font-light">+</span>
                          </button>
                        </div>
                        {prevSet && !set.completed && (
                          <span className="text-[10px] text-neutral-600 mt-0.5 tabular-nums">
                            Last: {prevSet.weight}
                            {prevUnit} &times; {prevSet.reps}
                          </span>
                        )}
                      </div>

                      {/* Reps input with steppers */}
                      <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0">
                        <button
                          onClick={() =>
                            updateSet(currentExerciseIndex, sIdx, 'reps', set.reps - 1)
                          }
                          className="w-7 sm:w-8 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
                          aria-label="Decrease reps by 1"
                          disabled={set.completed}
                        >
                          <span className="text-base font-light">-</span>
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps || ''}
                          onChange={(e) =>
                            updateSet(
                              currentExerciseIndex,
                              sIdx,
                              'reps',
                              Number(e.target.value) || 0
                            )
                          }
                          disabled={set.completed}
                          className="w-8 sm:w-10 h-10 text-center text-base sm:text-lg font-bold bg-transparent border-b-2 border-white/10 focus:border-[#c9a855] outline-none tabular-nums text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                          aria-label={`Reps for set ${set.setNumber}`}
                        />
                        <button
                          onClick={() =>
                            updateSet(currentExerciseIndex, sIdx, 'reps', set.reps + 1)
                          }
                          className="w-7 sm:w-8 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
                          aria-label="Increase reps by 1"
                          disabled={set.completed}
                        >
                          <span className="text-base font-light">+</span>
                        </button>
                      </div>

                      {/* Complete button */}
                      <button
                        onClick={() => toggleSetComplete(currentExerciseIndex, sIdx)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                          set.completed
                            ? 'bg-green-500 text-white'
                            : 'border-2 border-white/20 hover:border-[#c9a855]/50 text-transparent hover:text-[#c9a855]/50'
                        }`}
                        aria-label={
                          set.completed
                            ? `Undo set ${set.setNumber}`
                            : `Complete set ${set.setNumber}`
                        }
                      >
                        <Check className="w-5 h-5" strokeWidth={3} />
                      </button>
                    </motion.div>
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
                    className="mt-4 w-full h-12 rounded-xl bg-[#c9a855]/10 border border-[#c9a855]/30 text-[#c9a855] font-medium flex items-center justify-center gap-2"
                    aria-label="Go to next exercise"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}

              {/* Navigation dots */}
              <div className="flex items-center justify-center gap-1.5 mt-6 mb-4">
                {session.exercises.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => goToExercise(i)}
                    className={`rounded-full transition-all ${
                      i === currentExerciseIndex
                        ? 'w-6 h-2 bg-[#c9a855]'
                        : ex.status === 'completed'
                          ? 'w-2 h-2 bg-green-500'
                          : 'w-2 h-2 bg-white/20'
                    }`}
                    aria-label={`Go to exercise ${i + 1}: ${ex.exerciseName}`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Rest Timer Bar (floating) ── */}
      <AnimatePresence>
        {isRestVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-16 left-0 right-0 z-40 px-4"
          >
            <div
              className={`rounded-2xl p-4 backdrop-blur-xl border transition-colors ${
                restTimeLeft === 0
                  ? 'bg-green-500/20 border-green-500/30'
                  : 'bg-neutral-900/95 border-white/10'
              }`}
            >
              {/* Progress ring */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke={restTimeLeft === 0 ? '#22c55e' : '#c9a855'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 24}
                        strokeDashoffset={
                          2 *
                          Math.PI *
                          24 *
                          (1 - (restDuration > 0 ? restTimeLeft / restDuration : 0))
                        }
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <span
                      className={`absolute inset-0 flex items-center justify-center font-mono text-lg font-bold tabular-nums ${
                        restTimeLeft === 0 ? 'text-green-400' : 'text-white'
                      }`}
                    >
                      {restTimeLeft === 0 ? 'Go!' : formatTime(restTimeLeft)}
                    </span>
                  </div>
                  <span className="text-sm text-neutral-400">
                    {restTimeLeft === 0 ? 'Ready for next set' : 'Rest period'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addRestTime}
                    className="h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-neutral-300 transition-colors"
                    aria-label="Add 30 seconds to rest timer"
                  >
                    +30s
                  </button>
                  <button
                    onClick={skipRest}
                    className="h-10 px-4 rounded-lg bg-[#c9a855] text-black text-sm font-semibold hover:bg-[#b89745] transition-colors"
                    aria-label="Skip rest period"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticky Bottom Bar ── */}
      <div className="flex-none h-16 flex items-center justify-between px-4 border-t border-white/5 bg-[#0A0A0A]/95 backdrop-blur-sm z-30">
        <button
          onClick={() => setShowExerciseList(true)}
          className="h-11 px-4 flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-neutral-300 transition-colors"
          aria-label="View exercise list"
        >
          <ListChecks className="w-4 h-4" />
          Exercises
        </button>
        <button
          onClick={handleFinishClick}
          className={`h-11 px-6 rounded-xl font-semibold text-sm transition-all ${
            overallProgress >= 100
              ? 'bg-[#c9a855] text-black animate-pulse'
              : overallProgress >= 50
                ? 'bg-[#c9a855] text-black'
                : 'border border-white/20 text-neutral-400 hover:border-white/40'
          }`}
          aria-label="Finish workout"
        >
          {overallProgress >= 100 ? 'Finish Workout!' : 'Finish Workout'}
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
              <div className="overflow-y-auto p-2">
                {session.exercises.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => goToExercise(i)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                      i === currentExerciseIndex ? 'bg-[#c9a855]/10' : 'hover:bg-white/5'
                    }`}
                    aria-label={`Go to ${ex.exerciseName}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-none text-xs font-bold ${
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
                      <p
                        className={`text-sm font-medium truncate ${
                          ex.status === 'completed' ? 'text-neutral-500' : 'text-white'
                        }`}
                      >
                        {ex.exerciseName}
                      </p>
                      <p className="text-xs text-neutral-600">
                        {ex.sets.filter((s) => s.completed).length}/{ex.sets.length} sets
                      </p>
                    </div>
                    {i === currentExerciseIndex && (
                      <ChevronRight className="w-4 h-4 text-[#c9a855] flex-none" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}

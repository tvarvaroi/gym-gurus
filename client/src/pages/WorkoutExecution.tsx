import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Check,
  Plus,
  Minus,
  SkipForward,
  Trophy,
  Timer,
  Dumbbell,
  ChevronRight,
  Volume2,
  VolumeX,
  Target,
  TrendingUp,
  RotateCcw,
  Edit3,
  X,
  Zap
} from "lucide-react";
import { ProgressiveOverloadIndicator, PRIndicator } from "@/components/workout/ProgressiveOverloadIndicator";
import { WorkoutProgressOverview } from "@/components/workout/ExerciseProgressBar";

// Types
interface SetLog {
  setNumber: number;
  weight: number;
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
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

interface WorkoutSession {
  workoutId: string;
  workoutTitle: string;
  startedAt: Date;
  exercises: ExerciseSession[];
  currentExerciseIndex: number;
  totalDuration: number;
  status: 'active' | 'completed';
}

type WeightUnit = 'kg' | 'lbs';

// Conversion helpers
const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10;

export default function WorkoutExecution() {
  const params = useParams();
  const workoutId = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();

  // State
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [workoutStartTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lbs');
  const [newPR, setNewPR] = useState<{ type: 'weight' | 'reps' | 'volume'; value: number; previousBest: number } | null>(null);
  const [showProgressOverview, setShowProgressOverview] = useState(false);


  // Persist session state to sessionStorage for recovery on refresh
  const storageKey = `workout-session-${workoutId}`;

  useEffect(() => {
    if (!session || showCompletion) return;
    const hasProgress = session.exercises.some(ex => ex.sets.some(s => s.completed));
    if (!hasProgress) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ session, currentExerciseIndex }));
  }, [session, currentExerciseIndex, showCompletion, storageKey]);

  // Clear saved state on completion
  useEffect(() => {
    if (showCompletion) {
      sessionStorage.removeItem(storageKey);
    }
  }, [showCompletion, storageKey]);

  // Warn before closing/refreshing if workout is in progress
  useEffect(() => {
    const hasProgress = session?.exercises.some(ex =>
      ex.sets.some(s => s.completed)
    );
    if (!hasProgress || showCompletion) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session, showCompletion]);

  // Fetch workout assignment details
  const { data: workout, isLoading, error: workoutError } = useQuery({
    queryKey: [`/api/workout-assignments/${workoutId}`],
    queryFn: async () => {
      const response = await fetch(`/api/workout-assignments/${workoutId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch workout');
      return response.json();
    }
  });

  // Initialize session when workout loads — restore from sessionStorage if available
  useEffect(() => {
    if (workout && !session) {
      // Try to restore a saved session first
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const { session: savedSession, currentExerciseIndex: savedIndex } = JSON.parse(saved);
          if (savedSession?.workoutId === workoutId) {
            setSession(savedSession);
            setCurrentExerciseIndex(savedIndex || 0);
            return;
          }
        } catch {
          sessionStorage.removeItem(storageKey);
        }
      }

      const exercises: ExerciseSession[] = (workout.exercises || []).map((ex: any, index: number) => ({
        exerciseId: ex.exerciseId || ex.id || `exercise-${index}`,
        exerciseName: ex.name || 'Exercise',
        muscleGroup: ex.muscleGroup || 'General',
        targetSets: ex.sets || 3,
        targetReps: ex.reps || '10',
        sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
          setNumber: i + 1,
          weight: 0,
          reps: 0,
          completed: false
        })),
        status: index === 0 ? 'in_progress' : 'pending',
        notes: ex.notes
      }));

      setSession({
        workoutId,
        workoutTitle: workout.title || 'Workout',
        startedAt: workoutStartTime,
        exercises,
        currentExerciseIndex: 0,
        totalDuration: 0,
        status: 'active'
      });
    }
  }, [workout, session, workoutId, workoutStartTime]);

  // Rest timer countdown
  useEffect(() => {
    if (isResting && restTimeLeft > 0) {
      const timer = setInterval(() => {
        setRestTimeLeft(prev => {
          if (prev <= 1) {
            setIsResting(false);
            if (soundEnabled) {
              playSound();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isResting, restTimeLeft, soundEnabled]);

  // Navigation guard - prevent accidental data loss during active workout
  useEffect(() => {
    if (session && !showCompletion) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [session, showCompletion]);

  // Play sound notification
  const playSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Update set data
  const updateSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    if (!session) return;

    const newSession = { ...session };
    newSession.exercises[exerciseIndex].sets[setIndex][field] = value;
    setSession(newSession);
  };

  // Complete a set
  const completeSet = (exerciseIndex: number, setIndex: number) => {
    if (!session) return;

    const newSession = { ...session };
    const currentSet = newSession.exercises[exerciseIndex].sets[setIndex];

    if (!currentSet.weight || !currentSet.reps) {
      toast({
        title: "Missing Data",
        description: "Please enter weight and reps before completing the set",
        variant: "destructive"
      });
      return;
    }

    currentSet.completed = true;
    currentSet.completedAt = new Date();
    setSession(newSession);

    // Auto-fill next set with same values
    const nextSet = newSession.exercises[exerciseIndex].sets[setIndex + 1];
    if (nextSet && !nextSet.completed) {
      nextSet.weight = currentSet.weight;
      nextSet.reps = currentSet.reps;
    }

    // Check if exercise is complete
    const allSetsComplete = newSession.exercises[exerciseIndex].sets.every(s => s.completed);
    if (allSetsComplete) {
      newSession.exercises[exerciseIndex].status = 'completed';

      // Move to next exercise if available
      if (exerciseIndex < newSession.exercises.length - 1) {
        newSession.exercises[exerciseIndex + 1].status = 'in_progress';
        setCurrentExerciseIndex(exerciseIndex + 1);
        toast({
          title: "Exercise Complete! 💪",
          description: "Moving to next exercise..."
        });
      } else {
        // Workout complete!
        finishWorkout();
        return;
      }
    } else {
      // Start rest timer (90 seconds default)
      setRestTimeLeft(90);
      setIsResting(true);
    }

    setSession(newSession);
  };

  // Skip rest timer
  const skipRest = () => {
    setIsResting(false);
    setRestTimeLeft(0);
  };

  // Adjust rest timer
  const adjustRestTime = (seconds: number) => {
    setRestTimeLeft(prev => Math.max(0, prev + seconds));
  };

  // Finish workout
  const finishWorkout = () => {
    if (!session) return;

    const newSession = { ...session };
    newSession.status = 'completed';
    setSession(newSession);
    setShowCompletion(true);

    if (soundEnabled) {
      playSound();
    }
  };

  // Save workout mutation
  const saveWorkoutMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;

      return apiRequest('PUT', `/api/workout-assignments/${workoutId}/complete`, {
        notes: 'Workout completed via execution interface'
      });
    },
    onSuccess: () => {
      toast({
        title: "Workout Saved! 🎉",
        description: "Great job completing your workout!"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client/profile'] });
      setTimeout(() => {
        setLocation('/workouts');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save workout",
        variant: "destructive"
      });
    }
  });

  if (workoutError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F] p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-medium">Failed to load workout</h2>
          <p className="text-sm text-muted-foreground">{workoutError.message}</p>
          <Button variant="outline" onClick={() => setLocation('/workouts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workouts
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
            className="w-16 h-16 border-[3px] border-primary/20 border-t-primary rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground font-light">Loading workout...</p>
        </div>
      </div>
    );
  }

  const currentExercise = session.exercises[currentExerciseIndex];
  const currentSetIndex = currentExercise.sets.findIndex(s => !s.completed);
  const completedSets = currentExercise.sets.filter(s => s.completed).length;
  const totalSets = currentExercise.sets.length;
  const workoutProgress = ((session.exercises.filter(e => e.status === 'completed').length) / session.exercises.length) * 100;
  const workoutDuration = Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000 / 60);

  // Get current set for input
  const currentSet = currentSetIndex >= 0 ? currentExercise.sets[currentSetIndex] : null;

  return (
    <div className="h-full w-full relative overflow-hidden bg-gradient-to-br from-[#0A0A0A] via-[#111111] to-[#0A0A0A]">
      {/* Premium Glass Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Multi-layered glass panels with depth */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.03) 0%, transparent 50%, rgba(20, 184, 166, 0.03) 100%)',
          }}
        />

        {/* Animated light reflections - diagonal sweeps */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(125deg, transparent 0%, transparent 40%, rgba(255, 255, 255, 0.02) 50%, transparent 60%, transparent 100%)',
            backgroundSize: '300% 300%',
            animation: 'glass-shine-1 12s ease-in-out infinite',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(65deg, transparent 0%, transparent 35%, rgba(6, 182, 212, 0.04) 50%, transparent 65%, transparent 100%)',
            backgroundSize: '250% 250%',
            animation: 'glass-shine-2 15s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />

        {/* Subtle frosted glass effect with moving light */}
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: 'radial-gradient(circle at 30% 40%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)',
            animation: 'glass-glow-1 20s ease-in-out infinite',
          }}
        />

        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: 'radial-gradient(circle at 70% 60%, rgba(20, 184, 166, 0.05) 0%, transparent 50%)',
            animation: 'glass-glow-2 18s ease-in-out infinite',
            animationDelay: '5s',
          }}
        />

        {/* Horizontal light bands */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 100px, rgba(255, 255, 255, 0.01) 100px, rgba(255, 255, 255, 0.01) 102px)',
          }}
        />

        {/* Premium shimmer overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.025) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'premium-shimmer 10s linear infinite',
          }}
        />
      </div>

      {/* CSS Animations - Seamless Continuous Loops */}
      <style>{`
        @keyframes glass-shine-1 {
          0% {
            background-position: 0% 0%;
            opacity: 0.5;
          }
          25% {
            background-position: 50% 50%;
            opacity: 0.65;
          }
          50% {
            background-position: 100% 100%;
            opacity: 0.8;
          }
          75% {
            background-position: 50% 50%;
            opacity: 0.65;
          }
          100% {
            background-position: 0% 0%;
            opacity: 0.5;
          }
        }

        @keyframes glass-shine-2 {
          0% {
            background-position: 100% 0%;
            opacity: 0.6;
          }
          25% {
            background-position: 50% 50%;
            opacity: 0.75;
          }
          50% {
            background-position: 0% 100%;
            opacity: 0.9;
          }
          75% {
            background-position: 50% 50%;
            opacity: 0.75;
          }
          100% {
            background-position: 100% 0%;
            opacity: 0.6;
          }
        }

        @keyframes glass-glow-1 {
          0% {
            transform: translate(0%, 0%) scale(1);
            opacity: 0.4;
          }
          20% {
            transform: translate(12%, -5%) scale(1.05);
            opacity: 0.5;
          }
          40% {
            transform: translate(20%, -10%) scale(1.1);
            opacity: 0.6;
          }
          60% {
            transform: translate(5%, 5%) scale(1.02);
            opacity: 0.55;
          }
          80% {
            transform: translate(-10%, 15%) scale(0.95);
            opacity: 0.5;
          }
          100% {
            transform: translate(0%, 0%) scale(1);
            opacity: 0.4;
          }
        }

        @keyframes glass-glow-2 {
          0% {
            transform: translate(0%, 0%) scale(1);
            opacity: 0.3;
          }
          20% {
            transform: translate(-8%, 5%) scale(1.02);
            opacity: 0.4;
          }
          40% {
            transform: translate(-15%, 10%) scale(1.05);
            opacity: 0.5;
          }
          60% {
            transform: translate(0%, 0%) scale(0.98);
            opacity: 0.45;
          }
          80% {
            transform: translate(10%, -12%) scale(0.9);
            opacity: 0.4;
          }
          100% {
            transform: translate(0%, 0%) scale(1);
            opacity: 0.3;
          }
        }

        @keyframes premium-shimmer {
          0% {
            background-position: -100% 0%;
          }
          100% {
            background-position: 200% 0%;
          }
        }
      `}</style>

      {/* Completion Screen */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0F0F]/98 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 20 }}
              className="max-w-sm mx-4 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", damping: 15 }}
                className="mb-8"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-3xl opacity-40 animate-pulse" />
                  <Trophy className="w-24 h-24 text-yellow-500 relative" />
                </div>
              </motion.div>

              <h2 className="text-4xl font-extralight mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Workout Complete
              </h2>
              <p className="text-muted-foreground font-light mb-12">Outstanding effort today</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
                >
                  <Timer className="w-6 h-6 mb-3 text-[#0099FF] mx-auto" />
                  <p className="text-3xl font-extralight mb-1 tabular-nums">{workoutDuration}</p>
                  <p className="text-xs text-muted-foreground font-light">Minutes</p>
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10"
                >
                  <Dumbbell className="w-6 h-6 mb-3 text-[#00D4FF] mx-auto" />
                  <p className="text-3xl font-extralight mb-1 tabular-nums">
                    {session.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground font-light">Sets</p>
                </motion.div>
              </div>

              {/* Workout Progress Overview */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="w-full mb-6"
              >
                <WorkoutProgressOverview
                  exercises={session.exercises.map(ex => ({
                    name: ex.exerciseName,
                    completedSets: ex.sets.filter(s => s.completed).length,
                    totalSets: ex.sets.length,
                    status: ex.status === 'completed' ? 'completed' : ex.status === 'in_progress' ? 'active' : 'pending' as const,
                  }))}
                  currentExerciseIndex={session.exercises.findIndex(ex => ex.status === 'in_progress')}
                />
              </motion.div>

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => saveWorkoutMutation.mutate()}
                disabled={saveWorkoutMutation.isPending}
                className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#0099FF] to-[#00D4FF] hover:from-[#0088EE] hover:to-[#00C3EE] font-light text-base transition-all disabled:opacity-50"
              >
                {saveWorkoutMutation.isPending ? 'Saving...' : 'Finish & Save Workout'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest Timer - Circular Minimalist */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={skipRest}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="text-center"
            >
              {/* Circular Timer */}
              <div className="relative w-64 h-64 mb-8">
                <svg className="w-64 h-64 transform -rotate-90">
                  <circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="128"
                    cy="128"
                    r="120"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 120}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - restTimeLeft / 90) }}
                    transition={{ duration: 0.5 }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0099FF" />
                      <stop offset="100%" stopColor="#00D4FF" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Timer Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.div
                    key={restTimeLeft}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-7xl font-extralight tabular-nums tracking-tight"
                  >
                    {Math.floor(restTimeLeft / 60)}:{String(restTimeLeft % 60).padStart(2, '0')}
                  </motion.div>
                  <div className="text-sm font-light text-muted-foreground mt-2">Rest Period</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => adjustRestTime(-15)}
                  disabled={restTimeLeft <= 15}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center disabled:opacity-30 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={skipRest}
                  className="px-8 h-12 rounded-full bg-gradient-to-r from-[#0099FF] to-[#00D4FF] hover:from-[#0088EE] hover:to-[#00C3EE] font-light transition-all"
                >
                  Skip Rest
                </button>
                <button
                  onClick={() => adjustRestTime(15)}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-muted-foreground font-light">
                Next: Set {currentSetIndex + 2} · {currentExercise.exerciseName}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workout Interface - Premium Split Screen */}
      <div className="relative h-full flex flex-col lg:flex-row">
        {/* Corner Accents for Main Container - Top */}
        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none z-20">
          <div className="absolute top-0 left-0 w-20 h-[2px] bg-gradient-to-r from-cyan-500 via-cyan-500/50 to-transparent" />
          <div className="absolute top-0 left-0 w-[2px] h-20 bg-gradient-to-b from-cyan-500 via-cyan-500/50 to-transparent" />
          <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-cyan-500/60 blur-md animate-pulse" />
        </div>
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none z-20">
          <div className="absolute top-0 right-0 w-20 h-[2px] bg-gradient-to-l from-teal-500 via-teal-500/50 to-transparent" />
          <div className="absolute top-0 right-0 w-[2px] h-20 bg-gradient-to-b from-teal-500 via-teal-500/50 to-transparent" />
          <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-teal-500/60 blur-md animate-pulse" />
        </div>

        {/* Corner Accents for Main Container - Bottom */}
        <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none z-20">
          <div className="absolute bottom-0 left-0 w-20 h-[2px] bg-gradient-to-r from-cyan-500 via-cyan-500/50 to-transparent" />
          <div className="absolute bottom-0 left-0 w-[2px] h-20 bg-gradient-to-t from-cyan-500 via-cyan-500/50 to-transparent" />
          <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-cyan-500/60 blur-md animate-pulse" />
        </div>
        <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none z-20">
          <div className="absolute bottom-0 right-0 w-20 h-[2px] bg-gradient-to-l from-teal-500 via-teal-500/50 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[2px] h-20 bg-gradient-to-t from-teal-500 via-teal-500/50 to-transparent" />
          <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-teal-500/60 blur-md animate-pulse" />
        </div>

        {/* LEFT SIDEBAR - Exercise Info & Stats */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="w-full lg:w-[300px] flex-shrink-0 p-4 lg:p-5 space-y-4 overflow-y-auto"
        >
          {/* Header with Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <motion.button
                onClick={() => setLocation('/workouts')}
                whileHover={{ scale: 1.05, x: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 transition-all backdrop-blur-xl"
              >
                <ArrowLeft className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-light">Exit</span>
              </motion.button>

              <motion.button
                onClick={() => setSoundEnabled(!soundEnabled)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-xl"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-cyan-400" />}
              </motion.button>
            </div>

            {/* Workout Stats Card */}
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-light text-muted-foreground uppercase tracking-wider">Duration</span>
                  </div>
                  <span className="text-2xl font-extralight tabular-nums">{workoutDuration}<span className="text-sm text-muted-foreground">m</span></span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="uppercase tracking-wide">Workout Progress</span>
                    <span className="tabular-nums font-medium">{Math.round(workoutProgress)}%</span>
                  </div>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${workoutProgress}%` }}
                      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise Card - Dramatic */}
          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative group"
          >
            {/* Dramatic outer glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-teal-500/30 to-cyan-500/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />

            {/* Card content */}
            <div className="relative">
              {/* Triple border effect */}
              <div className="p-[2px] rounded-2xl bg-gradient-to-br from-cyan-500/50 via-teal-500/30 to-cyan-500/50">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[#0F0F0F] to-teal-950/40 backdrop-blur-xl border border-cyan-500/20">

                  {/* Exercise badges */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge className="px-2.5 py-0.5 bg-cyan-500/20 border-cyan-400/40 text-cyan-300 backdrop-blur-sm text-xs">
                      <span className="tracking-wide">{currentExerciseIndex + 1}/{session.exercises.length}</span>
                    </Badge>
                    <Badge className="px-2.5 py-0.5 capitalize bg-gradient-to-r from-teal-600 to-emerald-600 border-0 text-xs">
                      <span className="tracking-wide">{currentExercise.muscleGroup}</span>
                    </Badge>
                  </div>

                  {/* Exercise name with dramatic typography */}
                  <h2 className="text-2xl lg:text-3xl font-extralight text-center mb-4 tracking-tight leading-tight" style={{ letterSpacing: '0.02em' }}>
                    {currentExercise.exerciseName}
                  </h2>

                  {/* Set info with icons */}
                  <div className="flex items-center justify-center gap-5 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Target className="w-5 h-5 text-cyan-400" />
                      <span className="text-lg font-light tabular-nums">{totalSets}</span>
                      <span className="text-xs uppercase tracking-wider">Sets</span>
                    </div>
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-400" />
                      <span className="text-lg font-light tabular-nums">{currentExercise.targetReps}</span>
                      <span className="text-xs uppercase tracking-wider">Reps</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Progressive Overload Indicator */}
          <ProgressiveOverloadIndicator
            exerciseName={currentExercise.exerciseName}
            currentWeight={currentSet?.weight || 0}
            currentReps={currentSet?.reps || 0}
            targetReps={parseInt(currentExercise.targetReps) || 10}
            history={currentExercise.sets
              .filter(s => s.completed)
              .map(s => ({
                date: s.completedAt?.toISOString() || new Date().toISOString(),
                weight: s.weight,
                reps: s.reps,
              }))}
            showRecommendation={completedSets >= 2}
          />

          {/* PR Notification */}
          <AnimatePresence>
            {newPR && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
              >
                <PRIndicator
                  type={newPR.type}
                  value={newPR.value}
                  previousBest={newPR.previousBest}
                  unit={weightUnit}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completed Sets - Compact */}
          {completedSets > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-3.5 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-light text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Completed Sets
                  </h3>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    {completedSets}/{totalSets}
                  </Badge>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {currentExercise.sets
                    .filter(set => set.completed)
                    .map((set) => (
                      <motion.div
                        key={set.setNumber}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-light">Set {set.setNumber}</span>
                        </div>
                        <span className="text-sm tabular-nums text-muted-foreground font-light">
                          {weightUnit === 'kg' ? lbsToKg(set.weight) : set.weight}{weightUnit} × {set.reps}
                        </span>
                      </motion.div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          {session.exercises.length > 1 && (
            <div className="flex gap-3">
              {currentExerciseIndex > 0 && (
                <motion.button
                  onClick={() => setCurrentExerciseIndex(currentExerciseIndex - 1)}
                  whileHover={{ scale: 1.02, x: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 flex items-center justify-center gap-2 text-sm font-light transition-all backdrop-blur-xl"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-400" />
                  Previous
                </motion.button>
              )}
              {currentExerciseIndex < session.exercises.length - 1 && (
                <motion.button
                  onClick={() => setCurrentExerciseIndex(currentExerciseIndex + 1)}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 flex items-center justify-center gap-2 text-sm font-light transition-all backdrop-blur-xl"
                >
                  Next
                  <ChevronRight className="w-4 h-4 text-cyan-400" />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>

        {/* RIGHT MAIN AREA - Set Input (HERO SECTION) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 flex flex-col justify-center items-center px-4 lg:px-8 py-8 lg:py-12"
        >
          {currentSet ? (
            <div className="w-full max-w-4xl flex flex-col">
              {/* Set Header - Centered Above Cards */}
              <div className="text-center space-y-3 mb-8 lg:mb-10">
                <div className="text-sm font-light text-muted-foreground uppercase tracking-[0.3em]">
                  Set {currentSet.setNumber} of {totalSets}
                </div>

                {/* ACTIVE badge with dramatic glow */}
                <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-lg"></span>
                  </span>
                  <span className="text-sm font-semibold text-white uppercase tracking-wider relative">Active</span>
                </div>

                {/* Unit Toggle - Premium */}
                <div className="flex justify-center pt-2">
                  <div className="inline-flex rounded-xl p-1.5 bg-white/5 border border-white/10 backdrop-blur-xl">
                    <motion.button
                      onClick={() => setWeightUnit('kg')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden ${
                        weightUnit === 'kg'
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-2xl shadow-cyan-500/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {weightUnit === 'kg' && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
                        />
                      )}
                      <span className="relative">KG</span>
                    </motion.button>
                    <motion.button
                      onClick={() => setWeightUnit('lbs')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden ${
                        weightUnit === 'lbs'
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-2xl shadow-cyan-500/50'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      {weightUnit === 'lbs' && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
                        />
                      )}
                      <span className="relative">LBS</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Optimized Floating Orbs - CSS animations */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  className="absolute w-64 h-64 rounded-full opacity-40"
                  style={{
                    top: '20%',
                    left: '10%',
                    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15), transparent 70%)',
                    animation: 'float-orb-1 10s ease-in-out infinite',
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                  }}
                />
                <div
                  className="absolute w-48 h-48 rounded-full opacity-30"
                  style={{
                    bottom: '20%',
                    right: '15%',
                    background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15), transparent 70%)',
                    animation: 'float-orb-2 12s ease-in-out infinite',
                    willChange: 'transform',
                    transform: 'translateZ(0)',
                  }}
                />
              </div>

              <style>{`
                @keyframes float-orb-1 {
                  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                  50% { transform: translate3d(100px, -80px, 0) scale(1.2); }
                }
                @keyframes float-orb-2 {
                  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                  50% { transform: translate3d(-80px, 100px, 0) scale(1.3); }
                }
              `}</style>

              {/* Two Card Layout - Equal Heights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 lg:mb-10">
                {/* WEIGHT CARD */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="relative group"
                >
                  {/* Dramatic outer glow */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 to-cyan-500/30 rounded-[1.5rem] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

                  {/* Card */}
                  <div className="relative p-[3px] rounded-[1.5rem] bg-gradient-to-br from-cyan-400/60 via-cyan-400/40 to-cyan-400/60">
                    <div className="p-[2px] rounded-[1.5rem] bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A]">
                      <div className="h-full p-6 lg:p-8 rounded-[1.5rem] bg-gradient-to-br from-cyan-950/30 via-[#0F0F0F]/90 to-cyan-950/20 backdrop-blur-2xl border border-cyan-500/20 relative overflow-hidden">

                        {/* Optimized Shimmer - CSS only */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            background: 'linear-gradient(120deg, transparent 30%, rgba(6, 182, 212, 0.15) 50%, transparent 70%)',
                            backgroundSize: '200% 100%',
                            animation: 'card-shimmer 8s linear infinite',
                            willChange: 'background-position',
                          }}
                        />

                        {/* Optimized particles - CSS only */}
                        <div
                          className="absolute top-4 right-4 w-2 h-2 rounded-full bg-cyan-400/40"
                          style={{
                            animation: 'particle-float-1 3s ease-in-out infinite',
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                          }}
                        />
                        <div
                          className="absolute bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-cyan-400/30"
                          style={{
                            animation: 'particle-float-2 4s ease-in-out infinite 0.5s',
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                          }}
                        />

                        <style>{`
                          @keyframes card-shimmer {
                            0% { background-position: 0% 0%; }
                            100% { background-position: 200% 0%; }
                          }
                          @keyframes particle-float-1 {
                            0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.4; }
                            50% { transform: translate3d(0, -20px, 0); opacity: 0.8; }
                          }
                          @keyframes particle-float-2 {
                            0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.3; }
                            50% { transform: translate3d(0, 15px, 0); opacity: 0.7; }
                          }
                        `}</style>

                        <div className="relative space-y-4 flex flex-col min-h-[160px]">
                          <motion.label
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="block text-xs font-light text-cyan-300 uppercase tracking-[0.2em] text-center"
                          >
                            Weight ({weightUnit})
                          </motion.label>

                          <div className="flex items-center gap-3 flex-1">
                            <motion.button
                              onClick={() => updateSet(currentExerciseIndex, currentSetIndex, 'weight', Math.max(0, currentSet.weight - (weightUnit === 'kg' ? 2.5 : 5)))}
                              whileHover={{ scale: 1.15, rotate: -5 }}
                              whileTap={{ scale: 0.85 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-900/60 to-cyan-950/60 hover:from-cyan-800/80 hover:to-cyan-900/80 border-2 border-cyan-400/40 hover:border-cyan-300/60 flex items-center justify-center transition-colors shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40"
                            >
                              <Minus className="w-5 h-5 text-cyan-300" />
                            </motion.button>

                            <div className="flex-1 relative group/input">
                              <motion.input
                                type="number"
                                value={weightUnit === 'kg' && currentSet.weight > 0 ? lbsToKg(currentSet.weight) : currentSet.weight || ''}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  updateSet(currentExerciseIndex, currentSetIndex, 'weight', weightUnit === 'kg' ? kgToLbs(value) : value);
                                }}
                                whileFocus={{ scale: 1.05 }}
                                className="w-full h-20 text-center text-5xl lg:text-6xl font-extralight bg-transparent border-b-4 border-cyan-400/40 focus:border-cyan-300 hover:border-cyan-400/60 outline-none tabular-nums text-white transition-all"
                                placeholder="0"
                                style={{ letterSpacing: '0.05em' }}
                              />
                              <motion.div
                                className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent blur-sm"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                              />
                            </div>

                            <motion.button
                              onClick={() => updateSet(currentExerciseIndex, currentSetIndex, 'weight', currentSet.weight + (weightUnit === 'kg' ? 2.5 : 5))}
                              whileHover={{ scale: 1.15, rotate: 5 }}
                              whileTap={{ scale: 0.85 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-900/60 to-cyan-950/60 hover:from-cyan-800/80 hover:to-cyan-900/80 border-2 border-cyan-400/40 hover:border-cyan-300/60 flex items-center justify-center transition-colors shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/40"
                            >
                              <Plus className="w-5 h-5 text-cyan-300" />
                            </motion.button>
                          </div>

                          {/* Previous Weight Indicator */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-center"
                          >
                            {currentSetIndex > 0 ? (
                              <div className="text-xs text-cyan-400/60 font-light">
                                Previous: {weightUnit === 'kg' ? lbsToKg(currentExercise.sets[currentSetIndex - 1].weight) : currentExercise.sets[currentSetIndex - 1].weight}{weightUnit}
                              </div>
                            ) : (
                              <div className="text-xs text-cyan-400/40 font-light">First set - go strong!</div>
                            )}
                          </motion.div>
                        </div>

                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* REPS CARD */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="relative group"
                >
                  {/* Dramatic outer glow */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/30 to-teal-500/30 rounded-[1.5rem] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

                  {/* Card */}
                  <div className="relative p-[3px] rounded-[1.5rem] bg-gradient-to-br from-teal-400/60 via-teal-400/40 to-teal-400/60">
                    <div className="p-[2px] rounded-[1.5rem] bg-gradient-to-br from-[#0A0A0A] via-[#0F0F0F] to-[#0A0A0A]">
                      <div className="h-full p-6 lg:p-8 rounded-[1.5rem] bg-gradient-to-br from-teal-950/30 via-[#0F0F0F]/90 to-teal-950/20 backdrop-blur-2xl border border-teal-500/20 relative overflow-hidden">

                        {/* Optimized Shimmer - CSS only */}
                        <div
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            background: 'linear-gradient(120deg, transparent 30%, rgba(20, 184, 166, 0.15) 50%, transparent 70%)',
                            backgroundSize: '200% 100%',
                            animation: 'card-shimmer-teal 8s linear infinite',
                            willChange: 'background-position',
                          }}
                        />

                        {/* Optimized particles - CSS only */}
                        <div
                          className="absolute top-4 left-4 w-2 h-2 rounded-full bg-teal-400/40"
                          style={{
                            animation: 'particle-float-3 3.5s ease-in-out infinite',
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                          }}
                        />
                        <div
                          className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-teal-400/30"
                          style={{
                            animation: 'particle-float-4 4.5s ease-in-out infinite 0.8s',
                            willChange: 'transform, opacity',
                            transform: 'translateZ(0)',
                          }}
                        />

                        <style>{`
                          @keyframes card-shimmer-teal {
                            0% { background-position: 0% 0%; }
                            100% { background-position: 200% 0%; }
                          }
                          @keyframes particle-float-3 {
                            0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.4; }
                            50% { transform: translate3d(0, -15px, 0); opacity: 0.8; }
                          }
                          @keyframes particle-float-4 {
                            0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.3; }
                            50% { transform: translate3d(0, 20px, 0); opacity: 0.7; }
                          }
                        `}</style>

                        <div className="relative space-y-4 flex flex-col min-h-[160px]">
                          <motion.label
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="block text-xs font-light text-teal-300 uppercase tracking-[0.2em] text-center"
                          >
                            Reps
                          </motion.label>

                          <div className="flex items-center gap-3 flex-1">
                            <motion.button
                              onClick={() => updateSet(currentExerciseIndex, currentSetIndex, 'reps', Math.max(0, currentSet.reps - 1))}
                              whileHover={{ scale: 1.15, rotate: -5 }}
                              whileTap={{ scale: 0.85 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-teal-900/60 to-teal-950/60 hover:from-teal-800/80 hover:to-teal-900/80 border-2 border-teal-400/40 hover:border-teal-300/60 flex items-center justify-center transition-colors shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/40"
                            >
                              <Minus className="w-5 h-5 text-teal-300" />
                            </motion.button>

                            <div className="flex-1 relative group/input">
                              <motion.input
                                type="number"
                                value={currentSet.reps || ''}
                                onChange={(e) => updateSet(currentExerciseIndex, currentSetIndex, 'reps', Number(e.target.value))}
                                whileFocus={{ scale: 1.05 }}
                                className="w-full h-20 text-center text-5xl lg:text-6xl font-extralight bg-transparent border-b-4 border-teal-400/40 focus:border-teal-300 hover:border-teal-400/60 outline-none tabular-nums text-white transition-all"
                                placeholder="0"
                                style={{ letterSpacing: '0.05em' }}
                              />
                              <motion.div
                                className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-teal-400/50 to-transparent blur-sm"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                              />
                            </div>

                            <motion.button
                              onClick={() => updateSet(currentExerciseIndex, currentSetIndex, 'reps', currentSet.reps + 1)}
                              whileHover={{ scale: 1.15, rotate: 5 }}
                              whileTap={{ scale: 0.85 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-teal-900/60 to-teal-950/60 hover:from-teal-800/80 hover:to-teal-900/80 border-2 border-teal-400/40 hover:border-teal-300/60 flex items-center justify-center transition-colors shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/40"
                            >
                              <Plus className="w-5 h-5 text-teal-300" />
                            </motion.button>
                          </div>

                          {/* Target Reps Indicator */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-center text-xs text-teal-400/60 font-light"
                          >
                            Target: {currentExercise.targetReps} reps
                          </motion.div>
                        </div>

                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Additional Info Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Rest Timer Suggestion */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 backdrop-blur-xl relative overflow-hidden group"
                  style={{ willChange: 'transform' }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 pointer-events-none"
                    style={{
                      animation: 'info-sweep 3s linear infinite',
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-light text-muted-foreground uppercase tracking-wider">Rest</span>
                    </div>
                    <div className="text-2xl font-extralight tabular-nums text-cyan-300">60<span className="text-sm text-muted-foreground">s</span></div>
                  </div>
                </motion.div>

                {/* Set Progress */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.7 } }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/20 backdrop-blur-xl relative overflow-hidden group"
                  style={{ willChange: 'transform' }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 pointer-events-none"
                    style={{
                      animation: 'info-sweep 3s linear infinite 0.5s',
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-light text-muted-foreground uppercase tracking-wider">Progress</span>
                    </div>
                    <div className="text-2xl font-extralight tabular-nums text-teal-300">{completedSets}<span className="text-sm text-muted-foreground">/{totalSets}</span></div>
                  </div>
                </motion.div>

                {/* Volume (Weight × Reps) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden group"
                  style={{ willChange: 'transform' }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 pointer-events-none"
                    style={{
                      animation: 'info-sweep 3s linear infinite 1s',
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-light text-muted-foreground uppercase tracking-wider">Volume</span>
                    </div>
                    <div className="text-2xl font-extralight tabular-nums text-emerald-300">
                      {((currentSet.weight || 0) * (currentSet.reps || 0)).toLocaleString()}<span className="text-sm text-muted-foreground">{weightUnit}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Estimated 1RM */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 backdrop-blur-xl relative overflow-hidden group"
                  style={{ willChange: 'transform' }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 pointer-events-none"
                    style={{
                      animation: 'info-sweep 3s linear infinite 1.5s',
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-light text-muted-foreground uppercase tracking-wider">Est. 1RM</span>
                    </div>
                    <div className="text-2xl font-extralight tabular-nums text-amber-300">
                      {currentSet.reps && currentSet.reps > 0 && currentSet.weight > 0
                        ? Math.round((currentSet.weight * (1 + currentSet.reps / 30))).toLocaleString()
                        : '0'
                      }<span className="text-sm text-muted-foreground">{weightUnit}</span>
                    </div>
                  </div>
                </motion.div>

                <style>{`
                  @keyframes info-sweep {
                    0% { transform: translate3d(-100%, 0, 0); }
                    100% { transform: translate3d(100%, 0, 0); }
                  }
                `}</style>
              </div>

              {/* Complete Button - MASSIVE CTA */}
              <motion.button
                onClick={() => completeSet(currentExerciseIndex, currentSetIndex)}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full h-16 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-cyan-500 hover:from-cyan-400 hover:via-teal-400 hover:to-cyan-400 font-semibold text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-2xl shadow-cyan-500/40 hover:shadow-3xl hover:shadow-cyan-500/60 relative overflow-hidden group"
                style={{ backgroundSize: '200% 100%' }}
                animate={{
                  backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
                }}
                transition={{
                  duration: 3,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: "linear",
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: "linear" }}
                />
                <Check className="w-5 h-5 relative" />
                <span className="relative">Complete Set</span>
              </motion.button>
            </div>
          ) : (
            /* Exercise Complete State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              >
                <Trophy className="w-32 h-32 mx-auto mb-8 text-yellow-500" />
              </motion.div>
              <h3 className="text-4xl font-extralight text-cyan-300 mb-4" style={{ letterSpacing: '0.05em' }}>Exercise Complete</h3>
              <p className="text-lg text-muted-foreground font-light">All sets finished for this exercise</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

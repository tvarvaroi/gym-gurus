import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  instructions?: string;
  sets: number;
  reps: string;
  weight?: number;
  restTime?: number;
  sortOrder: number;
}

export interface SetLog {
  id: string;
  setNumber: number;
  targetReps: number;
  actualReps: number | null;
  targetWeight: number | null;
  actualWeight: number | null;
  rpe: number | null; // Rate of Perceived Exertion (1-10)
  notes: string | null;
  completedAt: string | null;
  skipped: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  completed: boolean;
  skipped: boolean;
  notes: string | null;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  workoutId: string;
  assignmentId: string | null;
  startedAt: string;
  completedAt: string | null;
  totalDuration: number | null; // in seconds
  exercises: ExerciseLog[];
  notes: string | null;
  rating: number | null; // 1-5
  perceivedExertion: number | null; // RPE 1-10
}

export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

// Session state stored in localStorage for persistence
interface SessionState {
  session: WorkoutSession | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  status: SessionStatus;
  elapsedTime: number; // in seconds
  restStartTime: number | null;
}

const STORAGE_KEY = 'workout_session_state';

// Load session from localStorage
function loadSessionState(): SessionState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load session state:', e);
  }
  return null;
}

// Save session to localStorage
function saveSessionState(state: SessionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save session state:', e);
  }
}

// Clear session from localStorage
function clearSessionState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session state:', e);
  }
}

// API functions
async function startWorkoutSession(
  userId: string,
  workoutId: string,
  assignmentId?: string
): Promise<WorkoutSession> {
  const response = await fetch('/api/workout-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, workoutId, assignmentId }),
  });
  if (!response.ok) throw new Error('Failed to start workout session');
  return response.json();
}

async function completeWorkoutSession(
  sessionId: string,
  data: {
    exercises: ExerciseLog[];
    totalDuration: number;
    notes?: string;
    rating?: number;
    perceivedExertion?: number;
  }
): Promise<WorkoutSession> {
  const response = await fetch(`/api/workout-sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to complete workout session');
  return response.json();
}

async function saveSetLog(
  sessionId: string,
  exerciseId: string,
  setLog: SetLog
): Promise<SetLog> {
  const response = await fetch(`/api/workout-sessions/${sessionId}/sets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciseId, ...setLog }),
  });
  if (!response.ok) throw new Error('Failed to save set');
  return response.json();
}

// Main hook
export function useWorkoutSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  // Initialize state from localStorage or defaults
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    const saved = loadSessionState();
    return saved || {
      session: null,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      status: 'idle',
      elapsedTime: 0,
      restStartTime: null,
    };
  });

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (sessionState.status === 'active') {
      interval = setInterval(() => {
        setSessionState((prev) => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1,
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState.status]);

  // Persist state changes
  useEffect(() => {
    if (sessionState.session) {
      saveSessionState(sessionState);
    }
  }, [sessionState]);

  // Current exercise and set
  const currentExercise = useMemo(() => {
    if (!sessionState.session) return null;
    return sessionState.session.exercises[sessionState.currentExerciseIndex] || null;
  }, [sessionState.session, sessionState.currentExerciseIndex]);

  const currentSet = useMemo(() => {
    if (!currentExercise) return null;
    return currentExercise.sets[sessionState.currentSetIndex] || null;
  }, [currentExercise, sessionState.currentSetIndex]);

  // Progress calculation
  const progress = useMemo(() => {
    if (!sessionState.session) return { exercise: 0, overall: 0 };

    const exercises = sessionState.session.exercises;
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const completedSets = exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completedAt || s.skipped).length,
      0
    );

    const currentExSets = currentExercise?.sets || [];
    const currentExCompleted = currentExSets.filter((s) => s.completedAt || s.skipped).length;

    return {
      exercise: currentExSets.length > 0 ? (currentExCompleted / currentExSets.length) * 100 : 0,
      overall: totalSets > 0 ? (completedSets / totalSets) * 100 : 0,
    };
  }, [sessionState.session, currentExercise]);

  // Start mutation
  const startMutation = useMutation({
    mutationFn: ({
      workoutId,
      assignmentId,
      exercises,
    }: {
      workoutId: string;
      assignmentId?: string;
      exercises: WorkoutExercise[];
    }) => {
      // Create local session immediately (API call optional for offline support)
      const session: WorkoutSession = {
        id: `local-${Date.now()}`,
        userId: userId!,
        workoutId,
        assignmentId: assignmentId || null,
        startedAt: new Date().toISOString(),
        completedAt: null,
        totalDuration: null,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          completed: false,
          skipped: false,
          notes: null,
          sets: Array.from({ length: ex.sets }, (_, i) => {
            // Parse reps - could be "8-12" or "10"
            const repParts = ex.reps.split('-');
            const targetReps = parseInt(repParts[0]) || 10;

            return {
              id: `set-${ex.exerciseId}-${i}`,
              setNumber: i + 1,
              targetReps,
              actualReps: null,
              targetWeight: ex.weight || null,
              actualWeight: null,
              rpe: null,
              notes: null,
              completedAt: null,
              skipped: false,
            };
          }),
        })),
        notes: null,
        rating: null,
        perceivedExertion: null,
      };

      return Promise.resolve(session);
    },
    onSuccess: (session) => {
      setSessionState({
        session,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        status: 'active',
        elapsedTime: 0,
        restStartTime: null,
      });
    },
  });

  // Complete set
  const completeSet = useCallback(
    (actualReps: number, actualWeight?: number, rpe?: number, notes?: string) => {
      if (!currentExercise || !currentSet) return;

      setSessionState((prev) => {
        const exercises = [...prev.session!.exercises];
        const sets = [...exercises[prev.currentExerciseIndex].sets];

        sets[prev.currentSetIndex] = {
          ...sets[prev.currentSetIndex],
          actualReps,
          actualWeight: actualWeight ?? sets[prev.currentSetIndex].targetWeight,
          rpe: rpe ?? null,
          notes: notes ?? null,
          completedAt: new Date().toISOString(),
        };

        exercises[prev.currentExerciseIndex] = {
          ...exercises[prev.currentExerciseIndex],
          sets,
        };

        // Move to next set or exercise
        let nextExerciseIndex = prev.currentExerciseIndex;
        let nextSetIndex = prev.currentSetIndex + 1;

        if (nextSetIndex >= sets.length) {
          // Mark exercise as completed
          exercises[prev.currentExerciseIndex].completed = true;

          // Move to next exercise
          nextExerciseIndex++;
          nextSetIndex = 0;
        }

        return {
          ...prev,
          session: {
            ...prev.session!,
            exercises,
          },
          currentExerciseIndex: nextExerciseIndex,
          currentSetIndex: nextSetIndex,
          restStartTime: Date.now(), // Start rest timer
        };
      });
    },
    [currentExercise, currentSet]
  );

  // Skip set
  const skipSet = useCallback(() => {
    if (!currentExercise || !currentSet) return;

    setSessionState((prev) => {
      const exercises = [...prev.session!.exercises];
      const sets = [...exercises[prev.currentExerciseIndex].sets];

      sets[prev.currentSetIndex] = {
        ...sets[prev.currentSetIndex],
        skipped: true,
      };

      exercises[prev.currentExerciseIndex] = {
        ...exercises[prev.currentExerciseIndex],
        sets,
      };

      // Move to next set or exercise
      let nextExerciseIndex = prev.currentExerciseIndex;
      let nextSetIndex = prev.currentSetIndex + 1;

      if (nextSetIndex >= sets.length) {
        nextExerciseIndex++;
        nextSetIndex = 0;
      }

      return {
        ...prev,
        session: {
          ...prev.session!,
          exercises,
        },
        currentExerciseIndex: nextExerciseIndex,
        currentSetIndex: nextSetIndex,
      };
    });
  }, [currentExercise, currentSet]);

  // Skip exercise
  const skipExercise = useCallback(() => {
    setSessionState((prev) => {
      const exercises = [...prev.session!.exercises];
      exercises[prev.currentExerciseIndex] = {
        ...exercises[prev.currentExerciseIndex],
        skipped: true,
      };

      return {
        ...prev,
        session: {
          ...prev.session!,
          exercises,
        },
        currentExerciseIndex: prev.currentExerciseIndex + 1,
        currentSetIndex: 0,
      };
    });
  }, []);

  // Pause/resume
  const pause = useCallback(() => {
    setSessionState((prev) => ({
      ...prev,
      status: 'paused',
    }));
  }, []);

  const resume = useCallback(() => {
    setSessionState((prev) => ({
      ...prev,
      status: 'active',
    }));
  }, []);

  // Complete mutation
  const completeMutation = useMutation({
    mutationFn: async ({
      notes,
      rating,
      perceivedExertion,
    }: {
      notes?: string;
      rating?: number;
      perceivedExertion?: number;
    }) => {
      if (!sessionState.session) throw new Error('No active session');

      return completeWorkoutSession(sessionState.session.id, {
        exercises: sessionState.session.exercises,
        totalDuration: sessionState.elapsedTime,
        notes,
        rating,
        perceivedExertion,
      });
    },
    onSuccess: () => {
      clearSessionState();
      setSessionState({
        session: null,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        status: 'idle',
        elapsedTime: 0,
        restStartTime: null,
      });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      queryClient.invalidateQueries({ queryKey: ['recovery'] });
    },
  });

  // Cancel session
  const cancel = useCallback(() => {
    clearSessionState();
    setSessionState({
      session: null,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      status: 'idle',
      elapsedTime: 0,
      restStartTime: null,
    });
  }, []);

  // Format elapsed time
  const formattedTime = useMemo(() => {
    const hours = Math.floor(sessionState.elapsedTime / 3600);
    const minutes = Math.floor((sessionState.elapsedTime % 3600) / 60);
    const seconds = sessionState.elapsedTime % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [sessionState.elapsedTime]);

  // Check if workout is complete
  const isComplete = useMemo(() => {
    if (!sessionState.session) return false;
    return sessionState.currentExerciseIndex >= sessionState.session.exercises.length;
  }, [sessionState.session, sessionState.currentExerciseIndex]);

  return {
    // Session data
    session: sessionState.session,
    status: sessionState.status,
    isActive: sessionState.status === 'active',
    isPaused: sessionState.status === 'paused',
    isComplete,

    // Current position
    currentExercise,
    currentSet,
    currentExerciseIndex: sessionState.currentExerciseIndex,
    currentSetIndex: sessionState.currentSetIndex,

    // Time
    elapsedTime: sessionState.elapsedTime,
    formattedTime,
    restStartTime: sessionState.restStartTime,

    // Progress
    progress,

    // Actions
    start: startMutation.mutate,
    isStarting: startMutation.isPending,
    completeSet,
    skipSet,
    skipExercise,
    pause,
    resume,
    complete: completeMutation.mutate,
    isCompleting: completeMutation.isPending,
    cancel,
  };
}

export default useWorkoutSession;

import { motion } from 'framer-motion';
import { Check, SkipForward, Dumbbell } from 'lucide-react';

interface SetStatus {
  completed: boolean;
  skipped: boolean;
  reps?: number;
  weight?: number;
}

interface ExerciseProgressBarProps {
  exerciseName: string;
  totalSets: number;
  completedSets: number;
  currentSet: number;
  setStatuses?: SetStatus[];
  isPaused?: boolean;
  showDetails?: boolean;
}

export function ExerciseProgressBar({
  exerciseName,
  totalSets,
  completedSets,
  currentSet,
  setStatuses = [],
  isPaused = false,
  showDetails = false,
}: ExerciseProgressBarProps) {
  const progress = (completedSets / totalSets) * 100;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{exerciseName}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Set {currentSet} of {totalSets}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            isPaused ? 'bg-yellow-500' : 'bg-primary'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {isPaused && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {/* Set indicators */}
      <div className="flex justify-between gap-1">
        {Array.from({ length: totalSets }).map((_, index) => {
          const status = setStatuses[index];
          const isCompleted = status?.completed;
          const isSkipped = status?.skipped;
          const isCurrent = index + 1 === currentSet;
          const isFuture = index + 1 > currentSet;

          return (
            <motion.div
              key={index}
              className={`
                flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium
                ${isCurrent && !isCompleted && !isSkipped
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : isCompleted
                  ? 'bg-green-500 text-white'
                  : isSkipped
                  ? 'bg-gray-400 text-white'
                  : isFuture
                  ? 'bg-secondary text-muted-foreground'
                  : 'bg-secondary text-muted-foreground'
                }
              `}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isCurrent && !isCompleted ? 1.05 : 1,
                opacity: 1,
              }}
              transition={{ delay: index * 0.05 }}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : isSkipped ? (
                <SkipForward className="w-3 h-3" />
              ) : (
                index + 1
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detailed set info */}
      {showDetails && setStatuses.length > 0 && (
        <div className="space-y-1.5 pt-2">
          {setStatuses.map((status, index) => {
            if (!status.completed && !status.skipped) return null;

            return (
              <motion.div
                key={index}
                className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                  status.completed ? 'bg-green-500/10' : 'bg-gray-500/10'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="text-muted-foreground">Set {index + 1}</span>
                {status.completed ? (
                  <span className="font-medium text-green-600">
                    {status.reps} reps @ {status.weight}kg
                  </span>
                ) : (
                  <span className="text-gray-500">Skipped</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Mini version for workout overview
interface MiniProgressProps {
  totalSets: number;
  completedSets: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
}

export function MiniExerciseProgress({ totalSets, completedSets, status }: MiniProgressProps) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: totalSets }).map((_, index) => {
        const isCompleted = index < completedSets;

        return (
          <div
            key={index}
            className={`
              w-2 h-2 rounded-full
              ${status === 'completed'
                ? 'bg-green-500'
                : status === 'skipped'
                ? 'bg-gray-400'
                : isCompleted
                ? 'bg-primary'
                : 'bg-secondary'
              }
            `}
          />
        );
      })}
    </div>
  );
}

// Overall workout progress
interface WorkoutProgressProps {
  exercises: Array<{
    name: string;
    totalSets: number;
    completedSets: number;
    status: 'pending' | 'active' | 'completed' | 'skipped';
  }>;
  currentExerciseIndex: number;
}

export function WorkoutProgressOverview({ exercises, currentExerciseIndex }: WorkoutProgressProps) {
  const totalSets = exercises.reduce((sum, ex) => sum + ex.totalSets, 0);
  const completedSets = exercises.reduce((sum, ex) => sum + ex.completedSets, 0);
  const overallProgress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-2">
        {exercises.map((exercise, index) => {
          const isCurrent = index === currentExerciseIndex;
          const isCompleted = exercise.status === 'completed';
          const isSkipped = exercise.status === 'skipped';

          return (
            <motion.div
              key={index}
              className={`flex items-center justify-between p-2 rounded-lg ${
                isCurrent
                  ? 'bg-primary/10 border border-primary/30'
                  : isCompleted
                  ? 'bg-green-500/10'
                  : isSkipped
                  ? 'bg-gray-500/10'
                  : 'bg-secondary/30'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isSkipped
                      ? 'bg-gray-400 text-white'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : isSkipped ? (
                    <SkipForward className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isCurrent ? 'font-medium' : isCompleted || isSkipped ? 'text-muted-foreground' : ''
                  }`}
                >
                  {exercise.name}
                </span>
              </div>
              <MiniExerciseProgress
                totalSets={exercise.totalSets}
                completedSets={exercise.completedSets}
                status={exercise.status}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default ExerciseProgressBar;

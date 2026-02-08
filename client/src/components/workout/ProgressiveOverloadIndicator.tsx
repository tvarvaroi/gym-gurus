import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowUp, Target, Zap, AlertTriangle } from 'lucide-react';

// Types for progressive overload tracking
interface SetHistory {
  date: string;
  weight: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

interface ProgressiveOverloadIndicatorProps {
  exerciseName: string;
  currentWeight: number;
  currentReps: number;
  targetReps: number;
  history: SetHistory[];
  showRecommendation?: boolean;
}

// Calculate if user should increase weight
function calculateOverloadRecommendation(
  history: SetHistory[],
  currentWeight: number,
  currentReps: number,
  targetReps: number
): {
  recommendation: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload' | 'insufficient_data';
  confidence: number;
  message: string;
  suggestedWeight?: number;
  suggestedReps?: number;
} {
  if (history.length < 3) {
    return {
      recommendation: 'insufficient_data',
      confidence: 0,
      message: 'Complete more sets to get personalized recommendations',
    };
  }

  // Get last 3-5 sessions at this weight
  const recentSets = history
    .filter((h) => h.weight === currentWeight)
    .slice(-5);

  if (recentSets.length < 3) {
    return {
      recommendation: 'maintain',
      confidence: 0.5,
      message: 'Keep training at current weight to establish baseline',
    };
  }

  const avgReps = recentSets.reduce((sum, s) => sum + s.reps, 0) / recentSets.length;
  const avgRpe = recentSets.filter((s) => s.rpe).reduce((sum, s) => sum + (s.rpe || 0), 0) /
    (recentSets.filter((s) => s.rpe).length || 1);

  // Check for consistent performance above target
  const exceedsTarget = recentSets.every((s) => s.reps >= targetReps);
  const consistentlyHigh = avgReps >= targetReps + 2;
  const lowRpe = avgRpe < 7;

  if (exceedsTarget && consistentlyHigh && lowRpe) {
    // Calculate suggested weight increase (2.5-5kg / 5-10lbs)
    const increment = currentWeight < 50 ? 2.5 : 5;
    return {
      recommendation: 'increase_weight',
      confidence: 0.9,
      message: `You're ready to increase weight! Try ${currentWeight + increment}kg`,
      suggestedWeight: currentWeight + increment,
    };
  }

  if (exceedsTarget && consistentlyHigh) {
    const increment = currentWeight < 50 ? 2.5 : 5;
    return {
      recommendation: 'increase_weight',
      confidence: 0.75,
      message: `Consider increasing to ${currentWeight + increment}kg`,
      suggestedWeight: currentWeight + increment,
    };
  }

  // Check if reps are improving
  const repsImproving = recentSets.length >= 3 &&
    recentSets[recentSets.length - 1].reps > recentSets[0].reps;

  if (repsImproving && avgReps < targetReps) {
    return {
      recommendation: 'increase_reps',
      confidence: 0.7,
      message: `Keep pushing! Aim for ${targetReps} reps before increasing weight`,
      suggestedReps: targetReps,
    };
  }

  // Check for declining performance (potential need for deload)
  const repsDecreasing = recentSets.length >= 3 &&
    recentSets[recentSets.length - 1].reps < recentSets[0].reps - 2;
  const highRpe = avgRpe > 9;

  if (repsDecreasing && highRpe) {
    return {
      recommendation: 'deload',
      confidence: 0.8,
      message: 'Consider a deload week - reduce weight by 10-20%',
      suggestedWeight: Math.round(currentWeight * 0.85 / 2.5) * 2.5,
    };
  }

  return {
    recommendation: 'maintain',
    confidence: 0.6,
    message: 'Continue at current weight and aim for consistent form',
  };
}

export function ProgressiveOverloadIndicator({
  exerciseName,
  currentWeight,
  currentReps,
  targetReps,
  history,
  showRecommendation = true,
}: ProgressiveOverloadIndicatorProps) {
  const recommendation = useMemo(
    () => calculateOverloadRecommendation(history, currentWeight, currentReps, targetReps),
    [history, currentWeight, currentReps, targetReps]
  );

  const getIcon = () => {
    switch (recommendation.recommendation) {
      case 'increase_weight':
        return <TrendingUp className="w-5 h-5" />;
      case 'increase_reps':
        return <ArrowUp className="w-5 h-5" />;
      case 'maintain':
        return <Target className="w-5 h-5" />;
      case 'deload':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (recommendation.recommendation) {
      case 'increase_weight':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-600 dark:text-green-400',
          border: 'border-green-200 dark:border-green-800',
        };
      case 'increase_reps':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-200 dark:border-blue-800',
        };
      case 'maintain':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800/50',
          text: 'text-gray-600 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-700',
        };
      case 'deload':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-600 dark:text-orange-400',
          border: 'border-orange-200 dark:border-orange-800',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800/50',
          text: 'text-gray-500 dark:text-gray-400',
          border: 'border-gray-200 dark:border-gray-700',
        };
    }
  };

  const colors = getColors();

  if (!showRecommendation) {
    return null;
  }

  return (
    <motion.div
      className={`rounded-lg p-3 border ${colors.bg} ${colors.border}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${colors.bg} ${colors.text}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${colors.text}`}>
              {recommendation.recommendation === 'increase_weight' && 'Ready to Progress!'}
              {recommendation.recommendation === 'increase_reps' && 'Building Strength'}
              {recommendation.recommendation === 'maintain' && 'Stay Consistent'}
              {recommendation.recommendation === 'deload' && 'Recovery Recommended'}
              {recommendation.recommendation === 'insufficient_data' && 'Keep Training'}
            </span>
            {recommendation.confidence > 0.7 && (
              <Zap className="w-4 h-4 text-yellow-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {recommendation.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Compact badge version for inline display
interface OverloadBadgeProps {
  recommendation: 'increase_weight' | 'increase_reps' | 'maintain' | 'deload' | 'insufficient_data';
}

export function OverloadBadge({ recommendation }: OverloadBadgeProps) {
  const config = {
    increase_weight: {
      label: '↑ Weight',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    increase_reps: {
      label: '↑ Reps',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    maintain: {
      label: 'Maintain',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    },
    deload: {
      label: 'Deload',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    insufficient_data: {
      label: '...',
      className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    },
  };

  const { label, className } = config[recommendation];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// PR indicator for when user hits a new personal record
interface PRIndicatorProps {
  type: 'weight' | 'reps' | 'volume';
  value: number;
  previousBest: number;
  unit?: string;
}

export function PRIndicator({ type, value, previousBest, unit = 'kg' }: PRIndicatorProps) {
  const improvement = value - previousBest;
  const percentImprovement = ((improvement / previousBest) * 100).toFixed(1);

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', duration: 0.5 }}
    >
      <div className="text-2xl">🏆</div>
      <div>
        <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
          New PR!
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          {type === 'weight' && `${value}${unit} (+${improvement}${unit})`}
          {type === 'reps' && `${value} reps (+${improvement})`}
          {type === 'volume' && `${value}${unit} total (+${percentImprovement}%)`}
        </p>
      </div>
    </motion.div>
  );
}

// Volume tracker showing weekly progress
interface VolumeTrackerProps {
  currentWeekVolume: number;
  lastWeekVolume: number;
  targetVolume?: number;
  muscleGroup: string;
}

export function VolumeTracker({
  currentWeekVolume,
  lastWeekVolume,
  targetVolume,
  muscleGroup,
}: VolumeTrackerProps) {
  const volumeChange = currentWeekVolume - lastWeekVolume;
  const percentChange = lastWeekVolume > 0
    ? ((volumeChange / lastWeekVolume) * 100).toFixed(1)
    : '0';
  const isProgressing = volumeChange > 0;
  const targetProgress = targetVolume ? (currentWeekVolume / targetVolume) * 100 : 0;

  return (
    <div className="p-4 bg-card rounded-xl border space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">{muscleGroup} Volume</span>
        <div className="flex items-center gap-1">
          {isProgressing ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : volumeChange < 0 ? (
            <TrendingDown className="w-4 h-4 text-red-500" />
          ) : (
            <Minus className="w-4 h-4 text-gray-400" />
          )}
          <span className={`text-sm font-medium ${
            isProgressing ? 'text-green-600' : volumeChange < 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {isProgressing ? '+' : ''}{percentChange}%
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">This week</span>
          <span className="font-medium">{currentWeekVolume.toLocaleString()} kg</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Last week</span>
          <span className="text-muted-foreground">{lastWeekVolume.toLocaleString()} kg</span>
        </div>
      </div>

      {targetVolume && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Weekly target</span>
            <span>{Math.round(targetProgress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                targetProgress >= 100 ? 'bg-green-500' :
                targetProgress >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(targetProgress, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Warning for potential overtraining
interface OvertrainingWarningProps {
  consecutiveHardSessions: number;
  avgRpe: number;
  restDaysSinceLastWorkout: number;
}

export function OvertrainingWarning({
  consecutiveHardSessions,
  avgRpe,
  restDaysSinceLastWorkout,
}: OvertrainingWarningProps) {
  const showWarning = consecutiveHardSessions >= 5 || (avgRpe > 9 && restDaysSinceLastWorkout < 1);

  if (!showWarning) return null;

  return (
    <motion.div
      className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-orange-800 dark:text-orange-200">
          Recovery Alert
        </p>
        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
          {consecutiveHardSessions >= 5
            ? `You've had ${consecutiveHardSessions} intense sessions in a row. Consider a lighter day or rest.`
            : 'Your recent RPE is very high. Make sure to prioritize recovery.'}
        </p>
      </div>
    </motion.div>
  );
}

export default ProgressiveOverloadIndicator;

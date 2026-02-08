import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Check, ChevronRight, SkipForward, Edit2 } from 'lucide-react';

interface SetCompletionSwipeProps {
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  onComplete: (reps: number, weight?: number) => void;
  onSkip: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}

export function SetCompletionSwipe({
  setNumber,
  targetReps,
  targetWeight,
  onComplete,
  onSkip,
  onEdit,
  disabled = false,
}: SetCompletionSwipeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [reps, setReps] = useState(targetReps);
  const [weight, setWeight] = useState(targetWeight || 0);

  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  // Transform for swipe feedback
  const completeOpacity = useTransform(x, [0, 100], [0, 1]);
  const skipOpacity = useTransform(x, [-100, 0], [1, 0]);
  const completeScale = useTransform(x, [0, 100], [0.8, 1]);
  const skipScale = useTransform(x, [-100, 0], [1, 0.8]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const threshold = 100;

      if (info.offset.x > threshold) {
        // Swipe right - complete
        onComplete(reps, weight > 0 ? weight : undefined);
      } else if (info.offset.x < -threshold) {
        // Swipe left - skip
        onSkip();
      }
    },
    [onComplete, onSkip, reps, weight]
  );

  const handleQuickComplete = () => {
    onComplete(targetReps, targetWeight || undefined);
  };

  if (isEditing) {
    return (
      <motion.div
        className="bg-card rounded-xl p-4 border shadow-sm space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">Set {setNumber}</span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReps(Math.max(0, reps - 1))}
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold"
              >
                -
              </button>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="w-16 h-10 text-center text-lg font-bold bg-background border rounded-lg"
              />
              <button
                onClick={() => setReps(reps + 1)}
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeight(Math.max(0, weight - 2.5))}
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold"
              >
                -
              </button>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                step="2.5"
                className="w-16 h-10 text-center text-lg font-bold bg-background border rounded-lg"
              />
              <button
                onClick={() => setWeight(weight + 2.5)}
                className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsEditing(false);
              onSkip();
            }}
            className="flex-1 py-3 rounded-lg bg-secondary text-muted-foreground font-medium"
          >
            Skip
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              onComplete(reps, weight > 0 ? weight : undefined);
            }}
            className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Complete
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Background indicators */}
      <div className="absolute inset-0 flex">
        {/* Complete (right swipe) indicator */}
        <motion.div
          className="flex-1 bg-green-500 flex items-center justify-start pl-4"
          style={{ opacity: completeOpacity }}
        >
          <motion.div style={{ scale: completeScale }}>
            <Check className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>

        {/* Skip (left swipe) indicator */}
        <motion.div
          className="flex-1 bg-gray-400 flex items-center justify-end pr-4"
          style={{ opacity: skipOpacity }}
        >
          <motion.div style={{ scale: skipScale }}>
            <SkipForward className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
      </div>

      {/* Swipeable card */}
      <motion.div
        className={`bg-card border rounded-xl p-4 relative ${disabled ? 'opacity-50' : ''}`}
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
      >
        <div className="flex items-center justify-between">
          {/* Set info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{setNumber}</span>
            </div>
            <div>
              <p className="text-lg font-bold">
                {targetReps} reps
                {targetWeight && ` @ ${targetWeight}kg`}
              </p>
              <p className="text-sm text-muted-foreground">Swipe to complete</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                disabled={disabled}
              >
                <Edit2 className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleQuickComplete}
              className="p-3 rounded-xl bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors"
              disabled={disabled}
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Swipe hint */}
        {!disabled && (
          <motion.div
            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: [0.3, 0.6, 0.3], x: [-10, 0, -10] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronRight className="w-6 h-6" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// Simple button-based alternative for accessibility
interface SetCompletionButtonsProps {
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  onComplete: (reps: number, weight?: number) => void;
  onSkip: () => void;
  disabled?: boolean;
}

export function SetCompletionButtons({
  setNumber,
  targetReps,
  targetWeight,
  onComplete,
  onSkip,
  disabled = false,
}: SetCompletionButtonsProps) {
  const [adjustedReps, setAdjustedReps] = useState(targetReps);
  const [adjustedWeight, setAdjustedWeight] = useState(targetWeight || 0);
  const [showAdjust, setShowAdjust] = useState(false);

  return (
    <div className="bg-card border rounded-xl p-4 space-y-4">
      {/* Set info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{setNumber}</span>
          </div>
          <div>
            <p className="font-bold">
              {targetReps} reps{targetWeight && ` @ ${targetWeight}kg`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAdjust(!showAdjust)}
          className="text-sm text-primary"
          disabled={disabled}
        >
          {showAdjust ? 'Hide' : 'Adjust'}
        </button>
      </div>

      {/* Adjustment controls */}
      {showAdjust && (
        <motion.div
          className="grid grid-cols-2 gap-4 pt-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAdjustedReps(Math.max(0, adjustedReps - 1))}
                className="w-8 h-8 rounded bg-secondary flex items-center justify-center"
                disabled={disabled}
              >
                -
              </button>
              <span className="w-12 text-center font-bold">{adjustedReps}</span>
              <button
                onClick={() => setAdjustedReps(adjustedReps + 1)}
                className="w-8 h-8 rounded bg-secondary flex items-center justify-center"
                disabled={disabled}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Weight (kg)</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAdjustedWeight(Math.max(0, adjustedWeight - 2.5))}
                className="w-8 h-8 rounded bg-secondary flex items-center justify-center"
                disabled={disabled}
              >
                -
              </button>
              <span className="w-12 text-center font-bold">{adjustedWeight}</span>
              <button
                onClick={() => setAdjustedWeight(adjustedWeight + 2.5)}
                className="w-8 h-8 rounded bg-secondary flex items-center justify-center"
                disabled={disabled}
              >
                +
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 py-3 rounded-lg bg-secondary text-muted-foreground font-medium hover:bg-secondary/80 transition-colors"
          disabled={disabled}
        >
          Skip
        </button>
        <button
          onClick={() =>
            onComplete(
              showAdjust ? adjustedReps : targetReps,
              showAdjust ? (adjustedWeight > 0 ? adjustedWeight : undefined) : (targetWeight || undefined)
            )
          }
          className="flex-1 py-3 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
          disabled={disabled}
        >
          <Check className="w-5 h-5" />
          Complete
        </button>
      </div>
    </div>
  );
}

export default SetCompletionSwipe;

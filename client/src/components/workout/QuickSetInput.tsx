import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, X, Minus, Plus, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';

interface QuickSetInputProps {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  suggestedWeight: number;
  suggestedReps: number;
  previousWeight?: number;
  previousReps?: number;
  unit?: 'kg' | 'lbs';
  onComplete: (weight: number, reps: number) => void;
  onFail: (weight: number, reps: number) => void;
  onSkip: () => void;
}

export function QuickSetInput({
  exerciseName,
  setNumber,
  totalSets,
  suggestedWeight,
  suggestedReps,
  previousWeight,
  previousReps,
  unit = 'kg',
  onComplete,
  onFail,
  onSkip,
}: QuickSetInputProps) {
  const [weight, setWeight] = useState(suggestedWeight);
  const [reps, setReps] = useState(suggestedReps);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Weight increment based on unit
  const weightIncrement = unit === 'kg' ? 2.5 : 5;

  // Handle swipe gestures
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 100;

      if (info.offset.x > threshold) {
        // Swipe right - Complete set
        setSwipeDirection('right');
        if (navigator.vibrate) navigator.vibrate(50);
        setTimeout(() => {
          onComplete(weight, reps);
          setSwipeDirection(null);
        }, 200);
      } else if (info.offset.x < -threshold) {
        // Swipe left - Missed set
        setSwipeDirection('left');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setTimeout(() => {
          onFail(weight, reps);
          setSwipeDirection(null);
        }, 200);
      }
    },
    [weight, reps, onComplete, onFail]
  );

  // Quick accept button - one tap to log with suggested values
  const handleQuickAccept = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    onComplete(suggestedWeight, suggestedReps);
  };

  // Calculate improvement from previous
  const getImprovement = () => {
    if (!previousWeight || !previousReps) return null;

    const currentVolume = weight * reps;
    const previousVolume = previousWeight * previousReps;
    const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;

    if (weight > previousWeight) {
      return { type: 'weight', value: weight - previousWeight, percentage: ((weight - previousWeight) / previousWeight) * 100 };
    }
    if (reps > previousReps && weight >= previousWeight) {
      return { type: 'reps', value: reps - previousReps };
    }
    if (volumeChange > 0) {
      return { type: 'volume', percentage: volumeChange };
    }
    return null;
  };

  const improvement = getImprovement();

  return (
    <motion.div
      className="bg-card rounded-2xl shadow-lg overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Header */}
      <div className="bg-primary/10 px-4 py-3 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">{exerciseName}</h3>
          <p className="text-sm text-muted-foreground">
            Set {setNumber} of {totalSets}
          </p>
        </div>
        <button
          onClick={onSkip}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable Area */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="relative p-6 cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor:
            swipeDirection === 'right'
              ? 'rgba(34, 197, 94, 0.1)'
              : swipeDirection === 'left'
              ? 'rgba(239, 68, 68, 0.1)'
              : 'transparent',
        }}
      >
        {/* Swipe Indicators */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500 opacity-30">
          <X className="w-8 h-8" />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 opacity-30">
          <Check className="w-8 h-8" />
        </div>

        {/* Weight Input */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block text-center">
            Weight ({unit})
          </label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setWeight((w) => Math.max(0, w - weightIncrement))}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Minus className="w-6 h-6" />
            </button>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="text-5xl font-bold text-center w-32 bg-transparent border-b-2 border-primary focus:outline-none"
              step={weightIncrement}
            />
            <button
              onClick={() => setWeight((w) => w + weightIncrement)}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Reps Input */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block text-center">Reps</label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setReps((r) => Math.max(1, r - 1))}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Minus className="w-6 h-6" />
            </button>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="text-5xl font-bold text-center w-24 bg-transparent border-b-2 border-primary focus:outline-none"
            />
            <button
              onClick={() => setReps((r) => r + 1)}
              className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Improvement Indicator */}
        {improvement && (
          <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
              <ChevronRight className="w-4 h-4" />
              {improvement.type === 'weight' && `+${improvement.value}${unit} (${(improvement.percentage ?? 0).toFixed(1)}%)`}
              {improvement.type === 'reps' && `+${improvement.value} reps`}
              {improvement.type === 'volume' && `+${(improvement.percentage ?? 0).toFixed(1)}% volume`}
            </span>
          </motion.div>
        )}

        {/* Previous Performance */}
        {previousWeight && previousReps && (
          <p className="text-center text-sm text-muted-foreground">
            Previous: {previousWeight}{unit} × {previousReps} reps
          </p>
        )}
      </motion.div>

      {/* Quick Accept Button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleQuickAccept}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl text-lg font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-6 h-6" />
          Log Set ({suggestedWeight}{unit} × {suggestedReps})
        </button>

        {/* Swipe Instructions */}
        <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Swipe left = Missed
          </span>
          <span className="flex items-center gap-1">
            Swipe right = Complete <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Set completion animation overlay
interface SetCompleteOverlayProps {
  type: 'complete' | 'fail';
  setNumber: number;
  onDismiss: () => void;
}

export function SetCompleteOverlay({ type, setNumber, onDismiss }: SetCompleteOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onAnimationComplete={() => {
          setTimeout(onDismiss, 500);
        }}
      >
        <motion.div
          className={`p-8 rounded-full ${
            type === 'complete' ? 'bg-green-500' : 'bg-red-500'
          }`}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          exit={{ scale: 0 }}
          transition={{ duration: 0.3 }}
        >
          {type === 'complete' ? (
            <Check className="w-16 h-16 text-white" />
          ) : (
            <X className="w-16 h-16 text-white" />
          )}
        </motion.div>
        <motion.p
          className="absolute mt-32 text-xl font-bold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          Set {setNumber} {type === 'complete' ? 'Complete!' : 'Missed'}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact set button for quick logging
interface QuickSetButtonProps {
  setNumber: number;
  weight: number;
  reps: number;
  unit?: 'kg' | 'lbs';
  isComplete: boolean;
  isFailed: boolean;
  onClick: () => void;
}

export function QuickSetButton({
  setNumber,
  weight,
  reps,
  unit = 'kg',
  isComplete,
  isFailed,
  onClick,
}: QuickSetButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border-2 transition-all ${
        isComplete
          ? 'bg-green-100 border-green-500 text-green-700'
          : isFailed
          ? 'bg-red-100 border-red-500 text-red-700'
          : 'bg-secondary border-transparent hover:border-primary'
      }`}
    >
      <div className="text-sm font-medium">Set {setNumber}</div>
      <div className="text-lg font-bold">
        {weight}{unit} × {reps}
      </div>
    </button>
  );
}

export default QuickSetInput;

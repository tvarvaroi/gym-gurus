import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface SetRowProps {
  set: {
    setNumber: number;
    weight: number;
    reps: number;
    completed: boolean;
  };
  isActive: boolean;
  isUpcoming: boolean;
  weightUnit: 'kg' | 'lbs';
  weightStep: number;
  disabled?: boolean;
  onUpdateWeight: (value: number) => void;
  onUpdateReps: (value: number) => void;
  onToggleComplete: () => void;
}

export function SetRow({
  set,
  isActive,
  isUpcoming,
  weightUnit,
  weightStep,
  disabled,
  onUpdateWeight,
  onUpdateReps,
  onToggleComplete,
}: SetRowProps) {
  const prefersReducedMotion = useReducedMotion();

  // Collapsed upcoming sets
  if (isUpcoming) {
    return (
      <motion.div
        initial={false}
        animate={{ opacity: 0.5 }}
        className="rounded-2xl bg-white/[0.02] border border-white/5 px-4 py-3 flex items-center justify-between"
      >
        <span className="text-sm font-bold text-neutral-600">SET {set.setNumber}</span>
        <span className="text-xs text-neutral-600 tabular-nums">
          {set.weight > 0 ? `${set.weight} ${weightUnit}` : '—'} &times;{' '}
          {set.reps > 0 ? set.reps : '—'}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: set.completed ? 0.7 : 1,
        scale: isActive ? 1 : 0.98,
      }}
      className={`rounded-2xl p-4 transition-colors ${
        set.completed
          ? 'bg-green-500/[0.06] border border-green-500/15 border-l-4 border-l-green-500'
          : 'bg-[#c9a855]/[0.06] border border-[#c9a855]/20'
      }`}
    >
      {/* Top row: Set label + check */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            set.completed ? 'text-green-500' : 'text-[#c9a855]'
          }`}
        >
          SET {set.setNumber}
        </span>
        <motion.button
          onClick={onToggleComplete}
          animate={
            prefersReducedMotion
              ? undefined
              : set.completed
                ? { scale: [1, 1.3, 1] }
                : { scale: 1 }
          }
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
            set.completed
              ? 'bg-green-500 text-white'
              : 'border-2 border-white/20 hover:border-[#c9a855]/50 text-transparent hover:text-[#c9a855]/50'
          }`}
          aria-label={set.completed ? `Undo set ${set.setNumber}` : `Complete set ${set.setNumber}`}
        >
          {set.completed ? (
            <motion.div
              initial={prefersReducedMotion ? undefined : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            >
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </motion.div>
          ) : (
            <Check className="w-5 h-5" strokeWidth={3} />
          )}
        </motion.button>
      </div>

      {/* Weight + Reps side by side */}
      <div className="flex items-center justify-around mt-1">
        {/* Weight */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
            Weight ({weightUnit})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateWeight(set.weight - weightStep)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
              aria-label={`Decrease weight by ${weightStep} ${weightUnit}`}
              disabled={disabled || set.completed}
            >
              <span className="text-lg font-light">−</span>
            </button>
            <input
              type="number"
              inputMode="decimal"
              value={set.weight || ''}
              onChange={(e) => onUpdateWeight(Number(e.target.value) || 0)}
              disabled={disabled || set.completed}
              className="w-16 h-12 text-center text-xl font-bold bg-transparent border-b-2 border-white/[0.06] focus:border-[#c9a855] outline-none tabular-nums text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
              aria-label={`Weight for set ${set.setNumber}`}
            />
            <button
              onClick={() => onUpdateWeight(set.weight + weightStep)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
              aria-label={`Increase weight by ${weightStep} ${weightUnit}`}
              disabled={disabled || set.completed}
            >
              <span className="text-lg font-light">+</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-14 w-px bg-white/[0.06]" />

        {/* Reps */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
            Reps
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdateReps(set.reps - 1)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
              aria-label="Decrease reps by 1"
              disabled={disabled || set.completed}
            >
              <span className="text-lg font-light">−</span>
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={set.reps || ''}
              onChange={(e) => onUpdateReps(Number(e.target.value) || 0)}
              disabled={disabled || set.completed}
              className="w-14 h-12 text-center text-xl font-bold bg-transparent border-b-2 border-white/[0.06] focus:border-[#c9a855] outline-none tabular-nums text-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
              aria-label={`Reps for set ${set.setNumber}`}
            />
            <button
              onClick={() => onUpdateReps(set.reps + 1)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 active:scale-95 transition-all flex-none"
              aria-label="Increase reps by 1"
              disabled={disabled || set.completed}
            >
              <span className="text-lg font-light">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Complete Set CTA — active set only */}
      {isActive && !set.completed && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onToggleComplete}
          className="mt-4 w-full h-14 rounded-xl bg-[#c9a855] text-black font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          aria-label={`Complete set ${set.setNumber}`}
        >
          <Check className="w-5 h-5" strokeWidth={3} />
          Complete Set
        </motion.button>
      )}
    </motion.div>
  );
}

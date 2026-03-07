import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface RestTimerOverlayProps {
  restTimeLeft: number;
  restDuration: number;
  restJustFinished: boolean;
  nextSetInfo?: { setNumber: number; totalSets: number } | null;
  nextExerciseInfo?: { name: string; sets: number; reps: string } | null;
  onAddTime: () => void;
  onSkip: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimerOverlay({
  restTimeLeft,
  restDuration,
  restJustFinished,
  nextSetInfo,
  nextExerciseInfo,
  onAddTime,
  onSkip,
}: RestTimerOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const isVisible = restTimeLeft > 0 || restJustFinished;

  if (!isVisible) return null;

  const circumference = 2 * Math.PI * 74;
  const progress = restDuration > 0 ? restTimeLeft / restDuration : 0;
  const strokeColor = restTimeLeft === 0 ? '#22c55e' : '#c9a855';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-[60] bg-[#0A0A0A]/95 backdrop-blur-md flex flex-col items-center justify-center"
    >
      {/* REST label */}
      <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-6">
        {restTimeLeft === 0 ? 'ready' : 'rest'}
      </p>

      {/* Ring timer — 200px on mobile for better visibility */}
      <div className="relative w-[200px] h-[200px] mb-6">
        <svg className="w-[200px] h-[200px] -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={6}
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 90}
            strokeDashoffset={2 * Math.PI * 90 * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono text-5xl font-bold tabular-nums ${
            restTimeLeft === 0 ? 'text-green-400' : 'text-white'
          }`}
          style={
            restTimeLeft === 0 && !prefersReducedMotion
              ? { animation: 'pulse-primary 1.5s ease-in-out infinite' }
              : undefined
          }
        >
          {restTimeLeft === 0 ? 'GO!' : formatTime(restTimeLeft)}
        </span>
      </div>

      {/* Up Next info — next set */}
      {nextSetInfo && (
        <div className="text-center mb-8">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Next Up</p>
          <p className="text-sm text-neutral-300">
            Set {nextSetInfo.setNumber} of {nextSetInfo.totalSets}
          </p>
        </div>
      )}

      {/* Up Next info — next exercise */}
      {!nextSetInfo && nextExerciseInfo && (
        <div className="text-center mb-8">
          <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-1">Up Next</p>
          <p className="text-sm text-neutral-300">{nextExerciseInfo.name}</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {nextExerciseInfo.sets} sets &times; {nextExerciseInfo.reps} reps
          </p>
        </div>
      )}

      {/* Buttons — 48px min height for touch */}
      <div className="flex gap-3">
        <button
          onClick={onAddTime}
          className="h-14 px-8 rounded-xl bg-white/5 hover:bg-white/10 text-base text-neutral-300 font-medium transition-colors active:scale-95"
          aria-label="Add 30 seconds to rest timer"
        >
          +30s
        </button>
        <button
          onClick={onSkip}
          className="h-14 px-10 rounded-xl bg-[#c9a855] text-black text-base font-bold hover:bg-[#b89745] transition-colors flex items-center gap-2 active:scale-95"
          aria-label="Skip rest period"
        >
          Skip <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

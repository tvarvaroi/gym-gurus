import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';

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

  const progress = restDuration > 0 ? (restTimeLeft / restDuration) * 100 : 0;
  const isReady = restTimeLeft === 0;

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
        {isReady ? 'ready' : 'rest'}
      </p>

      {/* Ring timer — AnimatedCircularProgressBar */}
      <div className="relative w-[200px] h-[200px] mb-6">
        <AnimatedCircularProgressBar
          value={isReady ? 100 : progress}
          max={100}
          min={0}
          gaugePrimaryColor={isReady ? '#22c55e' : 'hsl(var(--primary))'}
          gaugeSecondaryColor="rgba(255,255,255,0.06)"
          className="size-[200px] !text-transparent"
        />
        {/* Time overlay */}
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono text-5xl font-bold tabular-nums ${
            isReady ? 'text-green-400' : 'text-white'
          }`}
          style={
            isReady && !prefersReducedMotion
              ? { animation: 'pulse-primary 1.5s ease-in-out infinite' }
              : undefined
          }
        >
          {isReady ? 'GO!' : formatTime(restTimeLeft)}
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
          className="h-14 px-10 rounded-xl bg-primary text-primary-foreground text-base font-bold transition-colors flex items-center gap-2 active:scale-95"
          aria-label="Skip rest period"
        >
          Skip <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

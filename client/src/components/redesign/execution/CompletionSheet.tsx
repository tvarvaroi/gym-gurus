import { motion } from 'framer-motion';
import { Trophy, Timer, Dumbbell, Check, Flame, Star, Share2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  getMuscleStyleClass,
  getMuscleAccentClass,
  formatMuscleLabel,
} from '@/lib/constants/muscleGroups';
import {
  ExerciseMuscleDisplay,
  aggregateWorkoutMuscles,
} from '@/components/redesign/charts/ExerciseMuscleDisplay';

interface ExerciseSummary {
  exerciseName: string;
  muscleGroup: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  sets: { weight: number; reps: number; completed: boolean }[];
}

interface PersonalRecord {
  exerciseName: string;
  newWeight: number;
  previousWeight: number;
}

interface CompletionSheetProps {
  workoutTitle: string;
  elapsedSeconds: number;
  totalVolume: number;
  completedSets: number;
  totalSets: number;
  weightUnit: 'kg' | 'lbs';
  exercises: ExerciseSummary[];
  personalRecords: PersonalRecord[];
  musclesWorked: string[];
  xpAwarded: number;
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
  onShare: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function estimateCalories(durationMinutes: number, totalSets = 0): number {
  const durationBased = Math.round(durationMinutes * 7);
  const setsBased = totalSets * 8;
  return Math.max(durationBased, setsBased);
}

// getMuscleStyleClass, getMuscleAccentClass, formatMuscleLabel
// imported from @/lib/constants/muscleGroups (canonical location)

// Simple animated counter
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <>
      {value}
      {suffix}
    </>
  );
}

export function CompletionSheet({
  workoutTitle,
  elapsedSeconds,
  totalVolume,
  completedSets,
  totalSets,
  weightUnit,
  exercises,
  personalRecords,
  musclesWorked,
  xpAwarded,
  isSaving,
  isSaved,
  onSave,
  onShare,
}: CompletionSheetProps) {
  const prefersReducedMotion = useReducedMotion();
  const durationMin = Math.round(elapsedSeconds / 60) || 1;
  const cals = estimateCalories(durationMin, completedSets);

  const statCardStyle = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0A0A0A] text-white overflow-y-auto">
      {/* CSS animations */}
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
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-primary {
          0%, 100% { box-shadow: 0 0 20px hsl(var(--primary) / 0.3); }
          50% { box-shadow: 0 0 40px hsl(var(--primary) / 0.6); }
        }
      `}</style>

      {/* Confetti */}
      {!prefersReducedMotion &&
        Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece rounded-sm"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: ['hsl(var(--primary))', '#22c55e', '#3b82f6', '#ef4444', '#a855f7'][
                i % 5
              ],
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
          initial={prefersReducedMotion ? undefined : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="text-center pt-8"
        >
          <motion.div
            initial={prefersReducedMotion ? undefined : { scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 12 }}
            className="mb-6 inline-block"
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background:
                  'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
                animation: prefersReducedMotion ? 'none' : 'pulse-primary 2s ease-in-out infinite',
              }}
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold font-['Playfair_Display'] mb-1">Workout Complete</h1>
          <p className="text-neutral-400">{workoutTitle}</p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          <div
            className="rounded-2xl p-5 text-center border border-white/[0.06]"
            style={statCardStyle}
          >
            <Timer className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold tabular-nums">{formatTime(elapsedSeconds)}</p>
            <p className="text-xs text-neutral-500">Duration</p>
          </div>
          <div
            className="rounded-2xl p-5 text-center border border-white/[0.06]"
            style={statCardStyle}
          >
            <Dumbbell className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              <AnimatedNumber value={Math.round(totalVolume)} suffix={` ${weightUnit}`} />
            </p>
            <p className="text-xs text-neutral-500">Volume</p>
          </div>
          <div
            className="rounded-2xl p-5 text-center border border-white/[0.06]"
            style={statCardStyle}
          >
            <Check className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {completedSets}/{totalSets}
            </p>
            <p className="text-xs text-neutral-500">Sets</p>
          </div>
          <div
            className="rounded-2xl p-5 text-center border border-white/[0.06]"
            style={statCardStyle}
          >
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              <AnimatedNumber value={cals} />
            </p>
            <p className="text-xs text-neutral-500">Est. kcal</p>
          </div>
        </motion.div>

        {/* Personal Records */}
        {personalRecords.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
                New PR{personalRecords.length > 1 ? 's' : ''}!
              </h3>
            </div>
            <div className="space-y-2">
              {personalRecords.map((pr) => (
                <div key={pr.exerciseName} className="flex items-center justify-between text-sm">
                  <span className="text-white/80">{pr.exerciseName}</span>
                  <span className="text-primary font-semibold">
                    {pr.previousWeight} → {pr.newWeight} {weightUnit}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
          {exercises.map((ex, i) => {
            const completed = ex.sets.filter((s) => s.completed);
            if (completed.length === 0) return null;
            const reps = completed.map((s) => s.reps);
            const mainWeight = completed[0]?.weight || 0;
            return (
              <div
                key={i}
                className={`rounded-lg px-4 py-3 border border-white/[0.06] border-l-4 ${getMuscleAccentClass(ex.muscleGroup)}`}
                style={statCardStyle}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{ex.exerciseName}</span>
                  <span className="text-xs text-neutral-500">
                    {completed.length}/{ex.sets.length} sets
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

        {/* Muscles Trained — anatomy heat-map or badge fallback */}
        {musclesWorked.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Muscles Trained
            </h3>
            {(() => {
              const { primary, secondary } = aggregateWorkoutMuscles(exercises);
              return primary.length > 0 ? (
                <ExerciseMuscleDisplay
                  primaryMuscles={primary}
                  secondaryMuscles={secondary}
                  mode="display"
                  size="lg"
                  showToggle={true}
                  showLegend={true}
                  className="py-2"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {musclesWorked.map((m) => (
                    <span
                      key={m}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${getMuscleStyleClass(m)}`}
                    >
                      {formatMuscleLabel(m)}
                    </span>
                  ))}
                </div>
              );
            })()}
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary/30"
            style={{
              background:
                'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)',
              backgroundSize: '200% 100%',
              animation: prefersReducedMotion ? 'none' : 'shimmer 3s linear infinite',
            }}
          >
            <Star className="w-5 h-5 text-primary" />
            <span className="text-primary font-bold">
              {xpAwarded > 0 ? <>+{xpAwarded} XP</> : <>~{completedSets * 5} XP</>}
            </span>
          </div>
        </motion.div>

        {/* Action buttons — 56px touch targets */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-3 pb-8"
        >
          <button
            onClick={onSave}
            disabled={isSaving || isSaved}
            className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-colors disabled:opacity-50"
            aria-label="Save workout and exit"
          >
            {isSaving ? 'Saving...' : isSaved ? 'Saved! Redirecting...' : 'Save & Exit'}
          </button>
          <button
            onClick={onShare}
            className="w-full h-14 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 font-medium text-base transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Results
          </button>
          {isSaved && <p className="text-center text-sm text-neutral-500">Redirecting...</p>}
        </motion.div>
      </div>
    </div>
  );
}

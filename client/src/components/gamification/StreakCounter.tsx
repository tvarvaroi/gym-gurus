import { motion } from 'framer-motion';
import { Flame, Calendar, TrendingUp } from 'lucide-react';

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate?: Date | string | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

// Get streak status and color
function getStreakStatus(streak: number): { color: string; bgColor: string; status: string } {
  if (streak >= 100) return { color: 'text-purple-500', bgColor: 'bg-purple-100', status: 'Legendary!' };
  if (streak >= 30) return { color: 'text-red-500', bgColor: 'bg-red-100', status: 'On Fire!' };
  if (streak >= 14) return { color: 'text-orange-500', bgColor: 'bg-orange-100', status: 'Blazing!' };
  if (streak >= 7) return { color: 'text-yellow-500', bgColor: 'bg-yellow-100', status: 'Heating Up!' };
  if (streak >= 3) return { color: 'text-green-500', bgColor: 'bg-green-100', status: 'Getting Started!' };
  return { color: 'text-gray-400', bgColor: 'bg-gray-100', status: 'Start Your Streak!' };
}

export function StreakCounter({
  currentStreak,
  longestStreak,
  lastWorkoutDate,
  size = 'md',
  showDetails = true,
}: StreakCounterProps) {
  const { color, bgColor, status } = getStreakStatus(currentStreak);

  const sizeClasses = {
    sm: { flame: 'w-6 h-6', number: 'text-2xl', label: 'text-xs' },
    md: { flame: 'w-10 h-10', number: 'text-4xl', label: 'text-sm' },
    lg: { flame: 'w-14 h-14', number: 'text-6xl', label: 'text-base' },
  };

  const { flame, number, label } = sizeClasses[size];

  const isStreakActive = () => {
    if (!lastWorkoutDate) return false;
    const last = new Date(lastWorkoutDate);
    const now = new Date();
    const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return hoursSince < 48; // Streak active if workout in last 48 hours
  };

  const streakActive = isStreakActive();

  return (
    <div className={`${bgColor} rounded-xl p-4`}>
      <div className="flex items-center gap-4">
        {/* Flame Icon */}
        <motion.div
          animate={
            streakActive && currentStreak > 0
              ? {
                  scale: [1, 1.1, 1],
                  rotate: [-5, 5, -5],
                }
              : {}
          }
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <Flame className={`${flame} ${streakActive ? color : 'text-gray-300'}`} />
        </motion.div>

        {/* Streak Number */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`${number} font-bold ${color}`}>{currentStreak}</span>
            <span className={`${label} text-muted-foreground`}>day streak</span>
          </div>
          <p className={`${label} ${color} font-medium`}>{status}</p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-current/10 grid grid-cols-2 gap-4">
          {/* Longest Streak */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Best Streak</p>
              <p className="font-bold">{longestStreak} days</p>
            </div>
          </div>

          {/* Last Workout */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Workout</p>
              <p className="font-bold">
                {lastWorkoutDate
                  ? new Date(lastWorkoutDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Streak warning if about to break */}
      {streakActive && currentStreak > 0 && lastWorkoutDate && (
        <StreakWarning lastWorkoutDate={lastWorkoutDate} />
      )}
    </div>
  );
}

// Warning when streak is about to break
function StreakWarning({ lastWorkoutDate }: { lastWorkoutDate: Date | string }) {
  const last = new Date(lastWorkoutDate);
  const now = new Date();
  const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, 48 - hoursSince);

  if (hoursRemaining > 24) return null;

  return (
    <motion.div
      className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-sm text-yellow-700 font-medium">
        ⚠️ Workout soon to keep your streak! {Math.floor(hoursRemaining)} hours remaining.
      </p>
    </motion.div>
  );
}

// Compact streak badge for headers
export function StreakBadge({ currentStreak }: { currentStreak: number }) {
  const { color } = getStreakStatus(currentStreak);

  return (
    <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-full">
      <Flame className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-bold ${color}`}>{currentStreak}</span>
    </div>
  );
}

// Weekly calendar showing streak
interface WeeklyStreakCalendarProps {
  lastWorkoutDate?: Date | string | null;
  workoutDates: (Date | string)[];
}

export function WeeklyStreakCalendar({ workoutDates }: WeeklyStreakCalendarProps) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const workoutDateSet = new Set(
    workoutDates.map((d) => new Date(d).toDateString())
  );

  return (
    <div className="flex gap-1">
      {days.map((day, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        const isToday = date.toDateString() === today.toDateString();
        const hasWorkout = workoutDateSet.has(date.toDateString());
        const isPast = date < today && !isToday;

        return (
          <div
            key={index}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              hasWorkout
                ? 'bg-green-500 text-white'
                : isToday
                ? 'border-2 border-primary'
                : isPast
                ? 'bg-gray-100 text-gray-400'
                : 'bg-gray-50 text-gray-500'
            }`}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}

export default StreakCounter;

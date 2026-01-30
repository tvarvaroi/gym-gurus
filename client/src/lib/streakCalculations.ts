import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: Date | null;
  isStreakActive: boolean; // true if workout was done today or yesterday
}

/**
 * Calculate workout streaks from completion dates
 * @param completedDates Array of ISO date strings when workouts were completed
 * @returns StreakData with current and longest streak information
 */
export function calculateWorkoutStreak(completedDates: string[]): StreakData {
  if (!completedDates || completedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      isStreakActive: false,
    };
  }

  // Parse and normalize dates to start of day
  const dates = completedDates
    .map(dateStr => startOfDay(parseISO(dateStr)))
    .sort((a, b) => b.getTime() - a.getTime()); // Sort descending (most recent first)

  // Remove duplicates (same day workouts count as one)
  const uniqueDates = dates.filter((date, index, self) =>
    index === 0 || date.getTime() !== self[index - 1].getTime()
  );

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
      isStreakActive: false,
    };
  }

  const today = startOfDay(new Date());
  const lastWorkout = uniqueDates[0];
  const daysSinceLastWorkout = differenceInDays(today, lastWorkout);

  // Calculate current streak
  let currentStreak = 0;

  // Streak is active if workout was today or yesterday
  const isStreakActive = daysSinceLastWorkout <= 1;

  if (isStreakActive) {
    currentStreak = 1;
    let previousDate = lastWorkout;

    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = uniqueDates[i];
      const dayDiff = differenceInDays(previousDate, currentDate);

      if (dayDiff === 1) {
        // Consecutive day
        currentStreak++;
        previousDate = currentDate;
      } else {
        // Streak broken
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const dayDiff = differenceInDays(uniqueDates[i - 1], uniqueDates[i]);

    if (dayDiff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    currentStreak,
    longestStreak,
    lastWorkoutDate: lastWorkout,
    isStreakActive,
  };
}

/**
 * Get motivational message based on streak
 */
export function getStreakMessage(currentStreak: number, isActive: boolean): string {
  if (!isActive) {
    return "Start a new streak today!";
  }

  if (currentStreak === 1) {
    return "Great start! Keep it going!";
  } else if (currentStreak < 7) {
    return `${currentStreak} days strong!`;
  } else if (currentStreak < 14) {
    return `${currentStreak} day streak! Amazing!`;
  } else if (currentStreak < 30) {
    return `${currentStreak} days! You're unstoppable!`;
  } else if (currentStreak < 100) {
    return `${currentStreak} day streak! Legendary!`;
  } else {
    return `${currentStreak} days! Hall of Fame!`;
  }
}

/**
 * Get streak emoji/icon based on streak length
 */
export function getStreakEmoji(currentStreak: number): string {
  if (currentStreak === 0) return "💪";
  if (currentStreak < 3) return "🔥";
  if (currentStreak < 7) return "🔥🔥";
  if (currentStreak < 14) return "🔥🔥🔥";
  if (currentStreak < 30) return "⚡";
  if (currentStreak < 100) return "💎";
  return "👑";
}

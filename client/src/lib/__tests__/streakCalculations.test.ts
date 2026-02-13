import { describe, it, expect } from 'vitest';
import { calculateWorkoutStreak, getStreakMessage, getStreakEmoji } from '../streakCalculations';

describe('calculateWorkoutStreak', () => {
  it('returns zeros for empty input', () => {
    const result = calculateWorkoutStreak([]);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastWorkoutDate).toBeNull();
    expect(result.isStreakActive).toBe(false);
  });

  it('returns zeros for null input', () => {
    const result = calculateWorkoutStreak(null as any);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it('counts a single workout today as a 1-day streak', () => {
    const today = new Date().toISOString();
    const result = calculateWorkoutStreak([today]);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isStreakActive).toBe(true);
  });

  it('counts consecutive days correctly', () => {
    const now = new Date();
    const dates = [
      new Date(now.getTime() - 0 * 86400000).toISOString(),
      new Date(now.getTime() - 1 * 86400000).toISOString(),
      new Date(now.getTime() - 2 * 86400000).toISOString(),
    ];
    const result = calculateWorkoutStreak(dates);
    expect(result.currentStreak).toBe(3);
    expect(result.isStreakActive).toBe(true);
  });

  it('detects broken streaks', () => {
    const now = new Date();
    const dates = [
      new Date(now.getTime() - 0 * 86400000).toISOString(), // today
      new Date(now.getTime() - 1 * 86400000).toISOString(), // yesterday
      // gap
      new Date(now.getTime() - 4 * 86400000).toISOString(), // 4 days ago
      new Date(now.getTime() - 5 * 86400000).toISOString(), // 5 days ago
    ];
    const result = calculateWorkoutStreak(dates);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
  });

  it('deduplicates same-day workouts', () => {
    const today = new Date();
    const dates = [
      today.toISOString(),
      new Date(today.getTime() + 3600000).toISOString(), // 1 hour later same day
    ];
    const result = calculateWorkoutStreak(dates);
    expect(result.currentStreak).toBe(1);
  });

  it('marks streak inactive when last workout was 2+ days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    const result = calculateWorkoutStreak([twoDaysAgo]);
    expect(result.isStreakActive).toBe(false);
    expect(result.currentStreak).toBe(0);
  });

  it('tracks longest streak separately from current', () => {
    const now = new Date();
    const dates = [
      // Current streak: 2 days
      new Date(now.getTime() - 0 * 86400000).toISOString(),
      new Date(now.getTime() - 1 * 86400000).toISOString(),
      // Gap
      // Old streak: 4 days
      new Date(now.getTime() - 10 * 86400000).toISOString(),
      new Date(now.getTime() - 11 * 86400000).toISOString(),
      new Date(now.getTime() - 12 * 86400000).toISOString(),
      new Date(now.getTime() - 13 * 86400000).toISOString(),
    ];
    const result = calculateWorkoutStreak(dates);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(4);
  });
});

describe('getStreakMessage', () => {
  it('returns start message when inactive', () => {
    expect(getStreakMessage(0, false)).toBe('Start a new streak today!');
  });

  it('returns appropriate message for day 1', () => {
    expect(getStreakMessage(1, true)).toBe('Great start! Keep it going!');
  });

  it('returns appropriate message for short streaks', () => {
    const msg = getStreakMessage(5, true);
    expect(msg).toContain('5');
    expect(msg).toContain('strong');
  });

  it('returns appropriate message for long streaks', () => {
    const msg = getStreakMessage(100, true);
    expect(msg).toContain('100');
    expect(msg).toContain('Hall of Fame');
  });
});

describe('getStreakEmoji', () => {
  it('returns flexed arm for zero streak', () => {
    expect(getStreakEmoji(0)).toBe('💪');
  });

  it('returns fire for short streaks', () => {
    expect(getStreakEmoji(1)).toBe('🔥');
  });

  it('returns crown for 100+ streaks', () => {
    expect(getStreakEmoji(100)).toBe('👑');
  });
});

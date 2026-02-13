import { describe, it, expect } from 'vitest';
import {
  calculateAchievements,
  getNextAchievement,
  groupAchievementsByTier,
  getRecentlyUnlockedAchievements,
  ACHIEVEMENT_DEFINITIONS,
  type BadgeCalculationData,
} from '../achievements';

const emptyData: BadgeCalculationData = {
  completedWorkouts: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  progressEntries: 0,
};

describe('calculateAchievements', () => {
  it('returns all achievements as locked for empty data', () => {
    const achievements = calculateAchievements(emptyData);
    expect(achievements).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
    expect(achievements.every(a => !a.unlocked)).toBe(true);
  });

  it('unlocks streak achievements based on longestStreak', () => {
    const data: BadgeCalculationData = { ...emptyData, longestStreak: 7 };
    const achievements = calculateAchievements(data);

    const streak3 = achievements.find(a => a.id === 'streak_3')!;
    const streak7 = achievements.find(a => a.id === 'streak_7')!;
    const streak14 = achievements.find(a => a.id === 'streak_14')!;

    expect(streak3.unlocked).toBe(true);
    expect(streak7.unlocked).toBe(true);
    expect(streak14.unlocked).toBe(false);
  });

  it('unlocks workout achievements based on completedWorkouts', () => {
    const data: BadgeCalculationData = { ...emptyData, completedWorkouts: 25 };
    const achievements = calculateAchievements(data);

    const w1 = achievements.find(a => a.id === 'workout_1')!;
    const w10 = achievements.find(a => a.id === 'workout_10')!;
    const w25 = achievements.find(a => a.id === 'workout_25')!;
    const w50 = achievements.find(a => a.id === 'workout_50')!;

    expect(w1.unlocked).toBe(true);
    expect(w10.unlocked).toBe(true);
    expect(w25.unlocked).toBe(true);
    expect(w50.unlocked).toBe(false);
  });

  it('unlocks progress achievements based on progressEntries', () => {
    const data: BadgeCalculationData = { ...emptyData, progressEntries: 20 };
    const achievements = calculateAchievements(data);

    const p5 = achievements.find(a => a.id === 'progress_5')!;
    const p20 = achievements.find(a => a.id === 'progress_20')!;
    const p50 = achievements.find(a => a.id === 'progress_50')!;

    expect(p5.unlocked).toBe(true);
    expect(p20.unlocked).toBe(true);
    expect(p50.unlocked).toBe(false);
  });

  it('unlocks complete_all only when 100% completion with workouts', () => {
    // 0 workouts → not unlocked
    const noWorkouts = calculateAchievements(emptyData);
    expect(noWorkouts.find(a => a.id === 'complete_all')!.unlocked).toBe(false);

    // partial completion → not unlocked
    const partial = calculateAchievements({
      ...emptyData,
      completedWorkouts: 5,
      totalWorkouts: 10,
    });
    expect(partial.find(a => a.id === 'complete_all')!.unlocked).toBe(false);

    // full completion → unlocked
    const full = calculateAchievements({
      ...emptyData,
      completedWorkouts: 10,
      totalWorkouts: 10,
    });
    expect(full.find(a => a.id === 'complete_all')!.unlocked).toBe(true);
  });

  it('sets progress values correctly', () => {
    const data: BadgeCalculationData = {
      ...emptyData,
      longestStreak: 5,
      completedWorkouts: 15,
      progressEntries: 8,
    };
    const achievements = calculateAchievements(data);

    expect(achievements.find(a => a.id === 'streak_7')!.progress).toBe(5);
    expect(achievements.find(a => a.id === 'workout_25')!.progress).toBe(15);
    expect(achievements.find(a => a.id === 'progress_20')!.progress).toBe(8);
  });

  it('sets unlockedAt only for unlocked achievements', () => {
    const data: BadgeCalculationData = { ...emptyData, completedWorkouts: 1 };
    const achievements = calculateAchievements(data);

    const w1 = achievements.find(a => a.id === 'workout_1')!;
    const w10 = achievements.find(a => a.id === 'workout_10')!;

    expect(w1.unlockedAt).toBeInstanceOf(Date);
    expect(w10.unlockedAt).toBeUndefined();
  });
});

describe('groupAchievementsByTier', () => {
  it('groups achievements into all 5 tiers', () => {
    const achievements = calculateAchievements(emptyData);
    const grouped = groupAchievementsByTier(achievements);

    expect(grouped).toHaveProperty('diamond');
    expect(grouped).toHaveProperty('platinum');
    expect(grouped).toHaveProperty('gold');
    expect(grouped).toHaveProperty('silver');
    expect(grouped).toHaveProperty('bronze');
  });

  it('places achievements in the correct tier', () => {
    const achievements = calculateAchievements(emptyData);
    const grouped = groupAchievementsByTier(achievements);

    // streak_3 is bronze
    expect(grouped.bronze.some(a => a.id === 'streak_3')).toBe(true);
    // streak_100 is diamond
    expect(grouped.diamond.some(a => a.id === 'streak_100')).toBe(true);
    // streak_30 is platinum
    expect(grouped.platinum.some(a => a.id === 'streak_30')).toBe(true);
  });
});

describe('getNextAchievement', () => {
  it('returns the closest-to-unlock achievement', () => {
    const data: BadgeCalculationData = {
      ...emptyData,
      longestStreak: 2, // 2/3 = 67% toward streak_3
      completedWorkouts: 0,
      progressEntries: 0,
    };
    const achievements = calculateAchievements(data);
    const next = getNextAchievement(achievements);

    expect(next).not.toBeNull();
    expect(next!.id).toBe('streak_3'); // 67% is highest
  });

  it('returns null when all achievements are unlocked', () => {
    const data: BadgeCalculationData = {
      completedWorkouts: 250,
      currentStreak: 100,
      longestStreak: 100,
      totalWorkouts: 250,
      progressEntries: 50,
    };
    const achievements = calculateAchievements(data);
    const next = getNextAchievement(achievements);

    expect(next).toBeNull();
  });
});

describe('getRecentlyUnlockedAchievements', () => {
  it('returns achievements unlocked within the time window', () => {
    const achievements = calculateAchievements({
      ...emptyData,
      completedWorkouts: 1,
    });
    // calculateAchievements sets unlockedAt to new Date() (now),
    // so recently unlocked within 24h should include them
    const recent = getRecentlyUnlockedAchievements(achievements, 24);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.every(a => a.unlocked)).toBe(true);
  });

  it('returns empty array when no achievements are unlocked', () => {
    const achievements = calculateAchievements(emptyData);
    const recent = getRecentlyUnlockedAchievements(achievements, 24);
    expect(recent).toHaveLength(0);
  });
});

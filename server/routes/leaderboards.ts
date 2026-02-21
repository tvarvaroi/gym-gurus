import { Router } from 'express';
import { db } from '../db';
import { userGamification, users } from '@shared/schema';
// Note: leaderboards and leaderboardEntries tables were archived (never used).
// Current leaderboards query userGamification directly for simpler, real-time rankings.
import { eq, desc, and, gte, sql } from 'drizzle-orm';

const router = Router();

// Leaderboard types
type LeaderboardType = 'xp' | 'streak' | 'workouts' | 'volume' | 'strength';
type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime';

/**
 * Get leaderboard by type and period
 * GET /api/leaderboards/:type/:period
 */
router.get('/:type/:period', async (req, res) => {
  try {
    const { type, period } = req.params as { type: LeaderboardType; period: LeaderboardPeriod };
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get date range for period
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly': {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
        startDate.setHours(0, 0, 0, 0);
        break;
      }
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'allTime':
        startDate = null;
        break;
    }

    // Build query based on leaderboard type
    let leaderboardData: any[] = [];

    switch (type) {
      case 'xp':
        // XP leaderboard from userGamification
        if (startDate) {
          // For time-limited periods, we'd need to track XP gained during that period
          // For now, use total XP as placeholder
          leaderboardData = await db
            .select({
              rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userGamification.totalXp} DESC)`,
              userId: userGamification.userId,
              score: userGamification.totalXp,
              level: userGamification.currentLevel,
            })
            .from(userGamification)
            .orderBy(desc(userGamification.totalXp))
            .limit(limit)
            .offset(offset);
        } else {
          leaderboardData = await db
            .select({
              rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userGamification.totalXp} DESC)`,
              userId: userGamification.userId,
              score: userGamification.totalXp,
              level: userGamification.currentLevel,
            })
            .from(userGamification)
            .orderBy(desc(userGamification.totalXp))
            .limit(limit)
            .offset(offset);
        }
        break;

      case 'streak':
        // Streak leaderboard
        leaderboardData = await db
          .select({
            rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userGamification.currentStreakDays} DESC)`,
            userId: userGamification.userId,
            score: userGamification.currentStreakDays,
            level: userGamification.currentLevel,
          })
          .from(userGamification)
          .orderBy(desc(userGamification.currentStreakDays))
          .limit(limit)
          .offset(offset);
        break;

      case 'workouts':
        // Workouts completed leaderboard
        leaderboardData = await db
          .select({
            rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userGamification.totalWorkoutsCompleted} DESC)`,
            userId: userGamification.userId,
            score: userGamification.totalWorkoutsCompleted,
            level: userGamification.currentLevel,
          })
          .from(userGamification)
          .orderBy(desc(userGamification.totalWorkoutsCompleted))
          .limit(limit)
          .offset(offset);
        break;

      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    res.json({
      type,
      period,
      entries: leaderboardData,
      total: leaderboardData.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * Get user's rank on a specific leaderboard
 * GET /api/leaderboards/:type/:period/user/:userId
 */
router.get('/:type/:period/user/:userId', async (req, res) => {
  try {
    const { type, period, userId } = req.params as {
      type: LeaderboardType;
      period: LeaderboardPeriod;
      userId: string;
    };

    // Get user's gamification data
    const [userData] = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId));

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate rank based on type
    let scoreField: string;
    let userScore: number;

    switch (type) {
      case 'xp':
        scoreField = 'totalXp';
        userScore = userData.totalXp;
        break;
      case 'streak':
        scoreField = 'currentStreak';
        userScore = userData.currentStreak;
        break;
      case 'workouts':
        scoreField = 'workoutsCompleted';
        userScore = userData.workoutsCompleted;
        break;
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    // Count users with higher scores
    const [rankResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(userGamification)
      .where(sql`${userGamification[scoreField as keyof typeof userGamification]} > ${userScore}`);

    const rank = (rankResult?.count || 0) + 1;

    // Get total participants
    const [totalResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(userGamification);

    res.json({
      userId,
      type,
      period,
      rank,
      score: userScore,
      level: userData.level,
      totalParticipants: totalResult?.count || 0,
      percentile: Math.round((1 - rank / (totalResult?.count || 1)) * 100),
    });
  } catch (error) {
    console.error('Get user rank error:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

/**
 * Get nearby users on leaderboard (users around the current user's rank)
 * GET /api/leaderboards/:type/:period/nearby/:userId
 */
router.get('/:type/:period/nearby/:userId', async (req, res) => {
  try {
    const { type, period, userId } = req.params as {
      type: LeaderboardType;
      period: LeaderboardPeriod;
      userId: string;
    };
    const range = parseInt(req.query.range as string) || 5; // Users above and below

    // Get user's score first
    const [userData] = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId));

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userScore: number;
    let scoreColumn;
    switch (type) {
      case 'xp':
        userScore = userData.totalXp;
        scoreColumn = userGamification.totalXp;
        break;
      case 'streak':
        userScore = userData.currentStreakDays;
        scoreColumn = userGamification.currentStreakDays;
        break;
      case 'workouts':
        userScore = userData.totalWorkoutsCompleted;
        scoreColumn = userGamification.totalWorkoutsCompleted;
        break;
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }

    // Get users above
    const usersAbove = await db
      .select({
        userId: userGamification.userId,
        score: scoreColumn,
        level: userGamification.currentLevel,
      })
      .from(userGamification)
      .where(sql`${scoreColumn} > ${userScore}`)
      .orderBy(scoreColumn)
      .limit(range);

    // Get users below
    const usersBelow = await db
      .select({
        userId: userGamification.userId,
        score: scoreColumn,
        level: userGamification.currentLevel,
      })
      .from(userGamification)
      .where(sql`${scoreColumn} < ${userScore}`)
      .orderBy(desc(scoreColumn))
      .limit(range);

    // Combine and sort
    const nearbyUsers = [
      ...usersAbove.reverse(),
      {
        userId: userData.userId,
        score: userScore,
        level: userData.currentLevel,
        isCurrentUser: true,
      },
      ...usersBelow,
    ];

    res.json({
      type,
      period,
      currentUser: userId,
      nearbyUsers,
    });
  } catch (error) {
    console.error('Get nearby users error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby users' });
  }
});

/**
 * Get available leaderboard types
 * GET /api/leaderboards/types
 */
router.get('/types', async (_req, res) => {
  res.json({
    types: [
      { id: 'xp', name: 'XP Leaders', description: 'Most experience points earned', icon: '⭐' },
      {
        id: 'streak',
        name: 'Streak Champions',
        description: 'Longest workout streaks',
        icon: '🔥',
      },
      {
        id: 'workouts',
        name: 'Workout Warriors',
        description: 'Most workouts completed',
        icon: '💪',
      },
      {
        id: 'volume',
        name: 'Volume Kings',
        description: 'Highest total training volume',
        icon: '📊',
      },
      {
        id: 'strength',
        name: 'Strength Masters',
        description: 'Highest strength scores',
        icon: '🏋️',
      },
    ],
    periods: [
      { id: 'daily', name: 'Today', description: 'Resets daily at midnight' },
      { id: 'weekly', name: 'This Week', description: 'Resets every Sunday' },
      { id: 'monthly', name: 'This Month', description: 'Resets on the 1st' },
      { id: 'allTime', name: 'All Time', description: 'Lifetime rankings' },
    ],
  });
});

/**
 * Get user's leaderboard summary (ranks across all types)
 * GET /api/leaderboards/summary/:userId
 */
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's gamification data
    const [userData] = await db
      .select()
      .from(userGamification)
      .where(eq(userGamification.userId, userId));

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate ranks for each type
    const types = ['xp', 'streak', 'workouts'] as const;
    const fields = {
      xp: 'totalXp',
      streak: 'currentStreak',
      workouts: 'workoutsCompleted',
    } as const;

    const summary: any[] = [];

    for (const type of types) {
      const field = fields[type];
      const userScore = userData[field as keyof typeof userData];

      const [rankResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userGamification)
        .where(sql`${userGamification[field as keyof typeof userGamification]} > ${userScore}`);

      const rank = (rankResult?.count || 0) + 1;

      summary.push({
        type,
        rank,
        score: userScore,
      });
    }

    res.json({
      userId,
      level: userData.level,
      summary,
    });
  } catch (error) {
    console.error('Get leaderboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;

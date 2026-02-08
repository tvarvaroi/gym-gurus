// Gamification API Routes
import { Router, Request, Response } from 'express';
import {
  getUserGamification,
  awardXp,
  updateStreak,
  getRecentXpTransactions,
  initializeUserGamification,
} from '../services/gamification/xpService';
import {
  getUserAchievementsWithProgress,
  getUserEarnedAchievements,
  getAchievementStats,
  checkWorkoutAchievements,
} from '../services/gamification/achievementService';

const router = Router();

// Get user's gamification profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await getUserGamification(userId);
    res.json(profile);
  } catch (error) {
    console.error('Error getting gamification profile:', error);
    res.status(500).json({ error: 'Failed to get gamification profile' });
  }
});

// Initialize gamification for user (called on first login)
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await initializeUserGamification(userId);
    const profile = await getUserGamification(userId);
    res.json(profile);
  } catch (error) {
    console.error('Error initializing gamification:', error);
    res.status(500).json({ error: 'Failed to initialize gamification' });
  }
});

// Get XP transaction history
router.get('/xp/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await getRecentXpTransactions(userId, limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error getting XP history:', error);
    res.status(500).json({ error: 'Failed to get XP history' });
  }
});

// Get all achievements with progress
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const achievements = await getUserAchievementsWithProgress(userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// Get earned achievements only
router.get('/achievements/earned', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const achievements = await getUserEarnedAchievements(userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error getting earned achievements:', error);
    res.status(500).json({ error: 'Failed to get earned achievements' });
  }
});

// Get achievement statistics
router.get('/achievements/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await getAchievementStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting achievement stats:', error);
    res.status(500).json({ error: 'Failed to get achievement stats' });
  }
});

// Update streak (called after workout completion)
router.post('/streak/update', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await updateStreak(userId);
    res.json(result);
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

// Check achievements after workout (internal use)
router.post('/achievements/check', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { workoutStats } = req.body;
    if (!workoutStats) {
      return res.status(400).json({ error: 'Workout stats required' });
    }

    const result = await checkWorkoutAchievements(userId, workoutStats);
    res.json(result);
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Get leaderboard (placeholder - to be expanded)
router.get('/leaderboard/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { timeframe = 'all_time', limit = 50 } = req.query;

    // TODO: Implement actual leaderboard queries
    res.json({
      type,
      timeframe,
      entries: [],
      message: 'Leaderboard coming soon',
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;

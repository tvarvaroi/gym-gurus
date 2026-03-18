// Dashboard & Analytics Routes
// Trainer dashboard statistics, charts, client attention alerts, and analytics

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import { clients } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { apiRateLimit } from '../middleware/rateLimiter';

const router = Router();

// GET /api/dashboard/stats - Get dashboard statistics (secured)
router.get('/dashboard/stats', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const stats = await storage.getDashboardStats(trainerId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dashboard/charts - Get chart data for trainer dashboard (secured)
router.get('/dashboard/charts', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const charts = await storage.getDashboardCharts(trainerId);
    res.json(charts);
  } catch (error) {
    console.warn('Error fetching dashboard charts:', error);
    res.json({
      weightProgressData: [],
      sessionsData: [],
      clientGrowthData: [],
      trainerStreak: 0,
      completionRate: 0,
      clientComplianceRates: [],
      performanceInsight: { metric: 'session_completion', value: 0, label: 'No data yet' },
    });
  }
});

// GET /api/dashboard/needs-attention - Clients needing attention (secured)
router.get('/dashboard/needs-attention', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const database = await getDb();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get all active clients for this trainer
    const allClients = await database
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.trainerId, trainerId),
          eq(clients.status, 'active'),
          isNull(clients.deletedAt)
        )
      );

    const alerts: Array<{
      clientId: string;
      clientName: string;
      reason: string;
      severity: 'warning' | 'urgent';
      lastSession: string | null;
    }> = [];

    for (const client of allClients) {
      // Check for inactivity (no session in 7+ days)
      if (!client.lastSession || client.lastSession < sevenDaysAgo) {
        const isUrgent = !client.lastSession || client.lastSession < fourteenDaysAgo;
        alerts.push({
          clientId: client.id,
          clientName: client.name,
          reason: !client.lastSession
            ? 'Never logged a session'
            : `No session in ${Math.floor((now.getTime() - client.lastSession.getTime()) / (24 * 60 * 60 * 1000))} days`,
          severity: isUrgent ? 'urgent' : 'warning',
          lastSession: client.lastSession?.toISOString() || null,
        });
        continue; // Only one alert per client
      }

      // Check for no upcoming session scheduled
      if (!client.nextSession || client.nextSession < now) {
        alerts.push({
          clientId: client.id,
          clientName: client.name,
          reason: 'No upcoming session scheduled',
          severity: 'warning',
          lastSession: client.lastSession?.toISOString() || null,
        });
      }
    }

    // Sort: urgent first, then warning
    alerts.sort((a, b) => {
      if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
      if (a.severity !== 'urgent' && b.severity === 'urgent') return 1;
      return 0;
    });

    res.json({ alerts: alerts.slice(0, 5) }); // Top 5 alerts
  } catch (error) {
    console.warn('Error fetching needs-attention:', error);
    res.json({ alerts: [] });
  }
});

// GET /api/analytics - Get analytics data (secured, trainerId from session only)
router.get('/analytics', apiRateLimit, async (req: Request, res: Response) => {
  try {
    // SECURITY: Always derive trainerId from session — never from query params
    const trainerId = req.user!.id;
    const analytics = await storage.getTrainerAnalytics(trainerId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

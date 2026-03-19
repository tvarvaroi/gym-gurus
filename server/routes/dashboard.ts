// Dashboard & Analytics Routes
// Trainer dashboard statistics, charts, client attention alerts, and analytics

import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { storage } from '../storage';
import { clients, appointments } from '@shared/schema';
import { eq, and, isNull, gte, lte } from 'drizzle-orm';
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

// GET /api/dashboard/week-activity - Per-day session breakdown for current week (secured)
router.get('/dashboard/week-activity', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const trainerId = req.user!.id;
    const database = await getDb();

    // Calculate Monday–Sunday of current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    // Format as YYYY-MM-DD strings to match appointments.date text column
    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayDate = new Date(monday);
    sundayDate.setDate(monday.getDate() + 6);
    const sundayStr = sundayDate.toISOString().slice(0, 10);

    // Fetch appointments for this trainer in this week range
    const weekAppointments = await database
      .select({
        date: appointments.date,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.trainerId, trainerId),
          gte(appointments.date, mondayStr),
          lte(appointments.date, sundayStr)
        )
      );

    // Build 7-day array
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayAppts = weekAppointments.filter((a) => a.date === dateStr);
      const completed = dayAppts.filter((a) => a.status === 'completed').length;
      const scheduled = dayAppts.filter((a) => a.status === 'scheduled').length;

      return {
        date: dateStr,
        dayName: dayNames[i],
        dateNumber: d.getDate(),
        completedSessions: completed,
        scheduledSessions: scheduled,
        totalSessions: completed + scheduled,
      };
    });

    res.json({ days });
  } catch (error) {
    console.warn('Error fetching week activity:', error);
    res.json({ days: [] });
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

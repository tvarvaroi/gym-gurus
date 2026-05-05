/**
 * Wellness routes — Sprint 3 BATCH 2
 *
 * 5 endpoints, all IDOR-safe (user_id derived from session, never from body/query).
 * Mounted at /api/wellness behind secureAuth + apiRateLimit. CSRF blanket-applied.
 *
 *   GET    /today       — { entry, streak, hasCheckedInToday }
 *   POST   /log         — upsert today's entry, compute readiness, grant XP if first
 *   GET    /history     — last N days, DESC
 *   GET    /streak      — { current, longest, lastCheckIn }
 *   DELETE /today       — delete today's entry, recompute streak
 *
 * Audit log on POST /log (`wellness.check_in`) and DELETE /today
 * (`wellness.delete_today`) carries the forensic chain for any privacy
 * regulator inspecting wellness data — same pattern as Sprint 1.5 BATCH 3
 * biometrics consent toggle and Sprint 2 BATCH 5 preferences PATCH.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import {
  users,
  insertDailyWellnessLogSchema,
  type NotificationPreferences,
} from '../../shared/schema';
import {
  getTodayEntry,
  upsertTodayEntry,
  deleteTodayEntry,
  getWellnessHistory,
  getWellnessStreak,
  updateWellnessStreakAfterCheckIn,
  recomputeWellnessStreakAfterDelete,
  grantWellnessXpIfFirstCheckInToday,
} from '../services/wellnessService';
import { logger } from '../logger';
import { getRequestId } from '../middleware/requestLogger';

const router = Router();

// ─── Timezone resolution ─────────────────────────────────────────────────────
// Resolution order (per `_brain/notes/decisions.md` "Today definition"):
//   1. ?tz= query parameter (validated as IANA-looking string)
//   2. users.notification_preferences.quietHours.timezone
//   3. 'UTC' fallback
async function resolveTimezone(userId: string, queryTz: unknown): Promise<string> {
  // Cheap validation: IANA timezones are like 'Region/City' or 'UTC'.
  // Reject anything that looks like an SQL injection or arbitrary string.
  const tzRegex = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z][A-Za-z0-9_+-]*)*$/;
  if (
    typeof queryTz === 'string' &&
    queryTz.length > 0 &&
    queryTz.length < 64 &&
    tzRegex.test(queryTz)
  ) {
    // Confirm Intl recognises it — invalid IANA throws.
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: queryTz });
      return queryTz;
    } catch {
      // fall through
    }
  }
  const db = await getDb();
  const [row] = await db
    .select({ prefs: users.notificationPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const prefs = row?.prefs as NotificationPreferences | null;
  const stored = prefs?.quietHours?.timezone;
  if (typeof stored === 'string' && stored.length > 0) {
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: stored });
      return stored;
    } catch {
      // fall through
    }
  }
  return 'UTC';
}

// ─── GET /api/wellness/today ─────────────────────────────────────────────────
router.get('/today', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tz = await resolveTimezone(userId, req.query.tz);
    const entry = await getTodayEntry(userId, tz);
    const streak = await getWellnessStreak(userId);

    res.json({
      entry,
      streak,
      hasCheckedInToday: entry !== null,
      timezone: tz,
    });
  } catch (error) {
    logger.error('[wellness/today] failed', error);
    res.status(500).json({ error: 'Failed to load today wellness' });
  }
});

// ─── POST /api/wellness/log ──────────────────────────────────────────────────
router.post('/log', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = insertDailyWellnessLogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid wellness payload', details: parsed.error.errors });
    }

    const tz = await resolveTimezone(userId, req.query.tz);
    const result = await upsertTodayEntry(userId, tz, parsed.data);

    // Streak update + XP grant only on isNewInsert (idempotent for same-day edits).
    // See decisions.md Sprint 3 entry for the rationale.
    let streakUpdate;
    let xpResult = { xpAwarded: 0 };
    if (result.isNewInsert) {
      streakUpdate = await updateWellnessStreakAfterCheckIn(userId, tz);
      xpResult = await grantWellnessXpIfFirstCheckInToday(userId, true);
    } else {
      const current = await getWellnessStreak(userId);
      streakUpdate = {
        current: current.current,
        longest: current.longest,
        isNewStreakStart: false,
      };
    }

    // Audit log — privacy/forensic chain.
    const userRow = await getDb().then((db) =>
      db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    );
    logger.audit('wellness.check_in', {
      userId,
      email: userRow[0]?.email ?? null,
      date: result.entry.date,
      readinessScore: result.entry.readinessScore,
      isNewInsert: result.isNewInsert,
      xpAwarded: xpResult.xpAwarded,
      streakDays: streakUpdate.current,
      ts: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: getRequestId(req),
    });

    res.json({
      entry: result.entry,
      isNewInsert: result.isNewInsert,
      streak: streakUpdate,
      xpAwarded: xpResult.xpAwarded,
    });
  } catch (error) {
    logger.error('[wellness/log] failed', error);
    res.status(500).json({ error: 'Failed to log wellness' });
  }
});

// ─── GET /api/wellness/history?days=N ────────────────────────────────────────
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const daysParam = parseInt(String(req.query.days ?? '30'), 10);
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
    const rows = await getWellnessHistory(userId, days);
    res.json(rows);
  } catch (error) {
    logger.error('[wellness/history] failed', error);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ─── GET /api/wellness/streak ────────────────────────────────────────────────
router.get('/streak', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const streak = await getWellnessStreak(userId);
    res.json(streak);
  } catch (error) {
    logger.error('[wellness/streak] failed', error);
    res.status(500).json({ error: 'Failed to load streak' });
  }
});

// ─── DELETE /api/wellness/today ──────────────────────────────────────────────
router.delete('/today', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const tz = await resolveTimezone(userId, req.query.tz);
    const previousStreak = await getWellnessStreak(userId);
    const deleted = await deleteTodayEntry(userId, tz);

    if (!deleted) {
      return res.status(404).json({ error: 'No entry for today' });
    }

    const newStreak = await recomputeWellnessStreakAfterDelete(userId, tz);

    const userRow = await getDb().then((db) =>
      db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    );
    logger.audit('wellness.delete_today', {
      userId,
      email: userRow[0]?.email ?? null,
      date: deleted.date,
      previousStreakDays: previousStreak.current,
      newStreakDays: newStreak.current,
      ts: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: getRequestId(req),
    });

    res.json({ success: true, streak: newStreak });
  } catch (error) {
    logger.error('[wellness/today DELETE] failed', error);
    res.status(500).json({ error: 'Failed to delete today entry' });
  }
});

export default router;

// Notification API Routes — Sprint 2 BATCH 2 extension
//
// Existing routes (unchanged): GET /, GET /unread-count, PUT /:id/read,
// PUT /read-all, DELETE /clear-all.
//
// New routes (BATCH 2):
//   GET    /vapid-public-key            — public key for browser pushManager.subscribe
//   POST   /subscribe                    — register a push subscription (upsert on endpoint)
//   DELETE /subscribe/:id                — revoke one of YOUR push subscriptions (IDOR-safe)
//   GET    /subscriptions                — list YOUR active push subscriptions for the Settings UI
//   GET    /preferences                  — read your notification_preferences
//   PATCH  /preferences                  — update notification_preferences (deep-partial)
//   POST   /test                         — fire a test notification at yourself
//
// All new routes are IDOR-safe (every WHERE clause includes userId from req.user!.id).
// CSRF is blanket-applied at the index.ts mount point. Auth comes from secureAuth.
import { Router, type Request, type Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db';
import {
  pushSubscriptions,
  users,
  notificationPreferencesSchema,
  notificationPreferencesPatchSchema,
  type NotificationPreferences,
} from '../../shared/schema';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from '../services/notificationService';
import { dispatch } from '../services/notificationDispatcher';
import { isPushConfigured } from '../services/pushService';
import { logger } from '../logger';
import { getRequestId } from '../middleware/requestLogger';

const router = Router();

// ─── Existing routes (unchanged) ────────────────────────────────────────────

// Get user's notifications (paginated)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 30;
    const offset = parseInt(req.query.offset as string) || 0;
    const notifs = await getUserNotifications(userId, limit, offset);
    res.json(notifs);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const count = await getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await markAsRead(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.delete('/clear-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await clearAllNotifications(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// ─── BATCH 2 new routes ─────────────────────────────────────────────────────

// Public — browsers need this to call pushManager.subscribe(...)
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  if (!isPushConfigured()) {
    return res.status(503).json({ error: 'Push not configured' });
  }
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(50),
  userAgent: z.string().max(500).optional(),
  platform: z.enum(['web', 'ios_pwa', 'android', 'ios_native', 'android_native']),
});

// POST /api/notifications/subscribe — upsert a push subscription
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid subscription', details: parsed.error.errors });
    }
    const { endpoint, p256dh, auth, userAgent, platform } = parsed.data;
    const db = await getDb();

    // Endpoint is globally UNIQUE (push services issue one URL per registration).
    // Two cases:
    //   (a) Same user re-subscribes (browser refreshed permission) → upsert keys, mark active
    //   (b) Different user has the same endpoint somehow → security boundary, return 409
    const [existing] = await db
      .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    if (existing && existing.userId !== userId) {
      // Different user has this endpoint. This shouldn't happen (push services
      // issue endpoints per browser-domain pair) but if it does, refuse.
      logger.error('[notifications/subscribe] endpoint claimed by different user', {
        userId,
        existingUserId: existing.userId,
        requestId: getRequestId(req),
      });
      return res.status(409).json({ error: 'Endpoint already registered to another account' });
    }

    if (existing) {
      // Same user, refresh keys + mark active (Sprint 2 spec — upsert).
      const [updated] = await db
        .update(pushSubscriptions)
        .set({ p256dh, auth, userAgent, platform, active: true, failureCount: 0 })
        .where(eq(pushSubscriptions.id, existing.id))
        .returning({ id: pushSubscriptions.id });
      return res.json({ success: true, id: updated.id, action: 'refreshed' });
    }

    const [created] = await db
      .insert(pushSubscriptions)
      .values({ userId, endpoint, p256dh, auth, userAgent, platform })
      .returning({ id: pushSubscriptions.id });
    return res.json({ success: true, id: created.id, action: 'created' });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// DELETE /api/notifications/subscribe/:id — revoke YOUR push subscription
router.delete('/subscribe/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    // IDOR-safe: WHERE id=:id AND userId=current. Returns row count so we can 404 when
    // the row exists but belongs to someone else (or doesn't exist).
    const result = await db
      .update(pushSubscriptions)
      .set({ active: false })
      .where(and(eq(pushSubscriptions.id, req.params.id), eq(pushSubscriptions.userId, userId)))
      .returning({ id: pushSubscriptions.id });

    if (result.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking push subscription:', error);
    res.status(500).json({ error: 'Failed to revoke subscription' });
  }
});

// GET /api/notifications/subscriptions — list YOUR active subs for Settings UI
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    // Don't return the endpoint URL or keys — those are server-side only secrets.
    const rows = await db
      .select({
        id: pushSubscriptions.id,
        userAgent: pushSubscriptions.userAgent,
        platform: pushSubscriptions.platform,
        lastUsedAt: pushSubscriptions.lastUsedAt,
        createdAt: pushSubscriptions.createdAt,
      })
      .from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.active, true)))
      .orderBy(desc(pushSubscriptions.lastUsedAt));
    res.json(rows);
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ error: 'Failed to list subscriptions' });
  }
});

// GET /api/notifications/preferences — read YOUR notification_preferences
// Returns DEFAULT_PREFS when row is NULL (migration 012 backfilled existing
// users, but new users created post-migration start with NULL; the UI shouldn't
// need to know the defaults). Mirrors the legacy /api/settings fallback shape.
const DEFAULT_PREFS_RESPONSE = {
  categories: {
    workouts: true,
    recovery: true,
    achievements: true,
    social: true,
    billing: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
  channels: { push: true, email: false },
};

router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDb();
    const [row] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId));

    res.json(row?.notificationPreferences ?? DEFAULT_PREFS_RESPONSE);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// PATCH /api/notifications/preferences — deep-partial update + audit log
router.patch('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = notificationPreferencesPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid preferences payload', details: parsed.error.errors });
    }

    const db = await getDb();
    const [existing] = await db
      .select({ notificationPreferences: users.notificationPreferences })
      .from(users)
      .where(eq(users.id, userId));

    if (!existing) return res.status(404).json({ error: 'User not found' });

    const merged: NotificationPreferences = mergePrefs(
      existing.notificationPreferences,
      parsed.data
    );

    // Re-validate the merged shape — patch was deep-partial; final result must
    // match the canonical schema.
    const fullCheck = notificationPreferencesSchema.safeParse(merged);
    if (!fullCheck.success) {
      return res
        .status(400)
        .json({ error: 'Merged preferences invalid', details: fullCheck.error.errors });
    }

    await db
      .update(users)
      .set({ notificationPreferences: fullCheck.data, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Audit log — privacy-sensitive setting, capture before+after for forensic chain.
    logger.audit('preferences.notifications_changed', {
      userId,
      previousValue: existing.notificationPreferences ?? null,
      value: fullCheck.data,
      ts: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: getRequestId(req),
    });

    res.json(fullCheck.data);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/notifications/test — fire a test push at yourself.
// Bypasses category gating (the user explicitly asked for this) but RESPECTS
// quiet hours so users can verify the queueing branch works.
router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await dispatch(
      userId,
      'achievement_unlocked',
      {
        achievementTitle: 'Test notification',
        xpReward: 0,
      },
      { bypassCategoryGating: true }
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Deep-merge a deep-partial onto an existing preferences object. Used by PATCH
// /preferences. Returns a new object — does not mutate inputs.
function mergePrefs(existing: unknown, patch: Record<string, unknown>): NotificationPreferences {
  // Defensive default if existing is null/malformed (will fail the post-merge zod check)
  const base: NotificationPreferences =
    existing && typeof existing === 'object'
      ? (existing as NotificationPreferences)
      : {
          categories: {
            workouts: true,
            recovery: true,
            achievements: true,
            social: true,
            billing: true,
          },
          quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
          channels: { push: true, email: false },
        };

  return {
    categories: { ...base.categories, ...((patch.categories as object | undefined) ?? {}) },
    quietHours: { ...base.quietHours, ...((patch.quietHours as object | undefined) ?? {}) },
    channels: { ...base.channels, ...((patch.channels as object | undefined) ?? {}) },
  };
}

export default router;

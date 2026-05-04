// Notification Service — server-side notification management
//
// Sprint 2 BATCH 2 refactor: every helper now routes through
// notificationDispatcher.dispatch() so it benefits from category gating, quiet
// hours, push fan-out, and email fallback automatically. The helper signatures
// are unchanged — every existing call site (assignments.ts, clients.ts,
// gamification.ts, payments.ts, schedule.ts, solo.ts, webhooks.ts) keeps working.
//
// `createNotification` stays exported for backwards compatibility but is marked
// @deprecated. New code should use the typed `notify*` helpers below; Sprint 3
// will remove createNotification once the in-tree call site count drops to zero.
import { sql, eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { notifications } from '../../shared/schema';
import { dispatch } from './notificationDispatcher';
import type { NotificationType } from './notificationTemplates';

// Kept for legacy code paths; mirrors the post-Sprint 2 type set defined in
// notificationTemplates.ts (NotificationType). New types should be added there
// FIRST — this alias keeps existing imports compiling.
export type { NotificationType };

/**
 * @deprecated Sprint 2 — use a typed `notify*` helper below or call
 * `dispatch(userId, type, data)` directly from notificationDispatcher.
 *
 * Direct row insert that BYPASSES push delivery, category gating, and quiet
 * hours. Kept exported only because some legacy paths may still import it;
 * Sprint 3 will remove once verified unused.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  const database = await db;

  await database.insert(notifications).values({
    userId,
    type,
    title,
    message,
    data: data ?? null,
    read: false,
    // Mark delivered immediately — this legacy helper writes-only, no push.
    deliveredAt: new Date(),
  });
}

// Get notifications for a user (paginated)
export async function getUserNotifications(userId: string, limit: number = 30, offset: number = 0) {
  const database = await db;

  const results = await database
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  // Auto-expire time-sensitive notifications older than 24 hours
  return results.filter((n) => {
    if (n.type === 'streak_danger') {
      const ageHours = (Date.now() - new Date(n.createdAt).getTime()) / (1000 * 60 * 60);
      return ageHours < 24;
    }
    return true;
  });
}

// Get unread notification count
export async function getUnreadCount(userId: string): Promise<number> {
  const database = await db;

  const result = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

  return result[0]?.count || 0;
}

// Mark a single notification as read
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const database = await db;

  await database
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

// Mark all notifications as read for a user
export async function markAllAsRead(userId: string): Promise<void> {
  const database = await db;

  await database
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

// Clear all notifications for a user
export async function clearAllNotifications(userId: string): Promise<void> {
  const database = await db;

  await database.delete(notifications).where(eq(notifications.userId, userId));
}

// Delete old notifications (cleanup, keep last 90 days)
export async function cleanupOldNotifications(): Promise<void> {
  const database = await db;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  await database.delete(notifications).where(sql`${notifications.createdAt} < ${cutoff}`);
}

// ─── Typed notify* helpers (Sprint 2 — route through dispatcher) ────────────
// Each helper:
//   1. Optionally dedups against recent rows (streak_danger, session_reminder)
//   2. Calls dispatch(userId, type, data) — the row, push fan-out, gating, and
//      email fallback all happen there.
//
// Helper signatures preserved exactly so every call site (7 files, 11 invocations
// total) keeps compiling without edits.

export async function notifyWorkoutAssigned(
  clientUserId: string,
  trainerName: string,
  workoutTitle: string,
  assignmentId: string
): Promise<void> {
  await dispatch(clientUserId, 'workout_assigned', { trainerName, workoutTitle, assignmentId });
}

export async function notifyWorkoutCompleted(
  trainerUserId: string,
  clientName: string,
  workoutTitle: string,
  assignmentId: string
): Promise<void> {
  await dispatch(trainerUserId, 'workout_completed', { clientName, workoutTitle, assignmentId });
}

export async function notifyAchievementUnlocked(
  userId: string,
  achievementTitle: string,
  xpReward: number
): Promise<void> {
  await dispatch(userId, 'achievement_unlocked', { achievementTitle, xpReward });
}

export async function notifyStreakMilestone(
  userId: string,
  days: number,
  xpReward: number
): Promise<void> {
  await dispatch(userId, 'streak_milestone', { days, xpReward });
}

export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  newRank: string
): Promise<void> {
  await dispatch(userId, 'level_up', { newLevel, newRank });
}

export async function notifyPersonalRecord(
  userId: string,
  exerciseName: string,
  newRecord: string
): Promise<void> {
  await dispatch(userId, 'personal_record', { exerciseName, newRecord });
}

export async function notifyClientJoined(
  trainerUserId: string,
  clientName: string,
  clientId: string
): Promise<void> {
  await dispatch(trainerUserId, 'client_joined', { clientName, clientId });
}

export async function notifyPaymentReceived(
  trainerUserId: string,
  clientName: string,
  amountFormatted: string,
  paymentId: string
): Promise<void> {
  await dispatch(trainerUserId, 'payment_received', { clientName, amountFormatted, paymentId });
}

export async function notifyStreakDanger(
  userId: string,
  currentStreak: number,
  hoursRemaining: number
): Promise<void> {
  // Prevent duplicate streak danger notifications (check last 12 hours)
  const database = await db;
  const recent = await database
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, 'streak_danger'),
        sql`${notifications.createdAt} > now() - interval '12 hours'`
      )
    )
    .limit(1);

  if (recent.length > 0) return;

  await dispatch(userId, 'streak_danger', { currentStreak, hoursRemaining });
}

export async function notifyWeeklySummary(
  userId: string,
  stats: { workoutsCompleted: number; xpEarned: number; streakDays: number; prsSet: number }
): Promise<void> {
  // Sprint 2: use the proper `summary_weekly` type instead of the old
  // 'streak_milestone' hack. The template renders the title/body from data,
  // so callers don't need to format strings anymore.
  await dispatch(userId, 'summary_weekly', {
    workoutsCompleted: stats.workoutsCompleted,
    xpEarned: stats.xpEarned,
    streakDays: stats.streakDays,
    prsSet: stats.prsSet,
    // adherencePct is not currently computed by the caller — pass 0 so the
    // template renders a deterministic message; Sprint 8 (AI context) will
    // produce the real adherence figure.
    adherencePct: 0,
  });
}

export async function notifySessionReminder(
  userId: string,
  sessionTitle: string,
  startTime: string,
  appointmentId: string
): Promise<void> {
  // Prevent duplicate session reminders
  const database = await db;
  const recent = await database
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, 'session_reminder'),
        sql`${notifications.data}->>'appointmentId' = ${appointmentId}`
      )
    )
    .limit(1);

  if (recent.length > 0) return;

  await dispatch(userId, 'session_reminder', { sessionTitle, startTime, appointmentId });
}

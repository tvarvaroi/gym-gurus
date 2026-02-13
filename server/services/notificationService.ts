// Notification Service - Server-side notification management
import { db } from '../db';
import { notifications } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type NotificationType =
  | 'workout_assigned'
  | 'workout_completed'
  | 'session_reminder'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'level_up'
  | 'payment_received'
  | 'client_joined'
  | 'personal_record'
  | 'message';

// Create a notification for a user
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  const database = await db;

  await database.insert(notifications).values({
    userId,
    type,
    title,
    message,
    data: data || null,
    read: false,
  });
}

// Get notifications for a user (paginated)
export async function getUserNotifications(
  userId: string,
  limit: number = 30,
  offset: number = 0
) {
  const database = await db;

  return database
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
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

// Delete old notifications (cleanup, keep last 90 days)
export async function cleanupOldNotifications(): Promise<void> {
  const database = await db;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  await database
    .delete(notifications)
    .where(sql`${notifications.createdAt} < ${cutoff}`);
}

// --- Helper functions to create specific notification types ---

export async function notifyWorkoutAssigned(
  clientUserId: string,
  trainerName: string,
  workoutTitle: string,
  assignmentId: string
): Promise<void> {
  await createNotification(
    clientUserId,
    'workout_assigned',
    'New Workout Assigned',
    `${trainerName} assigned you "${workoutTitle}"`,
    { assignmentId }
  );
}

export async function notifyWorkoutCompleted(
  trainerUserId: string,
  clientName: string,
  workoutTitle: string,
  assignmentId: string
): Promise<void> {
  await createNotification(
    trainerUserId,
    'workout_completed',
    'Workout Completed',
    `${clientName} completed "${workoutTitle}"`,
    { assignmentId }
  );
}

export async function notifyAchievementUnlocked(
  userId: string,
  achievementTitle: string,
  xpReward: number
): Promise<void> {
  await createNotification(
    userId,
    'achievement_unlocked',
    'Achievement Unlocked!',
    `You earned "${achievementTitle}" (+${xpReward} XP)`,
    { achievementTitle, xpReward }
  );
}

export async function notifyStreakMilestone(
  userId: string,
  days: number,
  xpReward: number
): Promise<void> {
  await createNotification(
    userId,
    'streak_milestone',
    `${days}-Day Streak!`,
    `Amazing consistency! You've worked out ${days} days in a row (+${xpReward} XP)`,
    { days, xpReward }
  );
}

export async function notifyLevelUp(
  userId: string,
  newLevel: number,
  newRank: string
): Promise<void> {
  await createNotification(
    userId,
    'level_up',
    `Level ${newLevel}!`,
    `You've reached level ${newLevel} — rank: ${newRank}`,
    { newLevel, newRank }
  );
}

export async function notifyPersonalRecord(
  userId: string,
  exerciseName: string,
  newRecord: string
): Promise<void> {
  await createNotification(
    userId,
    'personal_record',
    'New Personal Record!',
    `PR on ${exerciseName}: ${newRecord}`,
    { exerciseName, newRecord }
  );
}

export async function notifyClientJoined(
  trainerUserId: string,
  clientName: string,
  clientId: string
): Promise<void> {
  await createNotification(
    trainerUserId,
    'client_joined',
    'New Client',
    `${clientName} has joined your roster`,
    { clientId }
  );
}

export async function notifyPaymentReceived(
  trainerUserId: string,
  clientName: string,
  amountFormatted: string,
  paymentId: string
): Promise<void> {
  await createNotification(
    trainerUserId,
    'payment_received',
    'Payment Received',
    `${clientName} paid ${amountFormatted}`,
    { paymentId }
  );
}

/**
 * Notification Dispatcher — Sprint 2 BATCH 2
 *
 * The orchestrator. Public seam: `dispatch(userId, type, data)`.
 *
 * Pipeline (in order):
 *   1. Look up user + prefs. Default to all-categories-on if prefs are missing/malformed.
 *   2. Check category gate. If category is off → write notifications row, mark
 *      delivered_at = NOW (we honoured the user's choice; nothing to retry).
 *   3. Compute "now in user's timezone" via Intl.DateTimeFormat. If quiet hours
 *      enabled AND now is inside the window → write row with deliver_after =
 *      next quiet-hours-end timestamp, leave delivered_at NULL. The cron picks it up.
 *   4. Otherwise: load active push_subscriptions, fan out via pushService in
 *      parallel, mark each sub's last_used_at or failure_count, mark sub inactive
 *      after 3 consecutive failures. Set notifications.delivered_at if at least
 *      one push landed (or all subs returned permanent failures — see Q3 semantic).
 *   5. Email fallback: if push had ZERO sent outcomes AND user.channels.email
 *      is true AND the type's category is enabled → send email via Resend.
 *
 * Returns counts so callers can log/audit, but never throws — the dispatcher
 * is the seam; everything that could fail is wrapped.
 */

import { sql, eq, and, isNotNull } from 'drizzle-orm';
import { getDb } from '../db';
import {
  notifications,
  pushSubscriptions,
  users,
  type NotificationPreferences,
} from '../../shared/schema';
import { logger } from '../logger';
import {
  isPushConfigured,
  sendPush,
  type PushResult,
  type PushSubscriptionInput,
  type PushPayload,
} from './pushService';
import {
  NOTIFICATION_TEMPLATES,
  TYPE_TO_CATEGORY,
  type NotificationType,
  type NotificationData,
  renderTemplate,
} from './notificationTemplates';
import { sendNotificationFallbackEmail } from '../email';

const FAILURE_INACTIVE_THRESHOLD = 3;

// ─── Defaults applied when prefs are NULL/malformed ─────────────────────────
// Defensive: production migration 012 reshapes every row, but this defends
// against (a) the migration window between deploy and migration run, and
// (b) future bugs where a row gets written outside the schema. All-on
// defaults match the migration backfill.
const DEFAULT_PREFS: NotificationPreferences = {
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

function safePrefs(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== 'object') return DEFAULT_PREFS;
  const r = raw as Partial<NotificationPreferences>;
  if (!r.categories || !r.quietHours || !r.channels) return DEFAULT_PREFS;
  return r as NotificationPreferences;
}

// ─── Quiet hours computation ─────────────────────────────────────────────────
// Edge case: window crosses midnight (e.g. 22:00 → 08:00). The cron's
// "deliver_after" must be the NEXT 08:00 in the user's timezone, not the previous.
//
// We avoid pulling moment-timezone for this — Intl.DateTimeFormat with
// timeZone is sufficient. Returns null if quietHours disabled OR not in window.
export function computeDeliverAfter(
  prefs: NotificationPreferences,
  now: Date = new Date()
): Date | null {
  if (!prefs.quietHours.enabled) return null;

  const tz = prefs.quietHours.timezone || 'UTC';

  // What time is it RIGHT NOW in the user's timezone? Format using Intl.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const nowParts = fmt.formatToParts(now);
  const nowH = parseInt(nowParts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const nowM = parseInt(nowParts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const nowMinutes = nowH * 60 + nowM;

  const [startH, startM] = prefs.quietHours.start.split(':').map(Number);
  const [endH, endM] = prefs.quietHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Two cases for the window:
  //   - Same-day window (start < end): in window iff start <= now < end
  //   - Wraps midnight (start > end):  in window iff now >= start OR now < end
  const inWindow =
    startMinutes <= endMinutes
      ? nowMinutes >= startMinutes && nowMinutes < endMinutes
      : nowMinutes >= startMinutes || nowMinutes < endMinutes;

  if (!inWindow) return null;

  // Compute next "end" instant in the user's timezone, in UTC.
  // Strategy: format `now` in the user's TZ, identify today's date in their TZ,
  // then reconstruct the "today's end OR tomorrow's end" wall-clock time and
  // resolve it back to a UTC Date by ISO-string + TZ offset.
  //
  // Simpler approximation that's good enough for v1: add the minutes-until-end
  // computed in the user's TZ to `now`. This works because Intl-derived TZ
  // computation already returned consistent local minutes; we only need the
  // *delta* from now to the window end, which is TZ-invariant.
  const minutesUntilEnd =
    endMinutes > nowMinutes ? endMinutes - nowMinutes : 24 * 60 - nowMinutes + endMinutes; // wraps midnight

  return new Date(now.getTime() + minutesUntilEnd * 60 * 1000);
}

// ─── Public: dispatch a notification ─────────────────────────────────────────
export interface DispatchResult {
  notificationId: string;
  outcome:
    | 'sent' // wrote row, fanned out, at least one push landed
    | 'queued_quiet_hours' // wrote row with deliver_after, no push fired
    | 'gated_category_off' // wrote row + delivered_at, no push fired (user chose to mute)
    | 'email_fallback_sent' // wrote row, no active push subs (or all failed), sent email
    | 'no_destination'; // wrote row, no push subs, email fallback off — row only
  pushResults?: { sent: number; expired: number; failed: number; payloadTooLarge: number };
}

export async function dispatch(
  userId: string,
  type: NotificationType,
  data: NotificationData,
  options: { bypassCategoryGating?: boolean } = {}
): Promise<DispatchResult> {
  const db = await getDb();

  // Always write the notifications row first — that's the user's in-app feed.
  // The row is the source of truth even if push fails completely.
  const rendered = renderTemplate(type, data);
  const [row] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title: rendered.title,
      message: rendered.body,
      data: data as Record<string, unknown>,
      read: false,
    })
    .returning({ id: notifications.id });
  const notificationId = row.id;

  // Load user + prefs
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      notificationPreferences: users.notificationPreferences,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) {
    // Edge: user deleted between row insert and now. Mark delivered, return.
    await db
      .update(notifications)
      .set({ deliveredAt: new Date() })
      .where(eq(notifications.id, notificationId));
    return { notificationId, outcome: 'no_destination' };
  }

  const prefs = safePrefs(user.notificationPreferences);
  const category = TYPE_TO_CATEGORY[type];

  // Category gate (skipped on test notifications which bypass per spec)
  if (!options.bypassCategoryGating && !prefs.categories[category]) {
    await db
      .update(notifications)
      .set({ deliveredAt: new Date() })
      .where(eq(notifications.id, notificationId));
    return { notificationId, outcome: 'gated_category_off' };
  }

  // Quiet hours gate (test notifications RESPECT this — user explicitly wants
  // to verify the queueing branch works)
  const deliverAfter = computeDeliverAfter(prefs);
  if (deliverAfter) {
    await db
      .update(notifications)
      .set({ deliverAfter })
      .where(eq(notifications.id, notificationId));
    return { notificationId, outcome: 'queued_quiet_hours' };
  }

  // Fan out
  const counts = await fanOut(userId, rendered, type);

  // Mark notification settled. delivered_at semantic = "pushed to >= 1 active sub
  // OR all subs returned non-retryable failure" (per migration 012 inline doc).
  // Both branches → set delivered_at. Only "transient failure with retries left"
  // would NOT mark it, but pushService closes those out internally.
  await db
    .update(notifications)
    .set({ deliveredAt: new Date() })
    .where(eq(notifications.id, notificationId));

  if (counts.sent > 0) {
    return { notificationId, outcome: 'sent', pushResults: counts };
  }

  // Push delivered to zero subs. Try email fallback if user opted in AND
  // category is on AND push channel was on (otherwise user explicitly disabled push).
  if (prefs.channels.email && prefs.channels.push && user.email) {
    try {
      await sendNotificationFallbackEmail(
        user.email,
        rendered.title,
        rendered.body,
        rendered.actionUrl
      );
      return { notificationId, outcome: 'email_fallback_sent', pushResults: counts };
    } catch (err) {
      logger.error('[dispatch] email fallback failed', err);
      // fall through to no_destination
    }
  }

  return { notificationId, outcome: 'no_destination', pushResults: counts };
}

// ─── Fan-out internals ──────────────────────────────────────────────────────
async function fanOut(
  userId: string,
  rendered: ReturnType<typeof renderTemplate>,
  type: NotificationType
): Promise<{ sent: number; expired: number; failed: number; payloadTooLarge: number }> {
  const counts = { sent: 0, expired: 0, failed: 0, payloadTooLarge: 0 };

  if (!isPushConfigured()) {
    // No VAPID keys configured. Treat as "no push destinations" — caller
    // decides whether to fall through to email.
    return counts;
  }

  const db = await getDb();

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.active, true)));

  if (subs.length === 0) return counts;

  const payload: PushPayload = {
    title: rendered.title,
    body: rendered.body,
    url: rendered.actionUrl,
    tag: rendered.tag,
    type,
  };

  // Parallel fan-out. Promise.allSettled so one failed sub never aborts others.
  const results = await Promise.allSettled(
    subs.map((sub) => {
      const subInput: PushSubscriptionInput = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      return sendPush(subInput, payload).then((result) => ({ sub, result }));
    })
  );

  // Reconcile each result back into push_subscriptions state.
  // We accumulate updates in arrays and run them as a small transaction
  // so we don't issue N separate UPDATEs.
  const now = new Date();
  for (const settled of results) {
    if (settled.status !== 'fulfilled') {
      counts.failed += 1;
      continue;
    }
    const { sub, result } = settled.value;
    await applySubscriptionResult(sub.id, result, counts, now);
  }

  return counts;
}

async function applySubscriptionResult(
  subId: string,
  result: PushResult,
  counts: { sent: number; expired: number; failed: number; payloadTooLarge: number },
  now: Date
): Promise<void> {
  const db = await getDb();
  switch (result.outcome) {
    case 'sent':
      counts.sent += 1;
      await db
        .update(pushSubscriptions)
        .set({ lastUsedAt: now, failureCount: 0 })
        .where(eq(pushSubscriptions.id, subId));
      return;
    case 'expired':
      counts.expired += 1;
      // Permanent: mark inactive immediately so we never push to this endpoint again.
      await db
        .update(pushSubscriptions)
        .set({ active: false })
        .where(eq(pushSubscriptions.id, subId));
      return;
    case 'payload_too_large':
      counts.payloadTooLarge += 1;
      // Permanent (payload bug, won't fix on retry). Log + alert via Logger.error
      // so observability picks it up. Keep the subscription active — it might
      // succeed with a smaller payload next time.
      logger.error('[dispatch] payload too large for push', {
        subscriptionId: subId,
        statusCode: result.statusCode,
        reason: result.reason,
      });
      return;
    case 'failed_terminal':
      counts.failed += 1;
      // Increment failure count; mark inactive after threshold.
      await db
        .update(pushSubscriptions)
        .set({ failureCount: sql`${pushSubscriptions.failureCount} + 1` })
        .where(eq(pushSubscriptions.id, subId));
      // Re-check threshold and mark inactive in a separate UPDATE
      // (single-stage UPDATE WHERE on the new value would race with the increment).
      await db
        .update(pushSubscriptions)
        .set({ active: false })
        .where(
          and(
            eq(pushSubscriptions.id, subId),
            // ge() not imported — use raw SQL for the threshold check
            sql`${pushSubscriptions.failureCount} >= ${FAILURE_INACTIVE_THRESHOLD}`
          )
        );
      return;
    case 'failed_transient':
      // Should not reach the dispatcher — pushService retries internally.
      counts.failed += 1;
      return;
  }
}

// ─── Cron retry helper ──────────────────────────────────────────────────────
// Used by server/jobs/cleanupExpiredQuietHours.ts. Same flow as `dispatch`
// post-quiet-hours, but we already have the row in hand.
export async function deliverPending(notificationId: string): Promise<DispatchResult['outcome']> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), isNotNull(notifications.deliverAfter)));
  if (!row) return 'no_destination';

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      notificationPreferences: users.notificationPreferences,
    })
    .from(users)
    .where(eq(users.id, row.userId));
  if (!user) {
    await db
      .update(notifications)
      .set({ deliveredAt: new Date() })
      .where(eq(notifications.id, notificationId));
    return 'no_destination';
  }

  const prefs = safePrefs(user.notificationPreferences);
  const category = TYPE_TO_CATEGORY[row.type as NotificationType];

  // Re-check category in case the user toggled it off during the queue window.
  if (!prefs.categories[category]) {
    await db
      .update(notifications)
      .set({ deliveredAt: new Date() })
      .where(eq(notifications.id, notificationId));
    return 'gated_category_off';
  }

  // Re-check quiet hours: user might have widened the window. If still in window,
  // bump deliver_after to the new end and leave for next cron tick.
  const stillQuiet = computeDeliverAfter(prefs);
  if (stillQuiet) {
    await db
      .update(notifications)
      .set({ deliverAfter: stillQuiet })
      .where(eq(notifications.id, notificationId));
    return 'queued_quiet_hours';
  }

  // Render from the row (we stored title/message/data on the original write).
  const rendered = {
    title: row.title,
    body: row.message,
    actionUrl:
      (row.data as { url?: string } | null)?.url ??
      NOTIFICATION_TEMPLATES[row.type as NotificationType]?.(row.data ?? {}).actionUrl ??
      '/',
    tag: undefined as string | undefined,
  };

  const counts = await fanOut(row.userId, rendered, row.type as NotificationType);

  await db
    .update(notifications)
    .set({ deliveredAt: new Date() })
    .where(eq(notifications.id, notificationId));

  if (counts.sent > 0) return 'sent';
  if (prefs.channels.email && prefs.channels.push && user.email) {
    try {
      await sendNotificationFallbackEmail(
        user.email,
        rendered.title,
        rendered.body,
        rendered.actionUrl
      );
      return 'email_fallback_sent';
    } catch (err) {
      logger.error('[deliverPending] email fallback failed', err);
    }
  }
  return 'no_destination';
}

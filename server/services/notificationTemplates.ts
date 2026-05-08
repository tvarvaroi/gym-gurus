/**
 * Notification Templates — Sprint 2 BATCH 2
 *
 * Single source of truth for:
 *   1. The closed set of notification types we ship
 *   2. The type → category mapping (drives user-facing toggles)
 *   3. Per-type rendering: title, body, action URL
 *
 * Why one file: a notification's type and category MUST move together. If a new
 * type ships and the category map isn't updated, the type silently bypasses
 * category gating in the dispatcher (= unblockable notifications). To prevent
 * this, the TYPE_TO_CATEGORY map uses `satisfies Record<NotificationType, NotificationCategory>`
 * — TypeScript's compile-time exhaustiveness check catches missing mappings at
 * build time, not runtime.
 *
 * Adding a new type:
 *   1. Add it to `NOTIFICATION_TYPES` tuple below.
 *   2. Add the matching entry in `TYPE_TO_CATEGORY` (TS will fail the build
 *      until you do).
 *   3. Add the matching entry in `NOTIFICATION_TEMPLATES` (TS will fail the
 *      build until you do).
 *   4. If the type maps to a NEW category, also add it to NOTIFICATION_CATEGORIES
 *      in shared/schema.ts.
 *
 * The 11 existing types preserve their snake_case strings (Q2 decision —
 * see _brain/notes/decisions.md). The 5 new types from the Sprint 2 brief
 * (workout_reminder, workout_missed, recovery_low, sleep_summary, summary_weekly)
 * are added with parallel snake_case naming.
 */

import type { NotificationCategory } from '../../shared/schema';

// ─── Closed type set ─────────────────────────────────────────────────────────
export const NOTIFICATION_TYPES = [
  // Existing (Sprint 1 and earlier)
  'workout_assigned',
  'workout_completed',
  'session_reminder',
  'achievement_unlocked',
  'streak_milestone',
  'streak_danger',
  'level_up',
  'personal_record',
  'client_joined',
  'payment_received',
  'message',
  // New (Sprint 2)
  'workout_reminder',
  'workout_missed',
  'recovery_low',
  'sleep_summary',
  'summary_weekly',
  // New (Sprint 3 — wellness check-in)
  'wellness_daily_nudge',
  'wellness_reengagement_7day',
  // New (Sprint 4 — wearable integration)
  'wearable_connected',
  'wearable_sync_failed',
  'wearable_expired',
  'wearable_first_sync_complete',
  // New (Sprint 5 — Apple Health import)
  'apple_health_import_complete',
  'apple_health_import_failed',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ─── Type → category exhaustive map ──────────────────────────────────────────
// `satisfies` enforces that EVERY NotificationType has a category. Adding a
// type to NOTIFICATION_TYPES without a matching entry here = build error.
//
// Sprint 1 categories (workouts/recovery/achievements/social/billing) —
// see NOTIFICATION_CATEGORIES in shared/schema.ts.
export const TYPE_TO_CATEGORY = {
  workout_assigned: 'workouts',
  workout_completed: 'social', // trainer-facing: a client finished their work
  session_reminder: 'workouts',
  achievement_unlocked: 'achievements',
  streak_milestone: 'achievements',
  streak_danger: 'achievements',
  level_up: 'achievements',
  personal_record: 'achievements',
  client_joined: 'social',
  payment_received: 'billing',
  message: 'social',
  workout_reminder: 'workouts',
  workout_missed: 'workouts',
  recovery_low: 'recovery',
  sleep_summary: 'recovery',
  summary_weekly: 'achievements',
  // Sprint 3 wellness — both map to 'recovery' so they obey the same user toggle
  // as recovery alerts. Quiet hours apply naturally via the dispatcher.
  wellness_daily_nudge: 'recovery',
  wellness_reengagement_7day: 'recovery',
  // Sprint 4 wearable lifecycle notifications. All map to 'social' per Sprint 4
  // BATCH 2 spec — they're informational events about the user's accounts
  // (parallel to client_joined and message), not workout/recovery/billing.
  // Users can mute the whole 'social' category to silence them.
  wearable_connected: 'social',
  wearable_sync_failed: 'social',
  wearable_expired: 'social',
  wearable_first_sync_complete: 'social',
  // Sprint 5 — Apple Health import lifecycle. Mapped to 'social' to mirror
  // the wearable lifecycle category (informational events about the user's
  // own data flows). Users can mute the whole 'social' category to silence
  // both. Email backup is NOT eligible — see EMAIL_FALLBACK_HIGH_PRIORITY_TYPES.
  apple_health_import_complete: 'social',
  apple_health_import_failed: 'social',
} as const satisfies Record<NotificationType, NotificationCategory>;

export function categoryForType(type: NotificationType): NotificationCategory {
  return TYPE_TO_CATEGORY[type];
}

// ─── Email fallback allowlist ────────────────────────────────────────────────
// Only types in this set trigger an email when ALL push deliveries fail AND the
// user has channels.email = true. The set is deliberately narrow: critical
// notifications a user should never miss even if every device push expires
// (e.g. payment, security, trainer-assigned workout for a Disciple). Marketing
// and social notifications are excluded — those are nice-to-have, not critical.
//
// Compile-time exhaustive: every type listed here must be a valid NotificationType,
// enforced via `satisfies readonly NotificationType[]`. Adding a new type here is
// a quiet decision — make sure the type really is critical-path before doing it.
//
// Settings UI: tooltip on the "Email backup" toggle says "high-priority alerts only".
// That phrasing maps to this list.
export const EMAIL_FALLBACK_HIGH_PRIORITY_TYPES = [
  'workout_assigned', // Disciple-blocking — they need to know to train
  'payment_received', // Trainer revenue event — billing-critical
  'session_reminder', // Imminent appointment — operationally critical
  // NOTE: wellness_daily_nudge and wellness_reengagement_7day are deliberately
  // EXCLUDED from this allowlist. They are soft prompts ("how are you feeling
  // today?", "still with us?") — emailing them would feel spammy and dilute the
  // "email = critical" signal. Wellness nudges stay push-only. If push fails on
  // every device, the user just doesn't see the nudge that day — no harm done.
  // See `_brain/notes/decisions.md` Sprint 3 entry.
] as const satisfies readonly NotificationType[];

export type EmailFallbackHighPriorityType = (typeof EMAIL_FALLBACK_HIGH_PRIORITY_TYPES)[number];

export function isEmailFallbackEligible(type: NotificationType): boolean {
  return (EMAIL_FALLBACK_HIGH_PRIORITY_TYPES as readonly string[]).includes(type);
}

// ─── Templates ───────────────────────────────────────────────────────────────
// Each template renders to:
//   - title   (required, short headline)
//   - body    (required, one-line message)
//   - actionUrl (required, where notification click lands)
//   - tag     (optional, deduplication key — same tag replaces previous push)
//
// Templates are pure functions of `data`. The dispatcher calls renderTemplate(type, data)
// and passes the result to pushService.sendPush as the payload.

export interface NotificationData {
  // Free-form per-type data. Documented per template below.
  [k: string]: unknown;
}

export interface RenderedTemplate {
  title: string;
  body: string;
  actionUrl: string;
  tag?: string;
}

type Renderer = (data: NotificationData) => RenderedTemplate;

// Helper: safely pull a string from data, fallback to ''
const s = (d: NotificationData, key: string, fallback = ''): string => {
  const v = d[key];
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
};
const n = (d: NotificationData, key: string, fallback = 0): number => {
  const v = d[key];
  return typeof v === 'number' ? v : fallback;
};
// Capitalize first letter of provider/dataType strings for display.
const capitalize = (str: string): string => (str ? str[0].toUpperCase() + str.slice(1) : str);

export const NOTIFICATION_TEMPLATES = {
  workout_assigned: (d) => ({
    title: 'New workout assigned',
    body: `${s(d, 'trainerName', 'Your trainer')} assigned you "${s(d, 'workoutTitle', 'a new workout')}"`,
    actionUrl: '/workouts/today',
    tag: `workout_assigned:${s(d, 'assignmentId')}`,
  }),
  workout_completed: (d) => ({
    title: 'Workout completed',
    body: `${s(d, 'clientName', 'A client')} completed "${s(d, 'workoutTitle', 'their workout')}"`,
    actionUrl: '/clients',
    tag: `workout_completed:${s(d, 'assignmentId')}`,
  }),
  session_reminder: (d) => ({
    title: 'Session starting soon',
    body: `"${s(d, 'sessionTitle', 'Your session')}" starts at ${s(d, 'startTime', 'soon')}`,
    actionUrl: '/schedule',
    tag: `session_reminder:${s(d, 'appointmentId')}`,
  }),
  achievement_unlocked: (d) => ({
    title: 'Achievement unlocked!',
    body: `You earned "${s(d, 'achievementTitle', 'an achievement')}" (+${n(d, 'xpReward')} XP)`,
    actionUrl: '/achievements',
    tag: `achievement:${s(d, 'achievementTitle')}`,
  }),
  streak_milestone: (d) => ({
    title: `${n(d, 'days')}-day streak!`,
    body: `${n(d, 'days')} workouts in a row. You're a machine.`,
    actionUrl: '/achievements',
    tag: `streak:${n(d, 'days')}`,
  }),
  streak_danger: (d) => ({
    title: 'Streak in danger!',
    body: `Your ${n(d, 'currentStreak')}-day streak expires in ~${Math.round(n(d, 'hoursRemaining'))}h. Work out to keep it alive!`,
    actionUrl: '/dashboard',
    tag: 'streak_danger', // single tag → only the most recent danger notification stays
  }),
  level_up: (d) => ({
    title: `Level ${n(d, 'newLevel')}!`,
    body: `You've reached level ${n(d, 'newLevel')} — rank: ${s(d, 'newRank')}`,
    actionUrl: '/achievements',
    tag: `level_up:${n(d, 'newLevel')}`,
  }),
  personal_record: (d) => ({
    title: 'New Personal Record!',
    body: `PR on ${s(d, 'exerciseName', 'an exercise')}: ${s(d, 'newRecord')}`,
    actionUrl: '/progress',
    tag: `pr:${s(d, 'exerciseName')}`,
  }),
  client_joined: (d) => ({
    title: 'New Disciple joined',
    body: `${s(d, 'clientName', 'A new client')} accepted your invitation`,
    actionUrl: '/clients',
    tag: `client_joined:${s(d, 'clientId')}`,
  }),
  payment_received: (d) => ({
    title: 'Payment received',
    body: `${s(d, 'amountFormatted', 'A payment')} from ${s(d, 'clientName', 'a client')}`,
    actionUrl: '/payments',
    tag: `payment:${s(d, 'paymentId')}`,
  }),
  message: (d) => ({
    title: `Message from ${s(d, 'senderName', 'someone')}`,
    body: s(d, 'preview', 'New message'),
    actionUrl: s(d, 'messageId') ? `/messages/${s(d, 'messageId')}` : '/messages',
    tag: `message:${s(d, 'messageId')}`,
  }),
  workout_reminder: (d) => ({
    title: 'Time to train',
    body: `${s(d, 'workoutTitle', 'Your workout')} starts in ${n(d, 'minutes', 30)} minutes`,
    actionUrl: '/workouts/today',
    tag: `workout_reminder:${s(d, 'assignmentId')}`,
  }),
  workout_missed: (d) => ({
    title: `You missed ${s(d, 'workoutTitle', 'a workout')}`,
    body: 'Reschedule or skip — your call.',
    actionUrl: '/programs/active',
    tag: `workout_missed:${s(d, 'assignmentId')}`,
  }),
  recovery_low: (d) => ({
    title: 'Low recovery alert',
    body: `Your readiness is ${n(d, 'readinessPct')}%. Consider a deload today.`,
    actionUrl: '/dashboard',
    tag: 'recovery_low', // single tag — only the latest alert stays
  }),
  sleep_summary: (d) => ({
    title: "Last night's sleep",
    body: `${n(d, 'hours')}h, ${n(d, 'qualityPct')}% quality. Sleep score ${n(d, 'score')}.`,
    actionUrl: '/biometrics?tab=trends',
    tag: 'sleep_summary', // daily, single tag — only today's summary stays
  }),
  summary_weekly: (d) => ({
    title: 'Weekly summary',
    body: `${n(d, 'workoutsCompleted')} workouts, ${n(d, 'prsSet')} PRs, ${n(d, 'adherencePct')}% adherence`,
    actionUrl: '/dashboard',
    tag: 'summary_weekly',
  }),
  // Sprint 3 — wellness check-in nudges. Both use single tags so a second
  // dispatch on the same user-day collapses on the OS notification tray
  // rather than stacking duplicate banners.
  wellness_daily_nudge: () => ({
    title: 'How are you feeling today?',
    body: '30 seconds — slide a few sliders, feed your AI coach.',
    actionUrl: '/wellness',
    tag: 'wellness_daily_nudge',
  }),
  wellness_reengagement_7day: () => ({
    title: 'Still with us?',
    body: '7 days since your last check-in. We miss the data.',
    actionUrl: '/wellness',
    tag: 'wellness_reengagement_7day',
  }),
  // Sprint 4 — wearable lifecycle notifications. Tag uses provider so different
  // providers get distinct entries on the OS notification tray (a Whoop expiry
  // banner shouldn't replace an Oura sync-failed banner).
  wearable_connected: (d) => ({
    title: `${capitalize(s(d, 'provider'))} connected`,
    body: "We'll start syncing your sleep, HRV, and recovery.",
    actionUrl: '/settings?tab=integrations',
    tag: `wearable_connected:${s(d, 'provider')}`,
  }),
  wearable_sync_failed: (d) => ({
    title: `${capitalize(s(d, 'provider'))} sync failed`,
    body: `Reconnect ${capitalize(s(d, 'provider'))} in Settings.`,
    actionUrl: '/settings?tab=integrations',
    tag: `wearable_sync_failed:${s(d, 'provider')}`,
  }),
  wearable_expired: (d) => ({
    title: `${capitalize(s(d, 'provider'))} connection expired`,
    body: 'Reconnect to keep your data flowing.',
    actionUrl: '/settings?tab=integrations',
    tag: `wearable_expired:${s(d, 'provider')}`,
  }),
  wearable_first_sync_complete: (d) => ({
    title: 'First sync complete',
    body: `We pulled ${n(d, 'days', 1)} days of your ${s(d, 'dataType', 'wearable')} data. View it now.`,
    actionUrl: '/biometrics?tab=trends',
    tag: `wearable_first_sync_complete:${s(d, 'dataType')}`,
  }),
  // Sprint 5 — Apple Health import lifecycle. Tag is single-per-import-id so
  // the OS notification tray collapses duplicates if dispatch fires twice
  // for the same import (cron retry edge cases).
  apple_health_import_complete: (d) => ({
    title: 'Apple Health import complete',
    body: `${n(d, 'recordsTotal')} records${
      s(d, 'dateRange') ? ` across ${s(d, 'dateRange')}` : ''
    }. View your trends.`,
    actionUrl: '/biometrics?tab=trends',
    tag: `apple_health_import_complete:${s(d, 'importId')}`,
  }),
  apple_health_import_failed: (d) => ({
    title: 'Apple Health import failed',
    body: 'Tap for details — most issues are file size or format.',
    actionUrl: '/settings?tab=imports',
    tag: `apple_health_import_failed:${s(d, 'importId')}`,
  }),
} as const satisfies Record<NotificationType, Renderer>;

export function renderTemplate(type: NotificationType, data: NotificationData): RenderedTemplate {
  return NOTIFICATION_TEMPLATES[type](data);
}

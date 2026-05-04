/**
 * Push Service — Sprint 2 BATCH 2
 *
 * Thin wrapper around the `web-push` library. Owns VAPID setup, payload
 * encryption, and the response-code → outcome mapping that the dispatcher and
 * cron retry job both depend on.
 *
 * What this file is NOT:
 *   - Not the dispatcher: doesn't load user prefs, doesn't gate on categories
 *     or quiet hours, doesn't write the notifications row. Those are in
 *     notificationDispatcher.ts.
 *   - Not a queue: each call is a single, synchronous-ish (one HTTP attempt
 *     plus retries) push. Concurrency lives in the dispatcher's Promise.allSettled.
 *
 * Why MPL-2.0 web-push is acceptable: see _brain/notes/decisions.md
 * "web-push MPL-2.0 dependency accepted (2026-05-05, Sprint 2 BATCH 1)".
 */

import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

// VAPID setup happens on first sendPush call, not at module load. Reason:
// migration scripts and tests can import this module without crashing on a
// missing private key in environments where push isn't configured. The
// dispatcher checks isPushConfigured() before invoking sendPush.
let vapidConfigured = false;

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
}

function ensureVapid(): void {
  if (vapidConfigured) return;
  if (!isPushConfigured()) {
    throw new Error(
      'Push not configured: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT must all be set'
    );
  }
  webpush.setVapidDetails(VAPID_SUBJECT!, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  vapidConfigured = true;
}

// ─── HTTP response → outcome mapping (Sprint 2 user spec) ───────────────────
// The cron retry job and the dispatcher use this constant — DO NOT scatter
// equivalent if/else logic elsewhere. Update the constant if the spec changes.
//
// PERMANENT (close out — mark subscription inactive, mark notification delivered):
//   410 Gone           — push service revoked the subscription (uninstall, denial, expiry)
//   404 Not Found      — subscription endpoint no longer exists
//   413 Payload Too Large — our payload exceeded service's max; retry won't fix
//                        (also alerted because it indicates a payload bug)
//
// TRANSIENT (retry with exponential backoff up to MAX_RETRY_ATTEMPTS):
//   429 Too Many Requests   — rate-limited, honour Retry-After if provided
//   500–599 server errors   — push service degraded
//   network errors / DNS    — transport-level failures
//
// Any other 4xx (e.g. 400, 401, 403) is treated as PERMANENT but logged as an
// error — these usually mean a payload or auth bug we should fix in code.
export const PUSH_RESPONSE_OUTCOMES = {
  permanentExpired: [404, 410],
  permanentPayloadTooLarge: [413],
  transientRetry: [429, 500, 501, 502, 503, 504, 505],
} as const;

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [250, 1000, 4000] as const;

export type PushResult =
  | { outcome: 'sent'; statusCode: number }
  | { outcome: 'expired'; statusCode: number; reason: string }
  | { outcome: 'payload_too_large'; statusCode: number; reason: string }
  | { outcome: 'failed_terminal'; statusCode?: number; reason: string }
  | { outcome: 'failed_transient'; reason: string }; // never returned by sendPush — only used internally between retries

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  /** URL to open when notification is clicked (action_url). */
  url?: string;
  /** Tag — same tag replaces previous notification (deduplication). */
  tag?: string;
  /** Type slug — passed through to client SW so it can route by type if needed. */
  type?: string;
  /** Free-form data; the SW echoes this into notification.data. */
  data?: Record<string, unknown>;
}

/**
 * Send a single push notification with retry on transient failure.
 *
 * Returns a settled outcome:
 *   - sent              — at least one HTTP 2xx response
 *   - expired           — 404/410, caller should mark subscription inactive
 *   - payload_too_large — 413, caller should log + alert + mark delivered
 *   - failed_terminal   — non-retryable 4xx OR all 3 retries exhausted on transient
 *
 * NEVER throws — failures are returned as outcomes. Caller (dispatcher) decides
 * the next step based on the outcome.
 */
export async function sendPush(
  subscription: PushSubscriptionInput,
  payload: PushPayload
): Promise<PushResult> {
  ensureVapid();

  const body = JSON.stringify(payload);

  let lastError: { statusCode?: number; reason: string } | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // web-push.sendNotification resolves on 2xx, throws WebPushError on non-2xx.
      const result = await webpush.sendNotification(subscription, body);
      // statusCode is on the resolved object for 2xx
      return { outcome: 'sent', statusCode: (result as { statusCode?: number }).statusCode ?? 201 };
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string; body?: string };
      const statusCode = e.statusCode;
      const reason = e.message ?? 'unknown push error';

      // Permanent: subscription expired
      if (statusCode && PUSH_RESPONSE_OUTCOMES.permanentExpired.includes(statusCode as 404 | 410)) {
        return { outcome: 'expired', statusCode, reason };
      }

      // Permanent: payload too large
      if (statusCode === 413) {
        return { outcome: 'payload_too_large', statusCode, reason };
      }

      // Transient: retry with exponential backoff if we haven't exhausted attempts
      const isTransient =
        !statusCode ||
        (PUSH_RESPONSE_OUTCOMES.transientRetry as readonly number[]).includes(statusCode);

      if (isTransient && attempt < MAX_RETRY_ATTEMPTS - 1) {
        lastError = { statusCode, reason };
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS[attempt]));
        continue;
      }

      // Non-retryable 4xx (400/401/403/etc.) OR exhausted retries on transient.
      return { outcome: 'failed_terminal', statusCode, reason };
    }
  }

  // Defensive: unreachable in normal flow because the loop returns on every path,
  // but TypeScript can't prove that. Treat as terminal.
  return {
    outcome: 'failed_terminal',
    reason: lastError?.reason ?? 'retries exhausted',
    statusCode: lastError?.statusCode,
  };
}

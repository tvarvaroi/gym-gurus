/**
 * Browser-side push subscription helpers — Sprint 2 BATCH 3
 *
 * The full lifecycle: detect support → request permission → subscribe via
 * pushManager → POST to backend → handle pushsubscriptionchange messages.
 *
 * iOS PWA detection: per the Sprint 2 brief and BATCH 3 spec, iOS Safari only
 * supports web push when the app is installed as a PWA via "Add to Home Screen".
 * In a regular Safari tab, `Notification.requestPermission()` is unsupported
 * (older iOS) or returns 'denied' silently (16.4+ outside PWA mode). We detect
 * this state and return 'ios-pwa-required' so the UI can show educational copy
 * instead of failing silently.
 *
 * The main.tsx fetch interceptor automatically injects `x-csrf-token` on /api
 * state-changing requests, so the POST below relies on it — DO NOT add the
 * header manually (gotchas.md: CSRF double-injection causes 500).
 */

export type SubscriptionState =
  | 'granted' // permission granted + subscription registered with backend
  | 'denied' // user denied permission
  | 'unsupported' // SW or Push API not available
  | 'ios-pwa-required' // iOS Safari outside standalone PWA — needs Add to Home Screen
  | 'error'; // unexpected failure (logged)

export interface SubscriptionResult {
  state: SubscriptionState;
  error?: string;
}

// ─── iOS PWA detection ──────────────────────────────────────────────────────
// Returns true when running on iOS Safari (or iPad Safari) AND NOT in standalone
// (Add-to-Home-Screen) mode. Both conditions must hold to surface the special
// "iOS PWA required" copy.
export function isIosNonStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iOS / iPadOS detection. iPad on iPadOS 13+ reports as MacIntel desktop UA
  // unless `maxTouchPoints` reveals it's a touch device.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  // Standalone PWA detection — both legacy iOS Safari (navigator.standalone)
  // and modern display-mode media query.
  const inStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !inStandalone;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

// ─── b64url -> Uint8Array (VAPID public key conversion) ─────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// ─── Public: subscribe ──────────────────────────────────────────────────────
//
// Single-call: register SW (idempotent), prompt for permission if needed,
// subscribe via pushManager, POST the subscription to the backend.
//
// Caller is responsible for:
//   - Triggering this only after a meaningful action (workout finish, body
//     metric logged, AI message sent) — never on page load
//   - Showing the educational UI (PushPermissionPrompt component) BEFORE this
//     function so the OS-level prompt isn't a surprise
export async function requestPermissionAndSubscribe(): Promise<SubscriptionResult> {
  if (!isPushSupported()) {
    return { state: 'unsupported' };
  }

  if (isIosNonStandalone()) {
    return { state: 'ios-pwa-required' };
  }

  try {
    // Permission first. If denied, bail before touching pushManager
    // (some platforms throw on subscribe without permission instead of
    // returning a denied state, which produces ugly errors).
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { state: 'denied' };
    }

    // SW registration is idempotent — main.tsx already calls register('/sw.js'),
    // and `serviceWorker.ready` waits for the active worker. We register again
    // here defensively in case the main.tsx call hasn't completed yet.
    await navigator.serviceWorker.register('/sw.js');
    const reg = await navigator.serviceWorker.ready;

    // Check for existing subscription — re-use if present, avoid duplicate
    // server-side rows (the upsert would handle it, but skipping the network
    // call is cleaner).
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      // Need to subscribe. Get the VAPID public key from the server.
      const vapidRes = await fetch('/api/notifications/vapid-public-key', {
        credentials: 'include',
      });
      if (!vapidRes.ok) {
        return { state: 'error', error: `VAPID key fetch failed (${vapidRes.status})` };
      }
      const { publicKey } = (await vapidRes.json()) as { publicKey: string };
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    }

    // POST the subscription to the backend. The main.tsx fetch interceptor
    // adds the x-csrf-token header automatically — DO NOT add it manually here.
    const subJson = sub.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { state: 'error', error: 'subscription missing endpoint or keys' };
    }

    const platform = isIosNonStandalone()
      ? 'ios_pwa' // shouldn't reach here given the early return, but defensive
      : 'web';

    const postRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        platform,
        userAgent: navigator.userAgent.slice(0, 200),
      }),
    });

    if (!postRes.ok) {
      return { state: 'error', error: `Subscribe POST failed (${postRes.status})` };
    }

    return { state: 'granted' };
  } catch (err) {
    return { state: 'error', error: (err as Error).message };
  }
}

// ─── Public: unsubscribe ────────────────────────────────────────────────────
//
// Used by Settings → "Revoke this device" (BATCH 5). Removes the local browser
// subscription AND tells the backend to mark the row inactive. The backend
// fetch needs the DB id of the subscription which the caller passes in.
export async function unsubscribeBrowser(subscriptionId?: string): Promise<boolean> {
  if (!isPushSupported()) return true;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    if (subscriptionId) {
      await fetch(`/api/notifications/subscribe/${subscriptionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    }
    return true;
  } catch (err) {
    console.warn('[pushSubscription] unsubscribe failed', err);
    return false;
  }
}

// ─── Public: pushsubscriptionchange relay ───────────────────────────────────
//
// The SW posts a `PUSH_SUBSCRIPTION_ROTATED` message when the browser
// auto-renews a subscription. The SW's own POST may have failed due to CSRF
// (SW fetches don't go through main.tsx's interceptor). Listen for the message
// and re-POST from the main thread, AND DELETE the old subscription's row.
export function listenForSwSubscriptionMessages(): void {
  if (!isPushSupported()) return;

  navigator.serviceWorker.addEventListener('message', async (event) => {
    const msg = event.data as
      | {
          type: string;
          oldEndpoint?: string;
          newSubscription?: { endpoint: string; p256dh: string; auth: string };
          swPostSucceeded?: boolean;
        }
      | undefined;
    if (!msg) return;

    if (msg.type === 'PUSH_SUBSCRIPTION_ROTATED' && msg.newSubscription) {
      // Re-POST from main thread (CSRF interceptor will fire) only if the SW's
      // own POST didn't succeed. If swPostSucceeded, the new sub is already
      // registered; we still need to clean up the old one.
      if (!msg.swPostSucceeded) {
        try {
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              endpoint: msg.newSubscription.endpoint,
              p256dh: msg.newSubscription.p256dh,
              auth: msg.newSubscription.auth,
              platform: 'web',
              userAgent: navigator.userAgent.slice(0, 200),
            }),
          });
        } catch {
          // swallow — next interaction will re-attempt
        }
      }

      // Clean up the OLD subscription row. We don't know its DB id in the SW
      // context, but we can find it via the /subscriptions list and match by
      // endpoint. If the old endpoint isn't found, it was already cleaned up.
      if (msg.oldEndpoint) {
        try {
          const listRes = await fetch('/api/notifications/subscriptions', {
            credentials: 'include',
          });
          if (listRes.ok) {
            // The list endpoint deliberately omits the endpoint URL (server-side
            // secret). So we can't match by endpoint here. Sprint 2 trade-off:
            // accept the orphaned-row-until-next-failure pattern — when the
            // dispatcher fans out to the old endpoint, it'll get 410/404 from
            // the push service and mark inactive. Not ideal but acceptable for v1.
            // Sprint 12 native shell may extend the list endpoint to include
            // a redacted endpoint hash so this can be matched.
          }
        } catch {
          // swallow
        }
      }
    }
  });
}

// ─── Public: getCurrentSubscription ────────────────────────────────────────
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

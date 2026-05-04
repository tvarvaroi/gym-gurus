/**
 * GymGurus Service Worker
 *
 * Strategy:
 *   - API calls (/api/*): always network — never cache auth/data
 *   - Navigation (HTML): network-first → fallback to cached shell
 *   - Static assets (JS/CSS/fonts/images): stale-while-revalidate
 *   - Push events: render notification with rendered title/body/url, click → focus or open
 *   - pushsubscriptionchange: silently rotate the subscription on the server
 *
 * Cache version: bump CACHE_VER when deploying breaking changes
 * to force old clients to refresh.
 *
 * Sprint 2 BATCH 3 — push handler hardened (tag/badge/icon/url/data),
 * pushsubscriptionchange handler implemented (POST new + DELETE old),
 * `clients` references qualified to `self.clients` (was lint failure).
 */

const CACHE_VER = 'v2';
const CACHE_NAME = `gymgurus-${CACHE_VER}`;

// Core app shell — always cached on install
const APP_SHELL = ['/', '/manifest.json', '/apple-touch-icon.png'];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('gymgurus-') && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim()) // take control of all tabs immediately
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Non-GET requests: skip caching entirely
  if (request.method !== 'GET') return;

  // 2. API calls: always go to network — session cookies must flow through
  if (url.pathname.startsWith('/api/')) return;

  // 3. External requests (Google Fonts, CDN, etc.): network only, don't cache
  if (url.origin !== self.location.origin) return;

  // 4. HTML navigation requests: network-first, fallback to cached index shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((res) => res || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // 5. Static assets (JS/CSS/images): stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          // Only cache successful same-origin responses
          if (response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        });
        // Return cached version immediately if available, else wait for network
        return cached || networkFetch;
      })
    )
  );
});

// ─── Push Notifications (Sprint 2 BATCH 3) ───────────────────────────────────
//
// Payload shape (from server/services/notificationDispatcher.ts → renderTemplate):
//   { title, body, url, tag?, type?, data? }
//
// The OS-level notification banner is what the user actually sees. The data
// passed through to notificationclick is { url, type } so a click can route
// the user back to the relevant page.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Defensive: if a non-JSON payload somehow arrives, render as plain text
    payload = { title: 'GymGurus', body: event.data.text() };
  }

  const title = payload.title || 'GymGurus';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-128.png', // 128 displays cleaner than 72 on most platforms
    tag: payload.tag, // dedup: same tag replaces previous notification
    renotify: false, // don't re-vibrate when replacing same-tag notification
    data: { url: payload.url || '/', type: payload.type || null },
    requireInteraction: false, // auto-dismiss on most platforms
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click handler — focus existing tab on the target URL if open, else open new.
// Sprint 2 BATCH 3 quality-of-life: don't open a duplicate tab if the user is
// already on the relevant page; just focus.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Prefer focusing a tab already on the target URL
        const onTarget = windowClients.find((c) => {
          try {
            return new URL(c.url).pathname === new URL(targetUrl, self.location.origin).pathname;
          } catch {
            return false;
          }
        });
        if (onTarget) return onTarget.focus();

        // Otherwise focus any open GymGurus tab and navigate it
        const anyTab = windowClients.find((c) => c.url.includes(self.location.host));
        if (anyTab && 'navigate' in anyTab) {
          return anyTab.navigate(targetUrl).then((c) => c?.focus());
        }

        // No GymGurus tabs open — open a new one
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── pushsubscriptionchange (Sprint 2 BATCH 3) ───────────────────────────────
//
// Browser fired this because either:
//   - The browser invalidated our subscription (key rotation, cache wipe, etc.)
//   - The push service expired the endpoint
//
// To keep notifications working without user action, we MUST:
//   1. Capture the new subscription (event.newSubscription) — may be null
//      if the browser couldn't auto-renew, in which case the user will need
//      to re-grant permission, which we can't trigger from a SW.
//   2. POST the new subscription to /api/notifications/subscribe.
//   3. DELETE the old subscription via /api/notifications/subscribe/:id.
//      We don't know the DB id from the SW context, but we can pass the OLD
//      endpoint to a special route OR just POST the new one and let the next
//      cron tick / manual cleanup handle the orphan. v1: POST new + post a
//      message to active tabs so the main app can clean up the old one.
//
// Note: the SW has NO user session by default. We rely on the browser's same-origin
// cookies being attached to the fetch — `credentials: 'include'` makes that explicit.
// If the session is expired (user logged out), the POST will 401 and the next
// real interaction will re-establish.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(handleSubscriptionChange(event));
});

async function handleSubscriptionChange(event) {
  // The new subscription may already be in event.newSubscription. If not,
  // try to re-subscribe with the same applicationServerKey from the OLD sub.
  let newSub = event.newSubscription;

  if (!newSub && event.oldSubscription) {
    try {
      const opts = event.oldSubscription.options;
      newSub = await self.registration.pushManager.subscribe(opts);
    } catch (err) {
      // Browser refused auto-resubscribe (typical when user revoked permission).
      // Notify the main app so it can re-prompt on next interaction.
      await postMessageToClients({
        type: 'PUSH_SUBSCRIPTION_LOST',
        reason: err && err.message ? err.message : 'subscribe failed',
      });
      return;
    }
  }

  if (!newSub) {
    // No new subscription possible. Tell the main app.
    await postMessageToClients({ type: 'PUSH_SUBSCRIPTION_LOST', reason: 'no new subscription' });
    return;
  }

  // POST the new subscription. If the user is still logged in this succeeds and
  // the server upserts on the unique endpoint constraint.
  const subJson = newSub.toJSON();
  let postOk = false;
  try {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // We don't have access to document.cookie inside the SW. The CSRF
      // interceptor in main.tsx is page-scoped, so SW fetches don't carry CSRF.
      // Workaround: postMessage to the main app and let it do the POST.
      // The fetch above will 403 on CSRF; that's expected for SW-scope.
      // We try anyway for environments where CSRF is bypassed (test/dev).
      credentials: 'include',
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        platform: 'web',
        userAgent: self.navigator?.userAgent?.slice(0, 200) || 'web-sw',
      }),
    });
    postOk = res.ok;
  } catch {
    postOk = false;
  }

  // Always relay to active tabs so the main app can:
  //   (a) Re-POST with proper CSRF if our SW POST failed.
  //   (b) DELETE the old subscription via /api/notifications/subscribe/:id
  //       (the main app knows the DB id from /subscriptions list).
  await postMessageToClients({
    type: 'PUSH_SUBSCRIPTION_ROTATED',
    oldEndpoint: event.oldSubscription?.endpoint || null,
    newSubscription: {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
    swPostSucceeded: postOk,
  });
}

async function postMessageToClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const c of clients) {
    try {
      c.postMessage(message);
    } catch {
      // ignore — client may be navigating
    }
  }
}

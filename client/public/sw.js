/**
 * GymGurus Service Worker
 *
 * Strategy:
 *   - API calls (/api/*): always network — never cache auth/data
 *   - Navigation (HTML): network-first → fallback to cached shell
 *   - Static assets (JS/CSS/fonts/images): stale-while-revalidate
 *
 * Cache version: bump CACHE_VER when deploying breaking changes
 * to force old clients to refresh.
 */

const CACHE_VER = 'v1';
const CACHE_NAME = `gymgurus-${CACHE_VER}`;

// Core app shell — always cached on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
];

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
  //    Serve the cached version immediately, update cache in the background.
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

// ─── Push Notifications (future) ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'GymGurus', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initWebVitals } from './lib/web-vitals';

// Initialize Web Vitals tracking
if (typeof window !== 'undefined') {
  initWebVitals();
}

// Global fetch interceptor — automatically injects CSRF token on all /api state-changing requests
// so every raw fetch() call across the app gets CSRF protection without manual wiring.
const STATE_CHANGING = ['POST', 'PUT', 'PATCH', 'DELETE'];
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method ?? 'GET').toUpperCase();

  if (url.startsWith('/api') && STATE_CHANGING.includes(method)) {
    const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
    const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : null;
    if (csrfToken) {
      init = {
        ...init,
        headers: {
          ...init.headers,
          'x-csrf-token': csrfToken,
        },
      };
    }
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(<App />);

// Register service worker for PWA / offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration is non-critical — fail silently
    });
  });
}

// Sprint 2 BATCH 3: listen for SW messages about push subscription rotation.
// The SW posts PUSH_SUBSCRIPTION_ROTATED when the browser auto-renews a sub
// (typically because the push service expired the endpoint). The handler
// re-POSTs the new subscription from the main thread (so CSRF interceptor fires)
// and lets the dispatcher's natural failure-path eventually mark the old row
// inactive. See client/src/lib/pushSubscription.ts for details.
if ('serviceWorker' in navigator) {
  // Lazy-load to keep main.tsx slim — pushSubscription.ts pulls in nothing heavy.
  import('./lib/pushSubscription').then(({ listenForSwSubscriptionMessages }) => {
    listenForSwSubscriptionMessages();
  });
}

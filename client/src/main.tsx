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

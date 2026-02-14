/**
 * Lightweight analytics module.
 * Supports Google Analytics (gtag.js) via the VITE_GA_MEASUREMENT_ID env var.
 * To enable: set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX in your .env file.
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
}

/** Inject the gtag script once on app startup */
export function initAnalytics() {
  if (!GA_ID) return;

  // Inject gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  const w = window as AnalyticsWindow;
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: unknown[]) {
    w.dataLayer!.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_ID, { send_page_view: false }); // We'll track page views manually
  w.gtag = gtag;
}

/** Track a page view (call on route change) */
export function trackPageView(path: string) {
  const w = window as AnalyticsWindow;
  if (!GA_ID || !w.gtag) return;
  w.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
  });
}

/** Track a custom event */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  const w = window as AnalyticsWindow;
  if (!GA_ID || !w.gtag) return;
  w.gtag('event', name, params);
}

import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

/**
 * Sends web vitals metrics to analytics endpoint
 * @param metric - Web Vitals metric object
 */
function sendToAnalytics(metric: Metric) {
  // Log to console in development only.
  // Production reporting is disabled because navigator.sendBeacon() bypasses
  // the global fetch CSRF interceptor, causing 403 errors on every page load.
  // Re-enable once the analytics endpoint supports beacon requests properly.
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric);
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once when the app initializes
 */
export function initWebVitals() {
  // Cumulative Layout Shift (CLS)
  // Measures visual stability - should be < 0.1
  onCLS(sendToAnalytics);

  // Interaction to Next Paint (INP) - replaces deprecated FID
  // Measures responsiveness - should be < 200ms
  onINP(sendToAnalytics);

  // First Contentful Paint (FCP)
  // Measures when first content is rendered - should be < 1.8s
  onFCP(sendToAnalytics);

  // Largest Contentful Paint (LCP)
  // Measures loading performance - should be < 2.5s
  onLCP(sendToAnalytics);

  // Time to First Byte (TTFB)
  // Measures server response time - should be < 800ms
  onTTFB(sendToAnalytics);
}

/**
 * Get Web Vitals thresholds for rating
 */
export const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
} as const;

/**
 * Rate a metric value
 */
export function rateMetric(
  name: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

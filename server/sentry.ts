import * as Sentry from '@sentry/node';
import { env, isProduction, isDevelopment } from './env';

/**
 * Initialize Sentry error monitoring
 * Only enabled in production when SENTRY_DSN is configured
 */
export function initSentry() {
  // Only initialize Sentry in production with a valid DSN
  const sentryDsn = process.env.SENTRY_DSN;

  if (!isProduction || !sentryDsn) {
    if (isDevelopment) {
      console.log('[Sentry] Skipped initialization (not in production or DSN not configured)');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: env.NODE_ENV,
      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }

        // Remove sensitive query parameters
        if (event.request?.query_string && typeof event.request.query_string === 'string') {
          const filtered = event.request.query_string
            .split('&')
            .filter((param: string) => !param.toLowerCase().includes('password'))
            .join('&');
          event.request.query_string = filtered;
        }

        return event;
      },

      // Ignore specific errors
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random plugins/extensions
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Facebook errors
        'fb_xd_fragment',
        // Network errors
        'NetworkError',
        'Network request failed',
      ],
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture an exception with Sentry
 * @param error - Error object to capture
 * @param context - Additional context for the error
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!isProduction) {
    // In development, just log the error
    console.error('Error:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with Sentry
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  if (!isProduction) {
    console.log(`[${level}]`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context for Sentry
 * @param user - User information
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  if (!isProduction) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser() {
  if (!isProduction) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * @param message - Breadcrumb message
 * @param category - Breadcrumb category
 * @param data - Additional data
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  data?: Record<string, any>
) {
  if (!isProduction) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

// Export Sentry instance for advanced usage
export { Sentry };

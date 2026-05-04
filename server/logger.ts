import { isDevelopment } from './env';

/**
 * Logger utility for consistent logging across the application
 * Logs are only output in development mode
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  level?: LogLevel;
  data?: any;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Always log errors and warnings
    if (level === 'error' || level === 'warn') {
      return true;
    }
    // Only log debug and info in development
    return isDevelopment;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  /**
   * Log informational messages (development only)
   */
  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  /**
   * Log warning messages (always logged)
   */
  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  /**
   * Log error messages (always logged)
   */
  error(message: string, error?: Error | any): void {
    if (this.shouldLog('error')) {
      const errorData =
        error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(this.formatMessage('error', message, errorData));
    }
  }

  /**
   * Log audit events (always logged in every environment).
   *
   * Use for security/privacy-sensitive state changes that need a forensic
   * trail: consent flips, role changes, account deletions, permission
   * grants. Output is a structured JSON line so downstream log aggregators
   * can filter on the `[AUDIT]` prefix and parse the payload directly.
   *
   * Distinguishes from `warn()` semantically — audit events aren't warnings,
   * they're successful state transitions worth recording.
   */
  audit(event: string, data: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [AUDIT] ${event} ${JSON.stringify(data)}`);
  }
}

export const logger = new Logger();

/**
 * Export log function for vite.ts compatibility
 */
export function log(message: string): void {
  logger.info(message);
}

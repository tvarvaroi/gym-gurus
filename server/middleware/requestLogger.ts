import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../logger';
import { isDevelopment } from '../env';

/**
 * Paths to skip when logging requests.
 * Health checks and static assets generate high-volume, low-value logs.
 */
const SKIP_PATHS = ['/api/health', '/api/health/ready', '/api/health/live'];

const SKIP_PREFIXES = ['/assets/', '/static/', '/@vite', '/@fs', '/node_modules/'];

const SKIP_EXTENSIONS = [
  '.js',
  '.css',
  '.map',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
];

/**
 * Determine whether the request path should be excluded from logging.
 */
function shouldSkip(path: string): boolean {
  if (SKIP_PATHS.includes(path)) {
    return true;
  }

  for (const prefix of SKIP_PREFIXES) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }

  for (const ext of SKIP_EXTENSIONS) {
    if (path.endsWith(ext)) {
      return true;
    }
  }

  return false;
}

// Store request IDs in a WeakMap keyed by request object to avoid namespace augmentation.
const requestIds = new WeakMap<object, string>();

export function getRequestId(req: object): string | undefined {
  return requestIds.get(req);
}

function setRequestId(req: object, id: string): void {
  requestIds.set(req, id);
}

/**
 * Structured log entry produced for each request.
 */
interface RequestLogEntry {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  contentLength?: string;
}

/**
 * Format a log entry for human-readable (development) output.
 */
function prettyFormat(entry: RequestLogEntry): string {
  const statusColor =
    entry.statusCode >= 500
      ? '\x1b[31m' // red
      : entry.statusCode >= 400
        ? '\x1b[33m' // yellow
        : '\x1b[32m'; // green
  const reset = '\x1b[0m';

  const user = entry.userId ? ` user=${entry.userId}` : '';
  return `${statusColor}${entry.statusCode}${reset} ${entry.method} ${entry.path} ${entry.duration}ms${user}`;
}

/**
 * Express middleware that logs every request with timing, status, and user context.
 *
 * - Attaches a unique `requestId` (via crypto.randomUUID) to every request.
 * - Sets the `X-Request-Id` response header so clients/load balancers can correlate.
 * - Skips logging for health-check endpoints and static assets to reduce noise.
 * - Uses structured JSON in production and pretty-printed output in development.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate and attach request ID
  const requestId = randomUUID();
  setRequestId(req, requestId);
  res.setHeader('X-Request-Id', requestId);

  // If this path should be skipped, bail out early
  if (shouldSkip(req.path)) {
    return next();
  }

  const startTime = process.hrtime.bigint();

  // Hook into the response `finish` event to capture final status and timing
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startTime) / 1_000_000; // ns -> ms

    const entry: RequestLogEntry = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      duration: Math.round(duration),
      userId: (req as any).user?.id || req.session?.userId,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      contentLength: res.get('content-length'),
    };

    if (isDevelopment) {
      logger.info(prettyFormat(entry));
    } else {
      // Structured JSON logging for production (easily parsed by log aggregators)
      logger.info('request', entry as any);
    }
  });

  next();
}

export default requestLogger;

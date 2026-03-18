import { Request, Response, NextFunction } from 'express';

interface SlowRequest {
  method: string;
  path: string;
  duration: number;
  statusCode: number;
  userId?: string;
  timestamp: string;
}

const performanceStats = {
  requestCounts: new Map<string, number>(),
  slowRequests: [] as SlowRequest[],
  startedAt: new Date().toISOString(),
};

/**
 * Middleware that tracks per-endpoint request counts and slow requests (>1s).
 * Lightweight — only increments a counter and conditionally pushes to a capped array.
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const routePath = req.route?.path;
    if (!routePath) return; // Skip static assets / non-route requests

    const key = `${req.method} ${routePath}`;
    performanceStats.requestCounts.set(key, (performanceStats.requestCounts.get(key) || 0) + 1);

    if (duration > 1000) {
      performanceStats.slowRequests.push({
        method: req.method,
        path: req.originalUrl || req.path,
        duration,
        statusCode: res.statusCode,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      });
      // Keep last 100 slow requests only
      if (performanceStats.slowRequests.length > 100) {
        performanceStats.slowRequests.shift();
      }
    }
  });

  next();
}

/**
 * Returns a snapshot of performance stats.
 * Used by the /api/admin/performance endpoint (dev/staging only).
 */
export function getPerformanceStats() {
  return {
    topEndpoints: Array.from(performanceStats.requestCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
    recentSlowRequests: performanceStats.slowRequests.slice(-20),
    totalTrackedEndpoints: performanceStats.requestCounts.size,
    totalSlowRequests: performanceStats.slowRequests.length,
    monitoringSince: performanceStats.startedAt,
    timestamp: new Date().toISOString(),
  };
}

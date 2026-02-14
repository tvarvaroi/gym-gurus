import { Router, Request, Response } from 'express';
import { getPool } from '../db';
import { logger } from '../logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latency?: number };
    memory: { used: number; total: number; percentage: number };
    ai: { status: string; configured: boolean };
    stripe: { status: string; configured: boolean };
  };
}

// GET /api/health
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    database: { status: 'unknown' },
    memory: { used: 0, total: 0, percentage: 0 },
    ai: { status: 'unknown', configured: false },
    stripe: { status: 'unknown', configured: false },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    const pool = await getPool();
    await pool.query('SELECT 1');
    checks.database = { status: 'healthy', latency: Date.now() - dbStart };
  } catch (error) {
    logger.error('Health check: database connectivity failed', error);
    checks.database = { status: 'unhealthy' };
  }

  // Check memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    used: Math.round(mem.heapUsed / 1024 / 1024),
    total: Math.round(mem.heapTotal / 1024 / 1024),
    percentage: Math.round((mem.heapUsed / mem.heapTotal) * 100),
  };

  // Check AI service (Anthropic API key presence)
  checks.ai = {
    status: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
    configured: !!process.env.ANTHROPIC_API_KEY,
  };

  // Check Stripe payment service
  checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured',
    configured: !!process.env.STRIPE_SECRET_KEY,
  };

  // Determine overall status
  const isHealthy = checks.database.status === 'healthy';
  const isDegraded = !checks.ai.configured || !checks.stripe.configured;

  const health: HealthStatus = {
    status: isHealthy ? (isDegraded ? 'degraded' : 'healthy') : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const statusCode = isHealthy ? 200 : 503;

  logger.debug('Health check completed', {
    status: health.status,
    duration: Date.now() - startTime,
  });

  res.status(statusCode).json(health);
});

// GET /api/health/ready — lightweight readiness probe (e.g. for k8s)
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const pool = await getPool();
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
});

// GET /api/health/live — liveness probe (always 200 if process is running)
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

export default router;

import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

// In-memory rate limit store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get identifier (use user ID if authenticated, otherwise IP)
    const identifier = (req as any).user?.id || req.ip || 'anonymous';
    const key = `${req.path}_${identifier}`;
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      // Increment count
      entry.count++;
    }
    
    // Update store
    rateLimitStore.set(key, entry);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());
    
    // Check if limit exceeded
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      });
    }
    
    // Optionally skip incrementing on successful requests
    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400 && entry) {
          entry.count = Math.max(0, entry.count - 1);
          rateLimitStore.set(key, entry);
        }
      });
    }
    
    next();
  };
}

// Preset rate limiters for different endpoints
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 10,
  message: 'Too many requests. Please wait before trying again.'
});

export const generalRateLimit = createRateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 60,
  message: 'Too many requests. Please slow down.'
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000,        // 1 minute
  maxRequests: 100,
  message: 'API rate limit exceeded.'
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again later.'
});

export const exportRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,   // 1 hour
  maxRequests: 10,
  message: 'Export rate limit exceeded. Please try again later.'
});
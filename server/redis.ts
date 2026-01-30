import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import { logger } from './logger';
import { env, isProduction } from './env';

/**
 * Redis client for session storage
 * Provides 10-100x faster session access than PostgreSQL
 */

let redisClient: ReturnType<typeof createClient> | null = null;
let redisStore: InstanceType<typeof RedisStore> | null = null;

/**
 * Initialize Redis connection
 * Falls back gracefully if Redis is not available
 */
export async function initRedis() {
  // Only use Redis if REDIS_URL is configured
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('Redis not configured (REDIS_URL not set). Using PostgreSQL for sessions.');
    return null;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Redis unavailable');
          }
          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis: Connected and ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis: Reconnecting...');
    });

    await redisClient.connect();

    // Create Redis store
    redisStore = new RedisStore({
      client: redisClient,
      prefix: 'gymgurus:session:',
      ttl: 60 * 60 * 24 * 7, // 7 days
    });

    logger.info('Redis session store initialized successfully');
    return redisStore;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    logger.info('Falling back to PostgreSQL for sessions');

    // Clean up client if it exists
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (e) {
        // Ignore errors during cleanup
      }
      redisClient = null;
    }

    return null;
  }
}

/**
 * Get Redis store (if available)
 */
export function getRedisStore(): InstanceType<typeof RedisStore> | null {
  return redisStore;
}

/**
 * Get Redis client (if available)
 */
export function getRedisClient(): ReturnType<typeof createClient> | null {
  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}

/**
 * Check if Redis is available and connected
 */
export function isRedisAvailable(): boolean {
  return redisClient?.isOpen ?? false;
}

/**
 * Cache helper functions for use throughout the application
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T = string>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;

    try {
      const value = await redisClient!.get(`gymgurus:cache:${key}`);
      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      logger.error('Redis cache get error:', error);
      return null;
    }
  },

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient!.setEx(`gymgurus:cache:${key}`, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error('Redis cache set error:', error);
      return false;
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      await redisClient!.del(`gymgurus:cache:${key}`);
      return true;
    } catch (error) {
      logger.error('Redis cache delete error:', error);
      return false;
    }
  },

  /**
   * Clear all cache entries with prefix
   */
  async clear(prefix: string = ''): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      const pattern = `gymgurus:cache:${prefix}*`;
      const keys = await redisClient!.keys(pattern);
      if (keys.length > 0) {
        await redisClient!.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis cache clear error:', error);
      return false;
    }
  },
};

// Graceful shutdown
if (isProduction) {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing Redis connection...');
    await closeRedis();
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing Redis connection...');
    await closeRedis();
  });
}

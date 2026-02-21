import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { getUserById } from '../auth';
import type { User } from '@shared/schema';
import { isInTrial, isTrialExpired, canAccessTier } from '../services/subscription';

// Extend Express Session interface to include user data
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
  }
}

// Augment the Express.User type that Passport uses
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Passport already declares User, we need to merge with it
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      role?: string | null;
      stripeCustomerId?: string | null;
      subscriptionStatus?: string | null;
      subscriptionTier?: string | null;
      subscriptionCurrentPeriodEnd?: Date | null;
      trialEndsAt?: Date | null;
      createdAt?: Date | null;
      updatedAt?: Date | null;
    }
  }
}

/**
 * Check if user is authenticated via session
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).session?.userId;

  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
  }

  next();
}

/**
 * Secure session-based authentication middleware
 * Loads user from database and attaches to request
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).session?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
      });
    }

    // Get user from database
    const user = await getUserById(userId);

    if (!user) {
      // Session exists but user doesn't - clear session
      (req as any).session.destroy();
      return res.status(401).json({
        error: 'Invalid authentication',
        message: 'User not found',
      });
    }

    // Add user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Internal server error during authentication',
    });
  }
}

/**
 * Combined authentication and authorization middleware
 * Verifies session and ensures user can only access their own resources
 */
export const secureAuth = [isAuthenticated, requireAuth];

/**
 * Secure authorization middleware - ensures trainer can only access their own clients
 * OR client can access their own data
 */
export async function requireClientOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authenticated user found',
      });
    }

    if (!clientId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Client ID is required',
      });
    }

    // Get the authenticated user to check their role
    const authenticatedUser = await storage.getUser(userId);
    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not found',
      });
    }

    // If user is a client, they can only access their own data
    if (authenticatedUser.role === 'client') {
      // Look up the client record by email to match user to client
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist',
        });
      }

      // Check if the client's email matches the authenticated user's email
      if (client.email !== authenticatedUser.email) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own data',
        });
      }
      // Client accessing their own data - allowed
      return next();
    }

    // If user is a trainer, verify the client belongs to them
    const client = await storage.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'The specified client does not exist',
      });
    }

    if (client.trainerId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own clients',
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Internal server error during authorization',
    });
  }
}

/**
 * Secure authorization middleware - ensures trainer can only access their own resources
 */
export async function requireTrainerOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { trainerId } = req.params;
    const authenticatedTrainerId = req.user?.id;

    if (!authenticatedTrainerId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authenticated user found',
      });
    }

    if (!trainerId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Trainer ID is required',
      });
    }

    if (trainerId !== authenticatedTrainerId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      error: 'Authorization failed',
      message: 'Internal server error during authorization',
    });
  }
}

/**
 * Secure rate limiting for WebSocket connections
 */
const wsConnectionLimits = new Map<string, { count: number; resetTime: number }>();
const WS_RATE_LIMIT = 100; // WebSocket messages per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

/**
 * WebSocket rate limiting - prevents abuse of real-time connections
 */
export function rateLimitWebSocket(userId: string): boolean {
  const now = Date.now();
  const userLimit = wsConnectionLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    wsConnectionLimits.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= WS_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Subscription gate middleware factory.
 * Disciples (role==='client') always pass — their trainer pays.
 * Trial users have full access during trial.
 * After trial expires with no subscription → 402 with upgrade prompt.
 */
export function requireSubscription(tier: 'solo' | 'trainer' | 'pro') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Disciples never pay
    if (user.role === 'client') return next();
    // Active subscription at required tier
    if (canAccessTier(user, tier)) return next();
    // Valid trial = full access
    if (isInTrial(user)) return next();
    // Trial expired with no subscription
    if (isTrialExpired(user)) {
      return res.status(402).json({
        error: 'subscription_required',
        tier,
        trialExpired: true,
        message: 'Your free trial has ended. Please subscribe to continue.',
      });
    }
    // No trial at all, no subscription
    return res.status(402).json({
      error: 'subscription_required',
      tier,
      message: `This feature requires a ${tier} subscription or higher.`,
    });
  };
}

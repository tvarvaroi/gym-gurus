import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { isAuthenticated, getAuthenticatedUserId } from '../replitAuth';
import type { User } from '@shared/schema';

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

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Secure session-based authentication middleware - replaces insecure header auth
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Use secure session-based authentication
    const userId = getAuthenticatedUserId(req);
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource' 
      });
    }

    // Validate user exists in database
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid authentication',
        message: 'User not found' 
      });
    }

    // Add user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error during authentication' 
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
 */
export async function requireClientOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params;
    const trainerId = req.user?.id;

    if (!trainerId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authenticated user found' 
      });
    }

    if (!clientId) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Client ID is required' 
      });
    }

    // Verify the client belongs to the authenticated trainer
    const client = await storage.getClient(clientId);
    if (!client) {
      return res.status(404).json({ 
        error: 'Client not found',
        message: 'The specified client does not exist' 
      });
    }

    if (client.trainerId !== trainerId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own clients' 
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Internal server error during authorization' 
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
        message: 'No authenticated user found' 
      });
    }

    if (!trainerId) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Trainer ID is required' 
      });
    }

    if (trainerId !== authenticatedTrainerId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own resources' 
      });
    }

    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Internal server error during authorization' 
    });
  }
}

/**
 * Secure rate limiting middleware for messaging endpoints and WebSocket connections
 */
const messageLimits = new Map<string, { count: number; resetTime: number }>();
const wsConnectionLimits = new Map<string, { count: number; resetTime: number }>();
const MESSAGE_RATE_LIMIT = 30; // messages per minute
const WS_RATE_LIMIT = 100; // WebSocket messages per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

export function rateLimitMessages(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Cannot apply rate limiting without authentication' 
    });
  }

  const now = Date.now();
  const userLimit = messageLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    messageLimits.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return next();
  }

  if (userLimit.count >= MESSAGE_RATE_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Too many messages. Limit: ${MESSAGE_RATE_LIMIT} per minute`,
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
    });
  }

  userLimit.count++;
  next();
}

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
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (userLimit.count >= WS_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}
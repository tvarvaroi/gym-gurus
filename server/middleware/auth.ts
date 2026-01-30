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

// Augment the Express.User type that Passport uses
declare global {
  namespace Express {
    // Passport already declares User, we need to merge with it
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      createdAt?: Date | null;
      updatedAt?: Date | null;
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

    // Try to get user from database, fall back to session data in development
    let user: User | undefined;
    try {
      user = await storage.getUser(userId);
    } catch (dbError) {
      // In development mode when database is unavailable, use session data
      if (process.env.NODE_ENV === 'development') {
        const sessionUser = (req as any).user;
        if (sessionUser?.claims) {
          // Construct user object from session claims - ensure consistent demo-trainer-123 ID in development
          user = {
            id: "demo-trainer-123", // Always use consistent demo trainer ID in development
            email: sessionUser.claims.email || sessionUser.email || "trainer@example.com",
            firstName: sessionUser.claims.first_name || sessionUser.firstName || "Demo",
            lastName: sessionUser.claims.last_name || sessionUser.lastName || "Trainer",
            profileImageUrl: sessionUser.claims.profile_image_url || sessionUser.profileImageUrl || null,
            role: "trainer",
            trainerId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        } else {
          // Fallback to demo user in development
          user = {
            id: "demo-trainer-123",
            email: "trainer@example.com",
            firstName: "Demo",
            lastName: "Trainer",
            profileImageUrl: null,
            role: "trainer",
            trainerId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      } else {
        throw dbError;
      }
    }
    
    // If user is still not found, synthesize demo user in development mode
    if (!user && process.env.NODE_ENV === 'development' && userId === "demo-trainer-123") {
      // Synthesize demo user when storage.getUser returns undefined
      user = {
        id: "demo-trainer-123",
        email: "trainer@example.com",
        firstName: "Demo",
        lastName: "Trainer",
        profileImageUrl: null,
        role: "trainer",
        trainerId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
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
 * OR client can access their own data
 */
export async function requireClientOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
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

    // Get the authenticated user to check their role
    const authenticatedUser = await storage.getUser(userId);
    if (!authenticatedUser) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not found'
      });
    }

    // If user is a client, they can only access their own data
    if (authenticatedUser.role === 'client') {
      // Look up the client record by email to match user to client
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist'
        });
      }

      // Check if the client's email matches the authenticated user's email
      if (client.email !== authenticatedUser.email) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own data'
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
        message: 'The specified client does not exist'
      });
    }

    if (client.trainerId !== userId) {
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
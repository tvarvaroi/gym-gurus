import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection using Double Submit Cookie pattern.
 *
 * How it works:
 * 1. Server generates a random CSRF token and sets it as a cookie
 * 2. Client reads the cookie and sends the token in X-CSRF-Token header
 * 3. Server validates that the header value matches the cookie value
 *
 * This works because:
 * - An attacker on a different domain can trigger requests WITH cookies (same-site=lax allows it for some cases)
 * - But an attacker CANNOT read our cookie to include it as a header (same-origin policy)
 * - So only legitimate JavaScript on our domain can set the header correctly
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Middleware to set the CSRF token cookie on every response.
 * Call this early in the middleware chain.
 */
export function csrfCookieSetter(req: Request, res: Response, next: NextFunction) {
  // If no CSRF cookie exists, generate one and set it
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches session TTL)
    });
  }
  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests.
 * Only applies to POST, PUT, PATCH, DELETE methods.
 *
 * Exempt paths can be specified (e.g., webhook endpoints).
 */
export function csrfProtection(exemptPaths: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only validate on state-changing methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Skip CSRF for exempt paths (e.g., Stripe webhooks)
    if (exemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get token from cookie and header
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    // Both must be present
    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        error: 'CSRF validation failed',
        message: 'Missing CSRF token. Please refresh the page and try again.',
      });
    }

    // Tokens must match (constant-time comparison to prevent timing attacks)
    if (!crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'utf8'),
      Buffer.from(headerToken, 'utf8')
    )) {
      return res.status(403).json({
        error: 'CSRF validation failed',
        message: 'Invalid CSRF token. Please refresh the page and try again.',
      });
    }

    next();
  };
}

import { Request, Response, NextFunction } from 'express';

/**
 * Server-side input sanitization middleware.
 *
 * Strips dangerous HTML/script content from all string values in request body.
 * This runs BEFORE Zod validation so that validated data is already clean.
 *
 * Uses a simple but effective approach: strip HTML tags and dangerous patterns.
 * For display-side protection, the client should also sanitize with DOMPurify.
 */

// Patterns that indicate potential injection attacks
const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,  // Script tags with content
  /<script\b[^>]*\/?>/gi,                   // Self-closing script tags
  /javascript\s*:/gi,                        // javascript: protocol
  /on\w+\s*=\s*["'][^"']*["']/gi,          // Event handlers (onclick, onerror, etc.)
  /on\w+\s*=\s*[^\s>]+/gi,                 // Unquoted event handlers
  /data\s*:\s*text\/html/gi,               // data:text/html protocol
  /vbscript\s*:/gi,                         // vbscript: protocol
  /expression\s*\(/gi,                      // CSS expression()
];

// Simple HTML tag removal (preserves text content)
const HTML_TAG_PATTERN = /<[^>]+>/g;

/**
 * Sanitize a single string value by removing dangerous content.
 */
function sanitizeString(value: string): string {
  let sanitized = value;

  // Remove dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Strip remaining HTML tags
  sanitized = sanitized.replace(HTML_TAG_PATTERN, '');

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  return sanitized;
}

/**
 * Recursively sanitize all string values in an object.
 * Handles nested objects and arrays.
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  // Numbers, booleans, null, undefined — pass through unchanged
  return obj;
}

/**
 * Express middleware that sanitizes request body strings.
 *
 * Apply to all routes that accept user input (POST, PUT, PATCH).
 * Safe methods (GET, HEAD, OPTIONS, DELETE) are skipped since they
 * typically don't have request bodies.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  // Only sanitize methods that have a request body
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Also sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        (req.query as Record<string, any>)[key] = sanitizeString(value);
      }
    }
  }

  next();
}

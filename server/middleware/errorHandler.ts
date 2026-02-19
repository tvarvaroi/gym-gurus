import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { isProduction } from '../env';
import { AppError, ValidationError } from './errors';
import { getRequestId } from './requestLogger';
import * as Sentry from '@sentry/node';

/**
 * Structured error context suitable for Sentry or any error-tracking service.
 * Contains everything needed to diagnose the issue without leaking secrets.
 */
interface ErrorContext {
  requestId?: string;
  userId?: string;
  method: string;
  path: string;
  statusCode: number;
  errorCode?: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Build an error context object from the request.
 * This is designed to be Sentry-ready: attach it via `Sentry.setContext('request', ctx)`.
 */
function buildErrorContext(req: Request, statusCode: number, code?: string): ErrorContext {
  return {
    requestId: getRequestId(req),
    userId: (req as any).user?.id || req.session?.userId,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    errorCode: code,
    timestamp: new Date().toISOString(),
    userAgent: req.get('user-agent'),
    ip: req.ip,
  };
}

/**
 * Map well-known error names/types to appropriate HTTP status codes.
 */
function resolveStatusCode(err: any): number {
  // AppError subclasses carry their own status code
  if (err instanceof AppError) {
    return err.statusCode;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return 400;
  }

  // JSON body-parser syntax errors
  if (err.type === 'entity.parse.failed') {
    return 400;
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    return 413;
  }

  // PostgreSQL unique-constraint violation
  if (err.code === '23505') {
    return 409;
  }

  // PostgreSQL foreign-key violation
  if (err.code === '23503') {
    return 400;
  }

  // Default to 500 for anything unknown
  return 500;
}

/**
 * Derive an error code string for the JSON response.
 */
function resolveErrorCode(err: any, statusCode: number): string {
  if (err instanceof AppError && err.code) {
    return err.code;
  }
  if (err.name === 'ZodError') {
    return 'VALIDATION_ERROR';
  }
  if (err.code === '23505') {
    return 'CONFLICT';
  }
  if (err.code === '23503') {
    return 'FK_VIOLATION';
  }

  // Derive from HTTP status
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return 'INTERNAL_ERROR';
  }
}

/**
 * Build a safe, client-facing error message.
 * In production, internal errors return a generic message to avoid leaking details.
 */
function resolveMessage(err: any, statusCode: number): string {
  // Known application errors always expose their message
  if (err instanceof AppError) {
    return err.message;
  }

  // Zod errors get a generic validation message
  if (err.name === 'ZodError') {
    return 'Validation failed';
  }

  // Database constraint errors
  if (err.code === '23505') {
    return 'Resource already exists';
  }
  if (err.code === '23503') {
    return 'Referenced resource does not exist';
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return 'Invalid JSON in request body';
  }

  if (err.type === 'entity.too.large') {
    return 'Request payload is too large';
  }

  // For 5xx errors, hide the real message in production
  if (statusCode >= 500 && isProduction) {
    return 'Internal server error';
  }

  return err.message || 'Internal server error';
}

/**
 * Extract Zod validation details into a structured map.
 */
function extractZodDetails(err: any): Record<string, string[]> | undefined {
  if (err.name !== 'ZodError' || !err.issues) {
    return undefined;
  }

  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || 'body';
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }
  return details;
}

/**
 * Global error-handling middleware for Express.
 *
 * Must be registered AFTER all route handlers:
 *   app.use(errorHandler);
 *
 * Features:
 *   - Catches all unhandled errors thrown or passed via next(err).
 *   - Logs errors with full request context (request ID, user ID, path).
 *   - Returns appropriate HTTP status codes (400, 401, 403, 404, 409, 413, 500).
 *   - Produces a Sentry-ready error context object for easy integration.
 *   - Never leaks stack traces or internal details in production responses.
 *   - Handles AppError subclasses, Zod errors, body-parser errors, and PG constraint errors.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  // If headers are already sent, Express requires us to delegate to the default handler
  if (res.headersSent) {
    return _next(err);
  }

  const statusCode = resolveStatusCode(err);
  const errorCode = resolveErrorCode(err, statusCode);
  const message = resolveMessage(err, statusCode);
  const context = buildErrorContext(req, statusCode, errorCode);

  // --- Logging ---
  // Log 5xx errors at error level; 4xx at warn level
  if (statusCode >= 500) {
    logger.error(
      `[${context.requestId || 'no-id'}] ${req.method} ${req.path} -> ${statusCode}`,
      err
    );
  } else {
    logger.warn(
      `[${context.requestId || 'no-id'}] ${req.method} ${req.path} -> ${statusCode}: ${message}`
    );
  }

  // --- Sentry integration ---
  // Capture 5xx errors in production when Sentry is configured
  if (statusCode >= 500 && isProduction) {
    Sentry.withScope((scope) => {
      scope.setContext('request', context);
      scope.setTag('status_code', String(statusCode));
      scope.setTag('error_code', errorCode);
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      Sentry.captureException(err);
    });
  }

  // --- Build response body ---
  const body: Record<string, any> = {
    error: message,
    code: errorCode,
    requestId: context.requestId,
  };

  // Attach Zod validation details when applicable
  const zodDetails = extractZodDetails(err);
  if (zodDetails) {
    body.details = zodDetails;
  }

  // Attach AppError validation details when applicable
  if (err instanceof ValidationError && err.details) {
    body.details = err.details;
  }

  // In development, include the stack trace for easier debugging
  if (!isProduction && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

/**
 * Catch-all middleware for requests that match no route.
 * Mount this AFTER all route handlers but BEFORE the error handler.
 *
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */
export function notFoundHandler(req: Request, res: Response): void {
  const context = buildErrorContext(req, 404, 'NOT_FOUND');

  logger.debug(`Route not found: ${req.method} ${req.originalUrl}`, {
    requestId: context.requestId,
  });

  res.status(404).json({
    error: `Cannot ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    requestId: getRequestId(req),
  });
}

export default errorHandler;

import { Request, Response, NextFunction } from 'express';

// ---------- Custom Error Classes ----------

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? `${resource} with id '${id}' not found` : `${resource} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

// ---------- Global Error Handler ----------

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Don't send response if headers already sent
  if (res.headersSent) {
    return;
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    const response: Record<string, any> = {
      error: err.message,
      code: err.code,
    };
    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues || []) {
      const path = issue.path.join('.') || 'body';
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details,
    });
  }

  // Handle database errors
  if (err.code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'CONFLICT',
    });
  }
  if (err.code === '23503') {
    // Foreign key constraint violation
    return res.status(400).json({
      error: 'Referenced resource does not exist',
      code: 'FK_VIOLATION',
    });
  }

  // Log unexpected errors
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // Generic 500 error — don't leak internals in production
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// ---------- Async Route Wrapper ----------

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async route handler to automatically catch errors
 * and forward them to the global error handler.
 */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

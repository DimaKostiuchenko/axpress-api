import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id;
  const isDevelopment = env.NODE_ENV === 'development';

  // Log error with full context
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      requestId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'Unhandled error'
  );

  // Handle Zod validation errors (shouldn't reach here if validation middleware works correctly)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      requestId,
    });
    return;
  }

  // Handle known error types
  if (err instanceof Error) {
    // In development, show more details
    if (isDevelopment) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack,
        requestId,
      });
      return;
    }
  }

  // Production: sanitize error response
  // Never expose stack traces, internal error messages, or sensitive information
  res.status(500).json({
    error: 'Internal Server Error',
    requestId,
  });
};

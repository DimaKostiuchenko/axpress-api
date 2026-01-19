import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validation middleware factory
 * Creates middleware to validate request data using Zod schemas
 */
export const validate =
  (schema: { query?: z.ZodSchema; params?: z.ZodSchema; body?: z.ZodSchema }) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
          requestId: req.id,
        });
        return;
      }

      // If it's not a Zod error, pass it to the error handler
      next(error);
    }
  };

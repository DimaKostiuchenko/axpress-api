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
        const details = error.errors.flatMap((err) => {
          if (err.code === 'unrecognized_keys' && err.keys?.length) {
            return err.keys.map((key) => ({
              path: key,
              message: `Unrecognized key: ${key}`,
            }));
          }

          return [
            {
              path: err.path.join('.'),
              message: err.message,
            },
          ];
        });

        res.status(400).json({
          error: 'Validation failed',
          details,
          requestId: req.id,
        });
        return;
      }

      // If it's not a Zod error, pass it to the error handler
      next(error);
    }
  };

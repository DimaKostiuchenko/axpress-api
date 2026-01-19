import type { ErrorRequestHandler } from 'express';

import { logger } from '../config/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
    },
    'Unhandled error'
  );

  res.status(500).json({ error: 'Internal Server Error' });
};

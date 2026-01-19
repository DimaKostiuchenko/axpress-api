import express from 'express';
import type { Request, Response } from 'express';

import { errorHandler } from './middlewares/error-handler.js';
import {
  corsMiddleware,
  helmetMiddleware,
  rateLimiter,
  requestIdMiddleware,
  requestSizeLimit,
} from './middlewares/security.js';
import { ethosStatsRouter } from './routes/ethos-stats-routes.js';

export const app = express();

// 1. Request ID for tracing
app.use(requestIdMiddleware);

// 2. Security headers
app.use(helmetMiddleware);

// 3. CORS configuration
app.use(corsMiddleware);

// 4. Rate limiting
app.use(rateLimiter);

// 6. Body parsing with size limits
app.use(express.json({ limit: requestSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimit }));

app.use('/api/v1/ethos', ethosStatsRouter);

// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

import { Router } from 'express';
import { z } from 'zod';

import { getEthosStats } from '../controllers/ethos-stats-controller.js';
import { validate } from '../middlewares/validation.js';

export const ethosStatsRouter = Router();

// Validation schema for the stats endpoint
// Currently no parameters, but ready for future additions
const statsSchema = {
  query: z.object({}).strict(), // Reject unknown query parameters
  params: z.object({}).strict(), // Reject unknown route parameters
};

ethosStatsRouter.get('/stats', validate(statsSchema), getEthosStats);

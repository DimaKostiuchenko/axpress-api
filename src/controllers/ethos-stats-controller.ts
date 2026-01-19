import type { NextFunction, Request, Response } from 'express';

import { ethosStatsService } from '../services/ethos-stats-service.js';

/**
 * Get Ethos stats from cache (with fallback to API)
 */
export const getEthosStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await ethosStatsService.getStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

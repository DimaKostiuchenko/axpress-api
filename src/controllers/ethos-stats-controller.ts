import type { Request, Response } from 'express';

import { ethosStatsService } from '../services/ethos-stats-service.js';

/**
 * Get Ethos stats from cache (with fallback to API)
 */
export const getEthosStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const stats = await ethosStatsService.getStats();
  res.json(stats);
};

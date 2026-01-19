import axios from 'axios';

import { logger } from '../config/logger.js';
import { redisRepository } from '../repositories/redis-repository.js';
import type { EthosStats } from '../types/ethos-stats.js';

const ETHOS_API_URL =
  'https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223';
const REDIS_KEY = 'ethos:stats';
const CACHE_TTL_SECONDS = 43200; // 12 hours

export class EthosStatsService {
  /**
   * Fetch stats from the Ethos API
   * @returns Promise resolving to EthosStats
   * @throws Error if the API request fails
   */
  async fetchStatsFromApi(): Promise<EthosStats> {
    try {
      logger.info({ url: ETHOS_API_URL }, 'Fetching stats from Ethos API');
      const response = await axios.get<EthosStats>(ETHOS_API_URL);
      logger.info(
        { url: ETHOS_API_URL, status: response.status },
        'Successfully fetched stats from Ethos API'
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = `Failed to fetch stats from Ethos API: ${error.message}`;
        logger.error(
          {
            err: error,
            url: ETHOS_API_URL,
            status: error.response?.status,
          },
          errorMessage
        );
        throw new Error(errorMessage);
      }
      const errorMessage = `Unexpected error fetching stats from Ethos API: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ err: error }, errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get stats from cache, or fetch from API if cache miss
   * @returns Promise resolving to EthosStats
   * @throws Error if both cache and API fetch fail
   */
  async getStats(): Promise<EthosStats> {
    try {
      const cachedStats = await redisRepository.get<EthosStats>(REDIS_KEY);
      if (cachedStats !== null) {
        logger.info({ key: REDIS_KEY }, 'Cache hit for Ethos stats');
        return cachedStats;
      }

      logger.info(
        { key: REDIS_KEY },
        'Cache miss for Ethos stats, fetching from API'
      );
      const stats = await this.fetchStatsFromApi();
      await redisRepository.set(REDIS_KEY, stats, CACHE_TTL_SECONDS);
      logger.info(
        { key: REDIS_KEY, ttl: CACHE_TTL_SECONDS },
        'Cached Ethos stats with TTL'
      );
      return stats;
    } catch (error) {
      const errorMessage = `Failed to get Ethos stats: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ err: error, key: REDIS_KEY }, errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Refresh the cache by fetching fresh data from the API
   * @returns Promise resolving to void
   * @throws Error if the API fetch or cache update fails
   */
  async refreshCache(): Promise<void> {
    try {
      logger.info({ key: REDIS_KEY }, 'Refreshing Ethos stats cache');
      const stats = await this.fetchStatsFromApi();
      await redisRepository.set(REDIS_KEY, stats, CACHE_TTL_SECONDS);
      logger.info(
        { key: REDIS_KEY, ttl: CACHE_TTL_SECONDS },
        'Successfully refreshed Ethos stats cache'
      );
    } catch (error) {
      const errorMessage = `Failed to refresh Ethos stats cache: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ err: error, key: REDIS_KEY }, errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export const ethosStatsService = new EthosStatsService();

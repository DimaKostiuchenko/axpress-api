import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../../../src/config/logger.js';
import { redisRepository } from '../../../src/repositories/redis-repository.js';
import { EthosStatsService } from '../../../src/services/ethos-stats-service.js';
import { mockEthosStats } from '../../helpers/fixtures.js';

// Mock dependencies
vi.mock('axios');
vi.mock('../../../src/config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('../../../src/repositories/redis-repository.js', () => ({
  redisRepository: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('EthosStatsService', () => {
  let service: EthosStatsService;

  beforeEach(() => {
    service = new EthosStatsService();
    vi.clearAllMocks();
  });

  describe('fetchStatsFromApi', () => {
    it('should successfully fetch stats from API', async () => {
      const mockResponse = {
        status: 200,
        data: mockEthosStats,
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      const result = await service.fetchStatsFromApi();

      expect(result).toEqual(mockEthosStats);
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223'
      );
      expect(logger.info).toHaveBeenCalledWith(
        {
          url: 'https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223',
        },
        'Fetching stats from Ethos API'
      );
      expect(logger.info).toHaveBeenCalledWith(
        {
          url: 'https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223',
          status: 200,
        },
        'Successfully fetched stats from Ethos API'
      );
    });

    it('should handle axios network errors', async () => {
      const networkError = new Error('Network Error');
      vi.mocked(axios.isAxiosError).mockReturnValue(true);
      vi.mocked(axios.get).mockRejectedValue(networkError);

      await expect(service.fetchStatsFromApi()).rejects.toThrow(
        'Failed to fetch stats from Ethos API: Network Error'
      );

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: networkError,
          url: 'https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223',
          status: undefined,
        },
        'Failed to fetch stats from Ethos API: Network Error'
      );
    });

    it('should handle axios HTTP errors (4xx/5xx)', async () => {
      const httpError = {
        message: 'Request failed with status code 500',
        response: {
          status: 500,
        },
      };
      vi.mocked(axios.isAxiosError).mockReturnValue(true);
      vi.mocked(axios.get).mockRejectedValue(httpError);

      await expect(service.fetchStatsFromApi()).rejects.toThrow(
        'Failed to fetch stats from Ethos API: Request failed with status code 500'
      );

      expect(logger.error).toHaveBeenCalledWith(
        {
          err: httpError,
          url: 'https://api.ethos.network/api/v2/votes/stats?type=attestation&activityId=223',
          status: 500,
        },
        'Failed to fetch stats from Ethos API: Request failed with status code 500'
      );
    });

    it('should handle non-axios errors', async () => {
      const genericError = new Error('Unexpected error');
      vi.mocked(axios.isAxiosError).mockReturnValue(false);
      vi.mocked(axios.get).mockRejectedValue(genericError);

      await expect(service.fetchStatsFromApi()).rejects.toThrow(
        'Unexpected error fetching stats from Ethos API: Unexpected error'
      );

      expect(logger.error).toHaveBeenCalledWith(
        { err: genericError },
        'Unexpected error fetching stats from Ethos API: Unexpected error'
      );
    });

    it('should handle non-Error objects', async () => {
      const stringError = 'String error';
      vi.mocked(axios.isAxiosError).mockReturnValue(false);
      vi.mocked(axios.get).mockRejectedValue(stringError);

      await expect(service.fetchStatsFromApi()).rejects.toThrow(
        'Unexpected error fetching stats from Ethos API: String error'
      );
    });
  });

  describe('getStats', () => {
    it('should return cached stats when cache hit', async () => {
      vi.mocked(redisRepository.get).mockResolvedValue(mockEthosStats);

      const result = await service.getStats();

      expect(result).toEqual(mockEthosStats);
      expect(redisRepository.get).toHaveBeenCalledWith('ethos:stats');
      expect(redisRepository.set).not.toHaveBeenCalled();
      expect(axios.get).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats' },
        'Cache hit for Ethos stats'
      );
    });

    it('should fetch from API on cache miss and cache result', async () => {
      const mockResponse = {
        status: 200,
        data: mockEthosStats,
      };

      vi.mocked(redisRepository.get).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue(mockResponse);
      vi.mocked(redisRepository.set).mockResolvedValue(undefined);

      const result = await service.getStats();

      expect(result).toEqual(mockEthosStats);
      expect(redisRepository.get).toHaveBeenCalledWith('ethos:stats');
      expect(axios.get).toHaveBeenCalled();
      expect(redisRepository.set).toHaveBeenCalledWith(
        'ethos:stats',
        mockEthosStats,
        43200
      );
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats' },
        'Cache miss for Ethos stats, fetching from API'
      );
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats', ttl: 43200 },
        'Cached Ethos stats with TTL'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const redisError = new Error('Redis connection failed');
      vi.mocked(redisRepository.get).mockRejectedValue(redisError);

      await expect(service.getStats()).rejects.toThrow(
        'Failed to get Ethos stats: Redis connection failed'
      );

      expect(logger.error).toHaveBeenCalledWith(
        { err: redisError, key: 'ethos:stats' },
        'Failed to get Ethos stats: Redis connection failed'
      );
    });

    it('should successfully fetch and cache fresh data', async () => {
      const mockResponse = {
        status: 200,
        data: mockEthosStats,
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);
      vi.mocked(redisRepository.set).mockResolvedValue(undefined);

      await service.refreshCache();

      expect(axios.get).toHaveBeenCalled();
      expect(redisRepository.set).toHaveBeenCalledWith(
        'ethos:stats',
        mockEthosStats,
        43200
      );
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats' },
        'Refreshing Ethos stats cache'
      );
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats', ttl: 43200 },
        'Successfully refreshed Ethos stats cache'
      );
    });

    it('should handle Redis set failures after successful API fetch', async () => {
      const mockResponse = {
        status: 200,
        data: mockEthosStats,
      };
      const redisSetError = new Error('Redis set failed');

      vi.mocked(redisRepository.get).mockResolvedValue(null);
      vi.mocked(axios.get).mockResolvedValue(mockResponse);
      vi.mocked(redisRepository.set).mockRejectedValue(redisSetError);

      await expect(service.getStats()).rejects.toThrow(
        'Failed to get Ethos stats: Redis set failed'
      );
    });
  });

  describe('refreshCache', () => {
    it('should successfully fetch and cache fresh data', async () => {
      const mockResponse = {
        status: 200,
        data: mockEthosStats,
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);
      vi.mocked(redisRepository.set).mockResolvedValue(undefined);

      await service.refreshCache();

      expect(axios.get).toHaveBeenCalled();
      expect(redisRepository.set).toHaveBeenCalledWith(
        'ethos:stats',
        mockEthosStats,
        43200
      );
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats' },
        'Refreshing Ethos stats cache'
      );
      expect(logger.info).toHaveBeenCalledWith(
        { key: 'ethos:stats', ttl: 43200 },
        'Successfully refreshed Ethos stats cache'
      );
    });

    it('should handle API fetch failures', async () => {
      const apiError = new Error('API request failed');
      vi.mocked(axios.isAxiosError).mockReturnValue(true);
      vi.mocked(axios.get).mockRejectedValue(apiError);

      await expect(service.refreshCache()).rejects.toThrow(
        'Failed to refresh Ethos stats cache: Failed to fetch stats from Ethos API: API request failed'
      );

      expect(logger.error).toHaveBeenCalled();
      const errorCalls = vi.mocked(logger.error).mock.calls;
      const refreshErrorCall = errorCalls.find((call) =>
        call[1]?.toString().includes('Failed to refresh Ethos stats cache')
      );
      expect(refreshErrorCall).toBeDefined();
    });

    it('should handle Redis set failures', async () => {
      const mockResponse = {
        status: 200,
        data: mockEthosStats,
      };
      const redisSetError = new Error('Redis set failed');

      vi.mocked(axios.get).mockResolvedValue(mockResponse);
      vi.mocked(redisRepository.set).mockRejectedValue(redisSetError);

      await expect(service.refreshCache()).rejects.toThrow(
        'Failed to refresh Ethos stats cache: Redis set failed'
      );
    });
  });
});

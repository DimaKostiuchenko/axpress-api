import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redisClient } from '../../../src/config/redis.js';
import { RedisRepository } from '../../../src/repositories/redis-repository.js';
import { mockEthosStats } from '../../helpers/fixtures.js';

// Mock Redis client
vi.mock('../../../src/config/redis.js', () => ({
  redisClient: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
  },
}));

describe('RedisRepository', () => {
  let repository: RedisRepository;

  beforeEach(() => {
    repository = new RedisRepository();
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return parsed JSON when key exists', async () => {
      const serializedValue = JSON.stringify(mockEthosStats);
      vi.mocked(redisClient.get).mockResolvedValue(serializedValue);

      const result = await repository.get('test-key');

      expect(result).toEqual(mockEthosStats);
      expect(redisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      vi.mocked(redisClient.get).mockResolvedValue(null);

      const result = await repository.get('non-existent-key');

      expect(result).toBeNull();
      expect(redisClient.get).toHaveBeenCalledWith('non-existent-key');
    });

    it('should handle JSON parse errors (SyntaxError)', async () => {
      const invalidJson = '{ invalid json }';
      vi.mocked(redisClient.get).mockResolvedValue(invalidJson);

      await expect(repository.get('invalid-key')).rejects.toThrow(
        'Failed to parse JSON for key "invalid-key"'
      );
    });

    it('should handle Redis connection errors', async () => {
      const redisError = new Error('Redis connection failed');
      vi.mocked(redisClient.get).mockRejectedValue(redisError);

      await expect(repository.get('test-key')).rejects.toThrow(
        'Redis get operation failed for key "test-key": Redis connection failed'
      );
    });

    it('should handle invalid JSON in cache', async () => {
      const invalidJson = 'not json at all';
      vi.mocked(redisClient.get).mockResolvedValue(invalidJson);

      await expect(repository.get('test-key')).rejects.toThrow(
        'Failed to parse JSON for key "test-key"'
      );
    });

    it('should handle non-Error objects thrown by Redis', async () => {
      const stringError = 'String error';
      vi.mocked(redisClient.get).mockRejectedValue(stringError);

      await expect(repository.get('test-key')).rejects.toThrow(
        'Redis get operation failed for key "test-key": String error'
      );
    });
  });

  describe('set', () => {
    it('should successfully set value without TTL', async () => {
      vi.mocked(redisClient.set).mockResolvedValue('OK');

      await repository.set('test-key', mockEthosStats);

      const expectedSerialized = JSON.stringify(mockEthosStats);
      expect(redisClient.set).toHaveBeenCalledWith(
        'test-key',
        expectedSerialized
      );
      expect(redisClient.setex).not.toHaveBeenCalled();
    });

    it('should successfully set value with TTL', async () => {
      vi.mocked(redisClient.setex).mockResolvedValue('OK');

      await repository.set('test-key', mockEthosStats, 3600);

      const expectedSerialized = JSON.stringify(mockEthosStats);
      expect(redisClient.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        expectedSerialized
      );
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('should handle Redis connection errors', async () => {
      const redisError = new Error('Redis connection failed');
      vi.mocked(redisClient.set).mockRejectedValue(redisError);

      await expect(repository.set('test-key', mockEthosStats)).rejects.toThrow(
        'Redis set operation failed for key "test-key": Redis connection failed'
      );
    });

    it('should handle Redis connection errors with TTL', async () => {
      const redisError = new Error('Redis connection failed');
      vi.mocked(redisClient.setex).mockRejectedValue(redisError);

      await expect(
        repository.set('test-key', mockEthosStats, 3600)
      ).rejects.toThrow(
        'Redis set operation failed for key "test-key": Redis connection failed'
      );
    });

    it('should serialize complex objects correctly', async () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          date: new Date('2024-01-01'),
        },
        number: 42,
        string: 'test',
        boolean: true,
        null: null,
      };

      vi.mocked(redisClient.set).mockResolvedValue('OK');

      await repository.set('complex-key', complexObject);

      const expectedSerialized = JSON.stringify(complexObject);
      expect(redisClient.set).toHaveBeenCalledWith(
        'complex-key',
        expectedSerialized
      );
    });

    it('should handle non-Error objects thrown by Redis', async () => {
      const stringError = 'String error';
      vi.mocked(redisClient.set).mockRejectedValue(stringError);

      await expect(repository.set('test-key', mockEthosStats)).rejects.toThrow(
        'Redis set operation failed for key "test-key": String error'
      );
    });
  });
});

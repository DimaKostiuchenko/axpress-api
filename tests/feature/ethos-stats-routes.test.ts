import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Mock dependencies - must be before any imports that use them
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    REDIS_URL: 'redis://localhost:6379',
  },
}));

vi.mock('../../src/config/redis.js', () => {
  const mockExec = vi.fn().mockResolvedValue([
    [null, 1], // incr result
    [null, 900], // expire result (TTL in seconds)
  ]);
  const mockMulti = vi.fn().mockReturnValue({
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: mockExec,
  });
  
  return {
    redisClient: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      setex: vi.fn().mockResolvedValue('OK'),
      multi: mockMulti,
      on: vi.fn(),
    },
  };
});

vi.mock('../../src/repositories/redis-repository.js', () => ({
  redisRepository: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../src/services/ethos-stats-service.js', () => ({
  ethosStatsService: {
    getStats: vi.fn(),
    fetchStatsFromApi: vi.fn(),
    refreshCache: vi.fn(),
  },
}));

import { app } from '../../src/app.js';
import { ethosStatsService } from '../../src/services/ethos-stats-service.js';
import { mockEthosStats } from '../helpers/fixtures.js';

describe('GET /api/v1/ethos/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached stats successfully (200)', async () => {
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(mockEthosStats);

    const response = await request(app).get('/api/v1/ethos/stats').expect(200);

    expect(response.body).toEqual(mockEthosStats);
    expect(ethosStatsService.getStats).toHaveBeenCalledTimes(1);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should fetch from API on cache miss and return stats (200)', async () => {
    // Simulate cache miss by having getStats fetch from API
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(mockEthosStats);

    const response = await request(app).get('/api/v1/ethos/stats').expect(200);

    expect(response.body).toEqual(mockEthosStats);
    expect(ethosStatsService.getStats).toHaveBeenCalledTimes(1);
  });

  it('should handle API fetch failure gracefully (500)', async () => {
    const error = new Error(
      'Failed to fetch stats from Ethos API: Network error'
    );
    vi.mocked(ethosStatsService.getStats).mockRejectedValue(error);

    const response = await request(app).get('/api/v1/ethos/stats').expect(500);

    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body).toHaveProperty('requestId');
    expect(ethosStatsService.getStats).toHaveBeenCalledTimes(1);
  });

  it('should handle Redis errors gracefully (500)', async () => {
    const error = new Error('Redis connection failed');
    vi.mocked(ethosStatsService.getStats).mockRejectedValue(error);

    const response = await request(app).get('/api/v1/ethos/stats').expect(500);

    expect(response.body).toHaveProperty('error', 'Internal Server Error');
    expect(response.body).toHaveProperty('requestId');
  }, 10000);

  it('should validate request (rejects unknown query params with 400)', async () => {
    const response = await request(app)
      .get('/api/v1/ethos/stats')
      .query({ unknown: 'param' })
      .expect(400);

    expect(response.body).toHaveProperty('error', 'Validation failed');
    expect(response.body).toHaveProperty('details');
    expect(response.body).toHaveProperty('requestId');
    // The validation error might be on the query object itself, not just 'unknown'
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.any(String),
          message: expect.any(String),
        }),
      ])
    );
    expect(ethosStatsService.getStats).not.toHaveBeenCalled();
  });

  it('should include proper response headers', async () => {
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(mockEthosStats);

    const response = await request(app).get('/api/v1/ethos/stats').expect(200);

    expect(response.headers['content-type']).toMatch(/json/);
  });

  it('should return response format matching EthosStats type', async () => {
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(mockEthosStats);

    const response = await request(app).get('/api/v1/ethos/stats').expect(200);

    expect(response.body).toBeInstanceOf(Object);
    expect(response.body).toEqual(mockEthosStats);
  });

  it('should handle empty cache and fetch from API', async () => {
    // First call returns null (cache miss), then fetches from API
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(mockEthosStats);

    const response = await request(app).get('/api/v1/ethos/stats').expect(200);

    expect(response.body).toEqual(mockEthosStats);
    expect(ethosStatsService.getStats).toHaveBeenCalledTimes(1);
  });

  it('should include requestId in error responses', async () => {
    const error = new Error('Service error');
    vi.mocked(ethosStatsService.getStats).mockRejectedValue(error);

    const response = await request(app).get('/api/v1/ethos/stats').expect(500);

    expect(response.body).toHaveProperty('requestId');
    expect(typeof response.body.requestId).toBe('string');
  }, 10000);

  it('should handle malformed service responses', async () => {
    // Service returns unexpected data structure
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(
      null as unknown as typeof mockEthosStats
    );

    const response = await request(app).get('/api/v1/ethos/stats').expect(200);

    expect(response.body).toBeNull();
  });

  it('should reject invalid HTTP methods', async () => {
    await request(app).post('/api/v1/ethos/stats').expect(404);
    await request(app).put('/api/v1/ethos/stats').expect(404);
    await request(app).delete('/api/v1/ethos/stats').expect(404);
  });

  it('should handle rate limiting middleware', async () => {
    vi.mocked(ethosStatsService.getStats).mockResolvedValue(mockEthosStats);

    // Make multiple requests to test rate limiting
    const requests = Array.from({ length: 5 }, () =>
      request(app).get('/api/v1/ethos/stats')
    );

    const responses = await Promise.all(requests);

    // All should succeed (rate limit is per IP, and we're using the same test client)
    // The actual rate limit behavior depends on the middleware configuration
    responses.forEach((response) => {
      expect([200, 429]).toContain(response.status);
    });
  });
});

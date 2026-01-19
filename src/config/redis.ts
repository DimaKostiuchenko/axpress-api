import { Redis } from 'ioredis';
import { logger } from './logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(REDIS_URL, {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (error: Error) => {
  logger.error({ err: error }, 'Redis connection error');
});

redisClient.on('close', () => {
  logger.info('Redis connection closed');
});

export const closeRedisConnection = async (): Promise<void> => {
  await redisClient.quit();
};

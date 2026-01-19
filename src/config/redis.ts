import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { env } from './env.js';

export const redisClient = new Redis(env.REDIS_URL, {
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

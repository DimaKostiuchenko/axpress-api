import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { env } from './env.js';

export const redisClient = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
});

redisClient.on('connect', () => {
  logger.info('Redis socket connected');
});

redisClient.on('ready', () => {
  logger.info('Redis ready');
});

redisClient.on('error', (error) => {
  logger.error({ err: error }, 'Redis error');
});

redisClient.on('reconnecting', (delay) => {
  logger.warn({ nextRetryIn: delay }, 'Redis reconnecting');
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

redisClient.on('end', () => {
  logger.warn('Redis connection ended');
});

export const waitForRedis = async (timeoutMs = 15000): Promise<void> => {
  if (redisClient.status === 'ready') return;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Redis connection timeout: ${timeoutMs}ms`));
    }, timeoutMs);

    redisClient.once('ready', () => {
      clearTimeout(timeout);
      resolve();
    });

    redisClient.once('error', (err) => {
      if (err.message.includes('AUTH')) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient.status === 'end') return;

  try {
    await redisClient.quit();
  } catch (err) {
    logger.error({ err }, 'Redis quit failed, forcing disconnect');
    redisClient.disconnect();
  }
};

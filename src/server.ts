import 'dotenv/config';

import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closeRedisConnection } from './config/redis.js';
import { ethosStatsScheduler } from './services/ethos-stats-scheduler.js';

const server = app.listen(env.PORT, () => {
  logger.info(`Server is running at http://localhost:${env.PORT}`);
  ethosStatsScheduler.start();
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      ethosStatsScheduler.stop();
      await closeRedisConnection();
      logger.info('Redis connection closed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino(
  isDevelopment
    ? {
        level: process.env.LOG_LEVEL || 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {
        level: process.env.LOG_LEVEL || 'info',
      }
);

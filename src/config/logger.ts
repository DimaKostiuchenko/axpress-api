import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV !== 'production' && !isTest;

export const logger = pino(
  isTest
    ? { level: 'silent' }
    : isDevelopment
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

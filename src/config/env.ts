import { z } from 'zod';

/**
 * Environment variable schema validation
 * Validates all environment variables at startup
 */
const envSchema = z.object({
  // Server configuration
  PORT: z
    .string()
    .optional()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),

  // Redis configuration
  REDIS_URL: z.string().url().min(1, 'REDIS_URL is required'),

  // Logging configuration
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .optional(),

  // CORS configuration
  CORS_ORIGIN: z.string().url().optional(),

  // Rate limiting configuration
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .optional()
    .default('900000') // 15 minutes
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .optional()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

/**
 * Validated environment variables
 * Throws error if validation fails
 */
export const env = envSchema.parse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
});

/**
 * Type-safe environment configuration
 */
export type Env = z.infer<typeof envSchema>;

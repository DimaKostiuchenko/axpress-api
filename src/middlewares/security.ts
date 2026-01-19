import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import expressRateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { redisClient } from '../config/redis.js';
import { logger } from '../config/logger.js';

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Extend Express Request type to include request ID
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Security headers configuration using Helmet
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Can be enabled if needed
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * CORS configuration
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // If CORS_ORIGIN is set, use it as allowlist
    if (env.CORS_ORIGIN) {
      const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }

    // In development, allow all origins
    if (env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production without CORS_ORIGIN, deny all
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400, // 24 hours
});

/**
 * Rate limiting store using Redis
 */
class RedisStore {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async increment(key: string) {
    const multi = this.client.multi();
    multi.incr(key);
    const ttlSeconds = Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000);
    multi.expire(key, ttlSeconds);
    const results = await multi.exec();

    if (!results || results.length < 2) {
      throw new Error('Redis rate limit increment failed');
    }

    const incrResult = results[0];
    const expireResult = results[1];

    if (!incrResult || !expireResult || incrResult[0] || expireResult[0]) {
      throw new Error('Redis rate limit increment failed');
    }

    const totalHits = incrResult[1] as number;
    const ttl = expireResult[1] as number;
    const now = Date.now();

    return {
      totalHits,
      resetTime: new Date(
        now + (ttl > 0 ? ttl * 1000 : env.RATE_LIMIT_WINDOW_MS)
      ),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(key);
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(key);
  }
}

/**
 * Global rate limiter
 */
export const rateLimiter = expressRateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  store: new RedisStore(redisClient),
  handler: (req: Request, res: Response) => {
    logger.warn(
      {
        ip: req.ip,
        path: req.path,
        requestId: req.id,
      },
      'Rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      requestId: req.id,
    });
  },
  skip: (_req: Request) => {
    // Skip rate limiting for health checks if needed
    return false;
  },
});

/**
 * Request size limit configuration
 */
export const requestSizeLimit = '10mb';

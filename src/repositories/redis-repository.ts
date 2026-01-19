import { redisClient } from '../config/redis.js';

export class RedisRepository {
  /**
   * Get a value from Redis and deserialize it as JSON
   * @param key - Redis key
   * @returns Parsed JSON value or null if key doesn't exist
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          `Failed to parse JSON for key "${key}": ${error.message}`
        );
      }
      throw new Error(
        `Redis get operation failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set a value in Redis with JSON serialization
   * @param key - Redis key
   * @param value - Value to store (will be JSON serialized)
   * @param ttlSeconds - Optional TTL in seconds
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds !== undefined) {
        await redisClient.setex(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      throw new Error(
        `Redis set operation failed for key "${key}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const redisRepository = new RedisRepository();

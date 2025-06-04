import Redis from 'ioredis';
import { RedisCacheBackend } from './redis';
import { CacheBackend } from '../types';

// Global Redis client to reuse connections
let globalRedisClient: Redis | null = null;

/**
 * Create a default Redis backend, reusing a global client if available.
 * 
 * @param options - Options for creating the Redis backend
 * @returns A Redis cache backend instance
 */
export function createDefaultBackend<T = unknown>(
  options: { prefix?: string; redisClient?: Redis } = {}
): CacheBackend<T> {
  const { prefix = 'next-cachex', redisClient } = options;
  
  // Use provided client or create/reuse global client
  const client = redisClient || getGlobalRedisClient();
  
  return new RedisCacheBackend<T>(client, prefix);
}

/**
 * Get or create the global Redis client
 * @returns Redis client instance
 */
function getGlobalRedisClient(): Redis {
  if (!globalRedisClient) {
    globalRedisClient = new Redis({
      // Default Redis connection options
      // These can be overridden with env vars
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    });
  }
  return globalRedisClient;
}

export { RedisCacheBackend } from './redis'; 
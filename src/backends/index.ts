import Redis from 'ioredis';
import { RedisCacheBackend } from './redis';
import { CacheBackend, CacheConnectionError } from '../types';

// Global Redis client to reuse connections
let globalRedisClient: Redis | null = null;
let connectionPromise: Promise<Redis> | null = null;

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
 * Get or create the global Redis client with proper error handling
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
      // Add connection timeout and retry settings
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately
    });

    // Set up proper error handling
    globalRedisClient.on('error', (error) => {
      // Only log connection errors, don't throw unhandled rejections
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Redis connection error:', error.message);
      }
    });

    globalRedisClient.on('connect', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log('Redis connected successfully');
      }
    });

    // Handle connection promise
    connectionPromise = globalRedisClient.connect().then(() => globalRedisClient!).catch((error) => {
      // Reset the promise on error so it can be retried
      connectionPromise = null;
      const connectionError = new CacheConnectionError(
        `Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`
      );
      
      // In test environment, don't throw unhandled rejections
      if (process.env.NODE_ENV === 'test') {
        console.warn('Redis connection failed in test environment:', connectionError.message);
        return globalRedisClient!;
      }
      
      throw connectionError;
    });
  }
  return globalRedisClient;
}

/**
 * Get the connection promise for the global Redis client
 * @returns Promise that resolves when Redis is connected
 */
export function getRedisConnectionPromise(): Promise<Redis> | null {
  return connectionPromise;
}

/**
 * Close the global Redis client (useful for cleanup in tests)
 */
export function closeGlobalRedisClient(): void {
  if (globalRedisClient) {
    globalRedisClient.disconnect();
    globalRedisClient = null;
    connectionPromise = null;
  }
}

export { RedisCacheBackend } from './redis';
export { MemoryCacheBackend } from './memory'; 
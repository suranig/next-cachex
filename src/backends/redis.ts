import { CacheBackend, CacheSerializationError, CacheBackendError, CacheConfigError } from '../types';
import type Redis from 'ioredis';

/**
 * Redis backend implementation of CacheBackend.
 * All Redis-specific logic is encapsulated here.
 */
export class RedisCacheBackend<T = unknown> implements CacheBackend<T> {
  private client: Redis;
  private prefix: string;

  constructor(client: Redis, prefix = '') {
    this.client = client;
    this.prefix = prefix;
  }

  /**
   * Get a value from Redis and parse it as JSON.
   * @param key - The cache key
   */
  async get(key: string): Promise<T | undefined> {
    const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
    try {
      const value = await this.client.get(fullKey);
      if (value === null) return undefined;
      try {
        return JSON.parse(value) as T;
      } catch (error) {
        throw new CacheSerializationError(
          `Failed to parse cached value for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } catch (error) {
      if (error instanceof CacheSerializationError) {
        throw error;
      }
      throw new CacheBackendError(
        `Redis get operation failed for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Set a value in Redis as JSON, with optional TTL (seconds).
   * @param key - The cache key
   * @param value - The value to cache
   * @param options - Optional TTL in seconds
   */
  async set(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
    let str: string;
    try {
      str = JSON.stringify(value);
    } catch (error) {
      throw new CacheSerializationError(
        `Failed to stringify value for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
    
    try {
      if (options?.ttl) {
        await this.client.set(fullKey, str, 'EX', options.ttl);
      } else {
        await this.client.set(fullKey, str);
      }
    } catch (error) {
      throw new CacheBackendError(
        `Redis set operation failed for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete a value from Redis.
   * @param key - The cache key
   */
  async del(key: string): Promise<void> {
    const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
    try {
      await this.client.del(fullKey);
    } catch (error) {
      throw new CacheBackendError(
        `Redis delete operation failed for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Acquire a distributed lock for a key (atomic, with TTL).
   * @param key - The lock key
   * @param ttl - Lock TTL in seconds
   * @returns True if lock acquired, false otherwise
   */
  async lock(key: string, ttl: number): Promise<boolean> {
    const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
    try {
      // Use SET NX EX for atomic lock
      const result = await this.client.set(fullKey, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      throw new CacheBackendError(
        `Redis lock operation failed for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Release a distributed lock for a key.
   * @param key - The lock key
   */
  async unlock(key: string): Promise<void> {
    const fullKey = this.prefix ? `${this.prefix}:${key}` : key;
    try {
      await this.client.del(fullKey);
    } catch (error) {
      throw new CacheBackendError(
        `Redis unlock operation failed for key "${fullKey}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clear all cache entries for the current prefix/namespace.
   * Uses SCAN and DEL for safety and performance.
   */
  async clear(): Promise<void> {
    if (!this.prefix) {
      throw new CacheConfigError('Refusing to clear all keys: prefix is required for safety.');
    }
    
    const pattern = `${this.prefix}:*`;
    let cursor = '0';
    try {
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      throw new CacheBackendError(
        `Redis clear operation failed for pattern "${pattern}": ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}

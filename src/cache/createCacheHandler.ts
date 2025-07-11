import {
  CacheHandler,
  CacheHandlerOptions,
  CacheFetchOptions,
  CacheLogger,
  CacheTimeoutError,
  CacheBackendError,
} from '../types';

/**
 * Default cache logger that does nothing
 */
const noopLogger: CacheLogger = {
  log: () => {
    // No-op
  },
};

/**
 * Default fetch options
 */
const DEFAULT_FETCH_OPTIONS = {
  ttl: 300, // 5 minutes
  lockTimeout: 5000, // 5 seconds
  staleTtl: 3600, // 1 hour
};

/**
 * Create a new cache handler with the specified backend and options.
 * 
 * @param options - Cache handler configuration
 * @returns A configured cache handler
 * 
 * @example
 * ```ts
 * import { createCacheHandler } from 'next-cachex';
 * import { RedisCacheBackend } from 'next-cachex/backends/redis';
 * import Redis from 'ioredis';
 * 
 * const redisClient = new Redis();
 * const cacheHandler = createCacheHandler({
 *   backend: new RedisCacheBackend(redisClient),
 *   prefix: 'myapp',
 *   version: 'v1',
 * });
 * 
 * // Use the handler
 * const data = await cacheHandler.fetch('posts:all', fetchPosts, { ttl: 300 });
 * ```
 */
export function createCacheHandler<T = unknown>(
  options: CacheHandlerOptions<T>,
): CacheHandler<T> {
  const {
    backend,
    prefix = '',
    logger = noopLogger,
    fallbackToStale = false,
    version = '',
  } = options;

  // Simple in-memory cache for frequently accessed keys (L1 cache)
  const l1Cache = new Map<string, { value: unknown; expiresAt: number }>();
  const L1_CACHE_TTL = 1000; // 1 second TTL for L1 cache

  /**
   * Get the fully qualified key with prefix and version
   */
  const getFullKey = (key: string): string => {
    const parts = [prefix, version, key].filter(Boolean);
    return parts.join(':');
  };

  /**
   * Fetch a value from cache or execute the fetcher function
   */
  const fetch = async <R = T>(
    key: string,
    fetcher: () => Promise<R>,
    options?: CacheFetchOptions,
  ): Promise<R> => {
    const fullKey = getFullKey(key);
    const fetchOptions = { ...DEFAULT_FETCH_OPTIONS, ...options };
    
    // Try to get from L1 cache first
    const l1Item = l1Cache.get(fullKey);
    if (l1Item && l1Item.expiresAt > Date.now()) {
      logger.log({ type: 'HIT', key: fullKey });
      return l1Item.value as R;
    }

    // Try to get from backend cache
    try {
      const cached = await backend.get(fullKey) as R | undefined;
      if (cached !== undefined) {
        // Store in L1 cache for future fast access
        l1Cache.set(fullKey, {
          value: cached,
          expiresAt: Date.now() + L1_CACHE_TTL,
        });
        logger.log({ type: 'HIT', key: fullKey });
        return cached;
      }
    } catch (error) {
      throw new CacheBackendError(
        `Failed to get value from cache: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
    
    logger.log({ type: 'MISS', key: fullKey });
    
    // Try to acquire a lock
    const lockKey = `lock:${fullKey}`;
    let lockAcquired = false;
    try {
      lockAcquired = await backend.lock(lockKey, Math.ceil(fetchOptions.lockTimeout / 1000));
    } catch (error) {
      throw new CacheBackendError(
        `Failed to acquire lock: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
    
    if (lockAcquired) {
      try {
        logger.log({ type: 'LOCK', key: lockKey });
        
        // Execute the fetcher
        const value = await fetcher();
        
        // Cache the result
        await backend.set(fullKey, value as unknown as T, { 
          ttl: fetchOptions.ttl,
        });
        
        // Also store in L1 cache
        l1Cache.set(fullKey, {
          value,
          expiresAt: Date.now() + L1_CACHE_TTL,
        });
        
        // If staleTtl is set, store a stale copy with longer TTL
        if (fallbackToStale && fetchOptions.staleTtl && fetchOptions.staleTtl > fetchOptions.ttl) {
          const staleKey = `stale:${fullKey}`;
          try {
            await backend.set(staleKey, value as unknown as T, {
              ttl: fetchOptions.staleTtl,
            });
          } catch (error) {
            // Just log stale cache errors, don't throw
            logger.log({
              type: 'ERROR',
              key: staleKey,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          }
        }
        
        return value;
      } catch (error) {
        logger.log({ 
          type: 'ERROR', 
          key: fullKey, 
          error: error instanceof Error ? error : new Error(String(error)),
        });
        
        // If fallback to stale is enabled, try to get stale value
        if (fallbackToStale && fetchOptions.staleTtl) {
          const staleKey = `stale:${fullKey}`;
          try {
            const staleValue = await backend.get(staleKey) as R | undefined;
            if (staleValue !== undefined) {
              logger.log({ type: 'HIT', key: `stale:${fullKey}` });
              return staleValue;
            }
          } catch (staleError) {
            // Just log stale cache errors, continue with original error
            logger.log({
              type: 'ERROR',
              key: staleKey,
              error: staleError instanceof Error ? staleError : new Error(String(staleError)),
            });
          }
        }
        
        throw error;
      } finally {
        // Always release the lock
        try {
          await backend.unlock(lockKey);
        } catch (unlockError) {
          // Just log unlock errors, don't throw
          logger.log({ 
            type: 'ERROR', 
            key: lockKey, 
            error: new CacheBackendError(
              `Failed to release lock: ${unlockError instanceof Error ? unlockError.message : String(unlockError)}`,
              unlockError instanceof Error ? unlockError : undefined
            ),
          });
        }
      }
    } else {
      // Lock not acquired, wait for the value to be available
      logger.log({ type: 'WAIT', key: lockKey });
      
      // Exponential backoff polling implementation
      const startTime = Date.now();
      let pollInterval = 50; // Start with 50ms
      const maxPollInterval = 500; // Max 500ms between polls
      
      while (Date.now() - startTime < fetchOptions.lockTimeout) {
        // Sleep with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        
        // Check if the value is now available
        try {
          const value = await backend.get(fullKey) as R | undefined;
          if (value !== undefined) {
            return value;
          }
        } catch (error) {
          // Continue polling even if get fails
          logger.log({
            type: 'ERROR',
            key: fullKey,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
        
        // Exponential backoff: double the interval, but cap it
        pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
      }
      
      // Timeout waiting for the value
      throw new CacheTimeoutError(
        `Timeout waiting for ${key} (${fetchOptions.lockTimeout}ms)`
      );
    }
  };

  /**
   * Clean up expired L1 cache entries
   */
  const cleanupL1Cache = () => {
    const now = Date.now();
    for (const [key, item] of l1Cache.entries()) {
      if (item.expiresAt <= now) {
        l1Cache.delete(key);
      }
    }
  };

  // Clean up L1 cache periodically
  setInterval(cleanupL1Cache, 5000); // Every 5 seconds

  return {
    fetch,
    backend,
    getFullKey,
  };
} 
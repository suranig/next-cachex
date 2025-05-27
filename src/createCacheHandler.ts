import {
  CacheBackend,
  CacheHandler,
  CacheHandlerOptions,
  CacheFetchOptions,
  CacheTimeoutError,
  CacheLogger,
} from './types';

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
const DEFAULT_FETCH_OPTIONS: Required<CacheFetchOptions> = {
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
    
    // Try to get from cache first
    const cached = await backend.get(fullKey) as R | undefined;
    if (cached !== undefined) {
      logger.log({ type: 'HIT', key: fullKey });
      return cached;
    }
    
    logger.log({ type: 'MISS', key: fullKey });
    
    // Try to acquire a lock
    const lockKey = `lock:${fullKey}`;
    const lockAcquired = await backend.lock(lockKey, Math.ceil(fetchOptions.lockTimeout / 1000));
    
    if (lockAcquired) {
      try {
        logger.log({ type: 'LOCK', key: lockKey });
        
        // Execute the fetcher
        const value = await fetcher();
        
        // Cache the result
        await backend.set(fullKey, value as unknown as T, { 
          ttl: fetchOptions.ttl,
        });
        
        return value;
      } catch (error) {
        logger.log({ 
          type: 'ERROR', 
          key: fullKey, 
          error: error instanceof Error ? error : new Error(String(error)),
        });
        
        // If fallback to stale is enabled, try to get stale value
        if (fallbackToStale) {
          // We could implement stale cache retrieval here
          // For now, just rethrow
        }
        
        throw error;
      } finally {
        // Always release the lock
        await backend.unlock(lockKey);
      }
    } else {
      // Lock not acquired, wait for the value to be available
      logger.log({ type: 'WAIT', key: lockKey });
      
      // Simple polling implementation
      const startTime = Date.now();
      
      while (Date.now() - startTime < fetchOptions.lockTimeout) {
        // Sleep for a short time
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Check if the value is now available
        const value = await backend.get(fullKey) as R | undefined;
        if (value !== undefined) {
          return value;
        }
      }
      
      // Timeout waiting for the value
      throw new CacheTimeoutError(
        `Timeout waiting for ${key} (${fetchOptions.lockTimeout}ms)`
      );
    }
  };

  return {
    fetch,
    backend,
    getFullKey,
  };
}

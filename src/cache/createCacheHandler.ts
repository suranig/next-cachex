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
    try {
      const cached = await backend.get(fullKey) as R | undefined;
      if (cached !== undefined) {
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
      
      // Simple polling implementation
      const startTime = Date.now();
      
      while (Date.now() - startTime < fetchOptions.lockTimeout) {
        // Sleep for a short time
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Check if the value is now available
        try {
          const value = await backend.get(fullKey) as R | undefined;
          if (value !== undefined) {
            return value;
          }
        } catch (error) {
          // Continue polling even if get fails
          continue;
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
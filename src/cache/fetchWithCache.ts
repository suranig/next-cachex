import {
  CacheBackend,
  CacheFetchOptions,
  CacheLogger,
  CacheTimeoutError,
  CacheConnectionError,
} from '../types';

/**
 * Default no-op logger (does nothing).
 */
const defaultLogger: CacheLogger = {
  log: () => {},
};

/**
 * Backend-agnostic cache fetch handler.
 * Retrieves data from cache or fetches and stores it if missing.
 * Handles distributed locking, TTL, stale fallback, logging, and errors.
 * @template T - The type of data being cached
 * @param key - The cache key
 * @param fetcher - The async function to fetch data if not cached
 * @param options - Cache fetch options (ttl, lockTimeout, backend, logger, etc.)
 * @param options.logger - Optional pluggable logger for cache events
 * @returns The cached or freshly fetched data
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheFetchOptions & {
    backend?: CacheBackend<T>;
    prefix?: string;
    logger?: CacheLogger;
    fallbackToStale?: boolean;
    version?: string;
  } = {}
): Promise<T> {
  const {
    backend,
    prefix = '',
    logger = defaultLogger,
    fallbackToStale = false,
    version,
    ttl,
    lockTimeout = 10,
    staleTtl,
  } = options;
  if (!backend) throw new CacheConnectionError('No cache backend provided');

  // Compose the full cache key with prefix and version
  const fullKey = [prefix, version, key].filter(Boolean).join(':');

  try {
    // Try to get from cache
    const cached = await backend.get(fullKey);
    if (cached !== undefined) {
      logger.log({ type: 'HIT', key: fullKey });
      return cached;
    }
    logger.log({ type: 'MISS', key: fullKey });

    // Try to acquire lock
    const lockKey = `${fullKey}:lock`;
    const lockAcquired = await backend.lock(lockKey, lockTimeout);
    if (!lockAcquired) {
      logger.log({ type: 'WAIT', key: fullKey });
      // Wait/poll for the lock to be released, then try to get from cache again
      const start = Date.now();
      while (Date.now() - start < lockTimeout * 1000) {
        await new Promise((r) => setTimeout(r, 100));
        const value = await backend.get(fullKey);
        if (value !== undefined) {
          logger.log({ type: 'HIT', key: fullKey });
          return value;
        }
      }
      logger.log({ type: 'ERROR', key: fullKey, error: new CacheTimeoutError(`Timeout waiting for lock on key: ${fullKey}`) });
      throw new CacheTimeoutError(`Timeout waiting for lock on key: ${fullKey}`);
    }

    // Lock acquired, fetch and set
    try {
      const data = await fetcher();
      await backend.set(fullKey, data, { ttl });
      logger.log({ type: 'LOCK', key: fullKey });
      return data;
    } catch (err) {
      // Optionally fallback to stale cache
      if (fallbackToStale && staleTtl) {
        const stale = await backend.get(fullKey);
        if (stale !== undefined) {
          logger.log({ type: 'HIT', key: fullKey });
          return stale;
        }
      }
      logger.log({ type: 'ERROR', key: fullKey, error: err instanceof Error ? err : new Error(String(err)) });
      throw err;
    } finally {
      await backend.unlock(lockKey);
    }
  } catch (err) {
    logger.log({ type: 'ERROR', key: fullKey, error: err instanceof Error ? err : new Error(String(err)) });
    throw err;
  }
} 
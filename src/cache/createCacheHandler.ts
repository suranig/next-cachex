import { CacheBackend, CacheHandlerOptions, CacheFetchOptions } from '../types';
import { fetchWithCache } from './fetchWithCache';

/**
 * Factory for creating a custom cache handler with a specific backend and options.
 * @template T - The type of data being cached
 * @param options - Handler options (backend, prefix, logger, etc.)
 * @returns An object with a fetch method
 */
export function createCacheHandler<T>(options: CacheHandlerOptions<T>) {
  return {
    /**
     * Fetch data with caching using the configured backend and options.
     * @param key - The cache key
     * @param fetcher - The async function to fetch data if not cached
     * @param fetchOptions - Per-request cache options (ttl, lockTimeout, etc.)
     * @returns The cached or freshly fetched data
     */
    fetch: (
      key: string,
      fetcher: () => Promise<T>,
      fetchOptions: CacheFetchOptions = {}
    ): Promise<T> => {
      // TODO: Pass backend and handler options to fetchWithCache
      // This is a placeholder; actual implementation will wire up backend, prefix, logger, etc.
      return fetchWithCache<T>(key, fetcher, { ...options, ...fetchOptions });
    },
    // Optionally expose backend, logger, etc. for advanced use
    backend: options.backend,
    logger: options.logger,
    prefix: options.prefix,
    version: options.version,
  };
} 
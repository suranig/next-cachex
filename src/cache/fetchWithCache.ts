/**
 * Fetch data from cache or execute the fetcher function.
 * This is a convenience wrapper around the default cache handler.
 * 
 * @param key - Cache key
 * @param fetcher - Function to execute on cache miss
 * @param options - Cache options (ttl, lockTimeout, etc.)
 * @returns The cached or fetched value
 * 
 * @example
 * ```ts
 * import { fetchWithCache } from 'next-cachex';
 * 
 * const data = await fetchWithCache(
 *   'posts:all',
 *   () => fetch('https://api.example.com/posts').then(r => r.json()),
 *   { ttl: 300 }
 * );
 * ```
 */
import type { CacheFetchOptions, CacheHandler } from '../types';
import { createCacheHandler } from './createCacheHandler';
import { createDefaultBackend } from '../backends';
import { MemoryCacheBackend } from '../backends/memory';

// Lazily create the default cache handler when first accessed
let defaultHandler: CacheHandler<unknown> | undefined;
export function getDefaultHandler() {
  if (!defaultHandler) {
    try {
      // Try to create a Redis backend first
      defaultHandler = createCacheHandler({
        backend: createDefaultBackend(),
        prefix: 'next-cachex',
      });
    } catch (error) {
      // Fallback to memory backend if Redis is not available (e.g., in tests)
      defaultHandler = createCacheHandler({
        backend: new MemoryCacheBackend(),
        prefix: 'next-cachex',
      });
    }
  }
  return defaultHandler;
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheFetchOptions,
): Promise<T> {
  // For testing: if a backend is provided in options, create a temporary handler
  if (options?.backend) {
    const tempHandler = createCacheHandler({
      backend: options.backend,
      logger: options.logger,
      prefix: 'next-cachex',
    });
    return tempHandler.fetch(key, fetcher, options);
  }
  
  // Use the default handler
  return getDefaultHandler().fetch(key, fetcher, options);
}

// Export the default handler for convenience
export { getDefaultHandler as cacheHandler };

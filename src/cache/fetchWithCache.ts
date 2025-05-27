import type { CacheFetchOptions } from '../types';
import { createCacheHandler } from './createCacheHandler';
import { createDefaultBackend } from '../backends';

// Create a singleton cache handler with default Redis backend
const defaultHandler = createCacheHandler({
  backend: createDefaultBackend(),
});

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
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheFetchOptions,
): Promise<T> {
  return defaultHandler.fetch(key, fetcher, options);
}

// Export the default handler for convenience
export const cacheHandler = defaultHandler; 
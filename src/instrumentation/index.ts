/**
 * next-cachex: Next.js Instrumentation
 * Provides hooks for cache warming, build-time cache population, etc.
 * @packageDocumentation
 */

import { CacheHandler } from '../types';

/**
 * Cache initialization data structure
 */
export interface CacheItem {
  key: string;
  value: unknown;
  options?: { ttl?: number; staleTtl?: number };
}

/**
 * Register initial cache data for cache warming.
 * Use this in Next.js instrumentation.ts or during app startup.
 * 
 * @param handler - The cache handler to populate
 * @param items - Cache items to populate
 * @returns Promise resolving when all cache items are set
 * 
 * @example
 * ```ts
 * // In your Next.js instrumentation.ts file
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     const { cacheHandler, registerInitialCache } = await import('next-cachex');
 *     
 *     await registerInitialCache(cacheHandler, [
 *       { key: 'global:config', value: { theme: 'light' }, options: { ttl: 3600 } },
 *       { key: 'products:featured', value: await fetchFeaturedProducts(), options: { ttl: 300 } },
 *     ]);
 *   }
 * }
 * ```
 */
export async function registerInitialCache<T>(
  handler: CacheHandler<T>,
  items: CacheItem[],
): Promise<void> {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return;
  }

  // Set each cache item using the handler backend
  await Promise.all(
    items.map(async ({ key, value, options }) => {
      const fullKey = handler.getFullKey(key);
      await handler.backend.set(fullKey, value as T, options);
      
      // If staleTtl is provided, also set a stale cache version
      if (options?.staleTtl && options.staleTtl > (options.ttl || 0)) {
        const staleKey = `stale:${fullKey}`;
        await handler.backend.set(staleKey, value as T, { ttl: options.staleTtl });
      }
    }),
  );
}

/**
 * Clear the cache prefix during deployment or on-demand.
 * Useful for global cache invalidation during deployments.
 * 
 * @param handler - The cache handler to clear
 * @returns Promise resolving when cache is cleared
 * 
 * @example
 * ```ts
 * // In your deployment script or API route
 * import { cacheHandler, clearCache } from 'next-cachex';
 * 
 * export default async function handler(req, res) {
 *   if (req.method === 'POST' && req.headers['x-api-key'] === process.env.CACHE_CLEAR_KEY) {
 *     await clearCache(cacheHandler);
 *     res.status(200).json({ success: true });
 *   } else {
 *     res.status(403).json({ error: 'Unauthorized' });
 *   }
 * }
 * ```
 */
export async function clearCache<T>(handler: CacheHandler<T>): Promise<void> {
  if (handler.backend.clear) {
    await handler.backend.clear();
  } else {
    throw new Error('Cache backend does not support the clear operation');
  }
}

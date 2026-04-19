/**
 * Utility functions for generating standardized cache keys
 * @packageDocumentation
 */

/**
 * Generates a key for the stale version of a cache entry
 * @param key The base cache key
 * @returns The stale cache key
 */
export function getStaleKey(key: string): string {
  return `stale:${key}`;
}

/**
 * Generates a key for the lock of a cache entry
 * @param key The base cache key
 * @returns The lock cache key
 */
export function getLockKey(key: string): string {
  return `lock:${key}`;
}

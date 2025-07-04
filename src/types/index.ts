/*
 * next-cachex: Core Types & Interfaces
 * All public types are exported for consumer DX.
 * @packageDocumentation
 */

// Re-export all error types from errors.ts
export * from '../errors';

/**
 * Represents a generic cache backend interface.
 * All backends (Redis, Memcached, etc.) must implement this.
 */
export interface CacheBackend<T = unknown> {
  /**
   * Get a value from the cache by key.
   * @param key - The cache key to retrieve
   * @returns The cached value or undefined if not found
   */
  get(key: string): Promise<T | undefined>;

  /**
   * Set a value in the cache.
   * @param key - The cache key to set
   * @param value - The value to cache
   * @param options - Optional TTL in seconds
   */
  set(key: string, value: T, options?: { ttl?: number }): Promise<void>;

  /**
   * Delete a value from the cache.
   * @param key - The cache key to delete
   */
  del(key: string): Promise<void>;

  /**
   * Acquire a distributed lock for a key.
   * @param key - The lock key to acquire
   * @param ttl - Lock TTL in seconds
   * @returns True if lock acquired, false otherwise
   */
  lock(key: string, ttl: number): Promise<boolean>;

  /**
   * Release a distributed lock for a key.
   * @param key - The lock key to release
   */
  unlock(key: string): Promise<void>;

  /**
   * Clear all cache entries for the current backend/prefix/namespace.
   * Optional: not all backends may support this.
   */
  clear?(): Promise<void>;
}

/**
 * Options for creating a cache handler.
 */
export interface CacheHandlerOptions<T = unknown> {
  backend: CacheBackend<T>;
  prefix?: string;
  logger?: CacheLogger;
  fallbackToStale?: boolean;
  version?: string;
}

/**
 * Options for a single cache fetch operation.
 */
export interface CacheFetchOptions {
  ttl?: number;
  lockTimeout?: number;
  staleTtl?: number;
  backend?: CacheBackend<unknown>; // For testing
  logger?: CacheLogger; // For testing
}

/**
 * Logger interface for cache events.
 */
export interface CacheLogger {
  /**
   * Log a cache event.
   * @param event - The cache event to log
   */
  log: (event: CacheLogEvent) => void;
}

/**
 * Cache log event types.
 */
export type CacheLogEvent =
  | { type: 'HIT'; key: string }
  | { type: 'MISS'; key: string }
  | { type: 'LOCK'; key: string }
  | { type: 'WAIT'; key: string }
  | { type: 'ERROR'; key: string; error: Error };

/**
 * Cache handler interface, returned by createCacheHandler
 */
export interface CacheHandler<T = unknown> {
  /**
   * Fetch a value from the cache, or execute the fetcher function to get and cache the value
   * @param key - The cache key to fetch
   * @param fetcher - Function to execute on cache miss
   * @param options - Optional fetch settings (ttl, lockTimeout, etc.)
   * @returns The cached or fetched value
   */
  fetch<R = T>(key: string, fetcher: () => Promise<R>, options?: CacheFetchOptions): Promise<R>;
  
  /**
   * The backend instance used by this handler
   */
  backend: CacheBackend<T>;
  
  /**
   * Get the fully qualified key with prefix and version
   * @param key - The base key to prefix
   * @returns The prefixed key
   */
  getFullKey(key: string): string;
}

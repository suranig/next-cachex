/*
 * next-cachex: Core Types & Interfaces
 * All public types are exported for consumer DX.
 * @packageDocumentation
 */

/**
 * Represents a generic cache backend interface.
 * All backends (Redis, Memcached, etc.) must implement this.
 */
export interface CacheBackend<T = unknown> {
  /**
   * Get a value from the cache by key.
   * @param key - The cache key
   * @returns The cached value or undefined if not found
   */
  get(key: string): Promise<T | undefined>;

  /**
   * Set a value in the cache.
   * @param key - The cache key
   * @param value - The value to cache
   * @param options - Optional TTL in seconds
   */
  set(key: string, value: T, options?: { ttl?: number }): Promise<void>;

  /**
   * Delete a value from the cache.
   * @param key - The cache key
   */
  del(key: string): Promise<void>;

  /**
   * Acquire a distributed lock for a key.
   * @param key - The lock key
   * @param ttl - Lock TTL in seconds
   * @returns True if lock acquired, false otherwise
   */
  lock(key: string, ttl: number): Promise<boolean>;

  /**
   * Release a distributed lock for a key.
   * @param key - The lock key
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
}

/**
 * Logger interface for cache events.
 */
export interface CacheLogger {
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
 * Typed error for cache timeouts.
 */
export class CacheTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheTimeoutError';
  }
}

/**
 * Typed error for cache connection issues.
 */
export class CacheConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheConnectionError';
  }
}

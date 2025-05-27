/**
 * next-cachex: Error Types
 * Specific error types for better error handling and DX.
 * @packageDocumentation
 */

/**
 * Base error class for all cache-related errors.
 */
export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheError';
    // Maintains proper stack trace in V8 (only if available)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Timeout error, thrown when cache operations exceed time limits.
 * 
 * @example
 * ```ts
 * try {
 *   const data = await fetchWithCache('key', fetcher, { lockTimeout: 1000 });
 * } catch (error) {
 *   if (error instanceof CacheTimeoutError) {
 *     console.error('Cache operation timed out:', error.message);
 *   }
 * }
 * ```
 */
export class CacheTimeoutError extends CacheError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheTimeoutError';
  }
}

/**
 * Connection error, thrown when cache backend connection fails.
 */
export class CacheConnectionError extends CacheError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheConnectionError';
  }
}

/**
 * Lock error, thrown when lock operations fail.
 */
export class CacheLockError extends CacheError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheLockError';
  }
}

/**
 * Serialization error, thrown when serializing/deserializing cache data fails.
 */
export class CacheSerializationError extends CacheError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheSerializationError';
  }
}

/**
 * Backend error, thrown when a cache backend operation fails.
 */
export class CacheBackendError extends CacheError {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'CacheBackendError';
  }
}

/**
 * Configuration error, thrown when cache configuration is invalid.
 */
export class CacheConfigError extends CacheError {
  constructor(message: string) {
    super(message);
    this.name = 'CacheConfigError';
  }
} 
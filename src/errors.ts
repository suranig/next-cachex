/**
 * Custom error classes for next-cachex
 * All error types are exported for consumer DX and error handling
 * @packageDocumentation
 */

/**
 * Base error class for all cache errors
 */
export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Fix the prototype chain in environments that don't support it
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a cache operation times out
 */
export class CacheTimeoutError extends CacheError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error thrown when a cache backend operation fails
 */
export class CacheBackendError extends CacheError {
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}

/**
 * Error thrown when serialization or deserialization fails
 */
export class CacheSerializationError extends CacheError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error thrown when cache configuration is invalid
 */
export class CacheConfigError extends CacheError {
  constructor(message: string) {
    super(message);
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
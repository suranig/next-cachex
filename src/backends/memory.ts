import { CacheBackend } from '../types';

/**
 * In-memory cache backend for testing and development.
 * This backend stores data in memory and is not suitable for production use.
 */
export class MemoryCacheBackend<T = unknown> implements CacheBackend<T> {
  private store = new Map<string, { value: T; expiresAt?: number }>();
  private locks = new Map<string, { expiresAt: number }>();

  /**
   * Get a value from memory cache.
   * @param key - The cache key
   */
  async get(key: string): Promise<T | undefined> {
    const item = this.store.get(key);
    if (!item) return undefined;
    
    // Check if item has expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * Set a value in memory cache with optional TTL.
   * @param key - The cache key
   * @param value - The value to cache
   * @param options - Optional TTL in seconds
   */
  async set(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    const expiresAt = options?.ttl ? Date.now() + (options.ttl * 1000) : undefined;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete a value from memory cache.
   * @param key - The cache key
   */
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Acquire a lock in memory (with TTL).
   * @param key - The lock key
   * @param ttl - Lock TTL in seconds
   * @returns True if lock acquired, false otherwise
   */
  async lock(key: string, ttl: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = now + (ttl * 1000);
    
    // Check if lock exists and is still valid
    const existingLock = this.locks.get(key);
    if (existingLock && existingLock.expiresAt > now) {
      return false;
    }
    
    // Acquire the lock
    this.locks.set(key, { expiresAt });
    return true;
  }

  /**
   * Release a lock in memory.
   * @param key - The lock key
   */
  async unlock(key: string): Promise<void> {
    this.locks.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  async clear(): Promise<void> {
    this.store.clear();
    this.locks.clear();
  }

  /**
   * Clean up expired entries (useful for memory management).
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired cache entries
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.store.delete(key);
      }
    }
    
    // Clean up expired locks
    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
      }
    }
  }
}
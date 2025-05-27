import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCacheHandler } from '../../src/createCacheHandler';
import { CacheBackend, CacheHandler, CacheTimeoutError } from '../../src/types';

// Simple in-memory backend for testing
class MemoryBackend<T> implements CacheBackend<T> {
  store = new Map<string, T>();
  locks = new Set<string>();
  async get(key: string) {
    return this.store.get(key);
  }
  async set(key: string, value: T) {
    this.store.set(key, value);
  }
  async del(key: string) {
    this.store.delete(key);
  }
  async lock(key: string, ttl: number) {
    if (this.locks.has(key)) return false;
    this.locks.add(key);
    setTimeout(() => this.locks.delete(key), ttl * 1000);
    return true;
  }
  async unlock(key: string) {
    this.locks.delete(key);
  }
  async clear() {
    this.store.clear();
    this.locks.clear();
  }
}

describe('createCacheHandler', () => {
  let backend: MemoryBackend<unknown>;
  let handler: CacheHandler;
  let logEvents: any[];

  beforeEach(() => {
    backend = new MemoryBackend();
    logEvents = [];
    handler = createCacheHandler({
      backend,
      prefix: 'test',
      version: 'v1',
      logger: { log: (event) => logEvents.push(event) },
    });
  });

  it('should create a cache handler with the provided backend', () => {
    expect(handler).toBeDefined();
    expect(handler.backend).toBe(backend);
  });

  it('should generate prefixed keys', () => {
    expect(handler.getFullKey('mykey')).toBe('test:v1:mykey');
  });

  it('should handle no prefix/version correctly', () => {
    const plainHandler = createCacheHandler({ backend });
    expect(plainHandler.getFullKey('mykey')).toBe('mykey');
  });

  it('should return cached value on hit and log HIT', async () => {
    await backend.set('test:v1:foo', 42);
    const result = await handler.fetch('foo', async () => 99);
    expect(result).toBe(42);
    expect(logEvents.some(e => e.type === 'HIT')).toBe(true);
  });

  it('should fetch, set, and return value on miss, and log MISS and LOCK', async () => {
    const result = await handler.fetch('bar', async () => 123);
    expect(result).toBe(123);
    expect(await backend.get('test:v1:bar')).toBe(123);
    expect(logEvents.some(e => e.type === 'MISS')).toBe(true);
    expect(logEvents.some(e => e.type === 'LOCK')).toBe(true);
  });

  it('should wait for lock and return value if set by another process', async () => {
    const lockKey = 'lock:test:v1:baz';
    backend.locks.add(lockKey);
    setTimeout(() => {
      backend.locks.delete(lockKey);
      backend.set('test:v1:baz', 555);
    }, 100);
    const result = await handler.fetch('baz', async () => 999, { lockTimeout: 1000 });
    expect(result).toBe(555);
    expect(logEvents.some(e => e.type === 'WAIT')).toBe(true);
  });

  it('should throw CacheTimeoutError if lock not released in time', async () => {
    const lockKey = 'lock:test:v1:locked';
    backend.locks.add(lockKey);
    await expect(handler.fetch('locked', async () => 1, { lockTimeout: 100 }))
      .rejects.toThrow(CacheTimeoutError);
    expect(logEvents.some(e => e.type === 'WAIT')).toBe(true);
  });

  it('should log ERROR and rethrow if fetcher throws', async () => {
    await expect(handler.fetch('err', async () => { throw new Error('fail'); }))
      .rejects.toThrow('fail');
    expect(logEvents.some(e => e.type === 'ERROR')).toBe(true);
  });

  // Add tests for stale cache fallback
  describe('stale cache fallback', () => {
    let handlerWithFallback: CacheHandler;
    
    beforeEach(() => {
      backend = new MemoryBackend();
      logEvents = [];
      handlerWithFallback = createCacheHandler({
        backend,
        prefix: 'test',
        version: 'v1',
        fallbackToStale: true,
        logger: { log: (event) => logEvents.push(event) },
      });
    });
    
    it('should save stale copy when staleTtl is provided', async () => {
      const result = await handlerWithFallback.fetch('stale-test', async () => 'fresh-value', {
        ttl: 10,
        staleTtl: 60,
      });
      
      expect(result).toBe('fresh-value');
      expect(await backend.get('test:v1:stale-test')).toBe('fresh-value');
      expect(await backend.get('stale:test:v1:stale-test')).toBe('fresh-value');
    });
    
    it('should fall back to stale value when fetcher fails', async () => {
      // First successful fetch to populate stale cache
      await handlerWithFallback.fetch('stale-fallback', async () => 'original-value', {
        ttl: 10,
        staleTtl: 60,
      });
      
      // Delete the main value but keep the stale copy
      await backend.del('test:v1:stale-fallback');
      
      // Now fetch again, but make the fetcher fail
      const fetcherThatFails = async () => { throw new Error('Fetcher failed'); };
      const result = await handlerWithFallback.fetch('stale-fallback', fetcherThatFails, {
        staleTtl: 60,
      });
      
      expect(result).toBe('original-value');
      expect(logEvents.some(e => e.type === 'ERROR')).toBe(true);
      expect(logEvents.some(e => e.type === 'HIT' && e.key === 'stale:test:v1:stale-fallback')).toBe(true);
    });
    
    it('should not save stale copy when staleTtl is less than or equal to ttl', async () => {
      await handlerWithFallback.fetch('no-stale', async () => 'value', {
        ttl: 30,
        staleTtl: 30, // Same as ttl, so no stale copy
      });
      
      expect(await backend.get('stale:test:v1:no-stale')).toBeUndefined();
    });
  });
}); 
import { describe, it, expect, beforeEach } from 'vitest';
import { createCacheHandler } from '../../src/cache/createCacheHandler';
import { CacheBackend, CacheHandler, CacheTimeoutError, CacheLogEvent } from '../../src/types';

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
  let backend: MemoryBackend<number>;
  let handler: CacheHandler<number>;
  let logEvents: CacheLogEvent[];

  beforeEach(() => {
    backend = new MemoryBackend<number>();
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
    let handlerWithFallback: CacheHandler<number>;
    
    beforeEach(() => {
      backend = new MemoryBackend<number>();
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

  // Additional tests for error handling and edge cases
  describe('error handling', () => {
    class ErrorBackend<T> implements CacheBackend<T> {
      store = new Map<string, T>();
      locks = new Set<string>();
      shouldThrowOnGet = false;
      shouldThrowOnSet = false;
      shouldThrowOnLock = false;
      shouldThrowOnUnlock = false;

      async get(key: string) {
        if (this.shouldThrowOnGet) {
          throw new Error('Backend get error');
        }
        return this.store.get(key);
      }
      async set(key: string, value: T) {
        if (this.shouldThrowOnSet) {
          throw new Error('Backend set error');
        }
        this.store.set(key, value);
      }
      async del(key: string) {
        this.store.delete(key);
      }
      async lock(key: string, ttl: number) {
        if (this.shouldThrowOnLock) {
          throw new Error('Backend lock error');
        }
        if (this.locks.has(key)) return false;
        this.locks.add(key);
        setTimeout(() => this.locks.delete(key), ttl * 1000);
        return true;
      }
      async unlock(key: string) {
        if (this.shouldThrowOnUnlock) {
          throw new Error('Backend unlock error');
        }
        this.locks.delete(key);
      }
      async clear() {
        this.store.clear();
        this.locks.clear();
      }
    }

    let errorBackend: ErrorBackend<number>;
    let errorHandler: CacheHandler<number>;
    let errorLogEvents: CacheLogEvent[];

    beforeEach(() => {
      errorBackend = new ErrorBackend<number>();
      errorLogEvents = [];
      errorHandler = createCacheHandler({
        backend: errorBackend,
        prefix: 'test',
        version: 'v1',
        logger: { log: (event) => errorLogEvents.push(event) },
      });
    });

    it('should throw CacheBackendError when backend.get fails', async () => {
      errorBackend.shouldThrowOnGet = true;
      
      await expect(errorHandler.fetch('key', async () => 'value'))
        .rejects.toThrow('Failed to get value from cache');
    });

    it('should throw CacheBackendError when backend.lock fails', async () => {
      errorBackend.shouldThrowOnLock = true;
      
      await expect(errorHandler.fetch('key', async () => 'value'))
        .rejects.toThrow('Failed to acquire lock');
    });

    it('should log unlock errors but not throw', async () => {
      errorBackend.shouldThrowOnUnlock = true;
      
      const result = await errorHandler.fetch('key', async () => 'value');
      expect(result).toBe('value');
      expect(errorLogEvents.some(e => e.type === 'ERROR' && e.key?.includes('lock:'))).toBe(true);
    });

    it('should continue polling even if get fails during wait', async () => {
      const lockKey = 'lock:test:v1:polling-key';
      errorBackend.locks.add(lockKey);
      
      let getCallCount = 0;
      const originalGet = errorBackend.get.bind(errorBackend);
      errorBackend.get = async (key: string) => {
        getCallCount++;
        // Only fail on the polling attempts, not the initial cache check
        if (key === 'test:v1:polling-key' && getCallCount === 2) {
          throw new Error('Temporary get error');
        }
        if (key === 'test:v1:polling-key' && getCallCount === 3) {
          return 'polled-value' as any;
        }
        return originalGet(key);
      };
      
      setTimeout(() => {
        errorBackend.locks.delete(lockKey);
        errorBackend.store.set('test:v1:polling-key', 'polled-value' as any);
      }, 150);
      
      const result = await errorHandler.fetch('polling-key', async () => 'fetcher-value', { 
        lockTimeout: 1000 
      });
      expect(result).toBe('polled-value');
    });
  });

  describe('stale cache error handling', () => {
    class StaleErrorBackend<T> implements CacheBackend<T> {
      store = new Map<string, T>();
      locks = new Set<string>();
      shouldThrowOnStaleSet = false;
      shouldThrowOnStaleGet = false;

      async get(key: string) {
        if (key.startsWith('stale:') && this.shouldThrowOnStaleGet) {
          throw new Error('Stale get error');
        }
        return this.store.get(key);
      }
      async set(key: string, value: T, options?: { ttl?: number }) {
        if (key.startsWith('stale:') && this.shouldThrowOnStaleSet) {
          throw new Error('Stale set error');
        }
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

    let staleErrorBackend: StaleErrorBackend<string>;
    let staleErrorHandler: CacheHandler<string>;
    let staleErrorLogEvents: CacheLogEvent[];

    beforeEach(() => {
      staleErrorBackend = new StaleErrorBackend<string>();
      staleErrorLogEvents = [];
      staleErrorHandler = createCacheHandler({
        backend: staleErrorBackend,
        prefix: 'test',
        version: 'v1',
        fallbackToStale: true,
        logger: { log: (event) => staleErrorLogEvents.push(event) },
      });
    });

    it('should log stale set errors but not throw', async () => {
      staleErrorBackend.shouldThrowOnStaleSet = true;
      
      const result = await staleErrorHandler.fetch('stale-set-error', async () => 'value', {
        ttl: 10,
        staleTtl: 60,
      });
      
      expect(result).toBe('value');
      expect(staleErrorLogEvents.some(e => 
        e.type === 'ERROR' && e.key?.includes('stale:')
      )).toBe(true);
    });

    it('should log stale get errors and continue with original error', async () => {
      // First populate stale cache
      await staleErrorHandler.fetch('stale-get-error', async () => 'original-value', {
        ttl: 10,
        staleTtl: 60,
      });
      
      // Delete main value
      await staleErrorBackend.del('test:v1:stale-get-error');
      
      // Make stale get fail
      staleErrorBackend.shouldThrowOnStaleGet = true;
      
      // Fetcher should fail and stale fallback should also fail
      await expect(staleErrorHandler.fetch('stale-get-error', async () => {
        throw new Error('Fetcher failed');
      }, { staleTtl: 60 })).rejects.toThrow('Fetcher failed');
      
      expect(staleErrorLogEvents.some(e => 
        e.type === 'ERROR' && e.key?.includes('stale:')
      )).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty prefix and version', () => {
      const plainHandler = createCacheHandler({ 
        backend,
        prefix: '',
        version: '',
      });
      expect(plainHandler.getFullKey('mykey')).toBe('mykey');
    });

    it('should handle only prefix without version', () => {
      const prefixOnlyHandler = createCacheHandler({ 
        backend,
        prefix: 'myapp',
        version: '',
      });
      expect(prefixOnlyHandler.getFullKey('mykey')).toBe('myapp:mykey');
    });

    it('should handle only version without prefix', () => {
      const versionOnlyHandler = createCacheHandler({ 
        backend,
        prefix: '',
        version: 'v2',
      });
      expect(versionOnlyHandler.getFullKey('mykey')).toBe('v2:mykey');
    });

    it('should use default options when none provided', async () => {
      const result = await handler.fetch('default-options', async () => 'value');
      expect(result).toBe('value');
      // Should use default TTL of 300 seconds
      expect(await backend.get('test:v1:default-options')).toBe('value');
    });

    it('should override default options with provided options', async () => {
      const result = await handler.fetch('custom-options', async () => 'value', {
        ttl: 600,
        lockTimeout: 10000,
        staleTtl: 1800,
      });
      expect(result).toBe('value');
    });
  });
}); 
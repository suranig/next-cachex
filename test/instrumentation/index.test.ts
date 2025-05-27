import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerInitialCache, clearCache } from '../../src/instrumentation';
import { CacheBackend, CacheHandler } from '../../src/types';

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

describe('Instrumentation', () => {
  let backend: MemoryBackend<unknown>;
  let handler: CacheHandler;

  beforeEach(() => {
    backend = new MemoryBackend();
    handler = {
      backend,
      fetch: vi.fn(),
      getFullKey: (key: string) => `test:${key}`,
    };
  });

  describe('registerInitialCache', () => {
    it('should set multiple cache items', async () => {
      await registerInitialCache(handler, [
        { key: 'item1', value: 'value1', options: { ttl: 60 } },
        { key: 'item2', value: { nested: true }, options: { ttl: 120 } },
      ]);

      expect(await backend.get('test:item1')).toBe('value1');
      expect(await backend.get('test:item2')).toEqual({ nested: true });
    });

    it('should set stale cache copies when staleTtl is provided', async () => {
      await registerInitialCache(handler, [
        { 
          key: 'stale-item', 
          value: 'stale-value', 
          options: { ttl: 60, staleTtl: 3600 } 
        },
      ]);

      expect(await backend.get('test:stale-item')).toBe('stale-value');
      expect(await backend.get('stale:test:stale-item')).toBe('stale-value');
    });

    it('should not set stale cache when staleTtl <= ttl', async () => {
      await registerInitialCache(handler, [
        { 
          key: 'no-stale', 
          value: 'value', 
          options: { ttl: 100, staleTtl: 100 } 
        },
      ]);

      expect(await backend.get('test:no-stale')).toBe('value');
      expect(await backend.get('stale:test:no-stale')).toBeUndefined();
    });

    it('should do nothing with empty or invalid items', async () => {
      const setSpy = vi.spyOn(backend, 'set');
      
      await registerInitialCache(handler, []);
      expect(setSpy).not.toHaveBeenCalled();
      
      await registerInitialCache(handler, null as any);
      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear the cache using backend.clear', async () => {
      backend.set('test:item1', 'value1');
      backend.set('test:item2', 'value2');
      
      await clearCache(handler);
      
      expect(backend.store.size).toBe(0);
    });

    it('should throw error if backend does not support clear', async () => {
      const handlerWithoutClear = {
        backend: {
          get: backend.get.bind(backend),
          set: backend.set.bind(backend),
          del: backend.del.bind(backend),
          lock: backend.lock.bind(backend),
          unlock: backend.unlock.bind(backend)
          // clear method intentionally omitted
        } as CacheBackend<unknown>,
        fetch: vi.fn(),
        getFullKey: (key: string) => `test:${key}`,
      };

      await expect(clearCache(handlerWithoutClear)).rejects.toThrow(
        'Cache backend does not support the clear operation'
      );
    });
  });
}); 
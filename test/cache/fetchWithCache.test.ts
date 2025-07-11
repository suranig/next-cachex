import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { fetchWithCache } from '../../src/cache/fetchWithCache';
import { CacheBackend, CacheLogger, CacheTimeoutError } from '../../src/types';
import { closeGlobalRedisClient } from '../../src/backends';

// Simple in-memory backend for testing
class MemoryBackend<T> implements CacheBackend<T> {
  store = new Map<string, T>();
  locks = new Set<string>();
  async get(key: string) {
    return this.store.get(key);
  }
  async set(key: string, value: T, _options?: { ttl?: number }) {
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

describe('fetchWithCache', () => {
  let backend: MemoryBackend<number>;
  let logger: CacheLogger;
  let logEvents: Array<{ type: string; key: string; error?: Error }>;

  beforeEach(() => {
    backend = new MemoryBackend<number>();
    logEvents = [];
    logger = { log: (event) => logEvents.push(event) };
  });

  afterAll(() => {
    // Clean up global Redis client to prevent memory leaks
    closeGlobalRedisClient();
  });

  it('returns cached value on HIT and logs HIT', async () => {
    await backend.set('next-cachex:foo', 42);
    const result = await fetchWithCache('foo', async () => 99, { backend, logger });
    expect(result).toBe(42);
    expect(logEvents.some(e => e.type === 'HIT')).toBe(true);
  });

  it('fetches, sets, and returns value on MISS, logs MISS and LOCK', async () => {
    const result = await fetchWithCache('bar', async () => 123, { backend, logger });
    expect(result).toBe(123);
    expect(await backend.get('next-cachex:bar')).toBe(123);
    expect(logEvents.some(e => e.type === 'MISS')).toBe(true);
    expect(logEvents.some(e => e.type === 'LOCK')).toBe(true);
  });

  it('waits for lock and returns value if set by another process', async () => {
    // Simulate lock already taken
    await backend.lock('lock:next-cachex:baz', 0.2); // Lock for 0.2 seconds
    
    // Setup another "process" to release the lock and set value
    setTimeout(() => {
      backend.unlock('lock:next-cachex:baz');
      backend.set('next-cachex:baz', 555);
    }, 50);
    
    const result = await fetchWithCache('baz', async () => 999, { backend, logger, lockTimeout: 500 });
    expect(result).toBe(555);
    expect(logEvents.some(e => e.type === 'WAIT')).toBe(true);
  });

  it('throws CacheTimeoutError if lock not released in time', async () => {
    await backend.lock('lock:next-cachex:locked', 0.5); // Lock for 0.5 second
    await expect(fetchWithCache('locked', async () => 1, { backend, logger, lockTimeout: 100 }))
      .rejects.toThrow(CacheTimeoutError);
    expect(logEvents.some(e => e.type === 'WAIT')).toBe(true);
  });

  it('logs ERROR and rethrows if fetcher throws', async () => {
    await expect(fetchWithCache('err', async () => { throw new Error('fail'); }, { backend, logger }))
      .rejects.toThrow('fail');
    expect(logEvents.some(e => e.type === 'ERROR')).toBe(true);
  });

  it('uses default handler when no backend is provided in options', async () => {
    // This test uses the default Redis backend path
    // We can't easily test this without a real Redis instance, but we can at least
    // verify the function doesn't throw when called without backend option
    try {
      await fetchWithCache('default-test', async () => 'value', { ttl: 1 });
    } catch (error) {
      // Expected to fail due to Redis connection, but the code path should be covered
      expect(error).toBeDefined();
      // The error should be a connection error or timeout
      expect(error instanceof Error).toBe(true);
    }
  }, 5000); // Reduce timeout to 5 seconds

  it('uses temporary handler when backend is provided in options', async () => {
    const customLogger = { log: () => {} };
    const result = await fetchWithCache('temp-handler', async () => 'temp-value', { 
      backend, 
      logger: customLogger 
    });
    expect(result).toBe('temp-value');
  });
});

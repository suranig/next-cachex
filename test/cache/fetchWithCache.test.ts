import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithCache } from '../../src/cache/fetchWithCache';
import { CacheBackend, CacheLogger, CacheTimeoutError } from '../../src/types';

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

describe('fetchWithCache', () => {
  let backend: MemoryBackend<any>;
  let logger: CacheLogger;
  let logEvents: any[];

  beforeEach(() => {
    backend = new MemoryBackend();
    logEvents = [];
    logger = { log: (event) => logEvents.push(event) };
  });

  it('returns cached value on HIT and logs HIT', async () => {
    backend.set('foo', 42);
    const result = await fetchWithCache('foo', async () => 99, { backend, logger });
    expect(result).toBe(42);
    expect(logEvents.some(e => e.type === 'HIT')).toBe(true);
  });

  it('fetches, sets, and returns value on MISS, logs MISS and LOCK', async () => {
    const result = await fetchWithCache('bar', async () => 123, { backend, logger });
    expect(result).toBe(123);
    expect(await backend.get('bar')).toBe(123);
    expect(logEvents.some(e => e.type === 'MISS')).toBe(true);
    expect(logEvents.some(e => e.type === 'LOCK')).toBe(true);
  });

  it('waits for lock and returns value if set by another process', async () => {
    backend.locks.add('baz:lock');
    setTimeout(() => {
      backend.locks.delete('baz:lock');
      backend.set('baz', 555);
    }, 100);
    const result = await fetchWithCache('baz', async () => 999, { backend, logger, lockTimeout: 1 });
    expect(result).toBe(555);
    expect(logEvents.some(e => e.type === 'WAIT')).toBe(true);
  });

  it('throws CacheTimeoutError if lock not released in time', async () => {
    backend.locks.add('locked:lock');
    await expect(fetchWithCache('locked', async () => 1, { backend, logger, lockTimeout: 0.1 }))
      .rejects.toThrow(CacheTimeoutError);
    expect(logEvents.some(e => e.type === 'ERROR')).toBe(true);
  });

  it('logs ERROR and rethrows if fetcher throws', async () => {
    await expect(fetchWithCache('err', async () => { throw new Error('fail'); }, { backend, logger }))
      .rejects.toThrow('fail');
    expect(logEvents.some(e => e.type === 'ERROR')).toBe(true);
  });
});

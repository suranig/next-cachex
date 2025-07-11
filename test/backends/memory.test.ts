import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryCacheBackend } from '../../src/backends/memory';

describe('MemoryCacheBackend', () => {
  let backend: MemoryCacheBackend<number>;

  beforeEach(() => {
    backend = new MemoryCacheBackend<number>();
  });

  it('should get and set values', async () => {
    await backend.set('test-key', 42);
    const value = await backend.get('test-key');
    expect(value).toBe(42);
  });

  it('should return undefined for non-existent keys', async () => {
    const value = await backend.get('non-existent');
    expect(value).toBeUndefined();
  });

  it('should delete values', async () => {
    await backend.set('test-key', 42);
    await backend.del('test-key');
    const value = await backend.get('test-key');
    expect(value).toBeUndefined();
  });

  it('should handle TTL expiration', async () => {
    await backend.set('test-key', 42, { ttl: 0.1 }); // 100ms TTL
    const value1 = await backend.get('test-key');
    expect(value1).toBe(42);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const value2 = await backend.get('test-key');
    expect(value2).toBeUndefined();
  });

  it('should acquire and release locks', async () => {
    const lockAcquired1 = await backend.lock('test-lock', 1);
    expect(lockAcquired1).toBe(true);
    
    const lockAcquired2 = await backend.lock('test-lock', 1);
    expect(lockAcquired2).toBe(false);
    
    await backend.unlock('test-lock');
    
    const lockAcquired3 = await backend.lock('test-lock', 1);
    expect(lockAcquired3).toBe(true);
  });

  it('should handle lock expiration', async () => {
    await backend.lock('test-lock', 0.1); // 100ms TTL
    
    // Try to acquire the same lock immediately
    const lockAcquired = await backend.lock('test-lock', 1);
    expect(lockAcquired).toBe(false);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should be able to acquire the lock now
    const lockAcquiredAfterExpiry = await backend.lock('test-lock', 1);
    expect(lockAcquiredAfterExpiry).toBe(true);
  });

  it('should clear all data', async () => {
    await backend.set('key1', 1);
    await backend.set('key2', 2);
    await backend.lock('lock1', 1);
    
    await backend.clear();
    
    expect(await backend.get('key1')).toBeUndefined();
    expect(await backend.get('key2')).toBeUndefined();
    expect(await backend.lock('lock1', 1)).toBe(true); // Lock should be cleared
  });

  it('should cleanup expired entries', async () => {
    await backend.set('expired-key', 42, { ttl: 0.1 });
    await backend.lock('expired-lock', 0.1);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Manually trigger cleanup
    backend.cleanup();
    
    // Should not be able to acquire the expired lock
    const lockAcquired = await backend.lock('expired-lock', 1);
    expect(lockAcquired).toBe(true);
  });
});
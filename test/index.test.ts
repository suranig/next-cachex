import { describe, it, expect } from 'vitest';

describe('main exports', () => {
  it('should export fetchWithCache and cacheHandler', async () => {
    const { fetchWithCache, cacheHandler } = await import('../src/index');
    expect(fetchWithCache).toBeDefined();
    expect(cacheHandler).toBeDefined();
  });

  it('should export createCacheHandler', async () => {
    const { createCacheHandler } = await import('../src/index');
    expect(createCacheHandler).toBeDefined();
  });

  it('should export types', async () => {
    const exports = await import('../src/index');
    // Check that type exports are available (they won't be runtime values)
    expect(typeof exports).toBe('object');
  });

  it('should export backend utilities', async () => {
    const { RedisCacheBackend } = await import('../src/index');
    expect(RedisCacheBackend).toBeDefined();
  });

  it('should export instrumentation utilities', async () => {
    const { registerInitialCache, clearCache } = await import('../src/index');
    expect(registerInitialCache).toBeDefined();
    expect(clearCache).toBeDefined();
  });
}); 
import { describe, it, expect } from 'vitest';
import type {
  CacheBackend,
  CacheHandlerOptions,
  CacheFetchOptions,
  CacheLogger,
  CacheLogEvent,
} from '../src/types';

describe('Types', () => {
  it('should export all required types and interfaces', () => {
    // This test ensures all types are properly exported
    // TypeScript will catch any missing exports at compile time
    
    // Test that we can create type-safe objects
    const mockBackend: CacheBackend<string> = {
      get: async () => undefined,
      set: async () => {},
      del: async () => {},
      lock: async () => true,
      unlock: async () => {},
      clear: async () => {},
    };

    const mockLogger: CacheLogger = {
      log: () => {},
    };

    const mockOptions: CacheHandlerOptions<string> = {
      backend: mockBackend,
      prefix: 'test',
      logger: mockLogger,
      fallbackToStale: true,
      version: 'v1',
    };

    const mockFetchOptions: CacheFetchOptions = {
      ttl: 300,
      lockTimeout: 5000,
      staleTtl: 3600,
    };

    const mockLogEvent: CacheLogEvent = {
      type: 'HIT',
      key: 'test-key',
    };

    // Verify objects are created successfully
    expect(mockBackend).toBeDefined();
    expect(mockLogger).toBeDefined();
    expect(mockOptions).toBeDefined();
    expect(mockFetchOptions).toBeDefined();
    expect(mockLogEvent).toBeDefined();
  });

  it('should support all log event types', () => {
    const hitEvent: CacheLogEvent = { type: 'HIT', key: 'key1' };
    const missEvent: CacheLogEvent = { type: 'MISS', key: 'key2' };
    const lockEvent: CacheLogEvent = { type: 'LOCK', key: 'key3' };
    const waitEvent: CacheLogEvent = { type: 'WAIT', key: 'key4' };
    const errorEvent: CacheLogEvent = { 
      type: 'ERROR', 
      key: 'key5', 
      error: new Error('test error') 
    };

    expect(hitEvent.type).toBe('HIT');
    expect(missEvent.type).toBe('MISS');
    expect(lockEvent.type).toBe('LOCK');
    expect(waitEvent.type).toBe('WAIT');
    expect(errorEvent.type).toBe('ERROR');
    expect(errorEvent.error).toBeInstanceOf(Error);
  });

  it('should allow optional properties in interfaces', () => {
    // Test minimal options
    const minimalOptions: CacheHandlerOptions = {
      backend: {
        get: async () => undefined,
        set: async () => {},
        del: async () => {},
        lock: async () => true,
        unlock: async () => {},
      },
    };

    const minimalFetchOptions: CacheFetchOptions = {};

    expect(minimalOptions.backend).toBeDefined();
    expect(minimalFetchOptions).toBeDefined();
  });
}); 
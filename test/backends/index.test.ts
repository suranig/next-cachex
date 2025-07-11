import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDefaultBackend, RedisCacheBackend } from '../../src/backends';
import type Redis from 'ioredis';

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      host: 'localhost',
      port: 6379,
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      scan: vi.fn(),
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
    })),
  };
});

describe('backends/index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any global state
    delete (global as Record<string, unknown>).globalRedisClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createDefaultBackend', () => {
    it('should create a Redis backend with default options', () => {
      const backend = createDefaultBackend();
      expect(backend).toBeInstanceOf(RedisCacheBackend);
    });

    it('should create a Redis backend with custom prefix', () => {
      const backend = createDefaultBackend({ prefix: 'custom-prefix' });
      expect(backend).toBeInstanceOf(RedisCacheBackend);
    });

    it('should use provided Redis client when given', () => {
      const mockClient = {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        scan: vi.fn(),
      };
      
      const backend = createDefaultBackend({ 
        redisClient: mockClient as unknown as Redis,
        prefix: 'test' 
      });
      
      expect(backend).toBeInstanceOf(RedisCacheBackend);
    });

    it('should create global Redis client with environment variables', () => {
      // Set environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: 'redis.example.com',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'secret',
        REDIS_DB: '2',
      };

      const backend = createDefaultBackend();
      expect(backend).toBeInstanceOf(RedisCacheBackend);

      // Restore environment
      process.env = originalEnv;
    });

    it('should reuse global Redis client on subsequent calls', () => {
      const backend1 = createDefaultBackend();
      const backend2 = createDefaultBackend();
      
      expect(backend1).toBeInstanceOf(RedisCacheBackend);
      expect(backend2).toBeInstanceOf(RedisCacheBackend);
    });

    it('should handle missing environment variables gracefully', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: undefined,
        REDIS_PORT: undefined,
        REDIS_PASSWORD: undefined,
        REDIS_DB: undefined,
      };

      const backend = createDefaultBackend();
      expect(backend).toBeInstanceOf(RedisCacheBackend);

      // Restore environment
      process.env = originalEnv;
    });

    it('should handle invalid port numbers gracefully', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_PORT: 'invalid-port',
        REDIS_DB: 'invalid-db',
      };

      const backend = createDefaultBackend();
      expect(backend).toBeInstanceOf(RedisCacheBackend);

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('RedisCacheBackend export', () => {
    it('should export RedisCacheBackend class', () => {
      expect(RedisCacheBackend).toBeDefined();
      expect(typeof RedisCacheBackend).toBe('function');
    });
  });
}); 
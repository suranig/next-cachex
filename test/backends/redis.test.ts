import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCacheBackend } from '../../src/backends/redis';
import { CacheSerializationError, CacheBackendError, CacheConfigError } from '../../src/types';

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
};

describe('RedisCacheBackend', () => {
  let backend: RedisCacheBackend<any>;
  let backendWithPrefix: RedisCacheBackend<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    backend = new RedisCacheBackend(mockRedisClient as any);
    backendWithPrefix = new RedisCacheBackend(mockRedisClient as any, 'test');
  });

  describe('constructor', () => {
    it('should create backend without prefix', () => {
      expect(backend).toBeDefined();
    });

    it('should create backend with prefix', () => {
      expect(backendWithPrefix).toBeDefined();
    });
  });

  describe('get', () => {
    it('should get value without prefix', async () => {
      const testValue = { foo: 'bar' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));

      const result = await backend.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testValue);
    });

    it('should get value with prefix', async () => {
      const testValue = { foo: 'bar' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testValue));

      const result = await backendWithPrefix.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test:test-key');
      expect(result).toEqual(testValue);
    });

    it('should return undefined for null values', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await backend.get('test-key');

      expect(result).toBeUndefined();
    });

    it('should throw CacheSerializationError for invalid JSON', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');

      await expect(backend.get('test-key')).rejects.toThrow(CacheSerializationError);
      await expect(backend.get('test-key')).rejects.toThrow('Failed to parse cached value');
    });

    it('should throw CacheBackendError for Redis errors', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));

      await expect(backend.get('test-key')).rejects.toThrow(CacheBackendError);
      await expect(backend.get('test-key')).rejects.toThrow('Redis get operation failed');
    });

    it('should throw CacheSerializationError when JSON.parse fails', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json');
      
      // Mock JSON.parse to throw an error
      const originalParse = JSON.parse;
      JSON.parse = vi.fn().mockImplementation(() => {
        throw new Error('Custom parse error');
      });

      try {
        await expect(backend.get('test-key')).rejects.toThrow(CacheSerializationError);
        await expect(backend.get('test-key')).rejects.toThrow('Failed to parse cached value');
      } finally {
        // Always restore JSON.parse
        JSON.parse = originalParse;
      }
    });

    it('should handle non-Error objects in Redis errors', async () => {
      mockRedisClient.get.mockRejectedValue('string error');

      await expect(backend.get('test-key')).rejects.toThrow(CacheBackendError);
      await expect(backend.get('test-key')).rejects.toThrow('string error');
    });
  });

  describe('set', () => {
    it('should set value without TTL and without prefix', async () => {
      const testValue = { foo: 'bar' };
      mockRedisClient.set.mockResolvedValue('OK');

      await backend.set('test-key', testValue);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testValue));
    });

    it('should set value with TTL and with prefix', async () => {
      const testValue = { foo: 'bar' };
      mockRedisClient.set.mockResolvedValue('OK');

      await backendWithPrefix.set('test-key', testValue, { ttl: 300 });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:test-key',
        JSON.stringify(testValue),
        'EX',
        300
      );
    });

    it('should throw CacheSerializationError for unstringifiable values', async () => {
      const circularValue = {};
      (circularValue as any).self = circularValue;

      await expect(backend.set('test-key', circularValue)).rejects.toThrow(CacheSerializationError);
      await expect(backend.set('test-key', circularValue)).rejects.toThrow('Failed to stringify value');
    });

    it('should throw CacheBackendError for Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(backend.set('test-key', 'value')).rejects.toThrow(CacheBackendError);
      await expect(backend.set('test-key', 'value')).rejects.toThrow('Redis set operation failed');
    });

    it('should handle non-Error objects in Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue('string error');

      await expect(backend.set('test-key', 'value')).rejects.toThrow(CacheBackendError);
      await expect(backend.set('test-key', 'value')).rejects.toThrow('string error');
    });

    it('should handle non-Error objects in JSON.stringify errors', async () => {
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn().mockImplementation(() => {
        throw 'string error';
      });

      await expect(backend.set('test-key', 'value')).rejects.toThrow(CacheSerializationError);
      await expect(backend.set('test-key', 'value')).rejects.toThrow('string error');

      JSON.stringify = originalStringify;
    });
  });

  describe('del', () => {
    it('should delete value without prefix', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await backend.del('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should delete value with prefix', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await backendWithPrefix.del('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:test-key');
    });

    it('should throw CacheBackendError for Redis errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis connection failed'));

      await expect(backend.del('test-key')).rejects.toThrow(CacheBackendError);
      await expect(backend.del('test-key')).rejects.toThrow('Redis delete operation failed');
    });

    it('should handle non-Error objects in Redis errors', async () => {
      mockRedisClient.del.mockRejectedValue('string error');

      await expect(backend.del('test-key')).rejects.toThrow(CacheBackendError);
      await expect(backend.del('test-key')).rejects.toThrow('string error');
    });
  });

  describe('lock', () => {
    it('should acquire lock successfully without prefix', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await backend.lock('test-key', 60);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', '1', 'EX', 60, 'NX');
      expect(result).toBe(true);
    });

    it('should acquire lock successfully with prefix', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await backendWithPrefix.lock('test-key', 60);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test:test-key', '1', 'EX', 60, 'NX');
      expect(result).toBe(true);
    });

    it('should fail to acquire lock when already exists', async () => {
      mockRedisClient.set.mockResolvedValue(null);

      const result = await backend.lock('test-key', 60);

      expect(result).toBe(false);
    });

    it('should throw CacheBackendError for Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(backend.lock('test-key', 60)).rejects.toThrow(CacheBackendError);
      await expect(backend.lock('test-key', 60)).rejects.toThrow('Redis lock operation failed');
    });

    it('should handle non-Error objects in Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue('string error');

      await expect(backend.lock('test-key', 60)).rejects.toThrow(CacheBackendError);
      await expect(backend.lock('test-key', 60)).rejects.toThrow('string error');
    });
  });

  describe('unlock', () => {
    it('should unlock successfully without prefix', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await backend.unlock('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should unlock successfully with prefix', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await backendWithPrefix.unlock('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:test-key');
    });

    it('should throw CacheBackendError for Redis errors', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis connection failed'));

      await expect(backend.unlock('test-key')).rejects.toThrow(CacheBackendError);
      await expect(backend.unlock('test-key')).rejects.toThrow('Redis unlock operation failed');
    });

    it('should handle non-Error objects in Redis errors', async () => {
      mockRedisClient.del.mockRejectedValue('string error');

      await expect(backend.unlock('test-key')).rejects.toThrow(CacheBackendError);
      await expect(backend.unlock('test-key')).rejects.toThrow('string error');
    });
  });

  describe('clear', () => {
    it('should throw CacheConfigError when no prefix is set', async () => {
      await expect(backend.clear()).rejects.toThrow(CacheConfigError);
      await expect(backend.clear()).rejects.toThrow('Refusing to clear all keys: prefix is required');
    });

    it('should clear all keys with prefix successfully', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['10', ['test:key1', 'test:key2']])
        .mockResolvedValueOnce(['0', ['test:key3']]);
      mockRedisClient.del.mockResolvedValue(2);

      await backendWithPrefix.clear();

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'test:*', 'COUNT', 100);
      expect(mockRedisClient.scan).toHaveBeenCalledWith('10', 'MATCH', 'test:*', 'COUNT', 100);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key1', 'test:key2');
      expect(mockRedisClient.del).toHaveBeenCalledWith('test:key3');
    });

    it('should handle empty scan results', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['10', []])
        .mockResolvedValueOnce(['0', []]);

      await backendWithPrefix.clear();

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should throw CacheBackendError for Redis scan errors', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Redis connection failed'));

      await expect(backendWithPrefix.clear()).rejects.toThrow(CacheBackendError);
      await expect(backendWithPrefix.clear()).rejects.toThrow('Redis clear operation failed');
    });

    it('should handle non-Error objects in Redis errors', async () => {
      mockRedisClient.scan.mockRejectedValue('string error');

      await expect(backendWithPrefix.clear()).rejects.toThrow(CacheBackendError);
      await expect(backendWithPrefix.clear()).rejects.toThrow('string error');
    });
  });
}); 
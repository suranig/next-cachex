import { describe, it, expect } from 'vitest';
import {
  CacheError,
  CacheTimeoutError,
  CacheConnectionError,
  CacheLockError,
  CacheSerializationError,
  CacheBackendError,
  CacheConfigError,
} from '../src/errors';

describe('Error Types', () => {
  it('should create CacheError with correct name and message', () => {
    const error = new CacheError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CacheError');
    expect(error.message).toBe('Test error');
  });

  it('should create CacheTimeoutError with correct inheritance', () => {
    const error = new CacheTimeoutError('Timeout error');
    expect(error).toBeInstanceOf(CacheError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CacheTimeoutError');
    expect(error.message).toBe('Timeout error');
  });

  it('should create CacheConnectionError with correct inheritance', () => {
    const error = new CacheConnectionError('Connection error');
    expect(error).toBeInstanceOf(CacheError);
    expect(error.name).toBe('CacheConnectionError');
  });

  it('should create CacheLockError with correct inheritance', () => {
    const error = new CacheLockError('Lock error');
    expect(error).toBeInstanceOf(CacheError);
    expect(error.name).toBe('CacheLockError');
  });

  it('should create CacheSerializationError with correct inheritance', () => {
    const error = new CacheSerializationError('Serialization error');
    expect(error).toBeInstanceOf(CacheError);
    expect(error.name).toBe('CacheSerializationError');
  });

  it('should create CacheBackendError with correct inheritance and cause', () => {
    const cause = new Error('Original error');
    const error = new CacheBackendError('Backend error', cause);
    expect(error).toBeInstanceOf(CacheError);
    expect(error.name).toBe('CacheBackendError');
    expect(error.cause).toBe(cause);
  });

  it('should create CacheConfigError with correct inheritance', () => {
    const error = new CacheConfigError('Config error');
    expect(error).toBeInstanceOf(CacheError);
    expect(error.name).toBe('CacheConfigError');
  });

  it('should use error types in try/catch blocks correctly', () => {
    try {
      throw new CacheTimeoutError('Test timeout');
    } catch (error) {
      expect(error instanceof CacheTimeoutError).toBe(true);
      expect(error instanceof CacheError).toBe(true);
      expect(error instanceof CacheConnectionError).toBe(false);
    }
  });
}); 
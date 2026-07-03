import { describe, it, expect } from 'vitest';
import { timingSafeStringEqual } from '../src/instrumentation';

describe('Security: timingSafeStringEqual', () => {
  it('should return true for matching strings', () => {
    expect(timingSafeStringEqual('secret-key', 'secret-key')).toBe(true);
    expect(timingSafeStringEqual('', '')).toBe(true);
    expect(timingSafeStringEqual('long'.repeat(100), 'long'.repeat(100))).toBe(true);
  });

  it('should return false for mismatching strings of the same length', () => {
    expect(timingSafeStringEqual('secret-key', 'secret-kez')).toBe(false);
    expect(timingSafeStringEqual('a', 'b')).toBe(false);
  });

  it('should return false for mismatching strings of different lengths', () => {
    expect(timingSafeStringEqual('secret', 'secret-key')).toBe(false);
    expect(timingSafeStringEqual('secret-key', 'secret')).toBe(false);
    expect(timingSafeStringEqual('', 'not-empty')).toBe(false);
  });

  it('should handle non-string inputs gracefully', () => {
    // @ts-expect-error - testing invalid inputs
    expect(timingSafeStringEqual(null, 'key')).toBe(false);
    // @ts-expect-error - testing invalid inputs
    expect(timingSafeStringEqual('key', undefined)).toBe(false);
    // @ts-expect-error - testing invalid inputs
    expect(timingSafeStringEqual(123, 123)).toBe(false);
  });
});

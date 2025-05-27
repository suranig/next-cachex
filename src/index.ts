/**
 * next-cachex - A distributed, shared cache handler for Next.js
 * 
 * @packageDocumentation
 */

// Main exports
export { fetchWithCache, cacheHandler } from './fetchWithCache';
export { createCacheHandler } from './createCacheHandler';

// Types
export * from './types';

// Re-export backends for convenience
export * from './backends';

/**
 * next-cachex - A distributed, shared cache handler for Next.js
 * 
 * @packageDocumentation
 */

// Main exports
export { fetchWithCache, cacheHandler } from './cache/fetchWithCache';
export { createCacheHandler } from './cache/createCacheHandler';

// Types
export * from './types';

// Re-export backends for convenience
export * from './backends';

// Instrumentation utilities
export { registerInitialCache, clearCache } from './instrumentation';

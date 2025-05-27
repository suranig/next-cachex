// API Route for cache invalidation
// -------------------------------
// This example demonstrates an API route for on-demand cache revalidation

import type { NextApiRequest, NextApiResponse } from 'next';
import { createCacheHandler, RedisCacheBackend, clearCache } from 'next-cachex';
import Redis from 'ioredis';

// Create a Redis client (typically done once in a shared file)
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create a custom cache handler with prefix
const cacheHandler = createCacheHandler({
  backend: new RedisCacheBackend(redisClient, 'myapp:v1'),
});

// Define response type
type RevalidateResponse = {
  revalidated: boolean;
  message?: string;
  error?: string;
}

/**
 * API handler for cache revalidation
 * 
 * Usage examples:
 * 1. Revalidate a specific key:
 *    POST /api/revalidate?key=posts:recent
 * 
 * 2. Revalidate multiple keys:
 *    POST /api/revalidate
 *    Body: { keys: ["posts:recent", "products:featured"] }
 * 
 * 3. Clear all cache (with API key for security):
 *    POST /api/revalidate?action=clear_all
 *    Headers: { "x-api-key": "your-secret-key" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevalidateResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      revalidated: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Get query parameters and body
    const { key, action } = req.query;
    const { keys } = req.body || {};

    // Clear all cache (protected by API key)
    if (action === 'clear_all') {
      // Verify API key for security
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.CACHE_REVALIDATE_KEY) {
        return res.status(401).json({ 
          revalidated: false, 
          error: 'Unauthorized' 
        });
      }

      // Clear all cache with the handler's prefix
      await clearCache(cacheHandler);
      return res.status(200).json({ 
        revalidated: true, 
        message: 'Cache cleared successfully' 
      });
    }

    // Revalidate a specific key
    if (typeof key === 'string') {
      await cacheHandler.backend.del(key);
      return res.status(200).json({ 
        revalidated: true, 
        message: `Cache key '${key}' revalidated` 
      });
    }

    // Revalidate multiple keys
    if (Array.isArray(keys) && keys.length > 0) {
      await Promise.all(keys.map(k => cacheHandler.backend.del(k)));
      return res.status(200).json({ 
        revalidated: true, 
        message: `${keys.length} cache keys revalidated` 
      });
    }

    // No valid action specified
    return res.status(400).json({ 
      revalidated: false, 
      error: 'Invalid request. Specify key, keys, or action=clear_all' 
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    return res.status(500).json({ 
      revalidated: false, 
      error: 'Failed to revalidate cache' 
    });
  }
} 
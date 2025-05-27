// App Router Instrumentation example
// ----------------------------------
// This example demonstrates using next-cachex for cache warming via Next.js instrumentation

import { cacheHandler, registerInitialCache } from 'next-cachex';

// These are the global configurations and data we want to pre-warm in the cache
const GLOBAL_CONFIG = {
  theme: 'light',
  features: {
    newHomepage: true,
    betaFeatures: false
  }
};

// List of popular product IDs to pre-cache
const FEATURED_PRODUCT_IDS = [1, 2, 3, 4, 5];

// Simulated function to fetch product data
async function fetchProductData(ids: number[]) {
  const responses = await Promise.all(
    ids.map(id => 
      fetch(`https://jsonplaceholder.typicode.com/posts/${id}`).then(r => r.json())
    )
  );
  return responses;
}

export async function register() {
  // Only run in Node.js environment (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('⚡ Initializing cache via instrumentation');
    
    // Fetch products for cache warming
    const featuredProducts = await fetchProductData(FEATURED_PRODUCT_IDS);
    
    // Register initial cache data for common values
    await registerInitialCache(cacheHandler, [
      {
        key: 'global:config',
        value: GLOBAL_CONFIG,
        options: { ttl: 3600 } // 1 hour TTL
      },
      {
        key: 'products:featured',
        value: featuredProducts,
        options: { ttl: 300, staleTtl: 3600 } // 5 min TTL, 1h stale TTL
      }
    ]);

    console.log('✅ Cache initialization complete');
  }
} 
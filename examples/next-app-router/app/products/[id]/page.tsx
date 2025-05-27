// App Router Dynamic Route example
// -------------------------------
// This example demonstrates using next-cachex for individual product pages

import { fetchWithCache, createCacheHandler } from 'next-cachex';
import { notFound } from 'next/navigation';

// Type definition for Product
interface Product {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// Function to fetch a single product
async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  
  if (!res.ok) {
    if (res.status === 404) {
      notFound();
    }
    throw new Error(`Failed to fetch product ${id}`);
  }
  
  return res.json();
}

// Generate static paths for the most popular products
export async function generateStaticParams() {
  // These IDs will be pre-rendered at build time
  return [1, 2, 3, 4, 5].map(id => ({ id: String(id) }));
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  // Create a cache key based on the product ID
  const cacheKey = `product:${params.id}`;
  
  // Use fetchWithCache with a longer TTL for popular products
  const product = await fetchWithCache(
    cacheKey,
    () => fetchProduct(params.id),
    { 
      ttl: 300,          // Cache for 5 minutes
      staleTtl: 3600,    // Keep stale version for 1 hour
    }
  );
  
  return (
    <div className="product-container">
      <h1>{product.title}</h1>
      <p className="product-id">Product ID: {product.id}</p>
      <div className="product-description">
        {product.body}
      </div>
      <p className="product-user">Created by user: {product.userId}</p>
    </div>
  );
} 
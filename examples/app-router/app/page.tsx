// App Router (RSC) usage example
// -----------------------------
// This example demonstrates using next-cachex with React Server Components

import { fetchWithCache } from 'next-cachex';
import { revalidatePath } from 'next/cache';

// Fetch function that will be cached
async function fetchPosts() {
  // Simulate API fetch
  const res = await fetch('https://jsonplaceholder.typicode.com/posts');
  
  if (!res.ok) {
    throw new Error('Failed to fetch posts');
  }
  
  return res.json();
}

export default async function PostsPage() {
  // Use fetchWithCache in a React Server Component
  // The key 'posts:all' will be cached with a TTL of 60 seconds
  const posts = await fetchWithCache(
    'posts:all',
    fetchPosts,
    { ttl: 60 }
  );
  
  // Server action to revalidate cache
  async function refreshPosts() {
    'use server';
    await fetchWithCache.cacheHandler.backend.del('posts:all');
    revalidatePath('/');
  }
  
  return (
    <div>
      <h1>Posts</h1>
      <form action={refreshPosts}>
        <button type="submit">Refresh Posts</button>
      </form>
      <ul>
        {posts.slice(0, 5).map((post: any) => (
          <li key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
} 
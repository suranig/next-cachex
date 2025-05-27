// Pages Router (SSR) usage example
// -----------------------------
// This example demonstrates using next-cachex with getServerSideProps

import React from 'react';
import { GetServerSideProps } from 'next';
import { fetchWithCache, createCacheHandler, RedisCacheBackend } from 'next-cachex';
import Redis from 'ioredis';

// Define types for the data
interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

interface HomeProps {
  posts: Post[];
  lastUpdated: string;
}

// Create a Redis client (typically done once in a shared file)
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create a custom cache handler with prefix
const customCacheHandler = createCacheHandler({
  backend: new RedisCacheBackend(redisClient, 'myapp:v1'),
  // Log cache events in development
  logger: process.env.NODE_ENV === 'development' 
    ? { log: (event) => console.log(`[CACHE] ${event.type} ${event.key}`) }
    : undefined,
});

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  try {
    // Use the custom cache handler to fetch posts
    const posts = await customCacheHandler.fetch(
      'posts:recent',
      async () => {
        console.log('Cache miss, fetching from API...');
        const res = await fetch('https://jsonplaceholder.typicode.com/posts');
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      },
      { ttl: 60 } // 60 seconds cache TTL
    );

    return {
      props: {
        posts: posts.slice(0, 5), // Only get the first 5 posts
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    
    // Return empty array on error
    return {
      props: {
        posts: [],
        lastUpdated: new Date().toISOString()
      }
    };
  }
};

export default function Home({ posts, lastUpdated }: HomeProps) {
  return (
    <div className="container">
      <h1>Recent Posts</h1>
      <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
      
      {posts.length > 0 ? (
        <ul>
          {posts.map(post => (
            <li key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.body.substring(0, 100)}...</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No posts available</p>
      )}
    </div>
  );
} 
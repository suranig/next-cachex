# next-cachex

[![codecov](https://codecov.io/gh/suranig/next-cachex/branch/main/graph/badge.svg)](https://codecov.io/gh/suranig/next-cachex)

## Dependencies
- typescript@5 (strict mode)
- vitest (unit testing)
- ioredis (Redis backend)
- @types/node (TypeScript types)
- eslint (linting)
- prettier (formatting)
- husky (pre-commit hooks)
- typedoc (API documentation)

## Installation
```sh
npm install next-cachex
# For development:
npm install --save-dev typescript vitest @types/node eslint prettier husky typedoc
npm install ioredis
```

# Assumptions and Technical Specification

1. Project Goal
- provide a distributed, shared cache handler for Next.js (13+), fully compatible with both App Router (app/) and Pages - - router (pages/), designed for multi-pod environments (Kubernetes, ECS, Vercel, etc.).
- primary backend at launch: Redis (support for more cache backends in future).
- solve production-scale cache problems: thundering herd, consistency, TTL, namespacing, easy API for developers.

## Distributed Cache, ISR, and Revalidation

### Why a Shared Cache?
In distributed Next.js deployments (multiple pods/containers), a shared cache (like Redis) ensures all instances serve the same data and revalidation is global. Without this, some pods may serve stale data after a revalidate.

### How to Invalidate (Revalidate) Cache
- **Single key:**
  ```ts
  await cacheHandler.backend.del('my-key')
  ```
- **All keys for a prefix:**
  ```ts
  await cacheHandler.backend.clear()
  ```
- **(Optional) Tag-based:**
  ```ts
  await cacheHandler.revalidateTag('my-tag') // if implemented
  ```

### Example: On-demand Revalidation (API Route)
```ts
import { cacheHandler } from 'next-cachex';

export default async function handler(req, res) {
  await cacheHandler.backend.del('posts:all');
  res.status(200).json({ revalidated: true });
}
```

## Example: Custom Logger

You can provide your own logger to capture cache events for debugging, metrics, or production observability:

```ts
import { createCacheHandler } from 'next-cachex';
import { RedisCacheBackend } from 'next-cachex/backends/redis';
import Redis from 'ioredis';

const redisClient = new Redis();

const logger = {
  log: (event) => {
    // You can send this to your logger, metrics, or just console.log
    console.log(`[CACHE]`, event);
  },
};

const cacheHandler = createCacheHandler({
  backend: new RedisCacheBackend(redisClient, 'myapp:v1'),
  logger,
});

// Usage
const data = await cacheHandler.fetch('posts:all', fetchPosts, { ttl: 300 });
```

## Inspirations & References

This project draws inspiration and best practices from several leading open-source caching and distributed systems projects:

- [next-boost](https://github.com/next-boost/next-boost): SSR cache with stale-while-revalidate, custom cache keys, and flexible TTL rules. Demonstrates advanced cache control and revalidation patterns for Next.js.
- [next-shared-cache](https://github.com/caching-tools/next-shared-cache): Modern, production-grade shared cache handler for Next.js, with Redis support, on-demand revalidation, and instrumentation hooks. Strong focus on distributed cache invalidation and DX.
- [node-redlock](https://github.com/mike-marcacci/node-redlock): Robust distributed locking for Redis, used as a reference for atomic lock implementation and safety in multi-pod environments.
- [bullmq](https://github.com/taskforcesh/bullmq): Distributed job and queue management with Redis, providing patterns for atomic operations and reliability in distributed systems.
- [upstash/nextauth-upstash-redis](https://github.com/upstash/examples/tree/main/examples/nextauth-upstash-redis): Example of using Upstash Redis for session and cache management in Next.js, showing best practices for serverless and distributed cache.
- [apicache](https://github.com/kwhitley/apicache): HTTP cache middleware for Node.js/Express, with flexible cache control and invalidation strategies.
- [cacheable](https://github.com/jaredwray/cacheable): Generic, pluggable cache abstraction for Node.js, with support for multiple backends and advanced cache policies.

These projects have influenced the design, API, and operational safety of next-cachex. See their docs for further patterns and advanced use cases.


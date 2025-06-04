# next-cachex Examples

This directory contains example implementations of next-cachex in various Next.js scenarios.

## Examples Structure

```
examples/
├── app-router/            # Next.js App Router (RSC) examples
│   ├── app/               # React Server Components
│   │   ├── page.tsx       # Basic usage with RSC
│   │   └── products/[id]/ # Dynamic route with caching
│   └── instrumentation.ts # Cache warming via Next.js instrumentation
│
└── pages-router/          # Next.js Pages Router examples
    ├── pages/             # Pages directory
    │   └── index.tsx      # SSR with getServerSideProps
    └── api/               # API Routes
        └── revalidate.ts  # Cache invalidation API
```

## App Router Examples

### React Server Components (RSC)

The `app-router/app/page.tsx` example demonstrates:
- Using `fetchWithCache` within a React Server Component
- Utilizing server actions for revalidation

### Dynamic Routes

The `app-router/app/products/[id]/page.tsx` example demonstrates:
- Cache handling for dynamic routes
- Setting TTL based on content type
- Using stale cache for resilience

### Instrumentation

The `app-router/instrumentation.ts` example demonstrates:
- Cache warming during app startup
- Pre-populating frequently accessed data
- Using the `registerInitialCache` helper

## Pages Router Examples

### Server-Side Rendering (SSR)

The `pages-router/pages/index.tsx` example demonstrates:
- Creating a custom cache handler with specific prefix
- Using cache in `getServerSideProps`
- Handling errors gracefully

### API Routes

The `pages-router/api/revalidate.ts` example demonstrates:
- Creating an API endpoint for on-demand cache invalidation
- Handling individual or batch key invalidation
- Securing global cache clearing with API keys

## Running the Examples

These examples are for reference and would need to be integrated into a Next.js application with the following setup:

1. Install dependencies:
```bash
npm install next-cachex ioredis
```

2. Configure Redis:
```bash
# In your .env file
REDIS_URL=redis://localhost:6379
CACHE_REVALIDATE_KEY=your-secret-key
```

3. Copy the relevant examples to your Next.js project structure 
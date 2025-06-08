next-cachex — Assumptions and Technical Specification

# 1. Project Goal
Provide a distributed, shared cache handler for Next.js (13+) and Node.js, compatible with both App Router and Pages Router, for scalable multi-pod/cloud environments.

- Initial backend: Redis (with planned support for Memcached, Varnish, etc.).
- Main focus: Solving production cache problems — thundering herd, consistency, TTL, namespacing, cache busting, easy API for developers.
- All APIs must be backend-agnostic and extensible.

# 2. Key Features
- Main cache handler: `fetchWithCache()` (default export, backend-agnostic)
- Retrieve data from cache (GET)
- On cache MISS: acquire a distributed lock, run the fetcher, set the value, release the lock
- Other parallel requests for the same key wait for the result (polling while locked)
- TTL support per cache key
- Core operations: GET, SET, DEL for cache; distributed locking
- Key prefixing/namespacing (to isolate apps, environments, services)
- Global prefix/versioning during handler creation/config
- Cache key versioning: (prefix:v1:resource)
- Logging (HIT/MISS/LOCK/WAIT/ERROR), with support for custom logger injection
- Optional fallback to stale cache on fetcher failure
- Full TypeScript typing (generics, interfaces)
- Instrumentation/build/start hook support for Next.js (cache warming/pre-population)
- All cache operations must be async and non-blocking
- Enforce timeouts for all network/cache operations
- Provide configurable stale cache fallback (optionally)
- Ensure lock implementation is atomic, with TTL (no "forever locks")
- No console.log in production builds; use a pluggable logger or debug flag
- Never log secrets, tokens, or raw credentials
- Always validate user input for key names/prefixes

# 3. Technology
- TypeScript (TS 5+, strict mode)
- ESM & CJS builds
- Initial backend: Redis (ioredis)
- Exports:
  - `fetchWithCache` (default singleton handler, e.g. Redis by default)
  - `createCacheHandler({ backend, ...options })` for custom handler (backend-agnostic)
  - Helper types/interfaces (all exported)
- Unit tests: Vitest or Jest, Redis mock
- No hard Next.js dependency — usable in any Node.js backend

# 4. User API
## Default usage:
```ts
import { fetchWithCache } from 'next-cachex';
const data = await fetchWithCache(
  'posts:all',
  () => fetch('https://api.example.com/posts').then(r => r.json()),
  { ttl: 300 }
);
```
## Custom handler and backend (future-proof):
```ts
import { createCacheHandler } from 'next-cachex';
const cacheHandler = createCacheHandler({
  backend: 'redis',
  redisClient, // required option if backend is 'redis'
  prefix: 'myapp:v1',
  // ...other options (logger, fallback, etc.)
});
const data = await cacheHandler.fetch('key', fetcher, { ttl: 120 });
```

# 5. Cache Warming / Instrumentation
- Export function `registerInitialCache` (for use in Next.js instrumentation.ts or build hooks)
- Automatically populates cache with pre-rendered/build data at app start or deploy
- Example:
```ts
export async function register() {
  const { registerInitialCache } = await import('next-cachex/instrumentation');
  await registerInitialCache(fetchWithCache, {/* optional: prefix, version, etc. */});
}
```
- Documentation will describe integration with Next.js instrumentation

# 6. Versioning & GitHub Actions
- Semver (major/minor/patch) based on Git tags
- CI:
  - Lint (ESLint, Prettier)
  - Test (Vitest, coverage)
  - Build (TS → dist, dts, ESM/CJS)
- CD:
  - Auto-publish to npm and GitHub Packages on release
  - Changelog generation

# 7. Directory Structure
```
next-cachex/
├── src/
│   ├── cache/              # Core cache logic (fetchWithCache, createCacheHandler)
│   ├── backends/           # Redis, Memcached, etc. (each implements CacheBackend)
│   ├── types/              # Shared types/interfaces
│   ├── instrumentation/    # Cache warming, Next.js hooks
│   └── index.ts            # Main entry point
├── test/
│   ├── cache/
│   ├── backends/
│   └── ...
├── examples/
│   ├── next-app-router/
│   └── next-pages-router/
├── package.json
├── tsconfig.json
├── README.md
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   │   └── release.yml
│   └── ...
└── ...
```

# 8. Code Quality & Contribution Guidelines
- Use strict TypeScript mode (`"strict": true` in tsconfig.json)
- Always use type-safe generics for cache data and options
- No `any` unless explicitly justified and commented
- Export all public types & interfaces (for consumers' DX)
- Write self-explanatory code – prefer clarity over cleverness
- Organize by feature/domain (not file type)
- Group logic into small, pure, composable functions
- The default export must be backend-agnostic (fetchWithCache, not fetchWithRedis)
- All configurable options should be passed as objects with named properties (not as long argument lists)
- Use factory functions for custom handlers (createCacheHandler)
- Always expose typed errors (e.g., CacheTimeoutError) – never throw raw strings
- Document all public APIs and their options with JSDoc
- Design handler interfaces to easily add new backends (e.g., Redis, Memcached, Varnish)
- Each backend should implement a common interface (e.g., CacheBackend with .get, .set, .del, .lock)
- Support global key prefixing/namespacing
- Default to Redis, but never hardcode Redis specifics outside its backend
- 100% coverage on core logic (Vitest/Jest)
- All new code must have unit tests (and integration tests if backend-specific)
- Mock external dependencies in tests (i.e., mock Redis, don't hit live infra)
- CI must run lint, type-check, test, build before merge (GitHub Actions)
- Use pre-commit hooks for lint & formatting (e.g., via Husky)
- Write a comprehensive README.md with motivation, installation, API, use-cases, gotchas
- All exported functions/types must have clear JSDoc (typedoc ready)
- Provide real-world usage examples (SSR, RSC, API Route, instrumentation)
- Maintain a CHANGELOG.md (auto-generated via CI)
- Use semver – breaking changes always increment major
- All merges to main must be PR-reviewed and pass CI
- Auto-publish on tag/release via GitHub Actions (npm + GH Packages)
- Add a license file and ensure every source file has license headers if required
- All cache operations must be async and non-blocking
- Enforce timeouts for all network/cache operations
- Provide configurable stale cache fallback (optionally)
- Ensure lock implementation is atomic, with TTL (no "forever locks")
- No console.log in production builds; use a pluggable logger or debug flag
- Never log secrets, tokens, or raw credentials
- Always validate user input for key names/prefixes
- Document all known security considerations and recommendations
- Favor composition over inheritance in new backends or features
- Mark internal APIs as such (with /** @internal */ or similar)
- Leave clear TODO/FIXME comments where design is to be extended
- Use "open/closed" principle in handler design (open for extension, closed for modification)

# 9. Documentation (README)
- What is it? When to use? Key benefits.
- Installation (npm i next-cachex)
- API (fetchWithCache, createCacheHandler, options)
- Usage examples (SSR, RSC, API routes, instrumentation/build hooks)
- Advanced: prefixing, versioning, logging, stale fallback, custom backends

# 10. Future Expansion
- Additional backends: Memcached, Varnish, File cache (plugins, adapters)
- Advanced features: Pub/Sub, distributed cache invalidation, metrics
- CLI tools: clear cache, scan, inspect, metrics
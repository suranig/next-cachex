# next-cachex Project Checklist

## 1. Architecture & Planning
- [x] Review and update `adr.md` for architecture, code quality, and extensibility
- [x] Define and document core interfaces and types (`src/types/`)
- [x] Plan backend-agnostic handler structure (`src/cache/`)
- [x] Plan backend plugin structure (`src/backends/`)

## 2. Directory & File Structure
- [x] Scaffold `src/`, `test/`, `examples/`, `.github/`, etc.
- [x] Create initial files for core logic, types, tests, and CI/CD

## 3. Dependencies & Tooling
- [x] Initialize npm project (`package.json`)
- [x] Add TypeScript (strict mode), Vitest, ioredis, @types/node
- [x] Add ESLint, Prettier, Husky (pre-commit hooks)
- [x] Add typedoc for API docs
- [x] Update README with dependencies and install instructions

## 4. Core Implementation
- [x] Implement and export all core types/interfaces (with JSDoc)
- [x] Implement backend-agnostic cache handler (`fetchWithCache`)
- [x] Implement handler factory (`createCacheHandler`)
- [x] Implement Redis backend plugin (in `src/backends/`)
- [x] Implement error types (e.g., `CacheTimeoutError`)
- [x] Implement key prefixing/namespacing logic
- [x] Implement distributed lock logic (atomic, with TTL)
- [x] Implement logging (pluggable logger)
- [x] Implement stale cache fallback (optional)
- [x] Implement instrumentation/build hooks

## 5. Testing
- [x] Write unit tests for all core logic (Vitest)
- [x] Mock Redis and other external dependencies in tests
- [ ] Achieve 100% coverage on core logic
- [ ] Add integration tests for backend plugins

## 6. Documentation
- [x] Write/refresh README: motivation, install, API, usage, gotchas
- [ ] Add real-world usage examples (SSR, RSC, API Route, instrumentation)
- [x] Document all exported functions/types with JSDoc
- [ ] Add typedoc generation script
- [ ] Maintain CHANGELOG.md (auto-generated via CI)
- [x] Update README as new features/dependencies are added

## 7. CI/CD & Quality Gates
- [x] Add GitHub Actions for lint, type-check, test, build, release
- [x] Add pre-commit hooks for lint/format (Husky)
- [ ] Ensure all merges to main are PR-reviewed and pass CI
- [ ] Auto-publish on tag/release (npm + GitHub Packages)
- [x] Add code coverage reporting (Codecov)

## 8. Security & Best Practices
- [ ] Never log secrets/tokens/credentials
- [ ] Validate all user input (keys, prefixes)
- [ ] Document security considerations in README

---

**Reminder:**
- [x] After each major step, update README with new dependencies, features, and usage examples.
- [ ] Check off each item as you complete it to track project progress. 
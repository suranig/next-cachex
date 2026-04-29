## 2024-05-18 - Optimize getFullKey to avoid dynamic array allocation
**Learning:** In Node.js, dynamically creating arrays, filtering them, and joining them on hot paths (like cache key generation) can be significantly slower than precomputing static prefixes and using simple string concatenation or template literals. A micro-benchmark showed a ~94% improvement in execution time for key generation.
**Action:** Always precompute static prefixes outside of hot path functions and use template literals/string concatenation to minimize CPU overhead and memory pressure.

## 2024-05-18 - Safe Map Key Eviction with Empty Strings
**Learning:** When manually implementing FIFO cache eviction using `map.keys().next().value`, a truthy check `if (oldestKey)` fails to evict an item if its key is an empty string `""`. This causes the cache to grow unbounded if empty strings are valid keys.
**Action:** Always use strict undefined checks `if (oldestKey !== undefined)` when checking the presence of a map key or value to correctly handle falsy, but valid, values.

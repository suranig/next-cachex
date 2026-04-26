## 2024-05-18 - Optimize getFullKey to avoid dynamic array allocation
**Learning:** In Node.js, dynamically creating arrays, filtering them, and joining them on hot paths (like cache key generation) can be significantly slower than precomputing static prefixes and using simple string concatenation or template literals. A micro-benchmark showed a ~94% improvement in execution time for key generation.
**Action:** Always precompute static prefixes outside of hot path functions and use template literals/string concatenation to minimize CPU overhead and memory pressure.

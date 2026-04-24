## 2026-04-24 - Precomputing Static Prefixes on Hot Paths
**Learning:** In Node.js, dynamic array allocation (`[]`), array methods like `.filter(Boolean)`, and `.join(':')` inside a hot path (like cache key generation) introduce unnecessary CPU overhead and memory allocation pressure. This is a common performance anti-pattern.
**Action:** Always precompute static segments of strings outside the function scope (e.g. at initialization). Use simple string concatenation or template literals (`${prefix}${key}`) on the hot path to construct keys efficiently.

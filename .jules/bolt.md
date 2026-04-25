## 2025-03-09 - [Hot Path Key Generation Optimization]
**Learning:** [Dynamic array allocations (`[]`), `.filter(Boolean)`, and `.join(':')` inside a hot path like `getFullKey` (which is called on every cache operation) create unnecessary memory pressure and CPU overhead in Node.js.]
**Action:** [Precompute static string prefixes during initialization instead of re-calculating them dynamically on every function call. Use simple template literals or string concatenation for maximum performance on hot paths.]

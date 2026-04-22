## 2024-05-24 - [Avoid dynamic array allocations on hot cache paths]
**Learning:** Using `[a, b, c].filter(Boolean).join(':')` to dynamically generate cache keys incurs unnecessary array allocation and loop processing overhead, which degrades performance when executed frequently in a hot path like `fetch`. Precomputing the static portion of the key (prefix + version) limits the overhead significantly in Node.js/V8.
**Action:** Always prefer precomputing static values and simple string concatenation (or template literals) for hot paths that run on every cache operation.

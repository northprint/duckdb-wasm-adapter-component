# Cache API

The Cache API provides intelligent query result caching to improve performance and reduce redundant database operations.

## Overview

The cache system automatically stores query results and serves them on subsequent identical queries, significantly improving performance for frequently executed queries.

## Cache Configuration

### CacheConfig

Configure caching behavior when creating a connection.

```typescript
interface CacheConfig {
  enabled?: boolean;              // Enable/disable caching (default: false)
  maxEntries?: number;            // Maximum cache entries (default: 100)
  maxSize?: number;               // Maximum cache size in bytes (default: 10MB)
  ttl?: number;                   // Time to live in milliseconds (default: 5 minutes)
  evictionStrategy?: EvictionStrategy; // Eviction strategy (default: 'lru')
  enableStats?: boolean;          // Enable cache statistics (default: true)
  keyGenerator?: (query: string, params?: unknown[]) => string; // Custom key generator
}
```

### EvictionStrategy

```typescript
type EvictionStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl';
```

- **LRU (Least Recently Used)**: Evicts the least recently accessed entries
- **LFU (Least Frequently Used)**: Evicts the least frequently accessed entries  
- **FIFO (First In, First Out)**: Evicts the oldest entries
- **TTL (Time To Live)**: Evicts expired entries only

## Basic Usage

### Enable Caching

```typescript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection({
  cache: {
    enabled: true,
    maxEntries: 50,
    ttl: 60000, // 1 minute
    evictionStrategy: 'lru'
  }
});
```

### Framework Integration

#### React

```jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  const cacheConfig = {
    enabled: true,
    maxEntries: 100,
    ttl: 300000, // 5 minutes
    evictionStrategy: 'lru'
  };

  return (
    <DuckDBProvider 
      autoConnect
      config={{ cache: cacheConfig }}
    >
      <Dashboard />
    </DuckDBProvider>
  );
}
```

#### Vue

```javascript
// main.js
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    cache: {
      enabled: true,
      maxEntries: 100,
      ttl: 300000,
      evictionStrategy: 'lru'
    }
  }
});
```

#### Svelte

```javascript
// App.svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({
    autoConnect: true,
    config: {
      cache: {
        enabled: true,
        maxEntries: 100,
        ttl: 300000,
        evictionStrategy: 'lru'
      }
    }
  });
</script>
```

## Cache Management

### CacheStats

Statistics about cache performance.

```typescript
interface CacheStats {
  hits: number;        // Number of cache hits
  misses: number;      // Number of cache misses
  evictions: number;   // Number of evicted entries
  entries: number;     // Current number of entries
  totalSize: number;   // Total size in bytes
  hitRate: number;     // Hit rate (0-1)
}
```

### getCacheStats()

Get current cache statistics.

```typescript
const stats = connection.getCacheStats();

console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Entries: ${stats.entries}`);
console.log(`Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
```

### clearCache()

Clear all cached entries.

```typescript
connection.clearCache();
console.log('Cache cleared');
```

### invalidateCache()

Invalidate specific cache entries using patterns.

```typescript
// Clear all user-related queries
const invalidated = connection.invalidateCache(/users/);
console.log(`Invalidated ${invalidated} entries`);

// Clear queries containing specific text
connection.invalidateCache('SELECT * FROM products');

// Clear using regex pattern
connection.invalidateCache(/^SELECT.*FROM (users|profiles)/);
```

## Framework-Specific Cache Hooks

### React - useCache

```jsx
import { useCache } from '@northprint/duckdb-wasm-adapter-react';

function CacheManager() {
  const { clearCache, getCacheStats, invalidateCache } = useCache();
  const [stats, setStats] = useState(getCacheStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats());
    }, 1000);
    return () => clearInterval(interval);
  }, [getCacheStats]);

  const handleClearUserQueries = () => {
    const cleared = invalidateCache(/users/);
    alert(`Cleared ${cleared} user-related queries`);
  };

  return (
    <div>
      <h3>Cache Statistics</h3>
      <p>Hit Rate: {(stats.hitRate * 100).toFixed(1)}%</p>
      <p>Entries: {stats.entries}</p>
      <p>Size: {(stats.totalSize / 1024).toFixed(2)} KB</p>
      
      <button onClick={clearCache}>Clear All</button>
      <button onClick={handleClearUserQueries}>Clear User Queries</button>
    </div>
  );
}
```

### Vue - useCache

```vue
<template>
  <div>
    <h3>Cache Statistics</h3>
    <p>Hit Rate: {{ (stats.hitRate * 100).toFixed(1) }}%</p>
    <p>Entries: {{ stats.entries }}</p>
    <p>Size: {{ (stats.totalSize / 1024).toFixed(2) }} KB</p>
    
    <button @click="clearCache">Clear All</button>
    <button @click="clearUserQueries">Clear User Queries</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useCache } from '@northprint/duckdb-wasm-adapter-vue';

const { clearCache, getCacheStats, invalidateCache } = useCache();
const stats = ref(getCacheStats());

let interval;

const clearUserQueries = () => {
  const cleared = invalidateCache(/users/);
  console.log(`Cleared ${cleared} user queries`);
  stats.value = getCacheStats();
};

onMounted(() => {
  interval = setInterval(() => {
    stats.value = getCacheStats();
  }, 1000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
```

### Svelte - Cache Store

```svelte
<script>
  import { writable } from 'svelte/store';
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const stats = writable(db.getCacheStats());
  
  // Update stats every second
  setInterval(() => {
    stats.set(db.getCacheStats());
  }, 1000);
  
  function clearUserQueries() {
    const cleared = db.invalidateCache(/users/);
    console.log(`Cleared ${cleared} user queries`);
    stats.set(db.getCacheStats());
  }
</script>

<div>
  <h3>Cache Statistics</h3>
  <p>Hit Rate: {($stats.hitRate * 100).toFixed(1)}%</p>
  <p>Entries: {$stats.entries}</p>
  <p>Size: {($stats.totalSize / 1024).toFixed(2)} KB</p>
  
  <button on:click={() => db.clearCache()}>Clear All</button>
  <button on:click={clearUserQueries}>Clear User Queries</button>
</div>
```

## Advanced Cache Strategies

### Custom Key Generator

Create custom cache keys for specific query patterns.

```typescript
const connection = await createConnection({
  cache: {
    enabled: true,
    keyGenerator: (query, params) => {
      // Normalize whitespace and case
      const normalizedQuery = query.replace(/\s+/g, ' ').trim().toLowerCase();
      
      // Include parameters in key
      const paramKey = params ? JSON.stringify(params) : '';
      
      // Create unique key
      return `${normalizedQuery}:${paramKey}`;
    }
  }
});
```

### Time-Based Cache Invalidation

```typescript
// Cache configuration for real-time data
const realtimeCache = {
  enabled: true,
  ttl: 30000, // 30 seconds for real-time data
  evictionStrategy: 'ttl'
};

// Cache configuration for static data
const staticCache = {
  enabled: true,
  ttl: 3600000, // 1 hour for static data
  evictionStrategy: 'lru'
};
```

### Conditional Caching

```typescript
class ConditionalCacheManager {
  constructor(connection) {
    this.connection = connection;
  }

  async query(sql, params, options = {}) {
    const { cache = true, ttl } = options;
    
    if (!cache) {
      // Bypass cache for this query
      return this.connection.execute(sql, params);
    }
    
    // Use custom TTL if provided
    if (ttl) {
      const originalTTL = this.connection.cache.options.ttl;
      this.connection.cache.options.ttl = ttl;
      
      try {
        return await this.connection.execute(sql, params);
      } finally {
        this.connection.cache.options.ttl = originalTTL;
      }
    }
    
    return this.connection.execute(sql, params);
  }
}
```

## Cache Warming

Pre-populate cache with frequently used queries.

```typescript
async function warmCache(connection) {
  const commonQueries = [
    'SELECT COUNT(*) FROM users',
    'SELECT DISTINCT department FROM employees',
    'SELECT * FROM settings WHERE active = true',
    'SELECT name, email FROM users WHERE role = "admin"'
  ];

  console.log('Warming cache...');
  
  for (const query of commonQueries) {
    try {
      await connection.execute(query);
      console.log(`Cached: ${query}`);
    } catch (error) {
      console.warn(`Failed to cache: ${query}`, error);
    }
  }
  
  console.log('Cache warming completed');
}

// Usage
const connection = await createConnection({
  cache: { enabled: true }
});

await connection.initialize();
await warmCache(connection);
```

## Cache Monitoring

### Performance Monitoring

```typescript
class CacheMonitor {
  constructor(connection) {
    this.connection = connection;
    this.startTime = Date.now();
  }

  getPerformanceReport() {
    const stats = this.connection.getCacheStats();
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: uptime / 1000, // seconds
      hitRate: stats.hitRate,
      totalQueries: stats.hits + stats.misses,
      avgHitsPerSecond: stats.hits / (uptime / 1000),
      cacheEfficiency: stats.hits > 0 ? stats.hits / (stats.hits + stats.misses) : 0,
      memoryUsage: stats.totalSize,
      evictionRate: stats.evictions / (stats.hits + stats.misses)
    };
  }

  logReport() {
    const report = this.getPerformanceReport();
    
    console.table({
      'Uptime (s)': report.uptime.toFixed(1),
      'Hit Rate': `${(report.hitRate * 100).toFixed(1)}%`,
      'Total Queries': report.totalQueries,
      'Hits/Second': report.avgHitsPerSecond.toFixed(2),
      'Memory (KB)': (report.memoryUsage / 1024).toFixed(2),
      'Eviction Rate': `${(report.evictionRate * 100).toFixed(1)}%`
    });
  }
}

// Usage
const monitor = new CacheMonitor(connection);

// Log performance every minute
setInterval(() => {
  monitor.logReport();
}, 60000);
```

## Best Practices

### 1. Cache Strategy Selection

```typescript
// For read-heavy applications
const readHeavyCache = {
  enabled: true,
  maxEntries: 500,
  ttl: 600000, // 10 minutes
  evictionStrategy: 'lru'
};

// For memory-constrained environments
const lightweightCache = {
  enabled: true,
  maxEntries: 50,
  maxSize: 5 * 1024 * 1024, // 5MB
  evictionStrategy: 'lfu'
};

// For real-time applications
const realtimeCache = {
  enabled: true,
  ttl: 10000, // 10 seconds
  evictionStrategy: 'ttl'
};
```

### 2. Query Optimization for Caching

```typescript
// ❌ Poor caching (dynamic timestamps)
const badQuery = `SELECT * FROM orders WHERE created_at > '${new Date().toISOString()}'`;

// ✅ Good caching (parameterized)
const goodQuery = 'SELECT * FROM orders WHERE created_at > ?';
const params = [new Date().toISOString()];
```

### 3. Cache Invalidation Patterns

```typescript
// Invalidate related caches after mutations
async function createUser(userData) {
  const result = await connection.execute(
    'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *',
    [userData.name, userData.email]
  );
  
  // Invalidate user-related caches
  connection.invalidateCache(/users/);
  connection.invalidateCache(/user_count/);
  
  return result;
}
```

### 4. Memory Management

```typescript
// Monitor cache size and adjust if needed
function manageCacheMemory(connection) {
  const stats = connection.getCacheStats();
  const maxMemory = 50 * 1024 * 1024; // 50MB
  
  if (stats.totalSize > maxMemory) {
    console.warn('Cache memory limit exceeded, clearing cache');
    connection.clearCache();
  }
}
```

### 5. Development vs Production

```typescript
const cacheConfig = {
  enabled: true,
  maxEntries: process.env.NODE_ENV === 'production' ? 200 : 50,
  ttl: process.env.NODE_ENV === 'production' ? 300000 : 60000,
  evictionStrategy: 'lru',
  enableStats: process.env.NODE_ENV === 'development'
};
```

## Troubleshooting

### Common Issues

1. **Low Hit Rate**: Queries might be too dynamic or TTL too short
2. **High Memory Usage**: Increase eviction frequency or reduce TTL
3. **Cache Misses**: Ensure queries are exactly the same (including whitespace)
4. **Performance Degradation**: Cache might be too large, consider reducing maxEntries

### Debug Cache Behavior

```typescript
// Enable debug logging for cache operations
const connection = await createConnection({
  debug: {
    enabled: true,
    logQueries: true
  },
  cache: {
    enabled: true,
    enableStats: true
  }
});
```
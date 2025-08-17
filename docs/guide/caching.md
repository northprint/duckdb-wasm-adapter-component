# Caching

DuckDB WASM Adapter provides advanced caching capabilities to improve performance.

## Overview

Caching provides the following benefits:

- **Faster queries** - Reduce response time for repeated queries
- **Resource savings** - Reduce CPU usage and memory access
- **Better UX** - Instant responses for better user experience

## Basic Usage

### Connection-level Cache Configuration

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection({
  cache: {
    enabled: true,        // Enable caching
    maxEntries: 100,      // Maximum cache entries
    ttl: 60000,          // TTL in milliseconds (1 minute)
    maxSize: 50 * 1024 * 1024  // Maximum cache size - 50MB
  }
});
```

### Query-level Cache Control

```javascript
// Query with cache
const result = await connection.execute('SELECT * FROM users', undefined, {
  cache: true,
  cacheKey: 'all-users',
  cacheTTL: 300000  // Cache for 5 minutes
});

// Bypass cache
const freshResult = await connection.execute('SELECT * FROM users', undefined, {
  cache: false
});
```

## Cache Strategies

### 1. Static Data Caching

Set long TTL for data that rarely changes:

```javascript
// State master data (rarely changes)
const states = await connection.execute(
  'SELECT * FROM states',
  undefined,
  {
    cache: true,
    cacheTTL: 24 * 60 * 60 * 1000  // 24 hours
  }
);

// Category master (occasionally changes)
const categories = await connection.execute(
  'SELECT * FROM categories',
  undefined,
  {
    cache: true,
    cacheTTL: 60 * 60 * 1000  // 1 hour
  }
);
```

### 2. Conditional Caching for Dynamic Data

Generate cache keys based on parameters:

```javascript
function getUsersByDepartment(departmentId) {
  return connection.execute(
    'SELECT * FROM users WHERE department_id = ?',
    [departmentId],
    {
      cache: true,
      cacheKey: `users-dept-${departmentId}`,
      cacheTTL: 5 * 60 * 1000  // 5 minutes
    }
  );
}
```

### 3. Aggregation Query Caching

Cache results of heavy aggregation queries:

```javascript
// Daily sales aggregation
async function getDailySales(date) {
  const cacheKey = `daily-sales-${date}`;
  const today = new Date().toISOString().split('T')[0];
  
  return connection.execute(
    `SELECT 
      DATE(order_date) as date,
      COUNT(*) as order_count,
      SUM(total) as total_sales,
      AVG(total) as avg_order_value
    FROM orders
    WHERE DATE(order_date) = ?
    GROUP BY DATE(order_date)`,
    [date],
    {
      cache: true,
      cacheKey,
      cacheTTL: date === today ? 60000 : Infinity  // 1 minute for today, permanent for past
    }
  );
}
```

## Cache Management

### Clear Cache

```javascript
// Clear specific cache key
connection.clearCache('all-users');

// Clear cache by pattern
connection.clearCache(/^users-dept-/);

// Clear all cache
connection.clearAllCache();
```

### Cache Statistics

```javascript
// Get cache statistics
const stats = connection.getCacheStats();
console.log({
  hits: stats.hits,           // Cache hit count
  misses: stats.misses,       // Cache miss count
  hitRate: stats.hitRate,     // Hit rate
  size: stats.size,           // Current cache size
  entries: stats.entries      // Number of entries
});
```

### Cache Invalidation

```javascript
// Invalidate cache on data update
async function updateUser(userId, data) {
  // Update user
  await connection.execute(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [data.name, data.email, userId]
  );
  
  // Invalidate related caches
  connection.clearCache('all-users');
  connection.clearCache(`user-${userId}`);
  connection.clearCache(/^users-dept-/);  // All department caches
}
```

## Framework Integration

### React

```jsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function UserList() {
  // Query with cache
  const { data, loading, error, refetch } = useQuery(
    'SELECT * FROM users',
    undefined,
    {
      cacheTime: 5 * 60 * 1000,    // Cache for 5 minutes
      staleTime: 60 * 1000,        // Revalidate after 1 minute
      refetchOnWindowFocus: false,  // Disable refetch on focus
      refetchInterval: false        // Disable periodic refetch
    }
  );
  
  // Manually refresh cache
  const handleRefresh = () => {
    refetch({ force: true });  // Ignore cache and refetch
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      {loading && <p>Loading...</p>}
      {data && (
        <ul>
          {data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <button @click="refresh">Refresh</button>
    <ul v-if="data">
      <li v-for="user in data" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error, refetch } = useQuery(
  'SELECT * FROM users',
  undefined,
  {
    cacheTime: 5 * 60 * 1000,
    staleTime: 60 * 1000
  }
);

// Force refresh
const refresh = () => {
  refetch({ force: true });
};
</script>
```

### Svelte

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ 
    autoConnect: true,
    config: {
      cache: {
        enabled: true,
        maxEntries: 100,
        ttl: 60000
      }
    }
  });
  
  // Cached query
  $: users = db.query('SELECT * FROM users', undefined, {
    cache: true,
    cacheTTL: 300000  // 5 minutes
  });
  
  // Clear cache and refetch
  function refresh() {
    db.clearCache('SELECT * FROM users');
    users.refetch();
  }
</script>

<button on:click={refresh}>Refresh</button>

{#if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name}</li>
    {/each}
  </ul>
{/if}
```

## Advanced Caching

### Multi-layer Cache

```javascript
class MultiLayerCache {
  constructor(connection) {
    this.connection = connection;
    this.memoryCache = new Map();
    this.storageCache = window.localStorage;
  }
  
  async get(key, queryFn) {
    // Level 1: Memory cache
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Level 2: LocalStorage
    const stored = this.storageCache.getItem(key);
    if (stored) {
      const data = JSON.parse(stored);
      if (Date.now() < data.expiry) {
        this.memoryCache.set(key, data.value);
        return data.value;
      }
    }
    
    // Level 3: DuckDB cache
    const result = await queryFn();
    
    // Save to cache
    this.set(key, result, 60000);  // 1 minute
    
    return result;
  }
  
  set(key, value, ttl) {
    // Save to memory
    this.memoryCache.set(key, value);
    
    // Save to LocalStorage
    this.storageCache.setItem(key, JSON.stringify({
      value,
      expiry: Date.now() + ttl
    }));
    
    // Remove after TTL
    setTimeout(() => {
      this.memoryCache.delete(key);
    }, ttl);
  }
}
```

## Performance Tips

### Cache Warming

```javascript
// Warm cache on application startup
async function warmCache(connection) {
  const queries = [
    'SELECT * FROM users WHERE active = true',
    'SELECT * FROM products WHERE in_stock = true',
    'SELECT * FROM categories',
    'SELECT * FROM settings'
  ];
  
  // Warm cache in parallel
  await Promise.all(queries.map(query => 
    connection.execute(query, undefined, {
      cache: true,
      cacheTTL: 3600000  // 1 hour
    })
  ));
  
  console.log('Cache warming complete');
}
```

## Best Practices

1. **Set appropriate TTL** - Different data types need different TTL
2. **Use consistent cache keys** - Ensure predictable cache behavior
3. **Invalidate on updates** - Keep cache consistent with data
4. **Monitor cache size** - Prevent memory issues
5. **Warm critical data** - Preload important queries

## Troubleshooting

### Cache Not Working

```javascript
// Debug mode to verify cache behavior
const connection = await createConnection({
  cache: {
    enabled: true,
    debug: true  // Enable debug logs
  },
  onCacheHit: (key) => console.log('Cache hit:', key),
  onCacheMiss: (key) => console.log('Cache miss:', key)
});
```

### Memory Leaks

```javascript
// Proper cleanup
window.addEventListener('beforeunload', () => {
  connection.clearAllCache();
  connection.close();
});
```
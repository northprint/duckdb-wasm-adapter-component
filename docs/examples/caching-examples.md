# Caching Examples

Practical examples of implementing caching strategies with DuckDB WASM Adapter.

## Basic Query Caching

### Simple Cache Implementation

```javascript
// React - Basic query caching
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function CachedDataView() {
  // Query with default caching
  const { data, loading, error, isCached } = useQuery(
    'SELECT * FROM large_table WHERE status = ?',
    ['active'],
    {
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
      staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
    }
  );

  return (
    <div>
      {isCached && <span className="badge">Cached</span>}
      {loading && !isCached && <div>Loading fresh data...</div>}
      {data && (
        <div>
          <h3>Results ({data.length} rows)</h3>
          {/* Display data */}
        </div>
      )}
    </div>
  );
}
```

### Cache Key Management

```javascript
// Vue - Cache with dynamic keys
<template>
  <div>
    <select v-model="selectedDepartment">
      <option value="Engineering">Engineering</option>
      <option value="Sales">Sales</option>
      <option value="Marketing">Marketing</option>
    </select>
    
    <div v-if="cachedData[selectedDepartment]">
      <span>Using cached data ({{ cacheAge }} seconds old)</span>
    </div>
    
    <DataTable :data="data" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const selectedDepartment = ref('Engineering');
const cachedData = ref({});
const cacheTimestamps = ref({});

const { data, refetch } = useQuery(
  computed(() => `SELECT * FROM employees WHERE department = '${selectedDepartment.value}'`),
  {
    queryKey: computed(() => ['employees', selectedDepartment.value]),
    cacheTime: 10 * 60 * 1000,
  }
);

// Track cache age
const cacheAge = computed(() => {
  const timestamp = cacheTimestamps.value[selectedDepartment.value];
  if (!timestamp) return 0;
  return Math.floor((Date.now() - timestamp) / 1000);
});

// Store in local cache
watch(data, (newData) => {
  if (newData) {
    cachedData.value[selectedDepartment.value] = newData;
    cacheTimestamps.value[selectedDepartment.value] = Date.now();
  }
});
</script>
```

## LRU Cache Implementation

### Least Recently Used Cache

```javascript
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    // Move to end (most recently used)
    this.updateAccessOrder(key);
    
    const entry = this.cache.get(key);
    
    // Check if expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key, data, ttl = null) {
    // Remove least recently used if at capacity
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      const lru = this.accessOrder[0];
      this.delete(lru);
    }
    
    const entry = {
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
      hits: 0
    };
    
    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
    
    // Increment hit count
    if (this.cache.has(key)) {
      this.cache.get(key).hits++;
    }
  }

  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: []
    };
    
    for (const [key, entry] of this.cache.entries()) {
      stats.entries.push({
        key,
        hits: entry.hits,
        age: Date.now() - entry.timestamp,
        expiresIn: entry.expiresAt ? entry.expiresAt - Date.now() : null
      });
    }
    
    return stats;
  }
}

// Usage with DuckDB
function createCachedConnection(connection) {
  const cache = new LRUCache(50);
  
  return {
    async execute(sql, params = [], options = {}) {
      const cacheKey = JSON.stringify({ sql, params });
      
      // Check cache first
      if (!options.skipCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
          console.log('Cache hit:', cacheKey);
          return cached;
        }
      }
      
      // Execute query
      console.log('Cache miss, executing query');
      const result = await connection.execute(sql, params);
      
      // Store in cache
      const ttl = options.cacheTTL || 5 * 60 * 1000; // 5 minutes default
      cache.set(cacheKey, result, ttl);
      
      return result;
    },
    
    clearCache() {
      cache.clear();
    },
    
    getCacheStats() {
      return cache.getStats();
    }
  };
}
```

## TTL-Based Caching

### Time-To-Live Cache

```javascript
// Svelte - TTL Cache Store
import { writable, derived } from 'svelte/store';

function createTTLCache() {
  const cache = writable(new Map());
  
  return {
    subscribe: cache.subscribe,
    
    async get(key, fetcher, ttl = 60000) {
      const now = Date.now();
      
      return new Promise((resolve) => {
        cache.update(map => {
          const entry = map.get(key);
          
          // Check if valid cache exists
          if (entry && entry.expiresAt > now) {
            console.log(`Cache hit for ${key}, expires in ${entry.expiresAt - now}ms`);
            resolve(entry.data);
            return map;
          }
          
          // Fetch new data
          console.log(`Cache miss for ${key}, fetching...`);
          fetcher().then(data => {
            map.set(key, {
              data,
              createdAt: now,
              expiresAt: now + ttl,
              ttl
            });
            
            // Auto-cleanup after TTL
            setTimeout(() => {
              cache.update(m => {
                m.delete(key);
                console.log(`Cache expired for ${key}`);
                return m;
              });
            }, ttl);
            
            resolve(data);
          });
          
          return map;
        });
      });
    },
    
    invalidate(key) {
      cache.update(map => {
        map.delete(key);
        return map;
      });
    },
    
    clear() {
      cache.set(new Map());
    }
  };
}

// Usage in Svelte component
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const cache = createTTLCache();
  
  let department = 'Engineering';
  let data = [];
  
  async function loadData() {
    data = await cache.get(
      `employees-${department}`,
      () => db.connection.execute(
        'SELECT * FROM employees WHERE department = ?',
        [department]
      ),
      30000 // 30 second TTL
    );
  }
  
  $: department, loadData();
</script>

<select bind:value={department}>
  <option>Engineering</option>
  <option>Sales</option>
  <option>Marketing</option>
</select>

{#each data as employee}
  <div>{employee.name}</div>
{/each}
```

## Intelligent Caching

### Adaptive Cache Strategy

```javascript
class AdaptiveCache {
  constructor() {
    this.cache = new Map();
    this.metrics = new Map();
    this.strategies = {
      LRU: new LRUStrategy(),
      LFU: new LFUStrategy(),
      TTL: new TTLStrategy(),
      FIFO: new FIFOStrategy()
    };
    this.currentStrategy = 'LRU';
  }

  async get(key, fetcher, options = {}) {
    const startTime = Date.now();
    
    // Track metrics
    this.updateMetrics(key, 'access');
    
    // Check cache
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached)) {
      this.updateMetrics(key, 'hit');
      return cached.data;
    }
    
    // Fetch data
    this.updateMetrics(key, 'miss');
    const data = await fetcher();
    
    // Store with appropriate strategy
    this.set(key, data, options);
    
    // Analyze and potentially switch strategy
    this.analyzePerformance();
    
    return data;
  }

  set(key, data, options) {
    const strategy = this.strategies[this.currentStrategy];
    const entry = strategy.createEntry(data, options);
    
    // Evict if necessary
    if (this.cache.size >= options.maxSize || 100) {
      const evictKey = strategy.selectEviction(this.cache);
      if (evictKey) {
        this.cache.delete(evictKey);
        this.updateMetrics(evictKey, 'evict');
      }
    }
    
    this.cache.set(key, entry);
  }

  updateMetrics(key, event) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        hits: 0,
        misses: 0,
        evictions: 0,
        accesses: 0,
        lastAccess: null
      });
    }
    
    const metric = this.metrics.get(key);
    
    switch(event) {
      case 'hit':
        metric.hits++;
        break;
      case 'miss':
        metric.misses++;
        break;
      case 'evict':
        metric.evictions++;
        break;
      case 'access':
        metric.accesses++;
        metric.lastAccess = Date.now();
        break;
    }
  }

  analyzePerformance() {
    const totalHits = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.hits, 0);
    const totalMisses = Array.from(this.metrics.values())
      .reduce((sum, m) => sum + m.misses, 0);
    
    const hitRate = totalHits / (totalHits + totalMisses);
    
    // Switch strategy based on hit rate
    if (hitRate < 0.3 && this.currentStrategy !== 'LFU') {
      console.log('Switching to LFU strategy due to low hit rate');
      this.currentStrategy = 'LFU';
    } else if (hitRate > 0.7 && this.currentStrategy !== 'LRU') {
      console.log('Switching to LRU strategy due to high hit rate');
      this.currentStrategy = 'LRU';
    }
  }

  getStats() {
    return {
      strategy: this.currentStrategy,
      cacheSize: this.cache.size,
      metrics: Array.from(this.metrics.entries()).map(([key, metric]) => ({
        key,
        ...metric,
        hitRate: metric.hits / (metric.hits + metric.misses)
      }))
    };
  }
}

// Strategy implementations
class LRUStrategy {
  createEntry(data, options) {
    return {
      data,
      timestamp: Date.now(),
      accessCount: 0
    };
  }
  
  selectEviction(cache) {
    let oldest = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldest = key;
        oldestTime = entry.timestamp;
      }
    }
    
    return oldest;
  }
}

class LFUStrategy {
  createEntry(data, options) {
    return {
      data,
      frequency: 1,
      lastAccess: Date.now()
    };
  }
  
  selectEviction(cache) {
    let leastFrequent = null;
    let minFrequency = Infinity;
    
    for (const [key, entry] of cache.entries()) {
      if (entry.frequency < minFrequency) {
        leastFrequent = key;
        minFrequency = entry.frequency;
      }
    }
    
    return leastFrequent;
  }
}
```

## Query Result Caching

### Selective Query Caching

```javascript
// React - Smart query caching based on query patterns
import { useState, useEffect, useRef } from 'react';
import { useConnection } from '@northprint/duckdb-wasm-adapter-react';

function SmartQueryCache() {
  const { connection } = useConnection();
  const cache = useRef(new Map());
  const [cacheStats, setCacheStats] = useState({});

  // Determine if query should be cached
  const shouldCache = (sql) => {
    const patterns = {
      aggregate: /SELECT.*?(COUNT|SUM|AVG|MIN|MAX)/i,
      join: /JOIN/i,
      groupBy: /GROUP BY/i,
      expensive: /WITH RECURSIVE|WINDOW|PARTITION/i
    };
    
    // Cache aggregate queries and complex operations
    return Object.values(patterns).some(pattern => pattern.test(sql));
  };

  // Get cache duration based on query type
  const getCacheDuration = (sql) => {
    if (/real.?time|live|current/i.test(sql)) {
      return 10 * 1000; // 10 seconds for real-time data
    }
    if (/historical|archive/i.test(sql)) {
      return 60 * 60 * 1000; // 1 hour for historical data
    }
    if (/GROUP BY.*?(month|year)/i.test(sql)) {
      return 24 * 60 * 60 * 1000; // 1 day for monthly/yearly aggregates
    }
    return 5 * 60 * 1000; // 5 minutes default
  };

  const executeQuery = async (sql, params = []) => {
    const cacheKey = JSON.stringify({ sql, params });
    
    // Check if should use cache
    if (shouldCache(sql)) {
      const cached = cache.current.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        // Update stats
        setCacheStats(prev => ({
          ...prev,
          hits: (prev.hits || 0) + 1
        }));
        
        return {
          data: cached.data,
          fromCache: true,
          cachedAt: cached.timestamp
        };
      }
    }
    
    // Execute query
    const startTime = Date.now();
    const data = await connection.execute(sql, params);
    const executionTime = Date.now() - startTime;
    
    // Cache if appropriate
    if (shouldCache(sql) && executionTime > 100) {
      const duration = getCacheDuration(sql);
      cache.current.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
        executionTime
      });
      
      // Update stats
      setCacheStats(prev => ({
        ...prev,
        misses: (prev.misses || 0) + 1,
        totalQueries: (prev.totalQueries || 0) + 1,
        avgExecutionTime: ((prev.avgExecutionTime || 0) * (prev.totalQueries || 0) + executionTime) / ((prev.totalQueries || 0) + 1)
      }));
    }
    
    return {
      data,
      fromCache: false,
      executionTime
    };
  };

  // Cleanup expired entries
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of cache.current.entries()) {
        if (entry.expiresAt < now) {
          cache.current.delete(key);
        }
      }
    }, 60000); // Clean every minute
    
    return () => clearInterval(interval);
  }, []);

  return {
    executeQuery,
    clearCache: () => cache.current.clear(),
    cacheSize: cache.current.size,
    cacheStats
  };
}
```

## Distributed Caching

### Multi-Tab Cache Sync

```javascript
// Sync cache across browser tabs using BroadcastChannel
class DistributedCache {
  constructor(channelName = 'duckdb-cache') {
    this.localCache = new Map();
    this.channel = new BroadcastChannel(channelName);
    this.listeners = new Set();
    
    // Listen for cache updates from other tabs
    this.channel.onmessage = (event) => {
      const { type, key, data, timestamp } = event.data;
      
      switch(type) {
        case 'set':
          this.localCache.set(key, { data, timestamp });
          this.notifyListeners(key, data);
          break;
        case 'delete':
          this.localCache.delete(key);
          this.notifyListeners(key, null);
          break;
        case 'clear':
          this.localCache.clear();
          this.notifyListeners(null, null);
          break;
      }
    };
  }

  set(key, data) {
    const entry = { data, timestamp: Date.now() };
    this.localCache.set(key, entry);
    
    // Broadcast to other tabs
    this.channel.postMessage({
      type: 'set',
      key,
      data,
      timestamp: entry.timestamp
    });
  }

  get(key) {
    const entry = this.localCache.get(key);
    return entry ? entry.data : null;
  }

  delete(key) {
    this.localCache.delete(key);
    this.channel.postMessage({ type: 'delete', key });
  }

  clear() {
    this.localCache.clear();
    this.channel.postMessage({ type: 'clear' });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(key, data) {
    this.listeners.forEach(listener => listener(key, data));
  }

  close() {
    this.channel.close();
  }
}

// React hook for distributed cache
function useDistributedCache() {
  const [cache] = useState(() => new DistributedCache());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = cache.subscribe(() => {
      setVersion(v => v + 1); // Force re-render on cache changes
    });
    
    return () => {
      unsubscribe();
      cache.close();
    };
  }, [cache]);

  return cache;
}
```

## Cache Warming

### Preload Cache Strategy

```javascript
// Preload frequently accessed queries
class CacheWarmer {
  constructor(connection, cache) {
    this.connection = connection;
    this.cache = cache;
    this.warmupQueries = [];
  }

  addWarmupQuery(sql, params = [], key = null) {
    this.warmupQueries.push({
      sql,
      params,
      key: key || JSON.stringify({ sql, params })
    });
  }

  async warmup() {
    console.log(`Starting cache warmup with ${this.warmupQueries.length} queries`);
    const startTime = Date.now();
    
    const promises = this.warmupQueries.map(async ({ sql, params, key }) => {
      try {
        const data = await this.connection.execute(sql, params);
        this.cache.set(key, data);
        return { success: true, key };
      } catch (error) {
        console.error(`Failed to warm cache for ${key}:`, error);
        return { success: false, key, error };
      }
    });
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.success).length;
    console.log(`Cache warmup completed in ${duration}ms. ${successful}/${results.length} queries cached.`);
    
    return results;
  }

  // Warm cache based on access patterns
  async warmupFromHistory(queryHistory) {
    // Analyze query history to find frequently accessed queries
    const frequency = new Map();
    
    queryHistory.forEach(({ sql, params, accessCount }) => {
      const key = JSON.stringify({ sql, params });
      frequency.set(key, (frequency.get(key) || 0) + accessCount);
    });
    
    // Sort by frequency and warm top queries
    const topQueries = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20 queries
    
    for (const [key, count] of topQueries) {
      const { sql, params } = JSON.parse(key);
      if (count > 10) { // Only cache frequently accessed queries
        this.addWarmupQuery(sql, params, key);
      }
    }
    
    return this.warmup();
  }
}

// Usage
async function initializeWithWarmCache(connection) {
  const cache = new LRUCache(100);
  const warmer = new CacheWarmer(connection, cache);
  
  // Add known expensive queries
  warmer.addWarmupQuery(`
    SELECT department, COUNT(*) as count, AVG(salary) as avg_salary
    FROM employees
    GROUP BY department
  `);
  
  warmer.addWarmupQuery(`
    SELECT 
      DATE_TRUNC('month', order_date) as month,
      SUM(total) as revenue
    FROM orders
    WHERE order_date >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY month
  `);
  
  // Warm cache on initialization
  await warmer.warmup();
  
  return cache;
}
```

## Cache Invalidation

### Smart Invalidation

```javascript
// Intelligent cache invalidation based on data changes
class SmartCacheInvalidator {
  constructor(cache) {
    this.cache = cache;
    this.dependencies = new Map(); // Query -> affected tables
    this.tableVersions = new Map(); // Table -> version
  }

  // Parse SQL to extract table dependencies
  extractTables(sql) {
    const tables = new Set();
    
    // Simple regex patterns (would need proper SQL parser for production)
    const patterns = [
      /FROM\s+([a-z_][a-z0-9_]*)/gi,
      /JOIN\s+([a-z_][a-z0-9_]*)/gi,
      /INTO\s+([a-z_][a-z0-9_]*)/gi,
      /UPDATE\s+([a-z_][a-z0-9_]*)/gi,
      /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        tables.add(match[1].toLowerCase());
      }
    });
    
    return Array.from(tables);
  }

  // Track query dependencies
  trackQuery(key, sql) {
    const tables = this.extractTables(sql);
    this.dependencies.set(key, tables);
  }

  // Invalidate cache entries when table is modified
  invalidateTable(tableName) {
    const invalidated = [];
    
    // Update table version
    this.tableVersions.set(
      tableName,
      (this.tableVersions.get(tableName) || 0) + 1
    );
    
    // Find and invalidate affected queries
    for (const [key, tables] of this.dependencies.entries()) {
      if (tables.includes(tableName)) {
        this.cache.delete(key);
        invalidated.push(key);
      }
    }
    
    console.log(`Invalidated ${invalidated.length} cache entries for table ${tableName}`);
    return invalidated;
  }

  // Invalidate based on operation type
  handleOperation(sql) {
    const operation = sql.trim().split(/\s+/)[0].toUpperCase();
    
    switch(operation) {
      case 'INSERT':
      case 'UPDATE':
      case 'DELETE':
        const tables = this.extractTables(sql);
        tables.forEach(table => this.invalidateTable(table));
        break;
      case 'TRUNCATE':
      case 'DROP':
        // Clear entire cache for destructive operations
        this.cache.clear();
        this.dependencies.clear();
        break;
    }
  }

  getStats() {
    return {
      trackedQueries: this.dependencies.size,
      tableVersions: Object.fromEntries(this.tableVersions),
      dependencies: Object.fromEntries(
        Array.from(this.dependencies.entries()).map(([key, tables]) => [
          key.substring(0, 50) + '...', // Truncate long keys
          tables
        ])
      )
    };
  }
}

// Usage with connection wrapper
function createInvalidatingConnection(connection, cache) {
  const invalidator = new SmartCacheInvalidator(cache);
  
  return {
    async execute(sql, params = []) {
      const key = JSON.stringify({ sql, params });
      
      // Check if this is a read or write operation
      const isWrite = /^\s*(INSERT|UPDATE|DELETE|TRUNCATE|DROP)/i.test(sql);
      
      if (isWrite) {
        // Invalidate affected cache entries
        invalidator.handleOperation(sql);
        
        // Execute the write operation
        return connection.execute(sql, params);
      } else {
        // Track query dependencies
        invalidator.trackQuery(key, sql);
        
        // Check cache for read operations
        const cached = cache.get(key);
        if (cached) {
          return cached;
        }
        
        // Execute and cache
        const result = await connection.execute(sql, params);
        cache.set(key, result);
        
        return result;
      }
    },
    
    getInvalidatorStats: () => invalidator.getStats()
  };
}
```

## Performance Monitoring

### Cache Performance Dashboard

```javascript
// React component for cache monitoring
function CacheMonitor({ cache }) {
  const [stats, setStats] = useState({
    hitRate: 0,
    missRate: 0,
    evictionRate: 0,
    avgResponseTime: 0,
    cacheSize: 0,
    memoryUsage: 0
  });
  
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStats = cache.getStats();
      
      setStats({
        hitRate: (currentStats.hits / (currentStats.hits + currentStats.misses)) * 100,
        missRate: (currentStats.misses / (currentStats.hits + currentStats.misses)) * 100,
        evictionRate: (currentStats.evictions / currentStats.totalOperations) * 100,
        avgResponseTime: currentStats.avgResponseTime,
        cacheSize: currentStats.size,
        memoryUsage: currentStats.memoryUsage
      });
      
      setHistory(prev => [...prev.slice(-59), {
        timestamp: Date.now(),
        ...currentStats
      }]);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [cache]);

  return (
    <div className="cache-monitor">
      <h3>Cache Performance</h3>
      
      <div className="stats-grid">
        <div className="stat">
          <label>Hit Rate</label>
          <div className="value">{stats.hitRate.toFixed(1)}%</div>
        </div>
        
        <div className="stat">
          <label>Cache Size</label>
          <div className="value">{stats.cacheSize} entries</div>
        </div>
        
        <div className="stat">
          <label>Avg Response</label>
          <div className="value">{stats.avgResponseTime.toFixed(0)}ms</div>
        </div>
        
        <div className="stat">
          <label>Memory Usage</label>
          <div className="value">{(stats.memoryUsage / 1024).toFixed(1)}KB</div>
        </div>
      </div>
      
      <div className="chart">
        {/* Render hit rate chart over time */}
        <LineChart data={history} dataKey="hitRate" />
      </div>
      
      <div className="actions">
        <button onClick={() => cache.clear()}>Clear Cache</button>
        <button onClick={() => cache.optimize()}>Optimize</button>
        <button onClick={() => exportStats(stats, history)}>Export Stats</button>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Choose appropriate cache strategy** based on access patterns
2. **Set reasonable TTL values** based on data volatility
3. **Monitor cache performance** and adjust strategies
4. **Implement cache warming** for predictable queries
5. **Use cache invalidation** for data consistency
6. **Consider memory limits** when setting cache size
7. **Track cache metrics** for optimization

## Next Steps

- [Spatial Examples](/examples/spatial-examples) - Spatial data and GIS queries
- [Full Apps](/examples/full-apps) - Complete application examples
- [Performance Guide](/guide/performance) - Performance optimization
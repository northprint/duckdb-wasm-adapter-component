# Performance Optimization

Optimize DuckDB WASM Adapter for maximum performance in browser environments.

## WASM Performance Fundamentals

::: warning Browser Environment Limitations
DuckDB WASM runs in the browser, which has different performance characteristics than native databases:
- **Memory is limited** to browser heap size (1-4GB)
- **Single-threaded by default** (use Web Workers for parallelism)
- **No disk-based operations** (everything is in-memory)
- **JavaScript bridge overhead** for data transfer
:::

## Memory Optimization

### Monitor Memory Usage

```javascript
// Create memory-aware connection
class MemoryAwareConnection {
  constructor(connection, maxMemoryMB = 512) {
    this.connection = connection;
    this.maxMemory = maxMemoryMB * 1024 * 1024;
    this.queries = new Map();
  }
  
  async execute(sql, params) {
    // Check memory before executing
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > this.maxMemory * 0.8) {
      console.warn('High memory usage detected, clearing caches');
      await this.clearCaches();
    }
    
    // Track query memory footprint
    const startMemory = this.getMemoryUsage();
    const result = await this.connection.execute(sql, params);
    const memoryDelta = this.getMemoryUsage() - startMemory;
    
    this.queries.set(sql, {
      memoryUsage: memoryDelta,
      rowCount: result.length,
      timestamp: Date.now()
    });
    
    return result;
  }
  
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    // Fallback estimation
    return this.estimateMemory();
  }
  
  estimateMemory() {
    let totalSize = 0;
    for (const [query, stats] of this.queries.entries()) {
      totalSize += stats.memoryUsage || 0;
    }
    return totalSize;
  }
  
  async clearCaches() {
    // Clear query results cache
    this.queries.clear();
    
    // Drop temporary tables
    await this.connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE 'temp_%'
    `).then(tables => {
      return Promise.all(
        tables.map(t => 
          this.connection.execute(`DROP TABLE IF EXISTS ${t.table_name}`)
        )
      );
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}
```

### Optimize Data Types

```javascript
// ❌ BAD: Wasteful data types
CREATE TABLE inefficient (
  id BIGINT,              -- Use INTEGER if values fit
  name VARCHAR(1000000),  -- Excessive length
  amount DOUBLE PRECISION -- Use DECIMAL for money
);

// ✅ GOOD: Appropriate data types
CREATE TABLE efficient (
  id INTEGER,           -- 4 bytes vs 8 bytes
  name VARCHAR(255),    -- Reasonable length
  amount DECIMAL(10,2), -- Exact decimal for currency
  active BOOLEAN,       -- 1 byte vs VARCHAR
  created_date DATE     -- 4 bytes vs TIMESTAMP (8 bytes)
);

// Use appropriate numeric types
const optimizeNumericColumns = async () => {
  // Analyze column ranges
  const analysis = await connection.execute(`
    SELECT 
      MIN(value) as min_val,
      MAX(value) as max_val,
      COUNT(DISTINCT value) as distinct_count
    FROM large_table
  `);
  
  const { min_val, max_val, distinct_count } = analysis[0];
  
  // Choose optimal type
  let dataType;
  if (min_val >= -128 && max_val <= 127) {
    dataType = 'TINYINT';
  } else if (min_val >= -32768 && max_val <= 32767) {
    dataType = 'SMALLINT';
  } else if (min_val >= -2147483648 && max_val <= 2147483647) {
    dataType = 'INTEGER';
  } else {
    dataType = 'BIGINT';
  }
  
  // Recreate with optimal type
  await connection.execute(`
    CREATE TABLE optimized AS
    SELECT * FROM large_table
  `);
};
```

## Query Optimization

### Use Indexes Strategically

```javascript
// Create indexes for frequently queried columns
async function createOptimalIndexes() {
  // Analyze query patterns
  const queryLog = await connection.execute(`
    SELECT 
      column_name,
      COUNT(*) as query_count
    FROM query_log
    WHERE operation = 'WHERE'
    GROUP BY column_name
    ORDER BY query_count DESC
    LIMIT 10
  `);
  
  // Create indexes for high-frequency columns
  for (const { column_name, query_count } of queryLog) {
    if (query_count > 100) {
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_${column_name} 
        ON main_table(${column_name})
      `);
    }
  }
  
  // Composite indexes for common combinations
  await connection.execute(`
    CREATE INDEX idx_composite ON orders(customer_id, order_date)
  `);
}

// Monitor index usage
const indexStats = await connection.execute(`
  SELECT 
    index_name,
    table_name,
    index_scans,
    index_size
  FROM duckdb_indexes()
  ORDER BY index_scans DESC
`);
```

### Optimize JOIN Operations

```javascript
// ❌ BAD: Cartesian product
SELECT * FROM large_table1, large_table2;

// ❌ BAD: Function in JOIN condition
SELECT * FROM t1 
JOIN t2 ON UPPER(t1.name) = UPPER(t2.name);

// ✅ GOOD: Indexed JOIN with simple condition
SELECT * FROM t1 
JOIN t2 ON t1.id = t2.foreign_id
WHERE t1.active = true;

// Optimize JOIN order (smaller tables first)
const optimizedJoin = `
  WITH small_filtered AS (
    SELECT * FROM small_table WHERE condition
  )
  SELECT * FROM small_filtered
  JOIN large_table ON small_filtered.id = large_table.foreign_id
`;

// Use EXISTS instead of IN for subqueries
// ❌ Slower
SELECT * FROM orders 
WHERE customer_id IN (
  SELECT id FROM customers WHERE country = 'USA'
);

// ✅ Faster
SELECT * FROM orders o
WHERE EXISTS (
  SELECT 1 FROM customers c 
  WHERE c.id = o.customer_id AND c.country = 'USA'
);
```

### Batch Operations

```javascript
// ❌ BAD: Individual inserts
for (const row of data) {
  await connection.execute(
    'INSERT INTO table VALUES (?, ?, ?)',
    [row.a, row.b, row.c]
  );
}

// ✅ GOOD: Batch insert
const batchInsert = async (data, batchSize = 1000) => {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const values = batch.map(() => '(?, ?, ?)').join(', ');
    const params = batch.flatMap(row => [row.a, row.b, row.c]);
    
    await connection.execute(
      `INSERT INTO table VALUES ${values}`,
      params
    );
  }
};

// ✅ BETTER: Use COPY for large datasets
const bulkLoad = async (csvData) => {
  await connection.registerFileText('data.csv', csvData);
  await connection.execute(`
    COPY table FROM 'data.csv' (FORMAT CSV, HEADER TRUE)
  `);
};
```

## Web Worker Optimization

### Offload Heavy Queries

```javascript
// worker-pool.js
class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workers = [];
    this.queue = [];
    this.poolSize = poolSize;
    
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      worker.busy = false;
      worker.id = i;
      this.workers.push(worker);
    }
  }
  
  async execute(sql, params) {
    return new Promise((resolve, reject) => {
      const task = { sql, params, resolve, reject };
      this.queue.push(task);
      this.processQueue();
    });
  }
  
  processQueue() {
    if (this.queue.length === 0) return;
    
    const worker = this.workers.find(w => !w.busy);
    if (!worker) return;
    
    const task = this.queue.shift();
    worker.busy = true;
    
    const handleMessage = (e) => {
      if (e.data.error) {
        task.reject(new Error(e.data.error));
      } else {
        task.resolve(e.data.result);
      }
      
      worker.busy = false;
      worker.removeEventListener('message', handleMessage);
      this.processQueue();
    };
    
    worker.addEventListener('message', handleMessage);
    worker.postMessage({ sql: task.sql, params: task.params });
  }
  
  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}

// Usage
const pool = new WorkerPool('duckdb-worker.js', navigator.hardwareConcurrency || 4);

// Execute queries in parallel
const results = await Promise.all([
  pool.execute('SELECT COUNT(*) FROM table1'),
  pool.execute('SELECT SUM(amount) FROM table2'),
  pool.execute('SELECT AVG(value) FROM table3')
]);
```

## Caching Strategy

### Multi-Level Cache

```javascript
class MultiLevelCache {
  constructor() {
    // L1: Memory cache (fastest, smallest)
    this.memoryCache = new Map();
    this.memoryCacheSize = 50 * 1024 * 1024; // 50MB
    
    // L2: IndexedDB cache (slower, larger)
    this.initIndexedDB();
    
    // L3: Query result materialization
    this.materializedViews = new Map();
  }
  
  async get(key) {
    // Check L1 (memory)
    if (this.memoryCache.has(key)) {
      this.updateLRU(key);
      return this.memoryCache.get(key);
    }
    
    // Check L2 (IndexedDB)
    const fromDB = await this.getFromIndexedDB(key);
    if (fromDB) {
      // Promote to L1
      this.setMemoryCache(key, fromDB);
      return fromDB;
    }
    
    // Check L3 (materialized view)
    if (this.materializedViews.has(key)) {
      const viewName = this.materializedViews.get(key);
      const result = await connection.execute(`SELECT * FROM ${viewName}`);
      this.setMemoryCache(key, result);
      return result;
    }
    
    return null;
  }
  
  async set(key, value, options = {}) {
    const size = this.estimateSize(value);
    
    if (size < this.memoryCacheSize * 0.1) {
      // Small result - keep in memory
      this.setMemoryCache(key, value);
    } else if (size < 10 * 1024 * 1024) {
      // Medium result - store in IndexedDB
      await this.setIndexedDB(key, value);
    } else {
      // Large result - create materialized view
      await this.createMaterializedView(key, value);
    }
  }
  
  async createMaterializedView(key, data) {
    const viewName = `cache_${key.replace(/[^a-z0-9]/gi, '_')}`;
    
    // Create table from data
    const columns = Object.keys(data[0]);
    const columnDefs = columns.map(col => `${col} VARCHAR`).join(', ');
    
    await connection.execute(`
      CREATE TABLE ${viewName} (${columnDefs})
    `);
    
    // Insert data
    const values = data.map(row => 
      `(${columns.map(col => `'${row[col]}'`).join(', ')})`
    ).join(', ');
    
    await connection.execute(`
      INSERT INTO ${viewName} VALUES ${values}
    `);
    
    this.materializedViews.set(key, viewName);
  }
}
```

## Lazy Loading and Virtualization

### Virtual Scrolling for Large Datasets

```javascript
// React component with virtual scrolling
import { FixedSizeList } from 'react-window';

function VirtualTable({ query }) {
  const [totalRows, setTotalRows] = useState(0);
  const [cache, setCache] = useState(new Map());
  const rowHeight = 35;
  const pageSize = 100;
  
  useEffect(() => {
    // Get total count
    connection.execute(`SELECT COUNT(*) as count FROM (${query})`).then(result => {
      setTotalRows(result[0].count);
    });
  }, [query]);
  
  const loadPage = async (startIndex) => {
    const pageIndex = Math.floor(startIndex / pageSize);
    
    if (!cache.has(pageIndex)) {
      const offset = pageIndex * pageSize;
      const result = await connection.execute(`
        ${query} 
        LIMIT ${pageSize} 
        OFFSET ${offset}
      `);
      
      cache.set(pageIndex, result);
      setCache(new Map(cache));
    }
    
    return cache.get(pageIndex);
  };
  
  const Row = ({ index, style }) => {
    const [data, setData] = useState(null);
    
    useEffect(() => {
      loadPage(index).then(pageData => {
        const rowIndex = index % pageSize;
        setData(pageData[rowIndex]);
      });
    }, [index]);
    
    if (!data) {
      return <div style={style}>Loading...</div>;
    }
    
    return (
      <div style={style}>
        {Object.values(data).join(' | ')}
      </div>
    );
  };
  
  return (
    <FixedSizeList
      height={600}
      itemCount={totalRows}
      itemSize={rowHeight}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

## Query Result Streaming

```javascript
// Stream large query results
class QueryStreamer {
  constructor(connection, chunkSize = 1000) {
    this.connection = connection;
    this.chunkSize = chunkSize;
  }
  
  async *stream(query) {
    // Get total count
    const countResult = await this.connection.execute(`
      SELECT COUNT(*) as total FROM (${query})
    `);
    const total = countResult[0].total;
    
    // Stream in chunks
    for (let offset = 0; offset < total; offset += this.chunkSize) {
      const chunk = await this.connection.execute(`
        ${query} 
        LIMIT ${this.chunkSize} 
        OFFSET ${offset}
      `);
      
      yield {
        data: chunk,
        progress: Math.min(100, (offset + chunk.length) / total * 100),
        isLast: offset + chunk.length >= total
      };
      
      // Allow browser to breathe
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  async process(query, processor) {
    let processedCount = 0;
    
    for await (const { data, progress, isLast } of this.stream(query)) {
      await processor(data);
      processedCount += data.length;
      
      console.log(`Processed ${processedCount} rows (${progress.toFixed(1)}%)`);
      
      if (isLast) {
        console.log('Processing complete');
      }
    }
    
    return processedCount;
  }
}

// Usage
const streamer = new QueryStreamer(connection);

await streamer.process(
  'SELECT * FROM large_table',
  async (chunk) => {
    // Process chunk
    for (const row of chunk) {
      await processRow(row);
    }
  }
);
```

## Monitoring and Profiling

### Performance Monitoring Dashboard

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      queries: [],
      memory: [],
      timing: []
    };
    
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Monitor memory every second
    setInterval(() => {
      if (performance.memory) {
        this.metrics.memory.push({
          timestamp: Date.now(),
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        });
        
        // Keep only last 60 seconds
        const cutoff = Date.now() - 60000;
        this.metrics.memory = this.metrics.memory.filter(
          m => m.timestamp > cutoff
        );
      }
    }, 1000);
  }
  
  async measureQuery(sql, params) {
    const startTime = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize || 0;
    
    try {
      const result = await connection.execute(sql, params);
      
      const endTime = performance.now();
      const endMemory = performance.memory?.usedJSHeapSize || 0;
      
      const metric = {
        sql: sql.substring(0, 100),
        duration: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        rowCount: result.length,
        timestamp: Date.now()
      };
      
      this.metrics.queries.push(metric);
      
      // Alert on slow queries
      if (metric.duration > 1000) {
        console.warn('Slow query detected:', metric);
      }
      
      return result;
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }
  
  getReport() {
    const avgQueryTime = this.metrics.queries.reduce(
      (sum, q) => sum + q.duration, 0
    ) / this.metrics.queries.length;
    
    const slowQueries = this.metrics.queries
      .filter(q => q.duration > avgQueryTime * 2)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    const currentMemory = this.metrics.memory[this.metrics.memory.length - 1];
    
    return {
      summary: {
        totalQueries: this.metrics.queries.length,
        avgQueryTime: avgQueryTime.toFixed(2),
        memoryUsage: currentMemory ? 
          (currentMemory.used / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'
      },
      slowQueries,
      memoryTrend: this.metrics.memory.slice(-10)
    };
  }
}
```

## Best Practices

1. **Monitor memory constantly** - WASM has strict memory limits
2. **Use Web Workers** for heavy computations
3. **Stream large results** instead of loading all at once
4. **Cache aggressively** but manage cache size
5. **Choose appropriate data types** to minimize memory usage
6. **Create indexes** for frequently queried columns
7. **Batch operations** to reduce overhead
8. **Profile queries** to identify bottlenecks
9. **Use virtual scrolling** for large result sets
10. **Clean up resources** when no longer needed

## WASM-Specific Optimizations

1. **Minimize data transfers** between WASM and JavaScript
2. **Use typed arrays** for numeric data
3. **Avoid string operations** in SQL when possible
4. **Prefer numeric comparisons** over string comparisons
5. **Keep result sets small** with LIMIT and pagination
6. **Use appropriate precision** for floating-point numbers
7. **Leverage browser caching** for static data
8. **Implement progressive loading** for better UX
9. **Consider using SharedArrayBuffer** when available
10. **Test on target devices** to ensure performance

## Next Steps

- [WASM Considerations](/guide/wasm-considerations) - Detailed WASM limitations
- [Caching Guide](/guide/caching) - Advanced caching strategies
- [Error Handling](/guide/error-handling) - Handle performance issues
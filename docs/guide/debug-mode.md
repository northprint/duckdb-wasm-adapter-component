# Debug Mode

DuckDB WASM Adapter provides comprehensive debugging capabilities to help you diagnose issues and optimize performance.

## Enabling Debug Mode

### Connection-level Debug

```javascript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

const connection = await createConnection({
  debug: {
    enabled: true,
    logQueries: true,
    logTiming: true,
    logCache: true
  },
  logLevel: 'debug'
});
```

### Query-level Debug

```javascript
const result = await connection.execute(
  'SELECT * FROM users',
  undefined,
  {
    debug: true,
    logTiming: true
  }
);
```

## Debug Options

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable debug mode | `false` |
| `logQueries` | Log all SQL queries | `false` |
| `logTiming` | Log query execution time | `false` |
| `logCache` | Log cache hits/misses | `false` |
| `logParams` | Log query parameters | `false` |
| `logResults` | Log query results | `false` |

## Query Logging

### Basic Query Logging

```javascript
const connection = await createConnection({
  debug: {
    enabled: true,
    logQueries: true
  },
  onQuery: (sql, params, duration) => {
    console.log(`Query: ${sql}`);
    console.log(`Params: ${JSON.stringify(params)}`);
    console.log(`Duration: ${duration}ms`);
  }
});
```

### Detailed Query Analysis

```javascript
class QueryAnalyzer {
  constructor() {
    this.queries = [];
  }
  
  analyze(sql, params, duration) {
    const query = {
      sql,
      params,
      duration,
      timestamp: new Date(),
      type: this.getQueryType(sql)
    };
    
    this.queries.push(query);
    
    // Warn about slow queries
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, sql);
    }
    
    // Warn about missing indexes
    if (sql.includes('WHERE') && !sql.includes('INDEX')) {
      console.warn('Query may benefit from an index:', sql);
    }
  }
  
  getQueryType(sql) {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }
  
  getStatistics() {
    const stats = {
      total: this.queries.length,
      byType: {},
      avgDuration: 0,
      slowQueries: []
    };
    
    let totalDuration = 0;
    
    this.queries.forEach(q => {
      stats.byType[q.type] = (stats.byType[q.type] || 0) + 1;
      totalDuration += q.duration;
      
      if (q.duration > 1000) {
        stats.slowQueries.push(q);
      }
    });
    
    stats.avgDuration = totalDuration / this.queries.length;
    
    return stats;
  }
}

const analyzer = new QueryAnalyzer();

const connection = await createConnection({
  onQuery: (sql, params, duration) => analyzer.analyze(sql, params, duration)
});
```

## Performance Profiling

### Query Timing

```javascript
const connection = await createConnection({
  debug: {
    enabled: true,
    logTiming: true
  }
});

// Measure query performance
console.time('query');
const result = await connection.execute('SELECT * FROM large_table');
console.timeEnd('query');

// Get detailed timing
const timing = result.getTiming();
console.log({
  parse: timing.parse,        // SQL parsing time
  plan: timing.plan,          // Query planning time
  execute: timing.execute,    // Execution time
  fetch: timing.fetch,        // Result fetching time
  total: timing.total         // Total time
});
```

### Memory Profiling

```javascript
class MemoryProfiler {
  constructor(connection) {
    this.connection = connection;
    this.baseline = this.getMemoryUsage();
  }
  
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  profile(label) {
    const current = this.getMemoryUsage();
    if (!current) return;
    
    const delta = {
      used: current.usedJSHeapSize - this.baseline.usedJSHeapSize,
      total: current.totalJSHeapSize - this.baseline.totalJSHeapSize
    };
    
    console.log(`Memory (${label}):`, {
      used: `${(delta.used / 1024 / 1024).toFixed(2)} MB`,
      total: `${(delta.total / 1024 / 1024).toFixed(2)} MB`
    });
  }
}

const profiler = new MemoryProfiler(connection);

// Profile memory usage
profiler.profile('before query');
const result = await connection.execute('SELECT * FROM large_table');
profiler.profile('after query');
```

## Error Debugging

### Detailed Error Information

```javascript
const connection = await createConnection({
  debug: {
    enabled: true
  },
  onError: (error, context) => {
    console.error('Error occurred:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      query: context.query,
      params: context.params,
      timestamp: new Date()
    });
  }
});

try {
  await connection.execute('INVALID SQL');
} catch (error) {
  console.error('Caught error:', {
    type: error.constructor.name,
    message: error.message,
    sql: error.sql,
    position: error.position
  });
}
```

## Framework-specific Debugging

### React DevTools Integration

```jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider
      debug={{
        enabled: process.env.NODE_ENV === 'development',
        logQueries: true
      }}
      onQuery={(sql, duration) => {
        // Log to React DevTools
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          window.__REACT_DEVTOOLS_GLOBAL_HOOK__.emit(
            'duckdb-query',
            { sql, duration }
          );
        }
      }}
    >
      <YourApp />
    </DuckDBProvider>
  );
}
```

### Vue DevTools Integration

```javascript
// main.js
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';

app.use(DuckDBPlugin, {
  debug: {
    enabled: process.env.NODE_ENV === 'development'
  },
  onQuery: (sql, duration) => {
    // Log to Vue DevTools
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('duckdb:query', {
        sql,
        duration,
        timestamp: Date.now()
      });
    }
  }
});
```

## Query Plan Analysis

```javascript
// Analyze query execution plan
async function analyzeQueryPlan(connection, sql) {
  const plan = await connection.execute(`EXPLAIN ${sql}`);
  const planText = plan.toArray().map(row => row.explain).join('\n');
  
  console.log('Query Plan:');
  console.log(planText);
  
  // Check for potential issues
  if (planText.includes('FULL SCAN')) {
    console.warn('⚠️ Full table scan detected - consider adding an index');
  }
  
  if (planText.includes('NESTED LOOP')) {
    console.warn('⚠️ Nested loop join - may be slow for large datasets');
  }
  
  return planText;
}

// Usage
await analyzeQueryPlan(connection, 'SELECT * FROM users WHERE email = ?');
```

## Debug Output Formatting

```javascript
class DebugFormatter {
  static formatQuery(sql, params) {
    let formatted = sql;
    
    // Replace parameters with actual values
    if (params && params.length > 0) {
      params.forEach((param, index) => {
        const value = typeof param === 'string' ? `'${param}'` : param;
        formatted = formatted.replace('?', value);
      });
    }
    
    // Add syntax highlighting (for console)
    formatted = formatted
      .replace(/\b(SELECT|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|LIMIT)\b/gi, 
        '\x1b[36m$1\x1b[0m')  // Cyan for keywords
      .replace(/\b(AND|OR|NOT|IN|LIKE|BETWEEN)\b/gi,
        '\x1b[35m$1\x1b[0m');  // Magenta for operators
    
    return formatted;
  }
  
  static formatTiming(timing) {
    const total = timing.total || 0;
    const parts = [];
    
    if (timing.parse) parts.push(`Parse: ${timing.parse}ms`);
    if (timing.plan) parts.push(`Plan: ${timing.plan}ms`);
    if (timing.execute) parts.push(`Execute: ${timing.execute}ms`);
    if (timing.fetch) parts.push(`Fetch: ${timing.fetch}ms`);
    
    return `Total: ${total}ms (${parts.join(', ')})`;
  }
  
  static formatResults(results, limit = 10) {
    const data = results.toArray();
    const count = data.length;
    const preview = data.slice(0, limit);
    
    console.table(preview);
    
    if (count > limit) {
      console.log(`... and ${count - limit} more rows`);
    }
    
    return {
      count,
      preview,
      columns: results.getMetadata()
    };
  }
}
```

## Production Considerations

### Conditional Debug Mode

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

const connection = await createConnection({
  debug: {
    enabled: isDevelopment,
    logQueries: isDevelopment && process.env.LOG_QUERIES === 'true',
    logTiming: isDevelopment && process.env.LOG_TIMING === 'true'
  }
});
```

### Debug Data Collection

```javascript
class DebugCollector {
  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
    this.data = {
      queries: [],
      errors: [],
      performance: []
    };
  }
  
  addQuery(query) {
    this.data.queries.push(query);
    if (this.data.queries.length > this.maxEntries) {
      this.data.queries.shift();
    }
  }
  
  addError(error) {
    this.data.errors.push(error);
    if (this.data.errors.length > this.maxEntries) {
      this.data.errors.shift();
    }
  }
  
  export() {
    return {
      ...this.data,
      timestamp: new Date(),
      stats: this.getStatistics()
    };
  }
  
  getStatistics() {
    return {
      totalQueries: this.data.queries.length,
      totalErrors: this.data.errors.length,
      avgQueryTime: this.data.queries.reduce((sum, q) => sum + q.duration, 0) / this.data.queries.length
    };
  }
}
```

## Best Practices

1. **Disable in production** - Debug mode impacts performance
2. **Use conditional debugging** - Enable only when needed
3. **Log selectively** - Don't log sensitive data
4. **Monitor performance** - Track slow queries
5. **Clean up logs** - Remove debug code before deployment
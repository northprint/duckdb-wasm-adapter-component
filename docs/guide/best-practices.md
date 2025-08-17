# Best Practices

Follow these best practices to build robust, performant applications with DuckDB WASM Adapter.

## Connection Management

### Single Connection Pattern

Create a single connection and reuse it throughout your application:

```javascript
// ❌ Bad - Multiple connections
function Component1() {
  const connection = createConnection();
  // ...
}

function Component2() {
  const connection = createConnection();  // Duplicate connection
  // ...
}

// ✅ Good - Shared connection
const connection = await createConnection();

function Component1() {
  // Use shared connection
}

function Component2() {
  // Use same shared connection
}
```

### Connection Lifecycle

```javascript
// ✅ Good - Proper lifecycle management
class DatabaseManager {
  constructor() {
    this.connection = null;
  }
  
  async initialize() {
    if (!this.connection) {
      this.connection = await createConnection({
        worker: true,
        logLevel: 'warning'
      });
    }
    return this.connection;
  }
  
  async cleanup() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}

// Initialize on app start
const dbManager = new DatabaseManager();
await dbManager.initialize();

// Cleanup on app close
window.addEventListener('beforeunload', () => {
  dbManager.cleanup();
});
```

## Query Optimization

### Use Parameterized Queries

Always use parameterized queries to prevent SQL injection:

```javascript
// ❌ Bad - SQL injection vulnerability
const name = "'; DROP TABLE users; --";
await connection.execute(`SELECT * FROM users WHERE name = '${name}'`);

// ✅ Good - Safe parameterized query
await connection.execute(
  'SELECT * FROM users WHERE name = ?',
  [name]
);
```

### Select Only Required Columns

```javascript
// ❌ Bad - Selecting all columns
await connection.execute('SELECT * FROM users');

// ✅ Good - Select only needed columns
await connection.execute('SELECT id, name, email FROM users');
```

### Use Indexes Appropriately

```javascript
// Create indexes for frequently queried columns
await connection.execute('CREATE INDEX idx_users_email ON users(email)');
await connection.execute('CREATE INDEX idx_users_created_at ON users(created_at)');

// Composite index for multi-column queries
await connection.execute('CREATE INDEX idx_users_status_created ON users(status, created_at)');
```

### Limit Result Sets

```javascript
// ❌ Bad - Fetching all records
const allUsers = await connection.execute('SELECT * FROM users');

// ✅ Good - Use LIMIT and pagination
const pageSize = 20;
const offset = (page - 1) * pageSize;
const users = await connection.execute(
  'SELECT * FROM users LIMIT ? OFFSET ?',
  [pageSize, offset]
);
```

## Data Import/Export

### Batch Operations

```javascript
// ❌ Bad - Individual inserts
for (const user of users) {
  await connection.execute(
    'INSERT INTO users VALUES (?, ?, ?)',
    [user.id, user.name, user.email]
  );
}

// ✅ Good - Batch insert with transaction
await connection.execute('BEGIN TRANSACTION');
try {
  const stmt = await connection.prepare(
    'INSERT INTO users VALUES (?, ?, ?)'
  );
  
  for (const user of users) {
    await stmt.run([user.id, user.name, user.email]);
  }
  
  await connection.execute('COMMIT');
} catch (error) {
  await connection.execute('ROLLBACK');
  throw error;
}
```

### File Size Handling

```javascript
// ✅ Good - Handle large files appropriately
async function importLargeFile(file, tableName) {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (file.size > MAX_SIZE) {
    // Use file registration for large files
    await connection.registerFile(file);
    await connection.execute(
      `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${file.name}')`
    );
  } else {
    // Direct import for small files
    await connection.importCSV(file, tableName);
  }
}
```

## Memory Management

### Clean Up Resources

```javascript
// ✅ Good - Clean up after operations
class QueryManager {
  constructor(connection) {
    this.connection = connection;
    this.activeQueries = new Set();
  }
  
  async execute(sql, params) {
    const queryId = Symbol();
    this.activeQueries.add(queryId);
    
    try {
      const result = await this.connection.execute(sql, params);
      return result;
    } finally {
      this.activeQueries.delete(queryId);
      
      // Clear cache if too many queries
      if (this.activeQueries.size === 0) {
        this.connection.clearCache();
      }
    }
  }
  
  cleanup() {
    this.activeQueries.clear();
    this.connection.clearAllCache();
  }
}
```

### Monitor Memory Usage

```javascript
// ✅ Good - Monitor and react to memory pressure
function monitorMemory() {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const usage = (used / limit) * 100;
    
    if (usage > 80) {
      console.warn('High memory usage:', usage.toFixed(2) + '%');
      // Clear caches or reduce data
      connection.clearAllCache();
    }
  }
}

// Check periodically
setInterval(monitorMemory, 30000);
```

## Caching Strategy

### Appropriate TTL Values

```javascript
// ✅ Good - Different TTL for different data types
const CACHE_TTL = {
  STATIC: 24 * 60 * 60 * 1000,  // 24 hours for static data
  SEMI_STATIC: 60 * 60 * 1000,  // 1 hour for rarely changing data
  DYNAMIC: 5 * 60 * 1000,       // 5 minutes for frequently changing data
  REAL_TIME: 0                   // No cache for real-time data
};

// Master data - long cache
await connection.execute('SELECT * FROM categories', undefined, {
  cache: true,
  cacheTTL: CACHE_TTL.STATIC
});

// User data - short cache
await connection.execute('SELECT * FROM active_users', undefined, {
  cache: true,
  cacheTTL: CACHE_TTL.DYNAMIC
});
```

### Cache Invalidation

```javascript
// ✅ Good - Invalidate cache on data changes
async function updateUser(userId, data) {
  // Update data
  await connection.execute(
    'UPDATE users SET name = ? WHERE id = ?',
    [data.name, userId]
  );
  
  // Invalidate related caches
  connection.clearCache('all-users');
  connection.clearCache(`user-${userId}`);
  connection.clearCache(/^users-/);  // Clear all user-related caches
}
```

## Error Handling

### Comprehensive Error Handling

```javascript
// ✅ Good - Handle all error cases
async function safeQuery(sql, params) {
  try {
    const result = await connection.execute(sql, params);
    return { success: true, data: result.toArray() };
  } catch (error) {
    // Log for debugging
    console.error('Query error:', {
      sql,
      params,
      error: error.message,
      stack: error.stack
    });
    
    // Handle specific errors
    if (error.code === 'TABLE_NOT_FOUND') {
      return { 
        success: false, 
        error: 'The requested data is not available',
        code: 'NOT_FOUND'
      };
    }
    
    if (error.code === 'MEMORY_LIMIT') {
      return {
        success: false,
        error: 'Too much data requested. Please narrow your search.',
        code: 'LIMIT_EXCEEDED'
      };
    }
    
    // Generic error
    return {
      success: false,
      error: 'An error occurred while processing your request',
      code: 'UNKNOWN'
    };
  }
}
```

## Security

### Input Validation

```javascript
// ✅ Good - Validate all inputs
class InputValidator {
  static validateTableName(name) {
    // Only allow alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Invalid table name');
    }
    return name;
  }
  
  static validateColumnName(name) {
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Invalid column name');
    }
    return name;
  }
  
  static sanitizeString(value) {
    // Remove potential SQL injection characters
    return value.replace(/[;'"\\]/g, '');
  }
  
  static validateLimit(limit) {
    const MAX_LIMIT = 1000;
    const parsed = parseInt(limit, 10);
    
    if (isNaN(parsed) || parsed < 1) {
      return 10;  // Default
    }
    
    return Math.min(parsed, MAX_LIMIT);
  }
}

// Usage
const tableName = InputValidator.validateTableName(userInput.table);
const limit = InputValidator.validateLimit(userInput.limit);
```

### Restrict Operations

```javascript
// ✅ Good - Restrict dangerous operations
class SafeConnection {
  constructor(connection) {
    this.connection = connection;
    this.allowedOperations = new Set(['SELECT', 'INSERT', 'UPDATE']);
  }
  
  async execute(sql, params) {
    const operation = sql.trim().split(' ')[0].toUpperCase();
    
    // Block dangerous operations
    if (!this.allowedOperations.has(operation)) {
      throw new Error(`Operation ${operation} is not allowed`);
    }
    
    // Block system tables
    if (sql.includes('information_schema') || sql.includes('pg_')) {
      throw new Error('Access to system tables is not allowed');
    }
    
    return this.connection.execute(sql, params);
  }
}
```

## Testing

### Mock Connections for Testing

```javascript
// ✅ Good - Mockable connection
class MockConnection {
  constructor(mockData = {}) {
    this.mockData = mockData;
  }
  
  async execute(sql, params) {
    // Return mock data based on query
    if (sql.includes('SELECT * FROM users')) {
      return {
        toArray: () => this.mockData.users || []
      };
    }
    
    return {
      toArray: () => []
    };
  }
}

// In tests
const mockConnection = new MockConnection({
  users: [
    { id: 1, name: 'Test User' }
  ]
});
```

### Test Error Scenarios

```javascript
// ✅ Good - Test error handling
describe('Database operations', () => {
  it('should handle connection errors', async () => {
    const connection = new MockConnection();
    connection.execute = jest.fn().mockRejectedValue(
      new DuckDBError('Connection failed', 'CONNECTION_FAILED')
    );
    
    const result = await safeQuery('SELECT * FROM users');
    expect(result.success).toBe(false);
    expect(result.code).toBe('CONNECTION_FAILED');
  });
});
```

## Performance Monitoring

### Query Performance Tracking

```javascript
// ✅ Good - Track query performance
class PerformanceMonitor {
  constructor() {
    this.queries = [];
  }
  
  async trackQuery(sql, params, executeFn) {
    const start = performance.now();
    
    try {
      const result = await executeFn(sql, params);
      const duration = performance.now() - start;
      
      this.queries.push({
        sql,
        duration,
        timestamp: new Date(),
        success: true
      });
      
      // Warn about slow queries
      if (duration > 1000) {
        console.warn(`Slow query (${duration.toFixed(2)}ms):`, sql);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.queries.push({
        sql,
        duration,
        timestamp: new Date(),
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }
  
  getStatistics() {
    const successful = this.queries.filter(q => q.success);
    const failed = this.queries.filter(q => !q.success);
    
    return {
      total: this.queries.length,
      successful: successful.length,
      failed: failed.length,
      avgDuration: successful.reduce((sum, q) => sum + q.duration, 0) / successful.length,
      slowQueries: this.queries.filter(q => q.duration > 1000)
    };
  }
}
```

## Framework-specific Best Practices

### React

```jsx
// ✅ Good - Proper provider placement
function App() {
  return (
    <ErrorBoundary>
      <DuckDBProvider>
        <Router>
          <Routes>
            {/* Your routes */}
          </Routes>
        </Router>
      </DuckDBProvider>
    </ErrorBoundary>
  );
}
```

### Vue

```javascript
// ✅ Good - Global error handler
app.config.errorHandler = (error, instance, info) => {
  if (error instanceof DuckDBError) {
    // Handle DuckDB errors specifically
    console.error('Database error:', error);
  }
};
```

### Svelte

```svelte
<!-- ✅ Good - Cleanup on destroy -->
<script>
  import { onDestroy } from 'svelte';
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  
  onDestroy(() => {
    db.disconnect();
  });
</script>
```

## Summary

Key takeaways:

1. **Single connection** - One connection per application
2. **Parameterized queries** - Always use parameters
3. **Proper cleanup** - Clean up resources
4. **Error handling** - Handle all error cases
5. **Input validation** - Validate all user input
6. **Performance monitoring** - Track and optimize
7. **Appropriate caching** - Cache wisely
8. **Security first** - Never trust user input
9. **Test thoroughly** - Include error scenarios
10. **Monitor production** - Track real-world usage
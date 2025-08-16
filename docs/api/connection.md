# Connection API

The Connection API provides low-level database connection management and query execution capabilities.

## Connection Creation

### createConnection()

Create a new DuckDB connection with optional configuration.

```typescript
function createConnection(
  config?: ConnectionConfig,
  events?: ConnectionEvents
): Promise<Connection>
```

#### Basic Usage

```typescript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

// Simple connection
const connection = await createConnection();

// With configuration
const connection = await createConnection({
  worker: true,
  logLevel: 'warning',
  cache: { enabled: true }
});
```

## ConnectionConfig

Configuration options for database connections.

```typescript
interface ConnectionConfig {
  worker?: boolean;           // Use Web Worker (default: true)
  logLevel?: LogLevel;        // Logging level
  query?: QueryConfig;        // Query execution options
  debug?: DebugConfig;        // Debug mode settings
  cache?: CacheConfig;        // Cache configuration
}
```

### LogLevel

```typescript
type LogLevel = 'silent' | 'error' | 'warning' | 'info' | 'debug';
```

### QueryConfig

```typescript
interface QueryConfig {
  castBigIntToDouble?: boolean;  // Convert BigInt to Double (default: false)
}
```

### Example Configuration

```typescript
const config: ConnectionConfig = {
  worker: true,
  logLevel: 'warning',
  query: {
    castBigIntToDouble: true
  },
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    logQueries: true,
    logTiming: true,
    slowQueryThreshold: 100
  },
  cache: {
    enabled: true,
    maxEntries: 100,
    ttl: 300000, // 5 minutes
    evictionStrategy: 'lru'
  }
};

const connection = await createConnection(config);
```

## ConnectionEvents

Event handlers for connection lifecycle events.

```typescript
interface ConnectionEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onQuery?: (query: string, duration: number) => void;
}
```

### Usage with Events

```typescript
const events: ConnectionEvents = {
  onConnect: () => {
    console.log('Connected to DuckDB');
  },
  onDisconnect: () => {
    console.log('Disconnected from DuckDB');
  },
  onError: (error) => {
    console.error('Connection error:', error);
  },
  onQuery: (query, duration) => {
    console.log(`Query executed in ${duration}ms: ${query}`);
  }
};

const connection = await createConnection(config, events);
```

## Connection Interface

### Properties

```typescript
interface Connection {
  readonly id: string;                    // Unique connection ID
  readonly status: ConnectionStatus;      // Current connection status
}

type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';
```

### Query Execution

#### execute()

Execute a query and return results.

```typescript
execute<T = Record<string, unknown>>(
  query: string,
  params?: unknown[]
): Promise<ResultSet<T>>
```

```typescript
// Simple query
const result = await connection.execute('SELECT * FROM users');
const users = result.toArray();

// Parameterized query
const result = await connection.execute(
  'SELECT * FROM users WHERE age > ? AND department = ?',
  [25, 'engineering']
);

// With type safety
interface User {
  id: number;
  name: string;
  email: string;
}

const result = await connection.execute<User>(
  'SELECT id, name, email FROM users'
);
const users: User[] = result.toArray();
```

#### executeSync()

Synchronous query execution (not supported in browser).

```typescript
executeSync<T = Record<string, unknown>>(
  query: string,
  params?: unknown[]
): ResultSet<T>
```

::: warning
`executeSync()` is not supported in browser environments and will throw an error.
:::

### Data Import

#### importCSV()

Import CSV data into a table.

```typescript
importCSV(
  file: File | string,
  tableName: string,
  options?: ImportOptions
): Promise<void>
```

```typescript
// Import from File object
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
await connection.importCSV(file, 'users');

// Import from URL
await connection.importCSV('https://example.com/data.csv', 'external_data');

// With options
await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ',',
  quote: '"',
  nullString: 'NULL',
  dateFormat: '%Y-%m-%d',
  timestampFormat: '%Y-%m-%d %H:%M:%S'
});
```

#### importJSON()

Import JSON data into a table.

```typescript
importJSON(data: unknown[], tableName: string): Promise<void>
```

```typescript
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

await connection.importJSON(users, 'users');
```

#### importParquet()

Import Parquet data into a table.

```typescript
importParquet(
  file: File | ArrayBuffer,
  tableName: string
): Promise<void>
```

```typescript
// From File object
const file = document.querySelector('input[type="file"]').files[0];
await connection.importParquet(file, 'large_dataset');

// From ArrayBuffer
const response = await fetch('/data.parquet');
const buffer = await response.arrayBuffer();
await connection.importParquet(buffer, 'fetched_data');
```

### Data Export

#### exportCSV()

Export query results as CSV.

```typescript
exportCSV(query: string, options?: ExportOptions): Promise<string>
```

```typescript
// Basic export
const csv = await connection.exportCSV('SELECT * FROM users');

// With options
const csv = await connection.exportCSV('SELECT * FROM users', {
  header: true,
  delimiter: ',',
  quote: '"',
  nullString: ''
});

// Download file
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'users.csv';
a.click();
```

#### exportJSON()

Export query results as JSON.

```typescript
exportJSON<T = Record<string, unknown>>(query: string): Promise<T[]>
```

```typescript
const users = await connection.exportJSON('SELECT * FROM users');
console.log('Exported users:', users);

// With type safety
interface User {
  id: number;
  name: string;
  email: string;
}

const users = await connection.exportJSON<User>('SELECT id, name, email FROM users');
```

### Cache Management

#### clearCache()

Clear all cached query results.

```typescript
clearCache(): void
```

```typescript
connection.clearCache();
console.log('Cache cleared');
```

#### getCacheStats()

Get cache performance statistics.

```typescript
getCacheStats(): CacheStats
```

```typescript
const stats = connection.getCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Entries: ${stats.entries}`);
console.log(`Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
```

#### invalidateCache()

Invalidate specific cache entries.

```typescript
invalidateCache(pattern: string | RegExp): number
```

```typescript
// Clear user-related queries
const cleared = connection.invalidateCache(/users/);
console.log(`Cleared ${cleared} entries`);

// Clear specific query
connection.invalidateCache('SELECT COUNT(*) FROM products');
```

### Connection Lifecycle

#### close()

Close the database connection.

```typescript
close(): Promise<void>
```

```typescript
await connection.close();
console.log('Connection closed');
```

## Connection Manager

### ConnectionManager

Singleton class for managing multiple connections.

```typescript
class ConnectionManager {
  static getInstance(): ConnectionManager;
  createConnection(config?: ConnectionConfig, events?: ConnectionEvents): Promise<Connection>;
  getConnection(id: string): Promise<Connection | undefined>;
  closeConnection(id: string): Promise<void>;
  closeAll(): Promise<void>;
  getActiveConnections(): string[];
  isInitialized(): boolean;
}
```

#### Usage

```typescript
import { ConnectionManager } from '@northprint/duckdb-wasm-adapter-core';

const manager = ConnectionManager.getInstance();

// Create multiple connections
const conn1 = await manager.createConnection({ worker: true });
const conn2 = await manager.createConnection({ worker: false });

// Get connection by ID
const retrieved = await manager.getConnection(conn1.id);

// List active connections
const activeIds = manager.getActiveConnections();
console.log('Active connections:', activeIds);

// Close specific connection
await manager.closeConnection(conn1.id);

// Close all connections
await manager.closeAll();
```

## ResultSet Interface

Results from query execution.

```typescript
interface ResultSet<T> {
  rows: T[];                              // Raw row data
  columns: string[];                      // Column names
  rowCount: number;                       // Number of rows
  
  toArray(): T[];                         // Convert to array
  toObject(): Record<string, unknown>[];  // Convert to objects
  getMetadata(): ColumnMetadata[];        // Get column metadata
  
  [Symbol.iterator](): Iterator<T>;       // Iterable interface
}
```

### Usage Examples

```typescript
const result = await connection.execute('SELECT * FROM users');

// Get as array
const users = result.toArray();

// Get metadata
const metadata = result.getMetadata();
console.log('Columns:', metadata.map(col => col.name));

// Iterate over results
for (const user of result) {
  console.log(user.name);
}

// Access raw data
console.log('Total rows:', result.rowCount);
console.log('Column names:', result.columns);
```

## Error Handling

### Connection Errors

```typescript
try {
  const connection = await createConnection({
    worker: true,
    logLevel: 'debug'
  });
  
  await connection.execute('SELECT * FROM non_existent_table');
} catch (error) {
  if (error instanceof DuckDBError) {
    console.error('DuckDB Error:', error.code, error.message);
    
    switch (error.code) {
      case 'CONNECTION_FAILED':
        console.log('Failed to connect to database');
        break;
      case 'QUERY_FAILED':
        console.log('Query execution failed');
        break;
      case 'NOT_CONNECTED':
        console.log('Not connected to database');
        break;
    }
  }
}
```

### Connection Status Monitoring

```typescript
function monitorConnection(connection: Connection) {
  const checkStatus = () => {
    switch (connection.status) {
      case 'connecting':
        console.log('Connecting to database...');
        break;
      case 'connected':
        console.log('Connected to database');
        break;
      case 'error':
        console.log('Connection error occurred');
        break;
      case 'disconnected':
        console.log('Disconnected from database');
        break;
    }
  };

  // Monitor status changes
  setInterval(checkStatus, 1000);
}
```

## Advanced Configuration

### Custom Worker Configuration

```typescript
const connection = await createConnection({
  worker: true,
  // Custom worker bundle paths
  bundles: {
    mvp: {
      mainModule: '/custom/path/duckdb-mvp.wasm',
      mainWorker: '/custom/path/duckdb-browser-mvp.worker.js'
    },
    eh: {
      mainModule: '/custom/path/duckdb-eh.wasm',
      mainWorker: '/custom/path/duckdb-browser-eh.worker.js'
    }
  }
});
```

### Connection Pooling

```typescript
class ConnectionPool {
  private connections: Connection[] = [];
  private config: ConnectionConfig;
  
  constructor(config: ConnectionConfig, poolSize: number = 5) {
    this.config = config;
    this.initializePool(poolSize);
  }
  
  private async initializePool(size: number) {
    for (let i = 0; i < size; i++) {
      const connection = await createConnection(this.config);
      this.connections.push(connection);
    }
  }
  
  async getConnection(): Promise<Connection> {
    if (this.connections.length === 0) {
      return createConnection(this.config);
    }
    return this.connections.pop()!;
  }
  
  releaseConnection(connection: Connection) {
    this.connections.push(connection);
  }
  
  async closeAll() {
    await Promise.all(
      this.connections.map(conn => conn.close())
    );
    this.connections = [];
  }
}
```

## Best Practices

### 1. Connection Management

```typescript
// ✅ Good: Single connection for application
const connection = await createConnection({
  worker: true,
  cache: { enabled: true }
});

// ❌ Bad: Creating multiple connections unnecessarily
const conn1 = await createConnection();
const conn2 = await createConnection();
```

### 2. Parameter Safety

```typescript
// ✅ Good: Parameterized queries
const users = await connection.execute(
  'SELECT * FROM users WHERE age > ? AND department = ?',
  [minAge, department]
);

// ❌ Bad: String concatenation
const users = await connection.execute(
  `SELECT * FROM users WHERE age > ${minAge} AND department = '${department}'`
);
```

### 3. Resource Cleanup

```typescript
// ✅ Good: Proper cleanup
try {
  const connection = await createConnection();
  // Use connection
  const result = await connection.execute('SELECT * FROM users');
  return result.toArray();
} finally {
  if (connection) {
    await connection.close();
  }
}
```

### 4. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
async function safeQuery(connection: Connection, sql: string, params?: unknown[]) {
  try {
    if (connection.status !== 'connected') {
      throw new Error('Connection not ready');
    }
    
    const result = await connection.execute(sql, params);
    return result.toArray();
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  }
}
```

### 5. Performance Optimization

```typescript
// ✅ Good: Enable caching and use appropriate settings
const connection = await createConnection({
  worker: true,
  cache: {
    enabled: true,
    maxEntries: 100,
    ttl: 300000
  },
  debug: {
    enabled: process.env.NODE_ENV === 'development',
    slowQueryThreshold: 100
  }
});
```
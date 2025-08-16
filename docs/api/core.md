# Core API Reference

The core package provides the foundation for all framework adapters.

## Installation

```bash
npm install @duckdb-wasm-adapter/core
```

## Connection Management

### `createConnection(config?: ConnectionConfig): Promise<Connection>`

Creates a new DuckDB connection.

```typescript
import { createConnection } from '@duckdb-wasm-adapter/core';

const connection = await createConnection({
  worker: true,
  logLevel: 'warning',
  query: {
    castBigIntToDouble: true
  }
});
```

#### ConnectionConfig

```typescript
interface ConnectionConfig {
  worker?: boolean;           // Use Web Worker (default: true)
  logLevel?: LogLevel;        // 'silent' | 'error' | 'warning' | 'info' | 'debug'
  query?: QueryConfig;         // Query execution options
  debug?: DebugConfig;         // Debug mode configuration
  cache?: CacheConfig;         // Cache configuration
}
```

### `Connection`

The main interface for interacting with DuckDB.

```typescript
interface Connection {
  readonly id: string;
  readonly status: 'connecting' | 'connected' | 'error' | 'disconnected';
  
  // Query execution
  execute<T>(query: string, params?: unknown[]): Promise<ResultSet<T>>;
  executeSync<T>(query: string, params?: unknown[]): ResultSet<T>;
  
  // Data import/export
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  importParquet(file: File | ArrayBuffer, tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T>(query: string): Promise<T[]>;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
  invalidateCache(pattern: string | RegExp): number;
  
  // Connection lifecycle
  close(): Promise<void>;
}
```

## Query Execution

### `ResultSet<T>`

Represents the result of a query execution.

```typescript
interface ResultSet<T> {
  rows: T[];
  columns: string[];
  rowCount: number;
  
  toArray(): T[];
  toObject(): Record<string, unknown>[];
  getMetadata(): ColumnMetadata[];
  
  [Symbol.iterator](): Iterator<T>;
}
```

### `ColumnMetadata`

Metadata about a result column.

```typescript
interface ColumnMetadata {
  name: string;
  type: DuckDBType;
  nullable: boolean;
  precision?: number;
  scale?: number;
}
```

## Data Import/Export

### `ImportOptions`

Options for CSV import.

```typescript
interface ImportOptions {
  header?: boolean;          // First row contains headers (default: true)
  delimiter?: string;         // Column delimiter (default: ',')
  quote?: string;            // Quote character (default: '"')
  escape?: string;           // Escape character (default: '"')
  nullString?: string;       // String representing NULL (default: '')
  columns?: string[];        // Column names (if no header)
  dateFormat?: string;       // Date format string
  timestampFormat?: string;  // Timestamp format string
}
```

### `ExportOptions`

Options for CSV export.

```typescript
interface ExportOptions {
  header?: boolean;          // Include headers (default: true)
  delimiter?: string;        // Column delimiter (default: ',')
  quote?: string;           // Quote character (default: '"')
  escape?: string;          // Escape character (default: '"')
  nullString?: string;      // String for NULL values (default: '')
}
```

## Error Handling

### `DuckDBError`

Custom error class for DuckDB operations.

```typescript
class DuckDBError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly originalError?: Error;
  
  static connectionFailed(message: string, cause?: Error): DuckDBError;
  static queryFailed(message: string, query?: string, cause?: Error): DuckDBError;
  static importFailed(message: string, cause?: Error): DuckDBError;
  static exportFailed(message: string, cause?: Error): DuckDBError;
  static notConnected(): DuckDBError;
  static unsupportedOperation(operation: string): DuckDBError;
  static initializationFailed(message: string, cause?: Error): DuckDBError;
}
```

### `ErrorCode`

Error codes for different failure types.

```typescript
enum ErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  NOT_CONNECTED = 'NOT_CONNECTED',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED'
}
```

## Debug Mode

### `DebugConfig`

Configuration for debug mode.

```typescript
interface DebugConfig {
  enabled?: boolean;           // Enable debug mode
  logQueries?: boolean;        // Log all queries
  logTiming?: boolean;         // Log query execution time
  logResults?: boolean;        // Log query results
  logConnections?: boolean;    // Log connection events
  logMemory?: boolean;         // Log memory usage
  slowQueryThreshold?: number; // Slow query threshold in ms
  profileQueries?: boolean;    // Enable query profiling
}
```

### `DebugLogger`

Logger for debug output.

```typescript
class DebugLogger {
  constructor(config?: DebugConfig);
  
  logQuery(sql: string, params?: unknown[]): void;
  logResult(result: unknown, rowCount: number): void;
  logTiming(duration: number): void;
  logConnection(event: string): void;
  logError(error: Error): void;
  logMemory(): void;
  log(message: string, ...args: unknown[]): void;
}
```

## Cache Management

### `CacheConfig`

Configuration for query result caching.

```typescript
interface CacheConfig {
  enabled?: boolean;              // Enable caching
  maxEntries?: number;            // Maximum cache entries
  maxSize?: number;               // Maximum cache size in bytes
  ttl?: number;                   // Time to live in ms
  evictionStrategy?: EvictionStrategy;
  keyGenerator?: (query: string, params?: unknown[]) => string;
}
```

### `CacheStats`

Cache statistics.

```typescript
interface CacheStats {
  hits: number;      // Cache hits
  misses: number;    // Cache misses
  evictions: number; // Evicted entries
  entries: number;   // Current entries
  totalSize: number; // Total size in bytes
  hitRate: number;   // Hit rate (0-1)
}
```

## Type Definitions

### `DuckDBType`

Supported DuckDB data types.

```typescript
type DuckDBType = 
  | 'BOOLEAN'
  | 'TINYINT' | 'SMALLINT' | 'INTEGER' | 'BIGINT'
  | 'UTINYINT' | 'USMALLINT' | 'UINTEGER' | 'UBIGINT'
  | 'FLOAT' | 'DOUBLE' | 'DECIMAL'
  | 'VARCHAR' | 'CHAR' | 'TEXT'
  | 'DATE' | 'TIME' | 'TIMESTAMP' | 'INTERVAL'
  | 'BLOB' | 'JSON'
  | 'ARRAY' | 'LIST' | 'MAP' | 'STRUCT' | 'UNION'
  | 'UUID' | 'ENUM';
```

## Utility Functions

### `formatBytes(bytes: number): string`

Format bytes to human-readable string.

```typescript
formatBytes(1024); // "1.00 KB"
formatBytes(1048576); // "1.00 MB"
```

### `formatDuration(ms: number): string`

Format milliseconds to human-readable duration.

```typescript
formatDuration(1500); // "1.50s"
formatDuration(65000); // "1m 5s"
```

### `formatNumber(num: number): string`

Format number with thousand separators.

```typescript
formatNumber(1000000); // "1,000,000"
```

### `resultToCSV(data: unknown[]): string`

Convert query result to CSV string.

```typescript
const csv = resultToCSV([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]);
// "id,name\n1,Alice\n2,Bob"
```

### `downloadFile(content: string, filename: string, type: string): void`

Trigger file download in browser.

```typescript
downloadFile(csvContent, 'data.csv', 'text/csv');
```
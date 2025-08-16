# @northprint/duckdb-wasm-adapter-core

Core library for DuckDB WASM with TypeScript support. This package provides the foundation for all framework-specific adapters.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-core
# or
pnpm add @northprint/duckdb-wasm-adapter-core
# or
yarn add @northprint/duckdb-wasm-adapter-core
```

## Features

- 🔒 **Type-safe** - Full TypeScript support with comprehensive type definitions
- 🚀 **Connection pooling** - Efficient connection management
- 🛡️ **SQL injection protection** - Parameter binding support
- 📦 **Data import/export** - Support for CSV, JSON, and Parquet formats
- ⚡ **Performance optimized** - Efficient memory management
- 🔧 **Extensible** - Clean architecture for framework adapters

## Quick Start

```typescript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

// Create a connection
const connection = await createConnection();

// Execute a query
const result = await connection.execute('SELECT * FROM users');
const data = result.toArray();

// Use parameter binding
const filtered = await connection.execute(
  'SELECT * FROM users WHERE age > ? AND city = ?',
  [18, 'Tokyo']
);

// Import CSV
await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ','
});

// Export as JSON
const json = await connection.exportJSON('SELECT * FROM users');
```

## API Reference

### createConnection(config?, events?)

Creates a new database connection.

#### Parameters

- `config` (optional): Connection configuration
  - `worker`: boolean - Use web worker (default: true)
  - `logLevel`: 'silent' | 'error' | 'warning' | 'info' | 'debug'
  - `query`: Query configuration options
    - `castBigIntToDouble`: boolean
    - `castDecimalToDouble`: boolean
    - `castTimestampToDate`: boolean
  - `path`: string - Database path

- `events` (optional): Event handlers
  - `onConnect`: () => void
  - `onDisconnect`: () => void
  - `onError`: (error: Error) => void
  - `onQuery`: (sql: string, duration: number) => void

#### Returns

Promise<Connection>

#### Example

```typescript
const connection = await createConnection({
  worker: true,
  logLevel: 'warning'
}, {
  onConnect: () => console.log('Connected'),
  onError: (error) => console.error('Error:', error),
  onQuery: (sql, duration) => console.log(`Query took ${duration}ms`)
});
```

### Connection Methods

#### execute(query, params?)

Executes a SQL query with optional parameter binding.

```typescript
const result = await connection.execute(
  'SELECT * FROM users WHERE age > ?',
  [18]
);
```

#### importCSV(file, tableName, options?)

Imports a CSV file into a table.

```typescript
await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ',',
  skipRows: 1,
  columns: ['id', 'name', 'email']
});
```

#### importJSON(data, tableName)

Imports JSON data into a table.

```typescript
const data = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
];
await connection.importJSON(data, 'users');
```

#### importParquet(file, tableName)

Imports a Parquet file into a table.

```typescript
await connection.importParquet(file, 'users');
```

#### exportCSV(query, options?)

Exports query results as CSV.

```typescript
const csv = await connection.exportCSV('SELECT * FROM users', {
  header: true,
  delimiter: ','
});
```

#### exportJSON(query)

Exports query results as JSON.

```typescript
const json = await connection.exportJSON('SELECT * FROM users');
```

#### close()

Closes the database connection.

```typescript
await connection.close();
```

### ResultSet Methods

#### toArray()

Converts the result to an array of objects.

```typescript
const data = result.toArray();
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
```

#### getMetadata()

Gets column metadata.

```typescript
const metadata = result.getMetadata();
// [{ name: 'id', type: 'INTEGER', nullable: false }, ...]
```

#### [Symbol.iterator]()

Allows iteration over results.

```typescript
for (const row of result) {
  console.log(row);
}
```

### Error Handling

The library provides custom error types with error codes:

```typescript
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

try {
  await connection.execute('INVALID SQL');
} catch (error) {
  if (error instanceof DuckDBError) {
    switch (error.code) {
      case ErrorCode.QUERY_FAILED:
        console.error('Query failed:', error.message);
        break;
      case ErrorCode.CONNECTION_FAILED:
        console.error('Connection failed:', error.message);
        break;
      default:
        console.error('Unknown error:', error);
    }
  }
}
```

### Error Codes

- `CONNECTION_FAILED` - Failed to establish connection
- `QUERY_FAILED` - Query execution failed
- `IMPORT_FAILED` - Data import failed
- `EXPORT_FAILED` - Data export failed
- `INVALID_PARAMS` - Invalid parameters provided
- `NOT_CONNECTED` - Operation requires connection
- `MEMORY_LIMIT` - Memory limit exceeded

## Advanced Usage

### Transaction Support

```typescript
await connection.execute('BEGIN TRANSACTION');
try {
  await connection.execute('INSERT INTO users VALUES (?, ?)', [1, 'Alice']);
  await connection.execute('UPDATE users SET status = ? WHERE id = ?', ['active', 1]);
  await connection.execute('COMMIT');
} catch (error) {
  await connection.execute('ROLLBACK');
  throw error;
}
```

### Batch Operations

```typescript
const queries = [
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [1, 'Alice'] },
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [2, 'Bob'] },
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [3, 'Carol'] }
];

await connection.execute('BEGIN TRANSACTION');
for (const { sql, params } of queries) {
  await connection.execute(sql, params);
}
await connection.execute('COMMIT');
```

### Large File Handling

For files larger than 10MB, the library automatically uses file registration:

```typescript
// Automatically handled for large files
const largeFile = new File([...], 'large.csv', { type: 'text/csv' });
await connection.importCSV(largeFile, 'large_table');
```

## TypeScript Support

The library is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  Connection,
  ConnectionConfig,
  ResultSet,
  ColumnMetadata,
  ImportOptions,
  ExportOptions,
  DuckDBType
} from '@northprint/duckdb-wasm-adapter-core';
```

## Browser Compatibility

- Chrome 90+
- Firefox 89+
- Safari 15+
- Edge 90+

Requires support for:
- WebAssembly
- Web Workers (optional but recommended)
- BigInt
- Apache Arrow

## Performance Tips

1. **Use Web Workers**: Enable worker mode for better performance
2. **Parameter Binding**: Always use parameter binding for dynamic queries
3. **Batch Operations**: Use transactions for multiple operations
4. **Memory Management**: Close connections when not needed
5. **Query Optimization**: Use appropriate indexes and query optimization

## License

MIT
# @northprint/duckdb-wasm-adapter-svelte

Svelte stores and utilities for DuckDB WASM. Provides reactive stores and hooks for seamless integration with Svelte applications.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-svelte @northprint/duckdb-wasm-adapter-core
# or
pnpm add @northprint/duckdb-wasm-adapter-svelte @northprint/duckdb-wasm-adapter-core
```

## Features

- 🎯 **Reactive stores** - Svelte-native reactive patterns
- 🔄 **Auto-refresh** - Automatic query refresh support
- 🎨 **Type-safe** - Full TypeScript support
- 🚀 **Optimized** - Efficient re-rendering
- 📦 **Utilities** - Formatting and export helpers

## Quick Start

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  // Create a reactive DuckDB store
  const db = createDuckDB({ autoConnect: true });
  
  // Execute a query - returns a reactive store
  const users = db.query('SELECT * FROM users');
</script>

<!-- Connection status -->
<p>Status: {$db.status}</p>

<!-- Query results -->
{#if $users.loading}
  <p>Loading...</p>
{:else if $users.error}
  <p>Error: {$users.error.message}</p>
{:else if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} - {user.email}</li>
    {/each}
  </ul>
{/if}
```

## API Reference

### createDuckDB(config?)

Creates a reactive DuckDB store with Svelte integration.

#### Parameters

- `config` (optional):
  - `autoConnect`: boolean - Automatically connect on creation
  - `events`: ConnectionEvents - Event handlers
  - All options from `@northprint/duckdb-wasm-adapter-core` ConnectionConfig

#### Returns

`DuckDBStore` with the following properties:

- `connection`: Readable<Connection | null> - Current connection
- `status`: Readable<ConnectionStatus> - Connection status
- `error`: Readable<Error | null> - Current error
- `connect()`: Promise<void> - Connect to database
- `disconnect()`: Promise<void> - Disconnect from database
- `query(sql, params?)`: QueryStore - Execute query
- `importCSV(file, tableName, options?)`: Promise<void>
- `importJSON(data, tableName)`: Promise<void>
- `importParquet(file, tableName)`: Promise<void>
- `exportCSV(query)`: Promise<string>
- `exportJSON(query)`: Promise<T[]>

#### Example

```javascript
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

const db = createDuckDB({
  autoConnect: true,
  events: {
    onConnect: () => console.log('Connected'),
    onError: (error) => console.error('Error:', error)
  }
});

// Query with reactive store
const results = db.query('SELECT * FROM users WHERE age > ?', [18]);

// The store automatically updates when the query completes
$: console.log('Results:', $results.data);
```

### Query Store

The query method returns a special store with additional methods:

```javascript
const queryStore = db.query('SELECT * FROM users');

// Subscribe to changes
queryStore.subscribe(result => {
  console.log('Data:', result.data);
  console.log('Loading:', result.loading);
  console.log('Error:', result.error);
  console.log('Metadata:', result.metadata);
});

// Refetch the query
await queryStore.refetch();

// Cancel ongoing query
queryStore.cancel();
```

### Hooks

#### useQuery(db, sql, params?, options?)

Convenience hook for queries with additional options.

```javascript
import { useQuery } from '@northprint/duckdb-wasm-adapter-svelte';

const query = useQuery(db, 'SELECT * FROM users', undefined, {
  enabled: true,
  refetchInterval: 5000 // Auto-refresh every 5 seconds
});
```

#### useMutation(db, options?)

Hook for data mutations with callbacks.

```javascript
import { useMutation } from '@northprint/duckdb-wasm-adapter-svelte';

const mutation = useMutation(db, {
  onSuccess: (data) => console.log('Success:', data),
  onError: (error) => console.error('Error:', error)
});

// Execute mutation
await mutation.execute('INSERT INTO users VALUES (?, ?)', [1, 'Alice']);
```

#### useBatch(db, operations)

Execute multiple operations in a transaction.

```javascript
import { useBatch } from '@northprint/duckdb-wasm-adapter-svelte';

await useBatch(db, [
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [1, 'Alice'] },
  { sql: 'INSERT INTO users VALUES (?, ?)', params: [2, 'Bob'] }
]);
```

#### useTransaction(db, callback)

Execute operations in a transaction with automatic rollback.

```javascript
import { useTransaction } from '@northprint/duckdb-wasm-adapter-svelte';

const result = await useTransaction(db, async (execute) => {
  await execute('INSERT INTO users VALUES (?, ?)', [1, 'Alice']);
  await execute('UPDATE stats SET count = count + 1');
  return 'Success';
});
```

### Utility Functions

#### formatBytes(bytes)

Format bytes to human-readable string.

```javascript
import { formatBytes } from '@northprint/duckdb-wasm-adapter-svelte';

formatBytes(1024) // "1 KB"
formatBytes(1048576) // "1 MB"
```

#### formatDuration(ms)

Format milliseconds to human-readable duration.

```javascript
import { formatDuration } from '@northprint/duckdb-wasm-adapter-svelte';

formatDuration(1500) // "1.50s"
formatDuration(65000) // "1.08m"
```

#### formatNumber(num)

Format number with thousands separator.

```javascript
import { formatNumber } from '@northprint/duckdb-wasm-adapter-svelte';

formatNumber(1000000) // "1,000,000"
```

#### resultToCSV(data)

Convert query results to CSV string.

```javascript
import { resultToCSV } from '@northprint/duckdb-wasm-adapter-svelte';

const csv = resultToCSV($queryStore.data);
// "id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com"
```

#### downloadFile(content, filename, mimeType?)

Download data as a file.

```javascript
import { downloadFile, resultToCSV } from '@northprint/duckdb-wasm-adapter-svelte';

const csv = resultToCSV($queryStore.data);
downloadFile(csv, 'users.csv', 'text/csv');
```

#### debounce(func, wait)

Debounce function calls.

```javascript
import { debounce } from '@northprint/duckdb-wasm-adapter-svelte';

const debouncedSearch = debounce((query) => {
  searchStore = db.query(`SELECT * FROM users WHERE name LIKE ?`, [`%${query}%`]);
}, 300);
```

#### getQueryType(sql)

Determine SQL query type.

```javascript
import { getQueryType } from '@northprint/duckdb-wasm-adapter-svelte';

getQueryType('SELECT * FROM users') // 'SELECT'
getQueryType('INSERT INTO users...') // 'INSERT'
```

#### isReadOnlyQuery(sql)

Check if query is read-only.

```javascript
import { isReadOnlyQuery } from '@northprint/duckdb-wasm-adapter-svelte';

isReadOnlyQuery('SELECT * FROM users') // true
isReadOnlyQuery('INSERT INTO users...') // false
```

#### createAutoRefreshStore(queryFn, interval, initialValue)

Create a store that auto-refreshes.

```javascript
import { createAutoRefreshStore } from '@northprint/duckdb-wasm-adapter-svelte';

const stats = createAutoRefreshStore(
  async () => {
    const conn = get(db.connection);
    const result = await conn.execute('SELECT COUNT(*) as count FROM users');
    return result.toArray()[0].count;
  },
  5000, // Refresh every 5 seconds
  0 // Initial value
);

// Start auto-refresh
stats.start();

// Stop auto-refresh
stats.stop();
```

## Examples

### Basic Query

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const users = db.query('SELECT * FROM users ORDER BY name');
</script>

<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    {#if $users.loading}
      <tr><td colspan="2">Loading...</td></tr>
    {:else if $users.data}
      {#each $users.data as user}
        <tr>
          <td>{user.name}</td>
          <td>{user.email}</td>
        </tr>
      {/each}
    {/if}
  </tbody>
</table>
```

### Dynamic Queries

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  let searchTerm = '';
  
  $: results = searchTerm 
    ? db.query('SELECT * FROM users WHERE name LIKE ?', [`%${searchTerm}%`])
    : db.query('SELECT * FROM users');
</script>

<input bind:value={searchTerm} placeholder="Search users..." />

{#if $results.data}
  <p>Found {$results.data.length} users</p>
  <!-- Display results -->
{/if}
```

### File Import

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  let importing = false;
  
  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    importing = true;
    try {
      if (file.name.endsWith('.csv')) {
        await db.importCSV(file, 'imported_data');
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        await db.importJSON(data, 'imported_data');
      }
      
      // Query imported data
      importedData = db.query('SELECT * FROM imported_data');
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      importing = false;
    }
  }
</script>

<input 
  type="file" 
  accept=".csv,.json" 
  on:change={handleFileImport}
  disabled={importing}
/>
```

### Export Data

```svelte
<script>
  import { createDuckDB, downloadFile, resultToCSV } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const query = db.query('SELECT * FROM users');
  
  function exportAsCSV() {
    if ($query.data) {
      const csv = resultToCSV($query.data);
      downloadFile(csv, 'users.csv', 'text/csv');
    }
  }
  
  async function exportAsJSON() {
    const json = await db.exportJSON('SELECT * FROM users');
    downloadFile(JSON.stringify(json, null, 2), 'users.json', 'application/json');
  }
</script>

<button on:click={exportAsCSV}>Export CSV</button>
<button on:click={exportAsJSON}>Export JSON</button>
```

## TypeScript

Full TypeScript support with type inference:

```typescript
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
import type { DuckDBStore, QueryStore } from '@northprint/duckdb-wasm-adapter-svelte';

interface User {
  id: number;
  name: string;
  email: string;
}

const db: DuckDBStore = createDuckDB();
const users: QueryStore<User> = db.query<User>('SELECT * FROM users');

// Type-safe access
$users.data?.forEach(user => {
  console.log(user.name); // TypeScript knows this is a string
});
```

## Best Practices

1. **Auto-connect**: Use `autoConnect: true` for simpler setup
2. **Error handling**: Always handle errors in queries
3. **Cleanup**: Disconnect when component unmounts
4. **Debouncing**: Debounce user input for search queries
5. **Transactions**: Use transactions for multiple operations

## License

MIT
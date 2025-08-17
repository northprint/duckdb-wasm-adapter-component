# DuckDB WASM Adapter Component

[![CI](https://github.com/northprint/duckdb-wasm-adapter-component/actions/workflows/ci.yml/badge.svg)](https://github.com/northprint/duckdb-wasm-adapter-component/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@northprint%2Fduckdb-wasm-adapter-core.svg)](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful adapter for using DuckDB WASM in modern web frameworks. Execute SQL queries directly in your browser with full TypeScript support.

[📚 Documentation](https://northprint.github.io/duckdb-wasm-adapter-component/) | [🌏 日本語](./README.ja.md)

## Features

- 🚀 **Zero Configuration** - Works out of the box with automatic WASM loading
- 🔧 **Framework Support** - Native integrations for React, Vue, and Svelte
- 📊 **In-Browser Analytics** - Process data without server round trips
- 🔒 **Type Safe** - Full TypeScript support with comprehensive type definitions
- ⚡ **High Performance** - Optimized for large datasets with query caching
- 📦 **Import/Export** - Support for CSV, JSON, and Parquet formats

## Quick Start

### React

```bash
npm install @northprint/duckdb-wasm-adapter-react
```

```jsx
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <DataTable />
    </DuckDBProvider>
  );
}

function DataTable() {
  const { data, loading, error } = useQuery('SELECT * FROM users');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <table>
      {data?.map(row => (
        <tr key={row.id}>
          <td>{row.name}</td>
          <td>{row.email}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Vue

```bash
npm install @northprint/duckdb-wasm-adapter-vue
```

```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <table v-else>
      <tr v-for="row in data" :key="row.id">
        <td>{{ row.name }}</td>
        <td>{{ row.email }}</td>
      </tr>
    </table>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery('SELECT * FROM users');
</script>
```

### Svelte

```bash
npm install @northprint/duckdb-wasm-adapter-svelte
```

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  $: users = db.query('SELECT * FROM users');
</script>

{#if $users.loading}
  <p>Loading...</p>
{:else if $users.error}
  <p>Error: {$users.error.message}</p>
{:else}
  <table>
    {#each $users.data as user}
      <tr>
        <td>{user.name}</td>
        <td>{user.email}</td>
      </tr>
    {/each}
  </table>
{/if}
```

## Installation

### Core Package

```bash
npm install @northprint/duckdb-wasm-adapter-core
```

### Framework-Specific Packages

```bash
# React
npm install @northprint/duckdb-wasm-adapter-react

# Vue
npm install @northprint/duckdb-wasm-adapter-vue

# Svelte
npm install @northprint/duckdb-wasm-adapter-svelte
```

## Key Features

### Query Execution

Execute SQL queries with parameter binding for security:

```javascript
const result = await connection.execute(
  'SELECT * FROM users WHERE age > ? AND city = ?',
  [18, 'Tokyo']
);
```

### Data Import/Export

Import and export data in various formats:

```javascript
// Import CSV
await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ','
});

// Export to JSON
const json = await connection.exportJSON('SELECT * FROM users');
```

### Query Builder

Build queries programmatically with type safety:

```javascript
const query = builder
  .select(['name', 'email', 'age'])
  .from('users')
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .limit(10);

const result = await query.execute();
```

### Caching

Automatic query result caching for improved performance:

```javascript
const { data } = useQuery('SELECT * FROM large_table', {
  cacheTime: 5 * 60 * 1000, // 5 minutes
  staleTime: 2 * 60 * 1000  // 2 minutes
});
```

## WASM Considerations

When using DuckDB WASM, keep in mind:

- **Memory Limits**: Browser tabs typically have 1-4GB memory limits
- **File System**: No direct file system access; use File API instead
- **CORS**: Remote resources must have proper CORS headers
- **SharedArrayBuffer**: Required for optimal performance (needs specific HTTP headers)

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Start development server
pnpm run dev

# Build documentation
pnpm run docs:build
```

## Examples

Check out our [example applications](./examples):

- [React Example](./examples/react-example) - Dashboard with query builder and caching
- [Vue Example](./examples/vue-example) - Data exploration with import/export
- [Svelte Example](./examples/svelte-example) - Real-time data processing

## Documentation

Full documentation is available at: https://northprint.github.io/duckdb-wasm-adapter-component/

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- [GitHub Issues](https://github.com/northprint/duckdb-wasm-adapter-component/issues)
- [Documentation](https://northprint.github.io/duckdb-wasm-adapter-component/)
- [NPM Package](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-core)
# Getting Started

Welcome to DuckDB WASM Adapter! This guide will help you get up and running with powerful in-browser data analytics in your web application.

## What is DuckDB WASM Adapter?

DuckDB WASM Adapter is a TypeScript library that provides easy-to-use, framework-specific adapters for [DuckDB WASM](https://duckdb.org/docs/api/wasm/overview). It enables you to:

- Run SQL queries directly in the browser
- Process large datasets without a backend
- Import/export data in various formats
- Build type-safe queries with our Query Builder
- Cache results for better performance

## Prerequisites

Before you begin, make sure you have:

- Node.js 16+ installed
- A modern web browser with WebAssembly support:
  - Chrome 57+ (recommended)
  - Firefox 52+
  - Safari 11+
  - Edge 16+
- Basic knowledge of your chosen framework (React, Vue, or Svelte)
- Familiarity with SQL (helpful but not required)

::: warning Important WASM Considerations
DuckDB WASM runs entirely in your browser, which means:
- **Memory is limited** (typically 1-4GB depending on browser)
- **No direct file system access** (use File API for uploads)
- **CORS restrictions apply** for remote resources
- **Performance depends on browser and device**

See our [WASM Considerations Guide](/guide/wasm-considerations) for detailed information.
:::

## Installation

Choose the adapter for your framework:

::: code-group

```bash [React]
npm install @northprint/duckdb-wasm-adapter-react
```

```bash [Vue]
npm install @northprint/duckdb-wasm-adapter-vue
```

```bash [Svelte]
npm install @northprint/duckdb-wasm-adapter-svelte
```

:::

The adapter will automatically install all required dependencies, including:
- `@duckdb/duckdb-wasm` - The core DuckDB WASM library
- `@northprint/duckdb-wasm-adapter-core` - Shared utilities and types

## Basic Setup

### React

```jsx
// App.jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <YourComponents />
    </DuckDBProvider>
  );
}
```

### Vue

```javascript
// main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import App from './App.vue';

const app = createApp(App);
app.use(DuckDBPlugin, { autoConnect: true });
app.mount('#app');
```

### Svelte

```javascript
// App.svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
</script>
```

## Your First Query

Once set up, you can start querying data immediately:

::: code-group

```jsx [React]
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function UserList() {
  const { data, loading, error } = useQuery(`
    SELECT 'Alice' as name, 25 as age
    UNION ALL
    SELECT 'Bob' as name, 30 as age
  `);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map((user, i) => (
        <li key={i}>{user.name} - {user.age} years old</li>
      ))}
    </ul>
  );
}
```

```vue [Vue]
<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <ul v-else>
    <li v-for="(user, i) in data" :key="i">
      {{ user.name }} - {{ user.age }} years old
    </li>
  </ul>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery(`
  SELECT 'Alice' as name, 25 as age
  UNION ALL
  SELECT 'Bob' as name, 30 as age
`);
</script>
```

```svelte [Svelte]
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const { query } = duckdb();
  const result = query(`
    SELECT 'Alice' as name, 25 as age
    UNION ALL
    SELECT 'Bob' as name, 30 as age
  `);
</script>

{#if $result.loading}
  <div>Loading...</div>
{:else if $result.error}
  <div>Error: {$result.error.message}</div>
{:else}
  <ul>
    {#each $result.data as user, i}
      <li>{user.name} - {user.age} years old</li>
    {/each}
  </ul>
{/if}
```

:::

## Working with Real Data

### Creating Tables

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  created_at TIMESTAMP
)
```

### Inserting Data

```sql
INSERT INTO users VALUES 
  (1, 'Alice', 'alice@example.com', '2024-01-01'),
  (2, 'Bob', 'bob@example.com', '2024-01-02')
```

### Importing CSV Files

::: code-group

```jsx [React]
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-react';

function DataImporter() {
  const { importCSV, loading } = useImportCSV();
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    await importCSV(file, 'users');
  };
  
  return (
    <input 
      type="file" 
      accept=".csv" 
      onChange={handleFileChange}
      disabled={loading}
    />
  );
}
```

```vue [Vue]
<template>
  <input 
    type="file" 
    accept=".csv" 
    @change="handleFileChange"
    :disabled="loading"
  />
</template>

<script setup>
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-vue';

const { importCSV, loading } = useImportCSV();

const handleFileChange = async (e) => {
  const file = e.target.files[0];
  await importCSV(file, 'users');
};
</script>
```

:::

## Configuration Options

The adapter can be configured with various options:

```javascript
const config = {
  // Auto-connect on initialization
  autoConnect: true,
  
  // Enable debug mode
  debug: {
    enabled: true,
    logQueries: true,
    logTiming: true,
    slowQueryThreshold: 50 // ms
  },
  
  // Configure caching
  cache: {
    enabled: true,
    maxEntries: 100,
    ttl: 60000, // 1 minute
    strategy: 'lru'
  },
  
  // Worker configuration
  worker: true,
  
  // Log level
  logLevel: 'warning'
};
```

## Next Steps

Now that you have the basics working, explore more advanced features:

- [Query Builder](/guide/query-builder) - Build type-safe queries
- [Caching](/guide/caching) - Optimize performance with smart caching
- [Data Import/Export](/guide/data-import-export) - Work with external data
- [Debug Mode](/guide/debug-mode) - Troubleshoot and optimize
- [Spatial Extension](/guide/spatial) - Work with geographic data

## Need Help?

- Check our [API Reference](/api/core) for detailed documentation
- Browse [Examples](/examples/) for common use cases
- Visit [GitHub Issues](https://github.com/yourusername/duckdb-wasm-adapter-component/issues) for support
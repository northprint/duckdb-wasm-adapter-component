---
layout: home

hero:
  name: "DuckDB WASM Adapter"
  text: "In-Browser Analytics for Modern Web Apps"
  tagline: Powerful, type-safe DuckDB WASM integration for React, Vue, and Svelte applications
  image:
    src: /hero-image.svg
    alt: DuckDB WASM Adapter
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/northprint/duckdb-wasm-adapter-component

features:
  - icon: 🦆
    title: DuckDB Powered
    details: Leverage the full power of DuckDB's analytical engine directly in the browser. No server required.
  
  - icon: ⚡
    title: Framework Agnostic
    details: Native support for React, Vue, and Svelte with idiomatic APIs for each framework.
  
  - icon: 🎯
    title: Type-Safe
    details: Full TypeScript support with comprehensive type definitions and IntelliSense.
  
  - icon: 🚀
    title: High Performance
    details: Built-in caching, query optimization, and Web Worker support for smooth user experience.
  
  - icon: 🛠️
    title: Developer Friendly
    details: Debug mode, query profiling, and detailed error messages for easier development.
  
  - icon: 🌍
    title: Spatial Support
    details: Built-in spatial extension support for geographic and geometric data analysis.

---

## Quick Start

Install the adapter for your framework:

::: code-group

```bash [npm]
# React
npm install @northprint/duckdb-wasm-adapter-react

# Vue
npm install @northprint/duckdb-wasm-adapter-vue

# Svelte
npm install @northprint/duckdb-wasm-adapter-svelte
```

```bash [pnpm]
# React
pnpm add @northprint/duckdb-wasm-adapter-react

# Vue
pnpm add @northprint/duckdb-wasm-adapter-vue

# Svelte
pnpm add @northprint/duckdb-wasm-adapter-svelte
```

```bash [yarn]
# React
yarn add @northprint/duckdb-wasm-adapter-react

# Vue
yarn add @northprint/duckdb-wasm-adapter-vue

# Svelte
yarn add @northprint/duckdb-wasm-adapter-svelte
```

:::

## Basic Usage

::: code-group

```jsx [React]
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <DataTable />
    </DuckDBProvider>
  );
}

function DataTable() {
  const { data, loading } = useQuery('SELECT * FROM users');
  
  if (loading) return <div>Loading...</div>;
  
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

```vue [Vue]
<template>
  <div v-if="loading">Loading...</div>
  <table v-else>
    <tr v-for="row in data" :key="row.id">
      <td>{{ row.name }}</td>
      <td>{{ row.email }}</td>
    </tr>
  </table>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading } = useQuery('SELECT * FROM users');
</script>
```

```svelte [Svelte]
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const { query } = duckdb();
  const result = query('SELECT * FROM users');
</script>

{#if $result.loading}
  <div>Loading...</div>
{:else}
  <table>
    {#each $result.data as row}
      <tr>
        <td>{row.name}</td>
        <td>{row.email}</td>
      </tr>
    {/each}
  </table>
{/if}
```

:::

## Key Features

### 🔍 Query Builder

Build type-safe SQL queries with a fluent API:

```typescript
const query = select('name', 'email')
  .from('users')
  .where('age', '>', 18)
  .orderBy('name')
  .limit(10)
  .build();
```

### 💾 Smart Caching

Automatic query result caching with multiple eviction strategies:

```typescript
const { data } = useQuery(sql, params, {
  cache: {
    enabled: true,
    ttl: 60000, // 1 minute
    strategy: 'lru'
  }
});
```

### 🐛 Debug Mode

Comprehensive debugging tools for development:

```typescript
<DuckDBProvider debug={{
  enabled: true,
  logQueries: true,
  slowQueryThreshold: 50
}}>
```

### 📊 Data Import/Export

Easy data import and export in multiple formats:

```typescript
// Import CSV
await importCSV(file, 'table_name');

// Export to JSON
const data = await exportJSON('SELECT * FROM table');
```

## Performance

<div class="metrics-grid">
  <div class="metric-card">
    <div class="metric-value">50ms</div>
    <div class="metric-label">Average Query Time</div>
  </div>
  <div class="metric-card">
    <div class="metric-value">10MB</div>
    <div class="metric-label">Bundle Size</div>
  </div>
  <div class="metric-card">
    <div class="metric-value">1M+</div>
    <div class="metric-label">Rows/Second</div>
  </div>
  <div class="metric-card">
    <div class="metric-value">0</div>
    <div class="metric-label">Server Calls</div>
  </div>
</div>

## Why DuckDB WASM Adapter?

- **No Backend Required**: Run complex analytical queries directly in the browser
- **Privacy First**: Data never leaves the user's device
- **Offline Capable**: Works without internet connection
- **Cost Effective**: No server infrastructure needed
- **Fast Development**: Rapid prototyping with instant feedback

## Community

Join our growing community of developers building data-intensive web applications:

- 📖 [Documentation](/guide/getting-started)
- 💬 [GitHub Discussions](https://github.com/northprint/duckdb-wasm-adapter-component/discussions)
- 🐛 [Issue Tracker](https://github.com/northprint/duckdb-wasm-adapter-component/issues)
- 📦 [NPM Package](https://www.npmjs.com/package/@northprint/duckdb-wasm-adapter-core)

## License

MIT License - feel free to use in your projects!
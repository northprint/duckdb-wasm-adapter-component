# @northprint/duckdb-wasm-adapter-vue

Vue 3 adapter for DuckDB WASM with composables and plugin support.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-vue
# or
pnpm add @northprint/duckdb-wasm-adapter-vue
# or
yarn add @northprint/duckdb-wasm-adapter-vue
```

## Features

- 🎯 **Vue 3 Composables** - useQuery, useMutation, useConnection
- 🔌 **Plugin system** - Easy global configuration
- 🔄 **Reactive data** - Automatic reactivity with Vue's system
- 📊 **Component library** - Pre-built Vue components
- ⚡ **Performance optimized** - Efficient reactivity
- 🔧 **TypeScript support** - Full type safety

## Quick Start

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

## Plugin Setup

```javascript
// main.js
import { createApp } from 'vue';
import { DuckDBPlugin } from '@northprint/duckdb-wasm-adapter-vue';
import App from './App.vue';

const app = createApp(App);

app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    worker: true
  }
});

app.mount('#app');
```

## Documentation

For full documentation, visit [https://northprint.github.io/duckdb-wasm-adapter-component/](https://northprint.github.io/duckdb-wasm-adapter-component/)

## License

MIT
# DuckDB WASM Adapter Component

DuckDB WASMを簡単に使用できるようにするアダプターコンポーネントライブラリです。複雑なデータやり取りをラップし、Svelte、React、Vueでの使用を簡単にします。

## Features

- 🚀 **Easy to use** - シンプルなAPIでDuckDB WASMを操作
- 🎯 **Type-safe** - 完全なTypeScriptサポート
- 🔌 **Framework adapters** - Svelte、React、Vue用のアダプター
- 📦 **Data import/export** - CSV、JSON、Parquetファイルの入出力サポート
- ⚡ **Reactive** - フレームワーク固有のリアクティブパターンをサポート
- 🛡️ **Error handling** - 包括的なエラーハンドリング

## Packages

このモノレポには以下のパッケージが含まれています：

| Package | Description | Status |
|---------|-------------|--------|
| [@northprint/duckdb-wasm-adapter-core](./packages/core) | Core library with TypeScript support | ✅ v0.1.0 |
| [@northprint/duckdb-wasm-adapter-svelte](./packages/svelte-adapter) | Svelte stores and utilities | ✅ v0.1.0 |
| [@northprint/duckdb-wasm-adapter-react](./packages/react-adapter) | React hooks and context | ✅ v0.1.0 |
| [@northprint/duckdb-wasm-adapter-vue](./packages/vue-adapter) | Vue composables | ✅ v0.1.0 |

## Installation

### Core Library

```bash
npm install @northprint/duckdb-wasm-adapter-core
# or
pnpm add @northprint/duckdb-wasm-adapter-core
# or
yarn add @northprint/duckdb-wasm-adapter-core
```

### Framework Adapters

```bash
# Svelte
npm install @northprint/duckdb-wasm-adapter-svelte

# React
npm install @northprint/duckdb-wasm-adapter-react

# Vue
npm install @northprint/duckdb-wasm-adapter-vue
```

## Quick Start

### Core Library

```typescript
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';

// Create connection
const connection = await createConnection();

// Execute query
const result = await connection.execute('SELECT * FROM users');
const data = result.toArray();

// Import CSV
await connection.importCSV(file, 'users');

// Export as JSON
const json = await connection.exportJSON('SELECT * FROM users');
```

### Svelte

```svelte
<script>
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({ autoConnect: true });
  const queryStore = db.query('SELECT * FROM users');
</script>

{#if $queryStore.loading}
  <p>Loading...</p>
{:else if $queryStore.error}
  <p>Error: {$queryStore.error.message}</p>
{:else if $queryStore.data}
  <ul>
    {#each $queryStore.data as row}
      <li>{row.name}</li>
    {/each}
  </ul>
{/if}
```

### React

```tsx
import { DuckDBProvider, useQuery } from '@northprint/duckdb-wasm-adapter-react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <UserList />
    </DuckDBProvider>
  );
}

function UserList() {
  const { data, loading, error } = useQuery('SELECT * FROM users');
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <ul>
      {data?.map(row => (
        <li key={row.id}>{row.name}</li>
      ))}
    </ul>
  );
}
```

### Vue

```vue
<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <ul v-else-if="data">
      <li v-for="row in data" :key="row.id">
        {{ row.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useDuckDB, useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const db = useDuckDB({ autoConnect: true });
const { data, loading, error } = useQuery('SELECT * FROM users');
</script>
```

## Development

このプロジェクトはpnpmワークスペースを使用したモノレポとして構成されています。

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# Clone repository
git clone https://github.com/northprint/duckdb-wasm-adapter-component.git
cd duckdb-wasm-adapter-component

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Project Structure

```
duckdb-wasm-adapter-component/
├── packages/
│   ├── core/               # Core library
│   ├── svelte-adapter/     # Svelte adapter
│   ├── react-adapter/      # React adapter
│   └── vue-adapter/        # Vue adapter
├── examples/               # Example applications
├── docs/                   # Documentation
└── package.json           # Root package.json
```

## API Documentation

### Core Library

#### createConnection(config?, events?)

データベース接続を作成します。

```typescript
const connection = await createConnection({
  worker: true,
  logLevel: 'warning',
}, {
  onConnect: () => console.log('Connected'),
  onError: (error) => console.error('Error:', error),
});
```

#### connection.execute(query, params?)

SQLクエリを実行します。

```typescript
const result = await connection.execute(
  'SELECT * FROM users WHERE age > ?',
  [18]
);
```

#### connection.importCSV(file, tableName, options?)

CSVファイルをインポートします。

```typescript
await connection.importCSV(file, 'users', {
  header: true,
  delimiter: ',',
});
```

### Framework-specific APIs

各フレームワークアダプターの詳細なAPIドキュメントは、それぞれのパッケージディレクトリを参照してください：

- [Svelte API Documentation](./packages/svelte-adapter/README.md)
- [React API Documentation](./packages/react-adapter/README.md)
- [Vue API Documentation](./packages/vue-adapter/README.md)

## Testing

各パッケージには包括的なテストスイートが含まれています。

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @northprint/duckdb-wasm-adapter-core test

# Run tests in watch mode
pnpm test:watch
```

## Contributing

コントリビューションは歓迎します！Pull Requestを送る前に、以下を確認してください：

1. テストが全て通ること
2. TypeScriptの型チェックが通ること
3. コーディングスタイルが既存のコードと一致していること

## License

MIT

## Credits

このプロジェクトは[DuckDB WASM](https://github.com/duckdb/duckdb-wasm)をベースにしています。
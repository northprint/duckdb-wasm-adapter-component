# @northprint/duckdb-wasm-adapter-react

React adapter for DuckDB WASM with hooks and components for seamless integration.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-react
# or
pnpm add @northprint/duckdb-wasm-adapter-react
# or
yarn add @northprint/duckdb-wasm-adapter-react
```

## Features

- 🪝 **React Hooks** - useQuery, useMutation, useConnection hooks
- 🔄 **Automatic re-rendering** - Reactive data updates
- 🎨 **Component library** - Pre-built data components
- 📊 **Data visualization** - Chart and table components
- ⚡ **Performance optimized** - Memoization and lazy loading
- 🔧 **TypeScript support** - Full type safety

## Quick Start

```tsx
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

## Documentation

For full documentation, visit [https://northprint.github.io/duckdb-wasm-adapter-component/](https://northprint.github.io/duckdb-wasm-adapter-component/)

## License

MIT
// Main store creation function
export { createDuckDB } from './store.js';

// Hooks for common operations
export { useQuery, useMutation, useBatch, useTransaction } from './hooks.js';

// Svelte 5 Runes API
export {
  DuckDBRunes,
  QueryRune,
  MutationRune,
  TableRune,
  createDuckDBRunes,
  createQueryRune,
  createMutationRune,
  createTableRune,
} from './runes.svelte.js';

// Svelte 5 Props types
export type {
  QueryProps,
  FormProps,
  TableProps,
  ChartProps,
  FilterProps,
  ExportProps,
  ImportProps,
  DashboardProps,
  SchemaProps,
  QueryEditorProps,
  PaginationProps,
  QueryComponentProps,
  TableComponentProps,
  FormComponentProps,
  BindableQueryProps,
  VirtualTableProps,
  QueryHistoryProps,
  ConnectionStatusProps,
  DuckDBQueryProps,
  BindableModelProps,
} from './props.svelte.js';

// Utility functions
export {
  formatBytes,
  formatDuration,
  formatNumber,
  resultToCSV,
  downloadFile,
  debounce,
  getQueryType,
  isReadOnlyQuery,
  createAutoRefreshStore,
} from './utils.js';

// Type exports
export type {
  DuckDBStore,
  DuckDBStoreConfig,
  ConnectionStatus,
  QueryResult,
  QueryStore,
  ColumnMetadata,
  MutationResult,
} from './types.js';

// Re-export core types for convenience
export type {
  Connection,
  ConnectionConfig,
  ConnectionEvents,
  ResultSet,
  ImportOptions,
  ExportOptions,
  ErrorCode,
  DuckDBType,
} from '@northprint/duckdb-wasm-adapter-core';

// Re-export core error class
export { DuckDBError } from '@northprint/duckdb-wasm-adapter-core';
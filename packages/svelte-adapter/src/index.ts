// Main store creation function
export { createDuckDB } from './store.js';

// Hooks for common operations
export { useQuery, useMutation, useBatch, useTransaction } from './hooks.js';

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
} from '@duckdb-wasm-adapter/core';

// Re-export core error class
export { DuckDBError } from '@duckdb-wasm-adapter/core';
// Composables
export {
  useDuckDB,
  useQuery,
  useMutation,
  useBatch,
  useTransaction,
  useImportCSV,
  useImportJSON,
  useExportCSV,
  useExportJSON,
} from './composables.js';

export { useQueryBuilder } from './useQueryBuilder.js';

// Utility functions
export {
  formatBytes,
  formatDuration,
  formatNumber,
  resultToCSV,
  downloadFile,
  getQueryType,
  isReadOnlyQuery,
  debounce,
  throttle,
} from './utils.js';

// Type exports
export type {
  DuckDBInstance,
  DuckDBConfig,
  ConnectionStatus,
  QueryResult,
  MutationResult,
  ColumnMetadata,
  UseQueryOptions,
  UseMutationOptions,
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
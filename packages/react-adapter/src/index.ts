// Context and Provider
export { DuckDBProvider, useDuckDB } from './context.js';

// Hooks
export {
  useQuery,
  useMutation,
  useBatch,
  useTransaction,
  useImportCSV,
  useImportJSON,
  useExportCSV,
  useExportJSON,
  useQueryBuilder,
  useQueryBuilderQuery,
  useCache,
} from './hooks.js';

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
  DuckDBContextValue,
  DuckDBProviderProps,
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
  QueryBuilder,
  QueryBuilderFactory,
  CacheStats,
  CacheOptions,
} from '@northprint/duckdb-wasm-adapter-core';

// Re-export core error class and utilities
export { 
  DuckDBError,
  query,
  select,
  from,
  createQueryBuilder,
} from '@northprint/duckdb-wasm-adapter-core';
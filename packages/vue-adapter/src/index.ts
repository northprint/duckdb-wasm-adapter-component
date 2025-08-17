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

// Vue 3.4+ composables
export {
  useDuckDBScope,
  useQueryWithEffects,
  useDashboardScope,
} from './composables/useEffectScope.js';

export {
  useModelQuery,
  useBatchModelQuery,
  useValidatedModel,
} from './composables/useModelQuery.js';

export {
  useTypedQuery,
  useTypedMutation,
  useRelationshipQuery,
  useAggregationQuery,
  type TypedTable,
  type TypedQueryOptions,
  type Relationship,
  type AggregationOptions,
} from './composables/useTypedQuery.js';

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
} from '@northprint/duckdb-wasm-adapter-core';

// Re-export core error class
export { DuckDBError } from '@northprint/duckdb-wasm-adapter-core';
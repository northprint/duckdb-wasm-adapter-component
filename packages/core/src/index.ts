// Main exports
export { ConnectionManager, ConnectionImpl } from './connection.js';
export { QueryExecutor } from './query.js';
export { DataImporter } from './data-import.js';
export { DataExporter } from './data-export.js';
export { ResultSetImpl } from './result-set.js';
export { DuckDBError } from './errors.js';
export { DebugLogger, setGlobalDebugger, getGlobalDebugger } from './debug.js';

// Cache exports
export { QueryCacheManager } from './cache/index.js';
export type {
  CacheKey,
  CacheEntry,
  CacheOptions,
  CacheStats,
  CacheManager,
} from './cache/types.js';

// Query Builder exports
export { 
  query,
  select,
  from,
  raw,
  createQueryBuilder,
  QueryBuilderFactory,
  SelectQueryBuilder,
} from './query-builder/index.js';

export type {
  QueryBuilder,
  InsertBuilder,
  UpdateBuilder,
  DeleteBuilder,
  CreateTableBuilder,
  ComparisonOperator,
  OrderDirection,
  JoinType,
  LogicalOperator,
  AggregateFunction,
  WhereCondition,
  ColumnOptions,
} from './query-builder/types.js';

// Type exports
export type {
  Connection,
  ConnectionConfig,
  ConnectionEvents,
  ResultSet,
  ColumnMetadata,
  DuckDBType,
  ImportOptions,
  ExportOptions,
  QueryOptions,
  DebugConfig,
  QueryProfile,
} from './types.js';

export { ErrorCode } from './types.js';

// Convenience function for creating connections
import { ConnectionManager } from './connection.js';
import type { Connection, ConnectionConfig, ConnectionEvents } from './types.js';

export async function createConnection(
  config?: ConnectionConfig,
  events?: ConnectionEvents
): Promise<Connection> {
  const manager = ConnectionManager.getInstance();
  return manager.createConnection(config, events);
}

export async function closeAllConnections(): Promise<void> {
  const manager = ConnectionManager.getInstance();
  return manager.closeAll();
}
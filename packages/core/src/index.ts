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
  ConnectionConfig,
  ConnectionEvents,
  ColumnMetadata,
  DuckDBType,
  ImportOptions,
  ExportOptions,
  QueryOptions,
  DebugConfig,
  QueryProfile,
} from './types.js';

// Re-export types
export type { Connection, ResultSet } from './types.js';

export { ErrorCode } from './types.js';

// Convenience function for creating connections
import { ConnectionManager } from './connection.js';
import type { Connection, ConnectionConfig, ConnectionEvents } from './types.js';
import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let duckdbInstance: AsyncDuckDB | null = null;

async function initializeDuckDB(config?: ConnectionConfig): Promise<AsyncDuckDB> {
  if (duckdbInstance) {
    return duckdbInstance;
  }
  
  // Initialize DuckDB WASM
  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: '/duckdb-mvp.wasm',
      mainWorker: '/duckdb-browser-mvp.worker.js',
    },
    eh: {
      mainModule: '/duckdb-eh.wasm',
      mainWorker: '/duckdb-browser-eh.worker.js',
    },
  };
  
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = config?.worker !== false 
    ? new Worker(bundle.mainWorker!) 
    : undefined;
  const logger = new duckdb.ConsoleLogger();
  
  duckdbInstance = new duckdb.AsyncDuckDB(logger, worker);
  await duckdbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
  
  return duckdbInstance;
}

export async function createConnection(
  config?: ConnectionConfig,
  events?: ConnectionEvents
): Promise<Connection> {
  const manager = ConnectionManager.getInstance();
  const duckdb = await initializeDuckDB(config);
  return manager.createConnection(duckdb, config);
}

export async function closeAllConnections(): Promise<void> {
  const manager = ConnectionManager.getInstance();
  return manager.closeAllConnections();
}
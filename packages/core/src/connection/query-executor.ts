import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ResultSet } from '../result-set.js';
import type { CacheManager } from '../cache/types.js';
import { QueryExecutor as QueryExec } from '../query.js';
import type { DebugLogger } from '../debug.js';
import { QueryError } from '../errors/query-error.js';

export interface QueryExecutorOptions {
  connection: AsyncDuckDBConnection;
  cacheManager?: CacheManager<unknown>;
  debugLogger: DebugLogger;
  events?: {
    onQuery?: (query: string, duration: number) => void;
  };
}

/**
 * Handles query execution logic
 */
export class QueryExecutor {
  private connection: AsyncDuckDBConnection;
  private cacheManager?: CacheManager<unknown>;
  private debugLogger: DebugLogger;
  private events?: {
    onQuery?: (query: string, duration: number) => void;
  };
  private queryExec: QueryExec;

  constructor(options: QueryExecutorOptions) {
    this.connection = options.connection;
    this.cacheManager = options.cacheManager;
    this.debugLogger = options.debugLogger;
    this.events = options.events;
    this.queryExec = new QueryExec(this.connection);
  }

  async execute<T = Record<string, unknown>>(
    query: string,
    params?: unknown[]
  ): Promise<ResultSet<T>> {
    const startTime = performance.now();
    
    this.debugLogger.log('Executing query:', query);
    this.debugLogger.log('With params:', params);
    
    // Check cache for SELECT queries
    if (this.cacheManager && this.isReadOnlyQuery(query)) {
      const cachedData = this.cacheManager.get(query, params) as T[] | undefined;
      
      if (cachedData && cachedData.length > 0) {
        this.debugLogger.log('Cache hit for query:', query);
        this.debugLogger.log('Cached data length:', cachedData.length);
        
        // Create ResultSet from cached data
        return {
          rows: cachedData,
          columns: [], // Would need to store metadata in cache
          rowCount: cachedData.length,
          toArray: () => cachedData,
          toObject: () => cachedData as Record<string, unknown>[],
          getMetadata: () => [],
          [Symbol.iterator]: function* () {
            for (const row of cachedData) {
              yield row;
            }
          },
        } as ResultSet<T>;
      }
    }
    
    try {
      // Execute the query
      const result = await this.queryExec.execute<T>(query, params);
      const duration = performance.now() - startTime;
      
      this.events?.onQuery?.(query, duration);
      
      // For caching, we need to materialize the result
      const resultArray = result.toArray();
      this.debugLogger.log('Result rows:', resultArray.length);
      this.debugLogger.log('First row:', resultArray[0]);
      
      // Cache the result for SELECT queries
      if (this.cacheManager && this.isReadOnlyQuery(query)) {
        this.cacheManager.set(query, params || [], resultArray);
        this.debugLogger.log('Cached query result:', query);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.events?.onQuery?.(query, duration);
      throw error;
    }
  }

  executeSync<T = Record<string, unknown>>(
    _query: string,
    _params?: unknown[]
  ): T[] {
    // Note: This is actually async under the hood but we block
    throw QueryError.unsupportedOperation('Synchronous execution in browser environment');
  }

  private isReadOnlyQuery(query: string): boolean {
    const normalizedQuery = query.trim().toUpperCase();
    return (
      normalizedQuery.startsWith('SELECT') ||
      normalizedQuery.startsWith('WITH') ||
      normalizedQuery.startsWith('DESCRIBE') ||
      normalizedQuery.startsWith('SHOW')
    );
  }

  async applyQueryConfig(config: Record<string, unknown>): Promise<void> {
    if (config.schema) {
      await this.connection.query(`SET search_path TO '${config.schema as string}'`);
    }
    
    if (config.timeout) {
      await this.connection.query(`SET statement_timeout = ${config.timeout as number}`);
    }
    
    if (config.memoryLimit) {
      await this.connection.query(`SET memory_limit = '${config.memoryLimit as string}'`);
    }
  }

  updateCacheManager(cacheManager?: CacheManager<unknown>): void {
    this.cacheManager = cacheManager;
  }

  updateConnection(connection: AsyncDuckDBConnection): void {
    this.connection = connection;
    this.queryExec = new QueryExec(connection);
  }
}
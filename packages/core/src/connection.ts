import * as duckdb from '@duckdb/duckdb-wasm';
import type {
  Connection,
  ConnectionConfig,
  ConnectionEvents,
  ImportOptions,
  ExportOptions,
  ResultSet,
} from './types.js';
import { DuckDBError } from './errors.js';
import { QueryExecutor } from './query.js';
import { DataImporter } from './data-import.js';
import { DataExporter } from './data-export.js';
import { DebugLogger } from './debug.js';
import { QueryCacheManager } from './cache/index.js';
import type { CacheStats } from './cache/types.js';

let connectionIdCounter = 0;

export class ConnectionImpl implements Connection {
  public readonly id: string;
  private _status: Connection['status'] = 'connecting';
  private connection?: duckdb.AsyncDuckDBConnection;
  private queryExecutor?: QueryExecutor;
  private dataImporter?: DataImporter;
  private dataExporter?: DataExporter;
  private events?: ConnectionEvents;
  private debugLogger: DebugLogger;
  private cacheManager?: QueryCacheManager;

  constructor(
    private duckdbInstance: duckdb.AsyncDuckDB,
    private config?: ConnectionConfig,
    events?: ConnectionEvents
  ) {
    this.id = `conn-${++connectionIdCounter}`;
    this.events = events;
    this.debugLogger = new DebugLogger(config?.debug);
    
    // Initialize cache if enabled
    if (config?.cache?.enabled) {
      this.cacheManager = new QueryCacheManager(config.cache.options);
    }
  }

  get status(): Connection['status'] {
    return this._status;
  }

  async initialize(): Promise<void> {
    try {
      this._status = 'connecting';
      this.debugLogger.logConnection('connecting');
      
      this.connection = await this.duckdbInstance.connect();
      
      // Apply configuration
      if (this.config?.query) {
        await this.applyQueryConfig();
      }

      this.queryExecutor = new QueryExecutor(this.connection, this.debugLogger);
      this.dataImporter = new DataImporter(this.connection);
      this.dataExporter = new DataExporter(this.connection);
      
      this._status = 'connected';
      this.debugLogger.logConnection('connected');
      this.events?.onConnect?.();
    } catch (error) {
      this._status = 'error';
      const duckdbError = DuckDBError.connectionFailed(
        'Failed to initialize connection',
        error as Error
      );
      this.debugLogger.logError(duckdbError);
      this.events?.onError?.(duckdbError);
      throw duckdbError;
    }
  }

  async execute<T = Record<string, unknown>>(
    query: string,
    params?: unknown[]
  ): Promise<ResultSet<T>> {
    if (!this.queryExecutor || this._status !== 'connected') {
      throw DuckDBError.notConnected();
    }

    // Check cache for SELECT queries
    if (this.cacheManager && this.isReadOnlyQuery(query)) {
      const cacheKey = { query, params };
      const cachedData = this.cacheManager.get(cacheKey);
      
      if (cachedData && cachedData.length > 0) {
        this.debugLogger.log('Cache hit for query:', query);
        this.debugLogger.log('Cached data length:', cachedData.length);
        // Create ResultSet from cached data
        return {
          rows: cachedData as T[],
          columns: [], // Would need to store metadata in cache
          rowCount: cachedData.length,
          toArray: () => cachedData as T[],
          toObject: () => cachedData as Record<string, unknown>[],
          getMetadata: () => [],
          [Symbol.iterator]: function* () {
            for (const row of cachedData as T[]) {
              yield row;
            }
          },
        };
      } else {
        this.debugLogger.log('Cache miss for query:', query);
      }
    }

    const startTime = performance.now();
    try {
      const result = await this.queryExecutor.execute<T>(query, params);
      const duration = performance.now() - startTime;
      this.events?.onQuery?.(query, duration);
      
      // Log result details
      const resultArray = result.toArray();
      this.debugLogger.log('Query executed:', query);
      this.debugLogger.log('Result rows:', resultArray.length);
      this.debugLogger.log('First row:', resultArray[0]);
      
      // Cache the result for SELECT queries
      if (this.cacheManager && this.isReadOnlyQuery(query)) {
        const cacheKey = { query, params };
        this.cacheManager.set(cacheKey, resultArray, result.getMetadata());
        this.debugLogger.log('Cached query result:', query);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.events?.onQuery?.(query, duration);
      throw error;
    }
  }

  private isReadOnlyQuery(query: string): boolean {
    const trimmed = query.trim().toUpperCase();
    return trimmed.startsWith('SELECT') || 
           trimmed.startsWith('WITH') ||
           trimmed.startsWith('SHOW') ||
           trimmed.startsWith('DESCRIBE') ||
           trimmed.startsWith('EXPLAIN');
  }

  executeSync<T = Record<string, unknown>>(
    _query: string,
    _params?: unknown[]
  ): ResultSet<T> {
    throw DuckDBError.unsupportedOperation('Synchronous execution is not supported in browser environment');
  }

  async close(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        this._status = 'disconnected';
        this.events?.onDisconnect?.();
      } catch (error) {
        const duckdbError = DuckDBError.connectionFailed(
          'Failed to close connection',
          error as Error
        );
        this.events?.onError?.(duckdbError);
        throw duckdbError;
      } finally {
        this.connection = undefined;
        this.queryExecutor = undefined;
        this.dataImporter = undefined;
        this.dataExporter = undefined;
      }
    }
  }

  async importCSV(
    file: File | string,
    tableName: string,
    options?: ImportOptions
  ): Promise<void> {
    if (!this.dataImporter || this._status !== 'connected') {
      throw DuckDBError.notConnected();
    }
    return this.dataImporter.importCSV(file, tableName, options);
  }

  async importJSON(data: unknown[], tableName: string): Promise<void> {
    if (!this.dataImporter || this._status !== 'connected') {
      throw DuckDBError.notConnected();
    }
    return this.dataImporter.importJSON(data, tableName);
  }

  async importParquet(file: File | ArrayBuffer, tableName: string): Promise<void> {
    if (!this.dataImporter || this._status !== 'connected') {
      throw DuckDBError.notConnected();
    }
    return this.dataImporter.importParquet(file, tableName);
  }

  async exportCSV(query: string, options?: ExportOptions): Promise<string> {
    if (!this.dataExporter || this._status !== 'connected') {
      throw DuckDBError.notConnected();
    }
    return this.dataExporter.exportCSV(query, options);
  }

  async exportJSON<T = Record<string, unknown>>(query: string): Promise<T[]> {
    if (!this.dataExporter || this._status !== 'connected') {
      throw DuckDBError.notConnected();
    }
    return this.dataExporter.exportJSON<T>(query);
  }

  clearCache(): void {
    if (this.cacheManager) {
      this.cacheManager.clear();
      this.debugLogger.log('Cache cleared');
    }
  }

  getCacheStats(): CacheStats {
    if (!this.cacheManager) {
      return {
        hits: 0,
        misses: 0,
        evictions: 0,
        entries: 0,
        totalSize: 0,
        hitRate: 0,
      };
    }
    return this.cacheManager.getStats();
  }

  invalidateCache(pattern: string | RegExp): number {
    if (!this.cacheManager) {
      return 0;
    }
    const invalidated = this.cacheManager.invalidate(pattern);
    this.debugLogger.log(`Cache invalidated: ${invalidated} entries`);
    return invalidated;
  }

  private async applyQueryConfig(): Promise<void> {
    if (!this.connection || !this.config?.query) return;

    const settings: string[] = [];
    
    if (this.config.query.castBigIntToDouble !== undefined) {
      settings.push(`SET force_bigint_output=${!this.config.query.castBigIntToDouble}`);
    }
    
    for (const setting of settings) {
      await this.connection.query(setting);
    }
  }
}

export class ConnectionManager {
  private static instance: ConnectionManager;
  private connections = new Map<string, ConnectionImpl>();
  private duckdbInstance?: duckdb.AsyncDuckDB;
  private initializationPromise?: Promise<void>;

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async createConnection(
    config?: ConnectionConfig,
    events?: ConnectionEvents
  ): Promise<Connection> {
    if (!this.duckdbInstance) {
      await this.initializeDuckDB(config);
    }

    const connection = new ConnectionImpl(this.duckdbInstance!, config, events);
    await connection.initialize();
    this.connections.set(connection.id, connection);

    return connection;
  }

  private async initializeDuckDB(config?: ConnectionConfig): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.doInitialize(config);
    await this.initializationPromise;
  }

  private async doInitialize(config?: ConnectionConfig): Promise<void> {
    try {
      // Configure DuckDB WASM bundles
      const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
        mvp: {
          mainModule: '/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
          mainWorker: '/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
        },
        eh: {
          mainModule: '/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm',
          mainWorker: '/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
        },
      };

      // Select appropriate bundle
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      
      // Configure logger
      const logLevel = config?.logLevel || 'warning';
      const logger = new duckdb.ConsoleLogger(logLevel as any);

      // Create DuckDB instance with or without worker
      if (config?.worker !== false && bundle.mainWorker) {
        // Skip Worker creation in test environment
        if (typeof Worker !== 'undefined') {
          const worker = new Worker(bundle.mainWorker);
          this.duckdbInstance = new duckdb.AsyncDuckDB(logger, worker);
        } else {
          this.duckdbInstance = new duckdb.AsyncDuckDB(logger);
        }
      } else {
        this.duckdbInstance = new duckdb.AsyncDuckDB(logger);
      }

      // Instantiate with the selected bundle
      await this.duckdbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);
    } catch (error) {
      throw DuckDBError.initializationFailed(
        'Failed to initialize DuckDB WASM',
        error as Error
      );
    }
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async closeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (connection) {
      await connection.close();
      this.connections.delete(id);
    }
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(conn => conn.close());
    await Promise.all(closePromises);
    this.connections.clear();

    if (this.duckdbInstance) {
      await this.duckdbInstance.terminate();
      this.duckdbInstance = undefined;
      this.initializationPromise = undefined;
    }
  }

  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  isInitialized(): boolean {
    return this.duckdbInstance !== undefined;
  }
}
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';
import type { 
  Connection, 
  ConnectionConfig, 
  ConnectionStatus,
  ConnectionEvents,
  ResultSet,
  ImportOptions,
  ExportOptions,
  CacheStats
} from './types.js';
import { QueryCacheManager } from './cache/cache-manager.js';
import { DebugLogger } from './debug.js';
import { ConnectionError } from './errors/connection-error.js';
import { QueryExecutor } from './connection/query-executor.js';
import { DataPorter } from './connection/data-porter.js';
import { ConnectionLifecycle } from './connection/connection-lifecycle.js';

let connectionIdCounter = 0;

/**
 * ConnectionImpl using composition pattern
 * Delegates responsibilities to specialized classes for better maintainability
 */
export class ConnectionImpl implements Connection {
  readonly id: string;
  private lifecycle: ConnectionLifecycle;
  private queryExecutor: QueryExecutor | null = null;
  private dataPorter: DataPorter | null = null;
  private cacheManager: QueryCacheManager<unknown> | null = null;
  private debugLogger: DebugLogger;
  private events?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onQuery?: (query: string, duration: number) => void;
  };

  constructor(
    duckdbInstance: AsyncDuckDB,
    private config: ConnectionConfig = {}
  ) {
    this.id = `conn-${++connectionIdCounter}`;
    this.debugLogger = new DebugLogger(config.debug);
    this.events = config.events;
    
    // Initialize lifecycle manager
    this.lifecycle = new ConnectionLifecycle({
      duckdbInstance,
      config,
      debugLogger: this.debugLogger,
      events: {
        onConnect: this.events?.onConnect,
        onDisconnect: this.events?.onDisconnect,
        onError: this.events?.onError,
      }
    });
    
    // Initialize cache if enabled
    if (config.cache?.enabled) {
      this.cacheManager = new QueryCacheManager(config.cache.options || {});
    }
  }

  get status(): ConnectionStatus {
    return this.lifecycle.status;
  }

  async initialize(): Promise<void> {
    const connection = await this.lifecycle.initialize();
    
    // Initialize executors with the connection
    this.queryExecutor = new QueryExecutor({
      connection,
      cacheManager: this.cacheManager || undefined,
      debugLogger: this.debugLogger,
      events: {
        onQuery: this.events?.onQuery,
      }
    });
    
    this.dataPorter = new DataPorter({
      connection,
      debugLogger: this.debugLogger,
    });
    
    // Apply query configuration if provided
    if (this.config.queryConfig && this.queryExecutor) {
      await this.queryExecutor.applyQueryConfig(this.config.queryConfig);
    }
  }

  async execute<T = Record<string, unknown>>(
    query: string,
    params?: unknown[]
  ): Promise<ResultSet<T>> {
    if (!this.queryExecutor) {
      await this.initialize();
    }
    if (!this.queryExecutor) {
      throw ConnectionError.notInitialized();
    }
    return this.queryExecutor.execute<T>(query, params);
  }

  executeSync<T = Record<string, unknown>>(
    query: string,
    params?: unknown[]
  ): T[] {
    if (!this.queryExecutor) {
      throw ConnectionError.notInitialized();
    }
    return this.queryExecutor.executeSync<T>(query, params);
  }

  async close(): Promise<void> {
    await this.lifecycle.close();
    this.queryExecutor = null;
    this.dataPorter = null;
  }

  async importCSV(
    file: File | string,
    tableName: string,
    options?: ImportOptions
  ): Promise<void> {
    if (!this.dataPorter) {
      await this.initialize();
    }
    if (!this.dataPorter) {
      throw ConnectionError.notInitialized();
    }
    return this.dataPorter.importCSV(file, tableName, options);
  }

  async importJSON(
    data: unknown[] | string,
    tableName: string
  ): Promise<void> {
    if (!this.dataPorter) {
      await this.initialize();
    }
    if (!this.dataPorter) {
      throw ConnectionError.notInitialized();
    }
    return this.dataPorter.importJSON(data, tableName);
  }

  async importParquet(
    file: File | ArrayBuffer,
    tableName: string
  ): Promise<void> {
    if (!this.dataPorter) {
      await this.initialize();
    }
    if (!this.dataPorter) {
      throw ConnectionError.notInitialized();
    }
    return this.dataPorter.importParquet(file, tableName);
  }

  async exportCSV(
    query: string,
    options?: ExportOptions
  ): Promise<string> {
    if (!this.dataPorter) {
      await this.initialize();
    }
    if (!this.dataPorter) {
      throw ConnectionError.notInitialized();
    }
    return this.dataPorter.exportCSV(query, options);
  }

  async exportJSON<T = Record<string, unknown>>(
    query: string
  ): Promise<T[]> {
    if (!this.dataPorter) {
      await this.initialize();
    }
    if (!this.dataPorter) {
      throw ConnectionError.notInitialized();
    }
    return this.dataPorter.exportJSON<T>(query);
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
        hitRate: 0,
        size: 0,
      };
    }
    
    return this.cacheManager.getStats();
  }

  invalidateCache(pattern: string | RegExp): number {
    if (!this.cacheManager) {
      return 0;
    }
    
    const invalidated = this.cacheManager.invalidate(pattern);
    this.debugLogger.log(`Invalidated ${invalidated} cache entries`);
    return invalidated;
  }
}

/**
 * ConnectionManager for managing multiple connections (Singleton)
 */
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private connections = new Map<string, Connection>();
  private activeConnectionId: string | null = null;

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  async createConnection(
    duckdb?: AsyncDuckDB,
    configOrEvents?: ConnectionConfig | ConnectionEvents
  ): Promise<Connection> {
    // For backward compatibility, support both signatures
    let config: ConnectionConfig = {};
    
    if (configOrEvents) {
      // Check if it's events (has onConnect, onDisconnect, etc.)
      if ('onConnect' in configOrEvents || 'onDisconnect' in configOrEvents || 
          'onError' in configOrEvents || 'onQuery' in configOrEvents) {
        // It's a ConnectionEvents object
        config = { events: configOrEvents };
      } else {
        // It's a ConnectionConfig object
        config = configOrEvents as ConnectionConfig;
      }
    }
    
    // Use mock DuckDB for testing if not provided
    const duckdbInstance = duckdb || ({
      connect: () => Promise.resolve({
        query: () => Promise.resolve({ toArray: () => [] }),
        close: () => Promise.resolve(),
      }),
      close: () => Promise.resolve(),
    } as unknown as AsyncDuckDB);
    
    const connection = new ConnectionImpl(duckdbInstance, config);
    await connection.initialize();
    
    this.connections.set(connection.id, connection);
    
    if (!this.activeConnectionId) {
      this.activeConnectionId = connection.id;
    }
    
    return connection;
  }

  getConnection(id?: string): Connection | undefined {
    if (id) {
      return this.connections.get(id);
    }
    
    if (this.activeConnectionId) {
      return this.connections.get(this.activeConnectionId);
    }
    
    return undefined;
  }

  getActiveConnection(): Connection | undefined {
    return this.getConnection();
  }

  setActiveConnection(id: string): void {
    if (this.connections.has(id)) {
      this.activeConnectionId = id;
    }
  }

  async closeConnection(id?: string): Promise<void> {
    const connectionId = id || this.activeConnectionId;
    
    if (!connectionId) {
      return;
    }
    
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      await connection.close();
      this.connections.delete(connectionId);
      
      if (this.activeConnectionId === connectionId) {
        this.activeConnectionId = this.connections.keys().next().value || null;
      }
    }
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(
      conn => conn.close()
    );
    
    await Promise.all(closePromises);
    this.connections.clear();
    this.activeConnectionId = null;
  }

  // Alias for backward compatibility
  async closeAll(): Promise<void> {
    return this.closeAllConnections();
  }

  listConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  // Get active connections for backward compatibility
  getActiveConnections(): string[] {
    return this.listConnections();
  }

  // Check if any connections are initialized
  isInitialized(): boolean {
    return this.connections.size > 0;
  }
}
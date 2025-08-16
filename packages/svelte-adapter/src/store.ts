import { writable, get } from 'svelte/store';
import {
  createConnection,
  type Connection,
  type ConnectionEvents,
  type ImportOptions,
  type ExportOptions,
} from '@duckdb-wasm-adapter/core';
import type {
  DuckDBStore,
  DuckDBStoreConfig,
  ConnectionStatus,
  QueryStore,
  QueryResult,
} from './types.js';

export function createDuckDB(config?: DuckDBStoreConfig): DuckDBStore {
  // State stores
  const connection = writable<Connection | null>(null);
  const status = writable<ConnectionStatus>('idle');
  const error = writable<Error | null>(null);
  
  // Auto-connect flag
  const autoConnect = config?.autoConnect ?? false;
  
  // Connection events
  const events: ConnectionEvents = {
    onConnect: () => {
      status.set('connected');
      if (config?.events?.onConnect) {
        config.events.onConnect();
      }
    },
    onDisconnect: () => {
      status.set('disconnected');
      if (config?.events?.onDisconnect) {
        config.events.onDisconnect();
      }
    },
    onError: (err) => {
      error.set(err);
      status.set('error');
      if (config?.events?.onError) {
        config.events.onError(err);
      }
    },
    onQuery: config?.events?.onQuery,
  };
  
  // Connect to database
  async function connect(): Promise<void> {
    try {
      status.set('connecting');
      error.set(null);
      
      const conn = await createConnection(config, events);
      connection.set(conn);
      status.set('connected');
    } catch (err) {
      const duckdbError = err instanceof Error ? err : new Error(String(err));
      error.set(duckdbError);
      status.set('error');
      throw duckdbError;
    }
  }
  
  // Disconnect from database
  async function disconnect(): Promise<void> {
    const conn = get(connection);
    if (conn) {
      try {
        await conn.close();
        connection.set(null);
        status.set('disconnected');
        error.set(null);
      } catch (err) {
        const duckdbError = err instanceof Error ? err : new Error(String(err));
        error.set(duckdbError);
        throw duckdbError;
      }
    }
  }
  
  // Execute query and return reactive store
  function query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): QueryStore<T> {
    const result = writable<QueryResult<T>>({
      data: null,
      loading: true,
      error: null,
      metadata: null,
    });
    
    let cancelled = false;
    
    async function executeQuery(): Promise<void> {
      const conn = get(connection);
      
      if (!conn) {
        result.set({
          data: null,
          loading: false,
          error: new Error('Not connected to database'),
          metadata: null,
        });
        return;
      }
      
      result.update(r => ({ ...r, loading: true, error: null }));
      
      try {
        if (cancelled) return;
        
        const resultSet = await conn.execute<T>(sql, params);
        
        if (cancelled) return;
        
        result.set({
          data: resultSet.toArray(),
          loading: false,
          error: null,
          metadata: resultSet.getMetadata(),
        });
      } catch (err) {
        if (cancelled) return;
        
        const duckdbError = err instanceof Error ? err : new Error(String(err));
        result.set({
          data: null,
          loading: false,
          error: duckdbError,
          metadata: null,
        });
      }
    }
    
    // Execute query immediately
    executeQuery();
    
    // Create query store with refetch and cancel methods
    const { subscribe } = result;
    
    return {
      subscribe,
      refetch: executeQuery,
      cancel: () => {
        cancelled = true;
        result.update(r => ({ ...r, loading: false }));
      },
    };
  }
  
  // Import/Export methods
  async function importCSV(
    file: File | string,
    tableName: string,
    options?: ImportOptions
  ): Promise<void> {
    const conn = get(connection);
    if (!conn) {
      throw new Error('Not connected to database');
    }
    return conn.importCSV(file, tableName, options);
  }
  
  async function importJSON(data: unknown[], tableName: string): Promise<void> {
    const conn = get(connection);
    if (!conn) {
      throw new Error('Not connected to database');
    }
    return conn.importJSON(data, tableName);
  }
  
  async function importParquet(
    file: File | ArrayBuffer,
    tableName: string
  ): Promise<void> {
    const conn = get(connection);
    if (!conn) {
      throw new Error('Not connected to database');
    }
    return conn.importParquet(file, tableName);
  }
  
  async function exportCSV(sql: string, options?: ExportOptions): Promise<string> {
    const conn = get(connection);
    if (!conn) {
      throw new Error('Not connected to database');
    }
    return conn.exportCSV(sql, options);
  }
  
  async function exportJSON<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const conn = get(connection);
    if (!conn) {
      throw new Error('Not connected to database');
    }
    return conn.exportJSON<T>(sql);
  }
  
  // Auto-connect if configured
  if (autoConnect) {
    connect().catch(err => {
      console.error('Auto-connect failed:', err);
    });
  }
  
  // Return the stores directly without derived wrappers
  return {
    connection,
    status,
    error,
    connect,
    disconnect,
    query,
    importCSV,
    importJSON,
    importParquet,
    exportCSV,
    exportJSON,
  };
}
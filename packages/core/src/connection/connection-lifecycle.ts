import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ConnectionConfig, ConnectionStatus } from '../types.js';
import type { DebugLogger } from '../debug.js';
import { ConnectionError } from '../errors/connection-error.js';

export interface ConnectionLifecycleOptions {
  duckdbInstance: AsyncDuckDB;
  config: ConnectionConfig;
  debugLogger: DebugLogger;
  events?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
  };
}

/**
 * Manages connection lifecycle (initialization, status, cleanup)
 */
export class ConnectionLifecycle {
  private duckdbInstance: AsyncDuckDB;
  private connection: AsyncDuckDBConnection | null = null;
  private _status: ConnectionStatus = 'idle';
  private config: ConnectionConfig;
  private debugLogger: DebugLogger;
  private events?: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
  };

  constructor(options: ConnectionLifecycleOptions) {
    this.duckdbInstance = options.duckdbInstance;
    this.config = options.config;
    this.debugLogger = options.debugLogger;
    this.events = options.events;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  getConnection(): AsyncDuckDBConnection | null {
    return this.connection;
  }

  async initialize(): Promise<AsyncDuckDBConnection> {
    if (this.connection) {
      return this.connection;
    }

    try {
      this._status = 'connecting';
      this.debugLogger.log('Initializing connection...');
      
      // Create a new connection
      this.connection = await this.duckdbInstance.connect();
      
      // Apply initial configuration
      if (this.config.schema) {
        await this.connection.query(`CREATE SCHEMA IF NOT EXISTS ${this.config.schema}`);
        await this.connection.query(`SET search_path TO '${this.config.schema}'`);
      }
      
      if (this.config.readOnly) {
        await this.connection.query('SET access_mode = READ_ONLY');
      }
      
      this._status = 'connected';
      this.debugLogger.log('Connection initialized successfully');
      this.events?.onConnect?.();
      
      return this.connection;
    } catch (error) {
      this._status = 'error';
      this.events?.onError?.(error as Error);
      throw ConnectionError.connectionFailed('Failed to initialize connection', error as Error);
    }
  }

  async close(): Promise<void> {
    if (!this.connection) {
      return;
    }
    
    try {
      this._status = 'disconnecting';
      this.debugLogger.log('Closing connection...');
      
      // Close the connection
      await this.connection.close();
      this.connection = null;
      
      this._status = 'idle';
      this.debugLogger.log('Connection closed successfully');
      this.events?.onDisconnect?.();
    } catch (error) {
      this._status = 'error';
      this.events?.onError?.(error as Error);
      throw ConnectionError.connectionFailed('Failed to close connection', error as Error);
    }
  }

  async reconnect(): Promise<AsyncDuckDBConnection> {
    await this.close();
    return this.initialize();
  }

  isConnected(): boolean {
    return this._status === 'connected' && this.connection !== null;
  }

  requireConnection(): AsyncDuckDBConnection {
    if (!this.connection) {
      throw ConnectionError.notInitialized();
    }
    return this.connection;
  }
}
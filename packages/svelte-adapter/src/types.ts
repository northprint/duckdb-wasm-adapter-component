import type { Readable } from 'svelte/store';
import type {
  Connection,
  ConnectionConfig,
  ConnectionEvents,
  ImportOptions,
  ExportOptions,
} from '@northprint/duckdb-wasm-adapter-core';

export interface DuckDBStore {
  connection: Readable<Connection | null>;
  status: Readable<ConnectionStatus>;
  error: Readable<Error | null>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): QueryStore<T>;
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  importParquet(file: File | ArrayBuffer, tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T = Record<string, unknown>>(query: string): Promise<T[]>;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface QueryResult<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  metadata: ColumnMetadata[] | null;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
}

export interface QueryStore<T> extends Readable<QueryResult<T>> {
  refetch(): Promise<void>;
  cancel(): void;
}

export interface DuckDBStoreConfig extends ConnectionConfig {
  autoConnect?: boolean;
  events?: ConnectionEvents;
}

export interface MutationResult<T> {
  execute(sql: string, params?: unknown[]): Promise<T[]>;
  loading: Readable<boolean>;
  error: Readable<Error | null>;
  data: Readable<T[] | null>;
}
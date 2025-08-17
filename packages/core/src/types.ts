export interface ConnectionConfig {
  worker?: boolean;
  logLevel?: 'silent' | 'error' | 'warning' | 'info' | 'debug';
  query?: {
    castBigIntToDouble?: boolean;
    castDecimalToDouble?: boolean;
    castTimestampToDate?: boolean;
  };
  path?: string;
  debug?: DebugConfig;
  cache?: {
    enabled?: boolean;
    options?: import('./cache/types.js').CacheOptions; // eslint-disable-line @typescript-eslint/consistent-type-imports
  };
}

export interface DebugConfig {
  enabled?: boolean;
  logQueries?: boolean;
  logTiming?: boolean;
  slowQueryThreshold?: number; // milliseconds
  logMemory?: boolean;
  profileQueries?: boolean;
}

export interface Connection {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  execute<T = Record<string, unknown>>(query: string, params?: unknown[]): Promise<ResultSet<T>>;
  executeSync<T = Record<string, unknown>>(query: string, params?: unknown[]): ResultSet<T>;
  close(): Promise<void>;
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  importParquet(file: File | ArrayBuffer, tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T = Record<string, unknown>>(query: string): Promise<T[]>;
  clearCache?(): void;
  getCacheStats?(): import('./cache/types.js').CacheStats; // eslint-disable-line @typescript-eslint/consistent-type-imports
  invalidateCache?(pattern: string | RegExp): number;
}

export interface ResultSet<T = Record<string, unknown>> {
  rows: T[];
  columns: ColumnMetadata[];
  rowCount: number;
  toArray(): T[];
  toObject(): Record<string, unknown>[];
  getMetadata(): ColumnMetadata[];
  [Symbol.iterator](): Iterator<T>;
  profile?: QueryProfile;
}

export interface QueryProfile {
  executionTime: number;
  planningTime: number;
  totalTime: number;
  rowsProcessed: number;
  memoryUsed: number;
  plan?: string;
}

export interface ColumnMetadata {
  name: string;
  type: DuckDBType;
  nullable: boolean;
}

export type DuckDBType =
  | 'BOOLEAN'
  | 'TINYINT'
  | 'SMALLINT'
  | 'INTEGER'
  | 'BIGINT'
  | 'UTINYINT'
  | 'USMALLINT'
  | 'UINTEGER'
  | 'UBIGINT'
  | 'FLOAT'
  | 'DOUBLE'
  | 'DECIMAL'
  | 'VARCHAR'
  | 'CHAR'
  | 'TEXT'
  | 'DATE'
  | 'TIME'
  | 'TIMESTAMP'
  | 'TIMESTAMP_S'
  | 'TIMESTAMP_MS'
  | 'TIMESTAMP_NS'
  | 'INTERVAL'
  | 'BLOB'
  | 'JSON';

export interface ImportOptions {
  delimiter?: string;
  header?: boolean;
  columns?: string[];
  dateFormat?: string;
  timestampFormat?: string;
  encoding?: 'utf8' | 'utf16' | 'latin1';
  skipRows?: number;
  maxRows?: number;
  nullValues?: string[];
}

export interface ExportOptions {
  delimiter?: string;
  header?: boolean;
  dateFormat?: string;
  timestampFormat?: string;
  encoding?: 'utf8' | 'utf16' | 'latin1';
}

export enum ErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  INVALID_PARAMS = 'INVALID_PARAMS',
  NOT_CONNECTED = 'NOT_CONNECTED',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  WORKER_ERROR = 'WORKER_ERROR',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
}

export interface QueryOptions {
  timeout?: number;
  maxRows?: number;
  chunkSize?: number;
}

export interface ConnectionEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onQuery?: (query: string, duration: number) => void;
}
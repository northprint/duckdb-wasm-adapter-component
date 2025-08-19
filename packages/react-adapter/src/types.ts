import type {
  Connection,
  ConnectionConfig,
  ConnectionEvents,
  DebugConfig,
  QueryBuilderFactory,
} from '@northprint/duckdb-wasm-adapter-core';

// Re-export types
export type { 
  ImportOptions, 
  ExportOptions 
} from '@northprint/duckdb-wasm-adapter-core';

export interface DuckDBContextValue {
  connection: Connection | null;
  status: ConnectionStatus;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  queryBuilder: QueryBuilderFactory | null;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface DuckDBProviderProps {
  children: React.ReactNode;
  config?: ConnectionConfig;
  autoConnect?: boolean;
  events?: ConnectionEvents;
  debug?: DebugConfig;
}

export interface QueryResult<T> {
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  metadata: ColumnMetadata[] | null;
}

export interface MutationResult<T> {
  mutate: (sql: string, params?: unknown[]) => Promise<T[]>;
  mutateAsync: (sql: string, params?: unknown[]) => Promise<T[]>;
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
}

export interface UseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: unknown[]) => void;
  onError?: (error: Error) => void;
  initialData?: unknown[];
}

export interface UseMutationOptions<T = Record<string, unknown>> {
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}
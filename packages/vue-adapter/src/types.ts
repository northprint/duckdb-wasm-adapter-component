import type { Ref } from 'vue';
import type {
  Connection,
  ConnectionConfig,
  ConnectionEvents,
} from '@northprint/duckdb-wasm-adapter-core';

export interface DuckDBInstance {
  connection: Ref<Connection | null>;
  status: Ref<ConnectionStatus>;
  error: Ref<Error | null>;
  isConnected: Ref<boolean>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface DuckDBConfig extends ConnectionConfig {
  autoConnect?: boolean;
  events?: ConnectionEvents;
}

export interface QueryResult<T> {
  data: Ref<T[] | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  metadata: Ref<ColumnMetadata[] | null>;
  execute: (sql?: string, params?: unknown[]) => Promise<void>;
  refetch: () => void;
}

export interface MutationResult<T> {
  mutate: (sql: string, params?: unknown[]) => Promise<T[]>;
  data: Ref<T[] | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reset: () => void;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
}

export interface UseQueryOptions {
  enabled?: boolean | Ref<boolean>;
  immediate?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: any[]) => void;
  onError?: (error: Error) => void;
  initialData?: any[];
}

export interface UseMutationOptions<T = any> {
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}
import { ref, shallowRef, computed, watch, onUnmounted, unref, type Ref } from 'vue';
import { createConnection, type Connection } from '@northprint/duckdb-wasm-adapter-core';
import type {
  DuckDBInstance,
  DuckDBConfig,
  ConnectionStatus,
  QueryResult,
  MutationResult,
  UseQueryOptions,
  UseMutationOptions,
  ColumnMetadata,
} from './types.js';

// Global connection instance for shared use
let globalConnection: Connection | null = null;
const globalStatus = ref<ConnectionStatus>('idle');
const globalError = ref<Error | null>(null);

/**
 * Create or get a DuckDB connection instance
 */
export function useDuckDB(config?: DuckDBConfig): DuckDBInstance {
  const connection = ref<Connection | null>(globalConnection);
  const status = computed(() => globalStatus.value);
  const error = computed(() => globalError.value);
  const isConnected = computed(() => status.value === 'connected');

  const connect = async () => {
    try {
      globalStatus.value = 'connecting';
      globalError.value = null;

      const conn = await createConnection(config, {
        onConnect: () => {
          globalStatus.value = 'connected';
          config?.events?.onConnect?.();
        },
        onDisconnect: () => {
          globalStatus.value = 'disconnected';
          config?.events?.onDisconnect?.();
        },
        onError: (err) => {
          globalError.value = err;
          globalStatus.value = 'error';
          config?.events?.onError?.(err);
        },
        onQuery: config?.events?.onQuery,
      });

      globalConnection = conn;
      connection.value = conn;
      globalStatus.value = 'connected';
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      globalError.value = error;
      globalStatus.value = 'error';
      throw error;
    }
  };

  const disconnect = async () => {
    if (globalConnection) {
      try {
        await globalConnection.close();
        globalConnection = null;
        connection.value = null;
        globalStatus.value = 'disconnected';
        globalError.value = null;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        globalError.value = error;
        throw error;
      }
    }
  };

  // Auto-connect if configured
  if (config?.autoConnect && !globalConnection) {
    connect().catch(() => {
      // Auto-connect failed
    });
  }

  // Cleanup on unmount
  onUnmounted(() => {
    // Don't disconnect the global connection on component unmount
    // as it may be used by other components
  });

  return {
    connection,
    status,
    error,
    isConnected,
    connect,
    disconnect,
  };
}

/**
 * Execute queries with reactive state
 */
export function useQuery<T = Record<string, unknown>>(
  sql: string | Ref<string>,
  params?: unknown[] | Ref<unknown[] | undefined>,
  options: UseQueryOptions = {}
): QueryResult<T> {
  // Use shallowRef for DuckDB results to avoid proxy issues
  const data = shallowRef<T[] | undefined>(options.initialData);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const metadata = shallowRef<ColumnMetadata[] | null>(null);

  const execute = async (overrideSql?: string, overrideParams?: unknown[]) => {
    // Always get the current global connection
    const conn = globalConnection;
    if (!conn) {
      error.value = new Error('Not connected to database');
      return;
    }

    const enabled = unref(options.enabled ?? true);
    if (!enabled) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const query = overrideSql ?? unref(sql);
      const parameters = overrideParams ?? unref(params);
      
      const result = await conn.execute<T>(query, parameters);
      const resultData = result.toArray();
      const resultMetadata = result.getMetadata();

      data.value = resultData;
      metadata.value = resultMetadata;
      options.onSuccess?.(resultData);
    } catch (err) {
      const duckdbError = err instanceof Error ? err : new Error(String(err));
      error.value = duckdbError;
      options.onError?.(duckdbError);
    } finally {
      loading.value = false;
    }
  };

  const refetch = () => execute();

  // Watch for changes in SQL, params, and connection state
  watch([() => unref(sql), () => unref(params), () => globalConnection], () => {
    if (options.immediate !== false && globalConnection) {
      execute();
    }
  }, { immediate: options.immediate !== false });

  // Set up refetch interval if specified
  if (options.refetchInterval && options.refetchInterval > 0) {
    const interval = setInterval(() => {
      execute();
    }, options.refetchInterval);

    onUnmounted(() => {
      clearInterval(interval);
    });
  }

  return {
    data: data as Ref<T[] | undefined>,
    loading,
    error,
    metadata,
    execute,
    refetch,
  };
}

/**
 * Execute mutations with reactive state
 */
export function useMutation<T = Record<string, unknown>>(
  options: UseMutationOptions<T> = {}
): MutationResult<T> {
  // Use shallowRef for DuckDB results
  const data = shallowRef<T[] | undefined>();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const mutate = async (sql: string, params?: unknown[]): Promise<T[]> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    loading.value = true;
    error.value = null;

    try {
      const result = await conn.execute<T>(sql, params);
      const resultData = result.toArray();

      data.value = resultData;
      options.onSuccess?.(resultData);
      
      return resultData;
    } catch (err) {
      const duckdbError = err instanceof Error ? err : new Error(String(err));
      error.value = duckdbError;
      options.onError?.(duckdbError);
      throw duckdbError;
    } finally {
      loading.value = false;
      options.onSettled?.();
    }
  };

  const reset = () => {
    data.value = undefined;
    error.value = null;
    loading.value = false;
  };

  return {
    mutate,
    data: data as Ref<T[] | undefined>,
    loading,
    error,
    reset,
  };
}

/**
 * Execute batch operations
 */
export function useBatch() {

  const execute = async (
    operations: Array<{ sql: string; params?: unknown[] }>
  ): Promise<void> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    await conn.execute('BEGIN TRANSACTION');

    try {
      for (const op of operations) {
        await conn.execute(op.sql, op.params);
      }
      await conn.execute('COMMIT');
    } catch (error) {
      await conn.execute('ROLLBACK');
      throw error;
    }
  };

  return { execute };
}

/**
 * Execute transactions
 */
export function useTransaction() {

  const execute = async <T>(
    callback: (execute: (sql: string, params?: unknown[]) => Promise<any>) => Promise<T>
  ): Promise<T> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    await conn.execute('BEGIN TRANSACTION');

    try {
      const exec = (sql: string, params?: unknown[]) => conn.execute(sql, params);
      const result = await callback(exec);
      await conn.execute('COMMIT');
      return result;
    } catch (error) {
      await conn.execute('ROLLBACK');
      throw error;
    }
  };

  return { execute };
}

/**
 * Import CSV data
 */
export function useImportCSV() {
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const importCSV = async (
    file: File | string,
    tableName: string,
    options?: any
  ): Promise<void> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    loading.value = true;
    error.value = null;

    try {
      await conn.importCSV(file, tableName, options);
    } catch (err) {
      const duckdbError = err instanceof Error ? err : new Error(String(err));
      error.value = duckdbError;
      throw duckdbError;
    } finally {
      loading.value = false;
    }
  };

  return { importCSV, loading, error };
}

/**
 * Import JSON data
 */
export function useImportJSON() {
  const loading = ref(false);
  const error = ref<Error | null>(null);

  const importJSON = async (
    data: unknown[],
    tableName: string
  ): Promise<void> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    loading.value = true;
    error.value = null;

    try {
      await conn.importJSON(data, tableName);
    } catch (err) {
      const duckdbError = err instanceof Error ? err : new Error(String(err));
      error.value = duckdbError;
      throw duckdbError;
    } finally {
      loading.value = false;
    }
  };

  return { importJSON, loading, error };
}

/**
 * Export data as CSV
 */
export function useExportCSV() {

  const exportCSV = async (
    query: string,
    options?: any
  ): Promise<string> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    return conn.exportCSV(query, options);
  };

  return { exportCSV };
}

/**
 * Export data as JSON
 */
export function useExportJSON<T = Record<string, unknown>>() {

  const exportJSON = async (query: string): Promise<T[]> => {
    const conn = globalConnection;
    if (!conn) {
      throw new Error('Not connected to database');
    }

    return conn.exportJSON<T>(query);
  };

  return { exportJSON };
}
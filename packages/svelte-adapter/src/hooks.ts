import { writable, get } from 'svelte/store';
import type { DuckDBStore, QueryResult, MutationResult } from './types.js';

/**
 * Convenience hook for executing queries with a DuckDB store
 */
export function useQuery<T = Record<string, unknown>>(
  db: DuckDBStore,
  sql: string,
  params?: unknown[],
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  const enabled = options?.enabled ?? true;
  const refetchInterval = options?.refetchInterval;
  
  if (!enabled) {
    const emptyResult: QueryResult<T> = {
      data: null,
      loading: false,
      error: null,
      metadata: null,
    };
    return {
      subscribe: writable(emptyResult).subscribe,
      refetch: async () => { await Promise.resolve(); },
      cancel: () => {},
    };
  }
  
  const queryStore = db.query<T>(sql, params);
  
  // Set up refetch interval if specified
  if (refetchInterval && refetchInterval > 0) {
    const interval = setInterval(() => {
      void queryStore.refetch();
    }, refetchInterval);
    
    // Clean up interval on unsubscribe
    const originalSubscribe = queryStore.subscribe;
    let subscriberCount = 0;
    
    queryStore.subscribe = (run, invalidate) => {
      subscriberCount++;
      const unsubscribe = originalSubscribe(run, invalidate);
      
      return () => {
        subscriberCount--;
        if (subscriberCount === 0) {
          clearInterval(interval);
        }
        unsubscribe();
      };
    };
  }
  
  return queryStore;
}

/**
 * Hook for executing mutations (INSERT, UPDATE, DELETE)
 */
export function useMutation<T = Record<string, unknown>>(
  db: DuckDBStore
): MutationResult<T> {
  const loading = writable(false);
  const error = writable<Error | null>(null);
  const data = writable<T[] | null>(null);
  
  async function execute(sql: string, params?: unknown[]): Promise<T[]> {
    const conn = get(db.connection);
    
    if (!conn) {
      const err = new Error('Not connected to database');
      error.set(err);
      throw err;
    }
    
    loading.set(true);
    error.set(null);
    
    try {
      const result = await conn.execute<T>(sql, params);
      const resultData = result.toArray();
      data.set(resultData);
      return resultData;
    } catch (err) {
      const duckdbError = err instanceof Error ? err : new Error(String(err));
      error.set(duckdbError);
      throw duckdbError;
    } finally {
      loading.set(false);
    }
  }
  
  return {
    execute,
    loading: { subscribe: loading.subscribe },
    error: { subscribe: error.subscribe },
    data: { subscribe: data.subscribe },
  };
}

/**
 * Hook for batch operations
 */
export async function useBatch(
  db: DuckDBStore,
  operations: Array<{ sql: string; params?: unknown[] }>
): Promise<void> {
  const conn = get(db.connection);
  
  if (!conn) {
    throw new Error('Not connected to database');
  }
  
  // Execute in transaction
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
}

/**
 * Hook for database transactions
 */
export async function useTransaction<T>(
  db: DuckDBStore,
  callback: (execute: (sql: string, params?: unknown[]) => Promise<unknown>) => Promise<T>
): Promise<T> {
  const conn = get(db.connection);
  
  if (!conn) {
    throw new Error('Not connected to database');
  }
  
  await conn.execute('BEGIN TRANSACTION');
  
  try {
    const execute = (sql: string, params?: unknown[]) => conn.execute(sql, params);
    const result = await callback(execute);
    await conn.execute('COMMIT');
    return result;
  } catch (error) {
    await conn.execute('ROLLBACK');
    throw error;
  }
}
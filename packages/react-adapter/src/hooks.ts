import { useState, useEffect, useCallback, useRef } from 'react';
import { useDuckDB } from './context.js';
import type { 
  QueryResult, 
  MutationResult, 
  UseQueryOptions, 
  UseMutationOptions,
  ColumnMetadata 
} from './types.js';

/**
 * Hook for executing queries
 */
export function useQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
  options: UseQueryOptions = {}
): QueryResult<T> {
  const { connection } = useDuckDB();
  const [data, setData] = useState<T[] | undefined>(options.initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<ColumnMetadata[] | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);
  
  const execute = useCallback(async () => {
    if (!connection || !options.enabled) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await connection.execute<T>(sql, params);
      
      if (!mountedRef.current) return;
      
      const resultData = result.toArray();
      const resultMetadata = result.getMetadata();
      
      console.log('Query result:', resultData); // Debug log
      
      setData(resultData);
      setMetadata(resultMetadata);
      options.onSuccess?.(resultData);
    } catch (err) {
      if (!mountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options.onError?.(error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [connection, sql, params, options.enabled]);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (options.enabled !== false) {
      execute();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [execute, options.enabled]);
  
  useEffect(() => {
    if (options.refetchInterval && options.refetchInterval > 0) {
      intervalRef.current = setInterval(() => {
        execute();
      }, options.refetchInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [execute, options.refetchInterval]);
  
  return {
    data,
    loading,
    error,
    refetch: execute,
    metadata,
  };
}

/**
 * Hook for executing mutations
 */
export function useMutation<T = Record<string, unknown>>(
  options: UseMutationOptions<T> = {}
): MutationResult<T> {
  const { connection } = useDuckDB();
  const [data, setData] = useState<T[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const mutateAsync = useCallback(async (sql: string, params?: unknown[]): Promise<T[]> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await connection.execute<T>(sql, params);
      const resultData = result.toArray();
      
      if (mountedRef.current) {
        setData(resultData);
        options.onSuccess?.(resultData);
      }
      
      return resultData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (mountedRef.current) {
        setError(error);
        options.onError?.(error);
      }
      
      throw error;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        options.onSettled?.();
      }
    }
  }, [connection, options]);
  
  const mutate = useCallback(async (sql: string, params?: unknown[]): Promise<T[]> => {
    return mutateAsync(sql, params).catch((error) => {
      // Error is already handled in mutateAsync
      return [] as T[];
    });
  }, [mutateAsync]);
  
  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setLoading(false);
  }, []);
  
  return {
    mutate,
    mutateAsync,
    data,
    loading,
    error,
    reset,
  };
}

/**
 * Hook for batch operations
 */
export function useBatch() {
  const { connection } = useDuckDB();
  
  const execute = useCallback(async (
    operations: Array<{ sql: string; params?: unknown[] }>
  ): Promise<void> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    await connection.execute('BEGIN TRANSACTION');
    
    try {
      for (const op of operations) {
        await connection.execute(op.sql, op.params);
      }
      await connection.execute('COMMIT');
    } catch (error) {
      await connection.execute('ROLLBACK');
      throw error;
    }
  }, [connection]);
  
  return execute;
}

/**
 * Hook for transactions
 */
export function useTransaction() {
  const { connection } = useDuckDB();
  
  const execute = useCallback(async <T>(
    callback: (execute: (sql: string, params?: unknown[]) => Promise<any>) => Promise<T>
  ): Promise<T> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    await connection.execute('BEGIN TRANSACTION');
    
    try {
      const exec = (sql: string, params?: unknown[]) => connection.execute(sql, params);
      const result = await callback(exec);
      await connection.execute('COMMIT');
      return result;
    } catch (error) {
      await connection.execute('ROLLBACK');
      throw error;
    }
  }, [connection]);
  
  return execute;
}

/**
 * Hook for importing CSV data
 */
export function useImportCSV() {
  const { connection } = useDuckDB();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const importCSV = useCallback(async (
    file: File | string,
    tableName: string,
    options?: any
  ): Promise<void> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await connection.importCSV(file, tableName, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [connection]);
  
  return { importCSV, loading, error };
}

/**
 * Hook for importing JSON data
 */
export function useImportJSON() {
  const { connection } = useDuckDB();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const importJSON = useCallback(async (
    data: unknown[],
    tableName: string
  ): Promise<void> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await connection.importJSON(data, tableName);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [connection]);
  
  return { importJSON, loading, error };
}

/**
 * Hook for exporting data as CSV
 */
export function useExportCSV() {
  const { connection } = useDuckDB();
  
  const exportCSV = useCallback(async (
    query: string,
    options?: any
  ): Promise<string> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    return connection.exportCSV(query, options);
  }, [connection]);
  
  return exportCSV;
}

/**
 * Hook for exporting data as JSON
 */
export function useExportJSON<T = Record<string, unknown>>() {
  const { connection } = useDuckDB();
  
  const exportJSON = useCallback(async (query: string): Promise<T[]> => {
    if (!connection) {
      throw new Error('Not connected to database');
    }
    
    return connection.exportJSON<T>(query);
  }, [connection]);
  
  return exportJSON;
}

// Re-export query builder hooks
export { useQueryBuilder, useQueryBuilderQuery } from './hooks/useQueryBuilder.js';

// Re-export cache hooks
export { useCache } from './hooks/useCache.js';

// Re-export React 19.1+ hooks
export { useOptimisticQuery } from './hooks/useOptimisticQuery.js';
export { useDuckDBAction, useFormWorkflow } from './hooks/useActionState.js';
export { useTransitionQuery, useDeferredQuery } from './hooks/useTransitionQuery.js';
export { useSuspenseQuery, createQueryResource, useStreamingQuery } from './hooks/useSuspenseQuery.js';
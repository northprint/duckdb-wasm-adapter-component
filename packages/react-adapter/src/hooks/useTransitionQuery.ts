import { useTransition, useState, useCallback, useEffect } from 'react';
import { useDuckDB } from '../context.js';
import type { QueryResult } from '../types.js';

/**
 * Hook for non-urgent query updates with useTransition (React 19.1+)
 * Allows marking updates as non-blocking for better UX
 */
export function useTransitionQuery<T = Record<string, unknown>>(
  sqlGenerator: (params: any) => string,
  initialParams?: any
): {
  data: T[] | undefined;
  displayData: T[] | undefined;
  loading: boolean;
  isPending: boolean;
  error: Error | null;
  updateQuery: (newParams: any) => void;
  refetch: () => void;
} {
  const { connection } = useDuckDB();
  const [isPending, startTransition] = useTransition();
  
  const [params, setParams] = useState(initialParams);
  const [displayParams, setDisplayParams] = useState(initialParams);
  
  const [data, setData] = useState<T[] | undefined>();
  const [displayData, setDisplayData] = useState<T[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeQuery = useCallback(async (queryParams: any, isTransition = false) => {
    if (!connection) return;

    const sql = sqlGenerator(queryParams);
    
    if (!isTransition) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await connection.execute<T>(sql);
      const resultData = result.toArray();
      
      if (isTransition) {
        setDisplayData(resultData);
      } else {
        setData(resultData);
        setDisplayData(resultData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      if (!isTransition) {
        setLoading(false);
      }
    }
  }, [connection, sqlGenerator]);

  const updateQuery = useCallback((newParams: any) => {
    setParams(newParams);
    
    // Start non-blocking transition
    startTransition(() => {
      setDisplayParams(newParams);
    });
  }, []);

  const refetch = useCallback(() => {
    executeQuery(params, false);
  }, [params, executeQuery]);

  // Execute query when params change
  useEffect(() => {
    executeQuery(params, false);
  }, [params, executeQuery]);

  // Execute transition query when display params change
  useEffect(() => {
    if (displayParams !== params) {
      executeQuery(displayParams, true);
    }
  }, [displayParams, params, executeQuery]);

  return {
    data,
    displayData,
    loading,
    isPending,
    error,
    updateQuery,
    refetch,
  };
}

/**
 * Hook for deferred query execution
 * Useful for expensive queries that shouldn't block UI
 */
export function useDeferredQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
  options?: {
    enabled?: boolean;
    delay?: number;
  }
): QueryResult<T> & { isPending: boolean; startQuery: () => void } {
  const { connection } = useDuckDB();
  const [isPending, startTransition] = useTransition();
  const [shouldExecute, setShouldExecute] = useState(false);
  
  const [data, setData] = useState<T[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const executeQuery = useCallback(async () => {
    if (!connection || (options?.enabled === false && !shouldExecute)) return;

    setLoading(true);
    setError(null);

    try {
      const result = await connection.execute<T>(sql, params);
      const resultData = result.toArray();
      const resultMetadata = result.getMetadata();
      
      startTransition(() => {
        setData(resultData);
        setMetadata(resultMetadata);
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setLoading(false);
      setShouldExecute(false);
    }
  }, [connection, sql, params, options?.enabled, shouldExecute]);

  const startQuery = useCallback(() => {
    setShouldExecute(true);
  }, []);

  useEffect(() => {
    if (shouldExecute || options?.enabled !== false) {
      const timer = setTimeout(
        () => executeQuery(),
        options?.delay || 0
      );
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldExecute, executeQuery, options?.enabled, options?.delay]);

  return {
    data,
    loading,
    error,
    metadata,
    refetch: executeQuery,
    isPending,
    startQuery,
  };
}
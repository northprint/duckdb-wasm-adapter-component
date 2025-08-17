/// <reference path="../types/react-19.d.ts" />
import { use, useMemo } from 'react';
import { useDuckDB } from '../context.js';

/**
 * Hook for Suspense-compatible queries using React 19.1's use() hook
 * Enables data fetching with Suspense boundaries
 */
export function useSuspenseQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): {
  data: T[];
  metadata: any;
} {
  const { connection } = useDuckDB();

  const queryPromise = useMemo(() => {
    if (!connection) {
      throw new Error('Not connected to database');
    }

    return connection.execute<T>(sql, params).then(result => ({
      data: result.toArray(),
      metadata: result.getMetadata(),
    }));
  }, [connection, sql, params]);

  // use() hook suspends the component until the promise resolves
  const result = use(queryPromise);

  return result;
}

/**
 * Create a query resource for use with Suspense
 * Can be created outside of components and passed as props
 */
export function createQueryResource<T = Record<string, unknown>>(
  connectionPromise: Promise<any>,
  sql: string,
  params?: unknown[]
) {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: { data: T[]; metadata: any } | undefined;
  let error: Error | undefined;

  const suspender = connectionPromise
    .then(connection => connection.execute(sql, params) as Promise<any>)
    .then(queryResult => {
      status = 'success';
      result = {
        data: queryResult.toArray(),
        metadata: queryResult.getMetadata(),
      };
    })
    .catch(err => {
      status = 'error';
      error = err instanceof Error ? err : new Error(String(err));
    });

  return {
    read(): { data: T[]; metadata: any } {
      if (status === 'pending') {
        throw suspender;
      } else if (status === 'error') {
        throw error;
      } else if (result) {
        return result;
      }
      throw new Error('Unknown state');
    },
  };
}

/**
 * Hook for streaming query results with Suspense
 * Useful for large datasets that can be processed incrementally
 */
export function useStreamingQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
  options?: {
    batchSize?: number;
    onBatch?: (batch: T[]) => void;
  }
): {
  stream: AsyncIterable<T[]>;
  cancel: () => void;
} {
  const { connection } = useDuckDB();
  const batchSize = options?.batchSize || 100;
  
  const streamPromise = useMemo(() => {
    if (!connection) {
      throw new Error('Not connected to database');
    }

    let cancelled = false;

    const stream = {
      async *[Symbol.asyncIterator]() {
        const result = await connection.execute(sql, params) as any;
        const data = result.toArray() as T[];
        
        for (let i = 0; i < data.length; i += batchSize) {
          if (cancelled) break;
          
          const batch = data.slice(i, i + batchSize);
          options?.onBatch?.(batch);
          yield batch;
        }
      },
    };

    return {
      stream,
      cancel: () => { cancelled = true; },
    };
  }, [connection, sql, params, batchSize]);

  const { stream, cancel } = use(Promise.resolve(streamPromise));

  return { stream, cancel };
}
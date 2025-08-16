import { useCallback } from 'react';
import { useDuckDB } from '../context.js';
import type { QueryBuilder } from '@northprint/duckdb-wasm-adapter-core';

export function useQueryBuilder() {
  const { queryBuilder, isConnected } = useDuckDB();

  const createQuery = useCallback(() => {
    if (!isConnected || !queryBuilder) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.query();
  }, [queryBuilder, isConnected]);

  const select = useCallback((...columns: string[]) => {
    if (!isConnected || !queryBuilder) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.select(...columns);
  }, [queryBuilder, isConnected]);

  const from = useCallback((table: string, alias?: string) => {
    if (!isConnected || !queryBuilder) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.from(table, alias);
  }, [queryBuilder, isConnected]);

  const table = useCallback((tableName: string) => {
    if (!isConnected || !queryBuilder) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.table(tableName);
  }, [queryBuilder, isConnected]);

  return {
    isConnected,
    queryBuilder,
    createQuery,
    select,
    from,
    table,
  };
}

export function useQueryBuilderQuery<T = Record<string, unknown>>(
  buildQuery: (qb: { 
    select: (...columns: string[]) => QueryBuilder;
    from: (table: string, alias?: string) => QueryBuilder;
    table: (tableName: string) => any;
  }) => QueryBuilder | Promise<T[]>
) {
  const { queryBuilder, isConnected, connection } = useDuckDB();
  
  const execute = useCallback(async (): Promise<T[]> => {
    if (!isConnected || !queryBuilder || !connection) {
      throw new Error('Not connected to database');
    }

    const result = buildQuery(queryBuilder);
    
    // If result is already a promise (from execute methods), return it
    if (result && typeof (result as any).then === 'function') {
      return result as Promise<T[]>;
    }
    
    // Otherwise it's a QueryBuilder, execute it
    const query = result as QueryBuilder;
    const sql = query.build();
    const resultSet = await connection.execute<T>(sql);
    return resultSet.toArray();
  }, [queryBuilder, isConnected, connection, buildQuery]);

  return {
    execute,
    isConnected,
  };
}
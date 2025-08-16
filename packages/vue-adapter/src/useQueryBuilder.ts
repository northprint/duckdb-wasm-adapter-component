import { computed } from 'vue';
import { useDuckDB } from './composables.js';
import { createQueryBuilder, type QueryBuilderFactory, type QueryBuilder } from '@duckdb-wasm-adapter/core';

export function useQueryBuilder() {
  const { connection, isConnected } = useDuckDB();
  
  const queryBuilder = computed(() => {
    if (connection.value) {
      return createQueryBuilder(connection.value);
    }
    return null;
  });

  const createQuery = () => {
    if (!isConnected.value || !queryBuilder.value) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.value.query();
  };

  const select = (...columns: string[]) => {
    if (!isConnected.value || !queryBuilder.value) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.value.select(...columns);
  };

  const from = (table: string, alias?: string) => {
    if (!isConnected.value || !queryBuilder.value) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.value.from(table, alias);
  };

  const table = (tableName: string) => {
    if (!isConnected.value || !queryBuilder.value) {
      throw new Error('Not connected to database');
    }
    return queryBuilder.value.table(tableName);
  };

  const execute = async <T = Record<string, unknown>>(query: QueryBuilder): Promise<T[]> => {
    if (!isConnected.value || !connection.value) {
      throw new Error('Not connected to database');
    }
    
    const sql = query.build();
    const result = await connection.value.execute<T>(sql);
    return result.toArray();
  };

  return {
    isConnected,
    queryBuilder,
    createQuery,
    select,
    from,
    table,
    execute,
  };
}
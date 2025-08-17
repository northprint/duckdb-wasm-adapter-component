import { ref, computed, type ComputedRef } from 'vue';
import { useQuery, useMutation } from '../composables.js';
import type { QueryResult } from '../types.js';

/**
 * Type-safe query builder with Vue 3.4's improved TypeScript support
 */
export interface TypedTable<T> {
  name: string;
  columns: (keyof T)[];
  primaryKey?: keyof T;
  indexes?: (keyof T)[];
}

export interface TypedQueryOptions<T> {
  select?: (keyof T)[];
  where?: Partial<T>;
  orderBy?: { column: keyof T; direction?: 'ASC' | 'DESC' }[];
  limit?: number;
  offset?: number;
}

/**
 * Create a type-safe query composable
 */
export function useTypedQuery<T extends Record<string, any>>(
  table: TypedTable<T>,
  options?: TypedQueryOptions<T>
): QueryResult<T> & {
  updateOptions: (newOptions: TypedQueryOptions<T>) => void;
  count: ComputedRef<number>;
} {
  const queryOptions = ref<TypedQueryOptions<T>>(options || {});
  
  // Build SQL query from options
  const sql = computed(() => {
    const opts = queryOptions.value;
    
    // SELECT clause
    const selectClause = opts.select && opts.select.length > 0
      ? opts.select.join(', ')
      : '*';
    
    // WHERE clause
    const whereConditions: string[] = [];
    const whereParams: unknown[] = [];
    
    if (opts.where) {
      Object.entries(opts.where).forEach(([key, value]) => {
        if (value !== undefined) {
          whereConditions.push(`${key} = ?`);
          whereParams.push(value);
        }
      });
    }
    
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // ORDER BY clause
    const orderByClause = opts.orderBy && opts.orderBy.length > 0
      ? `ORDER BY ${opts.orderBy.map(o => 
          `${String(o.column)} ${o.direction || 'ASC'}`
        ).join(', ')}`
      : '';
    
    // LIMIT and OFFSET
    const limitClause = opts.limit ? `LIMIT ${opts.limit}` : '';
    const offsetClause = opts.offset ? `OFFSET ${opts.offset}` : '';
    
    return {
      query: `
        SELECT ${selectClause}
        FROM ${table.name}
        ${whereClause}
        ${orderByClause}
        ${limitClause}
        ${offsetClause}
      `.trim().replace(/\s+/g, ' '),
      params: whereParams
    };
  });
  
  const queryResult = useQuery<T>(
    computed(() => sql.value.query),
    computed(() => sql.value.params)
  );
  
  const count = computed(() => queryResult.data.value?.length || 0);
  
  const updateOptions = (newOptions: TypedQueryOptions<T>) => {
    queryOptions.value = { ...queryOptions.value, ...newOptions } as any;
  };
  
  return {
    ...queryResult,
    updateOptions,
    count,
  };
}

/**
 * Type-safe mutation builder
 */
export function useTypedMutation<T extends Record<string, any>>(
  table: TypedTable<T>
): {
  insert: (data: T) => Promise<T[]>;
  update: (id: any, data: Partial<T>) => Promise<T[]>;
  delete: (id: any) => Promise<void>;
  upsert: (data: T) => Promise<T[]>;
} {
  const { mutate } = useMutation<T>();
  
  const insert = async (data: T): Promise<T[]> => {
    const columns = Object.keys(data);
    const values = columns.map(() => '?');
    const params = Object.values(data);
    
    const sql = `
      INSERT INTO ${table.name} (${columns.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING *
    `;
    
    return mutate(sql, params);
  };
  
  const update = async (id: any, data: Partial<T>): Promise<T[]> => {
    const updates = Object.entries(data)
      .filter(([_, value]) => value !== undefined)
      .map(([key]) => `${key} = ?`);
    
    const params = [
      ...Object.values(data).filter(v => v !== undefined),
      id
    ];
    
    const sql = `
      UPDATE ${table.name}
      SET ${updates.join(', ')}
      WHERE ${String(table.primaryKey || 'id')} = ?
      RETURNING *
    `;
    
    return mutate(sql, params);
  };
  
  const deleteRow = async (id: any): Promise<void> => {
    const sql = `
      DELETE FROM ${table.name}
      WHERE ${String(table.primaryKey || 'id')} = ?
    `;
    
    await mutate(sql, [id]);
  };
  
  const upsert = async (data: T): Promise<T[]> => {
    const columns = Object.keys(data);
    const values = columns.map(() => '?');
    const updates = columns.map(col => `${col} = excluded.${col}`);
    const params = Object.values(data);
    
    const sql = `
      INSERT INTO ${table.name} (${columns.join(', ')})
      VALUES (${values.join(', ')})
      ON CONFLICT (${String(table.primaryKey || 'id')})
      DO UPDATE SET ${updates.join(', ')}
      RETURNING *
    `;
    
    return mutate(sql, params);
  };
  
  return {
    insert,
    update,
    delete: deleteRow,
    upsert,
  };
}

/**
 * Type-safe relationship queries
 */
export interface Relationship<T, R> {
  type: 'one-to-many' | 'many-to-one' | 'many-to-many';
  foreignTable: TypedTable<R>;
  localKey: keyof T;
  foreignKey: keyof R;
  through?: {
    table: string;
    localKey: string;
    foreignKey: string;
  };
}

export function useRelationshipQuery<T extends Record<string, any>, R extends Record<string, any>>(
  table: TypedTable<T>,
  relationship: Relationship<T, R>,
  id: any
): QueryResult<R> {
  const sql = computed(() => {
    if (relationship.type === 'many-to-many' && relationship.through) {
      return `
        SELECT r.*
        FROM ${relationship.foreignTable.name} r
        JOIN ${relationship.through.table} t
          ON r.${String(relationship.foreignKey)} = t.${relationship.through.foreignKey}
        WHERE t.${relationship.through.localKey} = ?
      `;
    } else if (relationship.type === 'one-to-many') {
      return `
        SELECT *
        FROM ${relationship.foreignTable.name}
        WHERE ${String(relationship.foreignKey)} = ?
      `;
    } else {
      return `
        SELECT *
        FROM ${relationship.foreignTable.name}
        WHERE ${String(relationship.foreignKey)} = (
          SELECT ${String(relationship.localKey)}
          FROM ${table.name}
          WHERE ${String(table.primaryKey || 'id')} = ?
        )
      `;
    }
  });
  
  return useQuery<R>(sql, computed(() => [id]));
}

/**
 * Type-safe aggregation queries
 */
export interface AggregationOptions<T> {
  groupBy?: (keyof T)[];
  having?: string;
  aggregates: {
    [K: string]: {
      function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
      column?: keyof T;
      alias?: string;
    };
  };
}

export function useAggregationQuery<T extends Record<string, any>>(
  table: TypedTable<T>,
  options: AggregationOptions<T>
): QueryResult<Record<string, any>> {
  const sql = computed(() => {
    const aggregateSelects = Object.entries(options.aggregates).map(([key, agg]) => {
      const column = agg.column ? String(agg.column) : '*';
      const alias = agg.alias || key;
      return `${agg.function}(${column}) AS ${alias}`;
    });
    
    const groupByClause = options.groupBy && options.groupBy.length > 0
      ? `GROUP BY ${options.groupBy.join(', ')}`
      : '';
    
    const havingClause = options.having ? `HAVING ${options.having}` : '';
    
    const selectClause = [
      ...(options.groupBy || []),
      ...aggregateSelects
    ].join(', ');
    
    return `
      SELECT ${selectClause}
      FROM ${table.name}
      ${groupByClause}
      ${havingClause}
    `.trim().replace(/\s+/g, ' ');
  });
  
  return useQuery<Record<string, any>>(sql);
}
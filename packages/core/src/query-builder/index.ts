import { SelectQueryBuilder } from './select.js';
import type { QueryBuilder } from './types.js';
import type { Connection } from '../types.js';

export * from './types.js';
export { SelectQueryBuilder } from './select.js';

/**
 * Create a new SELECT query builder
 */
export function query(connection?: Connection): QueryBuilder {
  return new SelectQueryBuilder(connection);
}

/**
 * Create a new SELECT query builder (alias)
 */
export function select(...columns: string[]): QueryBuilder {
  return new SelectQueryBuilder().select(...columns);
}

/**
 * Create a new SELECT query builder with FROM clause
 */
export function from(table: string, alias?: string): QueryBuilder {
  return new SelectQueryBuilder().from(table, alias);
}

/**
 * Create a raw SQL query
 */
export function raw(sql: string, bindings?: any[]): { sql: string; bindings: any[] } {
  return { sql, bindings: bindings || [] };
}

/**
 * Fluent query builder with connection
 */
export class QueryBuilderFactory {
  constructor(private connection: Connection) {}

  query(): QueryBuilder {
    return new SelectQueryBuilder(this.connection);
  }

  select(...columns: string[]): QueryBuilder {
    return new SelectQueryBuilder(this.connection).select(...columns);
  }

  from(table: string, alias?: string): QueryBuilder {
    return new SelectQueryBuilder(this.connection).from(table, alias);
  }

  table(tableName: string) {
    return {
      select: (...columns: string[]) => 
        new SelectQueryBuilder(this.connection).select(...columns).from(tableName),
      
      insert: (data: Record<string, any> | Record<string, any>[]) => 
        this.insertInto(tableName, data),
      
      update: (data: Record<string, any>) => 
        this.update(tableName).set(data),
      
      delete: () => 
        this.deleteFrom(tableName),
      
      where: (column: string, operator?: any, value?: any) => {
        if (value === undefined) {
          value = operator;
          operator = '=';
        }
        return new SelectQueryBuilder(this.connection).from(tableName).where(column, operator, value);
      },
    };
  }

  private insertInto(table: string, data: Record<string, any> | Record<string, any>[]): Promise<any> {
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) {
      throw new Error('No data to insert');
    }

    const columns = Object.keys(records[0]);
    const values = records.map(record => 
      columns.map(col => this.formatValue(record[col]))
    );

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${values.map(row => `(${row.join(', ')})`).join(', ')}
    `;

    return this.connection.execute(sql).then(result => result.toArray());
  }

  private update(table: string) {
    const state = {
      table,
      updates: {} as Record<string, any>,
      conditions: [] as string[],
    };

    return {
      set: (updates: Record<string, any>) => {
        state.updates = updates;
        return {
          where: (column: string, operator?: any, value?: any) => {
            if (value === undefined) {
              value = operator;
              operator = '=';
            }
            state.conditions.push(`${column} ${operator} ${this.formatValue(value)}`);
            return {
              execute: () => {
                const setClauses = Object.entries(state.updates)
                  .map(([col, val]) => `${col} = ${this.formatValue(val)}`)
                  .join(', ');

                const whereClause = state.conditions.length > 0 
                  ? `WHERE ${state.conditions.join(' AND ')}`
                  : '';

                const sql = `UPDATE ${state.table} SET ${setClauses} ${whereClause}`;
                return this.connection.execute(sql).then(result => result.toArray());
              },
            };
          },
          execute: () => {
            const setClauses = Object.entries(state.updates)
              .map(([col, val]) => `${col} = ${this.formatValue(val)}`)
              .join(', ');

            const sql = `UPDATE ${state.table} SET ${setClauses}`;
            return this.connection.execute(sql).then(result => result.toArray());
          },
        };
      },
    };
  }

  private deleteFrom(table: string) {
    const conditions: string[] = [];

    return {
      where: (column: string, operator?: any, value?: any) => {
        if (value === undefined) {
          value = operator;
          operator = '=';
        }
        conditions.push(`${column} ${operator} ${this.formatValue(value)}`);
        return {
          execute: () => {
            const whereClause = conditions.length > 0 
              ? `WHERE ${conditions.join(' AND ')}`
              : '';

            const sql = `DELETE FROM ${table} ${whereClause}`;
            return this.connection.execute(sql).then(result => result.toArray());
          },
        };
      },
      execute: () => {
        const sql = `DELETE FROM ${table}`;
        return this.connection.execute(sql).then(result => result.toArray());
      },
    };
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }
}

/**
 * Create a query builder factory with connection
 */
export function createQueryBuilder(connection: Connection): QueryBuilderFactory {
  return new QueryBuilderFactory(connection);
}
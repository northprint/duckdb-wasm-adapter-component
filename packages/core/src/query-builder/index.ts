import { SelectQueryBuilder } from './select.js';
import type { QueryBuilder, ComparisonOperator } from './types.js';
import type { Connection } from '../types.js';
import { ConnectionError } from '../errors/connection-error.js';
import { ValidationError } from '../errors/validation-error.js';

export * from './types.js';
export { SelectQueryBuilder } from './select.js';

/**
 * Create a new SELECT query builder
 */
export function query(connection?: Connection | null): QueryBuilder {
  return new SelectQueryBuilder(connection ?? undefined);
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
export function raw(sql: string, bindings?: unknown[]): { sql: string; bindings: unknown[] } {
  return { sql, bindings: bindings || [] };
}

/**
 * Fluent query builder with connection
 */
export class QueryBuilderFactory {
  constructor(private connection: Connection) {
    if (!connection) {
      throw ConnectionError.notInitialized();
    }
  }

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
      
      insert: (data: Record<string, unknown> | Record<string, unknown>[]) => 
        this.insertInto(tableName, data),
      
      update: (data: Record<string, unknown>) => 
        this.update(tableName).set(data),
      
      delete: () => 
        this.deleteFrom(tableName),
      
      where: (column: string, operator?: unknown, value?: unknown) => {
        if (value === undefined) {
          value = operator;
          operator = '=';
        }
        return new SelectQueryBuilder(this.connection).from(tableName).where(column, operator as ComparisonOperator, value);
      },
    };
  }

  private insertInto(table: string, data: Record<string, unknown> | Record<string, unknown>[]): Promise<unknown> {
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) {
      throw ValidationError.missingParameter('data');
    }

    const columns = Object.keys(records[0]);
    const values = records.map(record => 
      columns.map(col => this.formatValue(record[col]))
    );

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${values.map(row => `(${row.join(', ')})`).join(', ')}
    `;

    if (!this.connection) {
      throw ConnectionError.notInitialized();
    }
    return this.connection.execute(sql).then(result => result.toArray());
  }

  private update(table: string) {
    const state = {
      table,
      updates: {} as Record<string, unknown>,
      conditions: [] as string[],
    };

    return {
      set: (updates: Record<string, unknown>) => {
        state.updates = updates;
        return {
          where: (column: string, operator?: unknown, value?: unknown) => {
            if (value === undefined) {
              value = operator;
              operator = '=';
            }
            state.conditions.push(`${column} ${operator as string} ${this.formatValue(value)}`);
            return {
              execute: () => {
                const setClauses = Object.entries(state.updates)
                  .map(([col, val]) => `${col} = ${this.formatValue(val)}`)
                  .join(', ');

                const whereClause = state.conditions.length > 0 
                  ? `WHERE ${state.conditions.join(' AND ')}`
                  : '';

                const sql = `UPDATE ${state.table} SET ${setClauses} ${whereClause}`;
                if (!this.connection) {
                  throw ConnectionError.notInitialized();
                }
                return this.connection.execute(sql).then(result => result.toArray());
              },
            };
          },
          execute: () => {
            const setClauses = Object.entries(state.updates)
              .map(([col, val]) => `${col} = ${this.formatValue(val)}`)
              .join(', ');

            const sql = `UPDATE ${state.table} SET ${setClauses}`;
            if (!this.connection) {
              throw ConnectionError.notInitialized();
            }
            return this.connection.execute(sql).then(result => result.toArray());
          },
        };
      },
    };
  }

  private deleteFrom(table: string) {
    const conditions: string[] = [];

    return {
      where: (column: string, operator?: unknown, value?: unknown) => {
        if (value === undefined) {
          value = operator;
          operator = '=';
        }
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        conditions.push(`${column} ${operator} ${String(this.formatValue(value as string | number | boolean | null))}`);
        return {
          execute: () => {
            const whereClause = conditions.length > 0 
              ? `WHERE ${conditions.join(' AND ')}`
              : '';

            const sql = `DELETE FROM ${table} ${whereClause}`;
            if (!this.connection) {
              throw ConnectionError.notInitialized();
            }
            return this.connection.execute(sql).then(result => result.toArray());
          },
        };
      },
      execute: () => {
        const sql = `DELETE FROM ${table}`;
        if (!this.connection) {
          throw ConnectionError.notInitialized();
        }
        return this.connection.execute(sql).then(result => result.toArray());
      },
    };
  }

  private formatValue(value: unknown): string {
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
  if (!connection) {
    throw ConnectionError.notInitialized();
  }
  return new QueryBuilderFactory(connection);
}
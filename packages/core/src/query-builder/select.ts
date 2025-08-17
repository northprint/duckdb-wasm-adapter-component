import type {
  QueryBuilder,
  QueryBuilderState,
  WhereCondition,
  ComparisonOperator,
  OrderDirection,
  JoinType,
} from './types.js';
import type { Connection } from '../types.js';

export class SelectQueryBuilder implements QueryBuilder {
  private state: QueryBuilderState = {
    joins: [],
    orderBy: [],
    ctes: [],
    unions: [],
  };
  
  constructor(private connection?: Connection) {}

  // CTE
  with(name: string, query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder), columns?: string[]): QueryBuilder {
    const cteQuery = typeof query === 'function' ? query(new SelectQueryBuilder()) : query;
    this.state.ctes.push({ name, query: cteQuery, columns });
    return this;
  }

  withRecursive(name: string, query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder), columns?: string[]): QueryBuilder {
    // For simplicity, treating recursive CTE same as regular CTE
    // In production, would need special handling
    return this.with(name, query, columns);
  }

  // SELECT
  select(...columns: string[]): QueryBuilder {
    if (!this.state.select) {
      this.state.select = { columns: [] };
    }
    this.state.select.columns.push(...columns);
    return this;
  }

  selectRaw(raw: string): QueryBuilder {
    if (!this.state.select) {
      this.state.select = { columns: [] };
    }
    this.state.select.columns.push(raw);
    return this;
  }

  distinct(): QueryBuilder {
    if (!this.state.select) {
      this.state.select = { columns: [], distinct: true };
    } else {
      this.state.select.distinct = true;
    }
    return this;
  }

  count(column: string = '*', alias?: string): QueryBuilder {
    const expr = alias ? `COUNT(${column}) AS ${alias}` : `COUNT(${column})`;
    return this.selectRaw(expr);
  }

  sum(column: string, alias?: string): QueryBuilder {
    const expr = alias ? `SUM(${column}) AS ${alias}` : `SUM(${column})`;
    return this.selectRaw(expr);
  }

  avg(column: string, alias?: string): QueryBuilder {
    const expr = alias ? `AVG(${column}) AS ${alias}` : `AVG(${column})`;
    return this.selectRaw(expr);
  }

  min(column: string, alias?: string): QueryBuilder {
    const expr = alias ? `MIN(${column}) AS ${alias}` : `MIN(${column})`;
    return this.selectRaw(expr);
  }

  max(column: string, alias?: string): QueryBuilder {
    const expr = alias ? `MAX(${column}) AS ${alias}` : `MAX(${column})`;
    return this.selectRaw(expr);
  }

  // FROM
  from(table: string, alias?: string): QueryBuilder {
    this.state.from = { table, alias };
    return this;
  }

  fromSubquery(subquery: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder), alias: string): QueryBuilder {
    const query = typeof subquery === 'function' ? subquery(new SelectQueryBuilder()) : subquery;
    this.state.from = { table: `(${query.build()})`, alias };
    return this;
  }

  // JOIN
  private addJoin(type: JoinType, table: string, on: string | WhereCondition, alias?: string): QueryBuilder {
    const condition: WhereCondition = typeof on === 'string' 
      ? { raw: on }
      : on;
    
    this.state.joins.push({ type, table, on: condition, alias });
    return this;
  }

  join(table: string, on: string | WhereCondition, alias?: string): QueryBuilder {
    return this.addJoin('INNER', table, on, alias);
  }

  leftJoin(table: string, on: string | WhereCondition, alias?: string): QueryBuilder {
    return this.addJoin('LEFT', table, on, alias);
  }

  rightJoin(table: string, on: string | WhereCondition, alias?: string): QueryBuilder {
    return this.addJoin('RIGHT', table, on, alias);
  }

  fullJoin(table: string, on: string | WhereCondition, alias?: string): QueryBuilder {
    return this.addJoin('FULL', table, on, alias);
  }

  crossJoin(table: string, alias?: string): QueryBuilder {
    this.state.joins.push({ type: 'CROSS', table, alias, on: { raw: '1=1' } });
    return this;
  }

  // WHERE
  private addWhere(condition: WhereCondition, logicalOperator: 'AND' | 'OR' = 'AND'): QueryBuilder {
    if (!this.state.where) {
      this.state.where = condition;
    } else {
      // If adding with OR and current conditions exist
      if (logicalOperator === 'OR') {
        // If current where is not a group, wrap it
        if (!this.state.where.conditions) {
          this.state.where = {
            conditions: [this.state.where, condition],
            logicalOperator: 'OR',
          };
        } else if (this.state.where.logicalOperator === 'OR') {
          // Already an OR group, just add
          this.state.where.conditions.push(condition);
        } else {
          // Current is AND group, need to restructure
          this.state.where = {
            conditions: [this.state.where, condition],
            logicalOperator: 'OR',
          };
        }
      } else {
        // Adding with AND
        if (!this.state.where.conditions) {
          // Not a group yet, create AND group
          this.state.where = {
            conditions: [this.state.where, condition],
            logicalOperator: 'AND',
          };
        } else if (this.state.where.logicalOperator === 'AND') {
          // Already an AND group, just add
          this.state.where.conditions.push(condition);
        } else {
          // Current is OR group, need to restructure
          this.state.where = {
            conditions: [this.state.where, condition],
            logicalOperator: 'AND',
          };
        }
      }
    }
    return this;
  }

  where(column: string | WhereCondition | ((qb: QueryBuilder) => QueryBuilder), operator?: ComparisonOperator, value?: any): QueryBuilder {
    if (typeof column === 'function') {
      const subquery = column(new SelectQueryBuilder());
      return this.addWhere({ raw: `(${subquery.build()})` });
    }
    
    if (typeof column === 'object') {
      return this.addWhere(column);
    }
    
    return this.addWhere({ column, operator: operator || '=', value });
  }

  whereRaw(raw: string, _bindings?: any[]): QueryBuilder {
    // Note: bindings would need to be handled properly in production
    return this.addWhere({ raw });
  }

  whereIn(column: string, values: any[]): QueryBuilder {
    return this.addWhere({ column, operator: 'IN', value: values });
  }

  whereNotIn(column: string, values: any[]): QueryBuilder {
    return this.addWhere({ column, operator: 'NOT IN', value: values });
  }

  whereNull(column: string): QueryBuilder {
    return this.addWhere({ column, operator: 'IS NULL' });
  }

  whereNotNull(column: string): QueryBuilder {
    return this.addWhere({ column, operator: 'IS NOT NULL' });
  }

  whereBetween(column: string, min: any, max: any): QueryBuilder {
    return this.addWhere({ column, operator: 'BETWEEN', value: [min, max] });
  }

  whereNotBetween(column: string, min: any, max: any): QueryBuilder {
    return this.addWhere({ column, operator: 'NOT BETWEEN', value: [min, max] });
  }

  whereExists(subquery: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder {
    const query = typeof subquery === 'function' ? subquery(new SelectQueryBuilder()) : subquery;
    return this.whereRaw(`EXISTS (${query.build()})`);
  }

  whereNotExists(subquery: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder {
    const query = typeof subquery === 'function' ? subquery(new SelectQueryBuilder()) : subquery;
    return this.whereRaw(`NOT EXISTS (${query.build()})`);
  }

  // OR WHERE
  orWhere(column: string | WhereCondition, operator?: ComparisonOperator, value?: any): QueryBuilder {
    if (typeof column === 'object') {
      return this.addWhere(column, 'OR');
    }
    return this.addWhere({ column, operator: operator || '=', value }, 'OR');
  }

  orWhereRaw(raw: string, _bindings?: any[]): QueryBuilder {
    return this.addWhere({ raw }, 'OR');
  }

  orWhereIn(column: string, values: any[]): QueryBuilder {
    return this.addWhere({ column, operator: 'IN', value: values }, 'OR');
  }

  orWhereNotIn(column: string, values: any[]): QueryBuilder {
    return this.addWhere({ column, operator: 'NOT IN', value: values }, 'OR');
  }

  orWhereNull(column: string): QueryBuilder {
    return this.addWhere({ column, operator: 'IS NULL' }, 'OR');
  }

  orWhereNotNull(column: string): QueryBuilder {
    return this.addWhere({ column, operator: 'IS NOT NULL' }, 'OR');
  }

  orWhereBetween(column: string, min: any, max: any): QueryBuilder {
    return this.addWhere({ column, operator: 'BETWEEN', value: [min, max] }, 'OR');
  }

  orWhereNotBetween(column: string, min: any, max: any): QueryBuilder {
    return this.addWhere({ column, operator: 'NOT BETWEEN', value: [min, max] }, 'OR');
  }

  // GROUP BY
  groupBy(...columns: string[]): QueryBuilder {
    if (!this.state.groupBy) {
      this.state.groupBy = { columns: [] };
    }
    this.state.groupBy.columns.push(...columns);
    return this;
  }

  groupByRaw(raw: string): QueryBuilder {
    if (!this.state.groupBy) {
      this.state.groupBy = { columns: [] };
    }
    this.state.groupBy.columns.push(raw);
    return this;
  }

  // HAVING
  having(column: string | WhereCondition, operator?: ComparisonOperator, value?: any): QueryBuilder {
    const condition: WhereCondition = typeof column === 'object'
      ? column
      : { column, operator: operator || '=', value };
    
    this.state.having = { condition };
    return this;
  }

  havingRaw(raw: string, _bindings?: any[]): QueryBuilder {
    this.state.having = { condition: { raw } };
    return this;
  }

  // ORDER BY
  orderBy(column: string, direction: OrderDirection = 'ASC'): QueryBuilder {
    this.state.orderBy.push({ column, direction });
    return this;
  }

  orderByRaw(raw: string): QueryBuilder {
    this.state.orderBy.push({ column: raw });
    return this;
  }

  // LIMIT
  limit(limit: number): QueryBuilder {
    if (!this.state.limit) {
      this.state.limit = { limit };
    } else {
      this.state.limit.limit = limit;
    }
    return this;
  }

  offset(offset: number): QueryBuilder {
    if (!this.state.limit) {
      this.state.limit = { limit: 0, offset };
    } else {
      this.state.limit.offset = offset;
    }
    return this;
  }

  // UNION
  union(query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder {
    const unionQuery = typeof query === 'function' ? query(new SelectQueryBuilder()) : query;
    this.state.unions.push({ query: unionQuery, all: false });
    return this;
  }

  unionAll(query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder {
    const unionQuery = typeof query === 'function' ? query(new SelectQueryBuilder()) : query;
    this.state.unions.push({ query: unionQuery, all: true });
    return this;
  }

  // Building
  private buildWhereClause(condition: WhereCondition): string {
    if (condition.raw) {
      return condition.raw;
    }
    
    if (condition.conditions) {
      const parts = condition.conditions.map(c => {
        // Don't add extra parentheses for simple conditions
        const clause = this.buildWhereClause(c);
        // Only add parentheses if it's a complex condition (contains AND/OR)
        if (c.conditions && c.conditions.length > 1) {
          return clause; // Already has parentheses from recursive call
        }
        return clause;
      });
      
      // Only add parentheses if there are multiple conditions
      if (parts.length > 1) {
        return `(${parts.join(` ${condition.logicalOperator || 'AND'} `)})`;
      }
      return parts[0] || '1=1';
    }
    
    if (!condition.column || !condition.operator) {
      return '1=1';
    }
    
    const column = condition.column;
    const operator = condition.operator;
    
    if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
      return `${column} ${operator}`;
    }
    
    if (operator === 'IN' || operator === 'NOT IN') {
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      const valueList = values.map(v => this.formatValue(v)).join(', ');
      return `${column} ${operator} (${valueList})`;
    }
    
    if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
      const [min, max] = Array.isArray(condition.value) ? condition.value : [condition.value, condition.value];
      return `${column} ${operator} ${this.formatValue(min)} AND ${this.formatValue(max)}`;
    }
    
    return `${column} ${operator} ${this.formatValue(condition.value)}`;
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

  build(): string {
    const parts: string[] = [];
    
    // CTEs
    if (this.state.ctes.length > 0) {
      const ctes = this.state.ctes.map(cte => {
        const columns = cte.columns ? ` (${cte.columns.join(', ')})` : '';
        return `${cte.name}${columns} AS (${cte.query.build()})`;
      });
      parts.push(`WITH ${ctes.join(', ')}`);
    }
    
    // SELECT
    if (this.state.select) {
      const distinct = this.state.select.distinct ? 'DISTINCT ' : '';
      const columns = this.state.select.columns.length > 0 
        ? this.state.select.columns.join(', ')
        : '*';
      parts.push(`SELECT ${distinct}${columns}`);
    } else {
      parts.push('SELECT *');
    }
    
    // FROM
    if (this.state.from) {
      const table = this.state.from.alias 
        ? `${this.state.from.table} AS ${this.state.from.alias}`
        : this.state.from.table;
      parts.push(`FROM ${table}`);
    }
    
    // JOINs
    for (const join of this.state.joins) {
      const table = join.alias ? `${join.table} AS ${join.alias}` : join.table;
      if (join.type === 'CROSS') {
        parts.push(`CROSS JOIN ${table}`);
      } else {
        const onClause = this.buildWhereClause(join.on);
        parts.push(`${join.type} JOIN ${table} ON ${onClause}`);
      }
    }
    
    // WHERE
    if (this.state.where) {
      const whereClause = this.buildWhereClause(this.state.where);
      parts.push(`WHERE ${whereClause}`);
    }
    
    // GROUP BY
    if (this.state.groupBy && this.state.groupBy.columns.length > 0) {
      parts.push(`GROUP BY ${this.state.groupBy.columns.join(', ')}`);
    }
    
    // HAVING
    if (this.state.having) {
      const havingClause = this.buildWhereClause(this.state.having.condition);
      parts.push(`HAVING ${havingClause}`);
    }
    
    // UNION
    let sql = parts.join('\n');
    
    for (const union of this.state.unions) {
      const unionType = union.all ? 'UNION ALL' : 'UNION';
      sql = `${sql}\n${unionType}\n${union.query.build()}`;
    }
    
    // ORDER BY (after unions)
    if (this.state.orderBy.length > 0) {
      const orderClauses = this.state.orderBy.map(o => 
        o.direction ? `${o.column} ${o.direction}` : o.column
      );
      sql += `\nORDER BY ${orderClauses.join(', ')}`;
    }
    
    // LIMIT
    if (this.state.limit) {
      if (this.state.limit.limit > 0) {
        sql += `\nLIMIT ${this.state.limit.limit}`;
      }
      if (this.state.limit.offset && this.state.limit.offset > 0) {
        sql += `\nOFFSET ${this.state.limit.offset}`;
      }
    }
    
    return sql;
  }

  toSQL(): { sql: string; bindings: any[] } {
    // In a production implementation, would track bindings
    return { sql: this.build(), bindings: [] };
  }

  toString(): string {
    return this.build();
  }

  // Execution
  async execute<T = Record<string, unknown>>(): Promise<T[]> {
    if (!this.connection) {
      throw new Error('No connection available. Use query builder with a connection.');
    }
    const result = await this.connection.execute<T>(this.build());
    return result.toArray();
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    this.limit(1);
    const results = await this.execute<T>();
    return results[0] || null;
  }

  // Cloning
  clone(): QueryBuilder {
    const cloned = new SelectQueryBuilder(this.connection);
    cloned.state = JSON.parse(JSON.stringify(this.state));
    return cloned;
  }
}
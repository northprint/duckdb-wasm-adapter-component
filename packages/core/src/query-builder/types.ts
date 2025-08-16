export type OrderDirection = 'ASC' | 'DESC';
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
export type ComparisonOperator = '=' | '!=' | '<>' | '<' | '>' | '<=' | '>=' | 'LIKE' | 'NOT LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN' | 'NOT BETWEEN';
export type LogicalOperator = 'AND' | 'OR';
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT' | 'FIRST' | 'LAST';

export interface SelectClause {
  columns: string[];
  distinct?: boolean;
}

export interface FromClause {
  table: string;
  alias?: string;
}

export interface JoinClause {
  type: JoinType;
  table: string;
  alias?: string;
  on: WhereCondition;
}

export interface WhereCondition {
  column?: string;
  operator?: ComparisonOperator;
  value?: any;
  conditions?: WhereCondition[];
  logicalOperator?: LogicalOperator;
  raw?: string;
}

export interface GroupByClause {
  columns: string[];
}

export interface HavingClause {
  condition: WhereCondition;
}

export interface OrderByClause {
  column: string;
  direction?: OrderDirection;
}

export interface LimitClause {
  limit: number;
  offset?: number;
}

export interface CTEDefinition {
  name: string;
  columns?: string[];
  query: QueryBuilder;
}

export interface QueryBuilderState {
  select?: SelectClause;
  from?: FromClause;
  joins: JoinClause[];
  where?: WhereCondition;
  groupBy?: GroupByClause;
  having?: HavingClause;
  orderBy: OrderByClause[];
  limit?: LimitClause;
  ctes: CTEDefinition[];
  unions: Array<{ query: QueryBuilder; all: boolean }>;
}

export interface QueryBuilder {
  // CTE
  with(name: string, query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder), columns?: string[]): QueryBuilder;
  withRecursive(name: string, query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder), columns?: string[]): QueryBuilder;
  
  // SELECT
  select(...columns: string[]): QueryBuilder;
  selectRaw(raw: string): QueryBuilder;
  distinct(): QueryBuilder;
  count(column?: string, alias?: string): QueryBuilder;
  sum(column: string, alias?: string): QueryBuilder;
  avg(column: string, alias?: string): QueryBuilder;
  min(column: string, alias?: string): QueryBuilder;
  max(column: string, alias?: string): QueryBuilder;
  
  // FROM
  from(table: string, alias?: string): QueryBuilder;
  fromSubquery(subquery: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder), alias: string): QueryBuilder;
  
  // JOIN
  join(table: string, on: string | WhereCondition, alias?: string): QueryBuilder;
  leftJoin(table: string, on: string | WhereCondition, alias?: string): QueryBuilder;
  rightJoin(table: string, on: string | WhereCondition, alias?: string): QueryBuilder;
  fullJoin(table: string, on: string | WhereCondition, alias?: string): QueryBuilder;
  crossJoin(table: string, alias?: string): QueryBuilder;
  
  // WHERE
  where(column: string | WhereCondition | ((qb: QueryBuilder) => QueryBuilder), operator?: ComparisonOperator, value?: any): QueryBuilder;
  whereRaw(raw: string, bindings?: any[]): QueryBuilder;
  whereIn(column: string, values: any[]): QueryBuilder;
  whereNotIn(column: string, values: any[]): QueryBuilder;
  whereNull(column: string): QueryBuilder;
  whereNotNull(column: string): QueryBuilder;
  whereBetween(column: string, min: any, max: any): QueryBuilder;
  whereNotBetween(column: string, min: any, max: any): QueryBuilder;
  whereExists(subquery: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder;
  whereNotExists(subquery: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder;
  
  // OR WHERE
  orWhere(column: string | WhereCondition, operator?: ComparisonOperator, value?: any): QueryBuilder;
  orWhereRaw(raw: string, bindings?: any[]): QueryBuilder;
  orWhereIn(column: string, values: any[]): QueryBuilder;
  orWhereNotIn(column: string, values: any[]): QueryBuilder;
  orWhereNull(column: string): QueryBuilder;
  orWhereNotNull(column: string): QueryBuilder;
  orWhereBetween(column: string, min: any, max: any): QueryBuilder;
  orWhereNotBetween(column: string, min: any, max: any): QueryBuilder;
  
  // GROUP BY
  groupBy(...columns: string[]): QueryBuilder;
  groupByRaw(raw: string): QueryBuilder;
  
  // HAVING
  having(column: string | WhereCondition, operator?: ComparisonOperator, value?: any): QueryBuilder;
  havingRaw(raw: string, bindings?: any[]): QueryBuilder;
  
  // ORDER BY
  orderBy(column: string, direction?: OrderDirection): QueryBuilder;
  orderByRaw(raw: string): QueryBuilder;
  
  // LIMIT
  limit(limit: number): QueryBuilder;
  offset(offset: number): QueryBuilder;
  
  // UNION
  union(query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder;
  unionAll(query: QueryBuilder | ((qb: QueryBuilder) => QueryBuilder)): QueryBuilder;
  
  // Building
  build(): string;
  toSQL(): { sql: string; bindings: any[] };
  toString(): string;
  
  // Execution (when connected)
  execute?<T = Record<string, unknown>>(): Promise<T[]>;
  first?<T = Record<string, unknown>>(): Promise<T | null>;
  
  // Cloning
  clone(): QueryBuilder;
}

export interface InsertBuilder {
  into(table: string): InsertBuilder;
  columns(...columns: string[]): InsertBuilder;
  values(...values: any[]): InsertBuilder;
  valuesMany(values: any[][]): InsertBuilder;
  fromSelect(query: QueryBuilder): InsertBuilder;
  returning(...columns: string[]): InsertBuilder;
  onConflict(columns: string[]): InsertBuilder;
  doNothing(): InsertBuilder;
  doUpdate(updates: Record<string, any>): InsertBuilder;
  build(): string;
  toSQL(): { sql: string; bindings: any[] };
}

export interface UpdateBuilder {
  table(table: string): UpdateBuilder;
  set(column: string, value: any): UpdateBuilder;
  setMany(updates: Record<string, any>): UpdateBuilder;
  where(column: string | WhereCondition, operator?: ComparisonOperator, value?: any): UpdateBuilder;
  whereRaw(raw: string, bindings?: any[]): UpdateBuilder;
  from(table: string, alias?: string): UpdateBuilder;
  returning(...columns: string[]): UpdateBuilder;
  build(): string;
  toSQL(): { sql: string; bindings: any[] };
}

export interface DeleteBuilder {
  from(table: string): DeleteBuilder;
  where(column: string | WhereCondition, operator?: ComparisonOperator, value?: any): DeleteBuilder;
  whereRaw(raw: string, bindings?: any[]): DeleteBuilder;
  returning(...columns: string[]): DeleteBuilder;
  build(): string;
  toSQL(): { sql: string; bindings: any[] };
}

export interface CreateTableBuilder {
  table(name: string): CreateTableBuilder;
  column(name: string, type: string, options?: ColumnOptions): CreateTableBuilder;
  primaryKey(...columns: string[]): CreateTableBuilder;
  unique(...columns: string[]): CreateTableBuilder;
  index(name: string, ...columns: string[]): CreateTableBuilder;
  foreignKey(column: string, references: string, onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT', onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT'): CreateTableBuilder;
  check(expression: string): CreateTableBuilder;
  ifNotExists(): CreateTableBuilder;
  temporary(): CreateTableBuilder;
  build(): string;
}

export interface ColumnOptions {
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: any;
  references?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  check?: string;
}
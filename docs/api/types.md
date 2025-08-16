# Types API

The Types API provides comprehensive TypeScript type definitions for all DuckDB WASM Adapter functionality.

## Core Types

### Connection Types

#### Connection

Main interface for database connections.

```typescript
interface Connection {
  readonly id: string;
  readonly status: ConnectionStatus;
  
  execute<T = Record<string, unknown>>(
    query: string, 
    params?: unknown[]
  ): Promise<ResultSet<T>>;
  
  executeSync<T = Record<string, unknown>>(
    query: string, 
    params?: unknown[]
  ): ResultSet<T>;
  
  importCSV(
    file: File | string, 
    tableName: string, 
    options?: ImportOptions
  ): Promise<void>;
  
  importJSON(data: unknown[], tableName: string): Promise<void>;
  importParquet(file: File | ArrayBuffer, tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T>(query: string): Promise<T[]>;
  
  clearCache(): void;
  getCacheStats(): CacheStats;
  invalidateCache(pattern: string | RegExp): number;
  
  close(): Promise<void>;
}
```

#### ConnectionStatus

```typescript
type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';
```

#### ConnectionConfig

```typescript
interface ConnectionConfig {
  worker?: boolean;
  logLevel?: LogLevel;
  query?: QueryConfig;
  debug?: DebugConfig;
  cache?: CacheConfig;
}
```

#### ConnectionEvents

```typescript
interface ConnectionEvents {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onQuery?: (query: string, duration: number) => void;
}
```

### Query Types

#### ResultSet

Interface for query results.

```typescript
interface ResultSet<T = Record<string, unknown>> {
  rows: T[];
  columns: string[];
  rowCount: number;
  
  toArray(): T[];
  toObject(): Record<string, unknown>[];
  getMetadata(): ColumnMetadata[];
  
  [Symbol.iterator](): Iterator<T>;
}
```

#### ColumnMetadata

Metadata for result columns.

```typescript
interface ColumnMetadata {
  name: string;
  type: DuckDBType;
  nullable: boolean;
  precision?: number;
  scale?: number;
}
```

#### DuckDBType

Supported DuckDB data types.

```typescript
type DuckDBType = 
  | 'BOOLEAN'
  | 'TINYINT' | 'SMALLINT' | 'INTEGER' | 'BIGINT'
  | 'UTINYINT' | 'USMALLINT' | 'UINTEGER' | 'UBIGINT'
  | 'FLOAT' | 'DOUBLE' | 'DECIMAL'
  | 'VARCHAR' | 'CHAR' | 'TEXT'
  | 'DATE' | 'TIME' | 'TIMESTAMP' | 'INTERVAL'
  | 'BLOB' | 'JSON'
  | 'ARRAY' | 'LIST' | 'MAP' | 'STRUCT' | 'UNION'
  | 'UUID' | 'ENUM';
```

#### QueryConfig

```typescript
interface QueryConfig {
  castBigIntToDouble?: boolean;
}
```

### Cache Types

#### CacheConfig

```typescript
interface CacheConfig {
  enabled?: boolean;
  maxEntries?: number;
  maxSize?: number;
  ttl?: number;
  evictionStrategy?: EvictionStrategy;
  enableStats?: boolean;
  keyGenerator?: (query: string, params?: unknown[]) => string;
}
```

#### EvictionStrategy

```typescript
type EvictionStrategy = 'lru' | 'lfu' | 'fifo' | 'ttl';
```

#### CacheStats

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  totalSize: number;
  hitRate: number;
}
```

#### CacheKey

```typescript
interface CacheKey {
  query: string;
  params?: unknown[];
}
```

#### CacheEntry

```typescript
interface CacheEntry<T> {
  key: CacheKey;
  data: T[];
  metadata?: unknown;
  timestamp: number;
  accessCount: number;
  size: number;
}
```

### Debug Types

#### DebugConfig

```typescript
interface DebugConfig {
  enabled?: boolean;
  logQueries?: boolean;
  logTiming?: boolean;
  logResults?: boolean;
  logConnections?: boolean;
  logMemory?: boolean;
  slowQueryThreshold?: number;
  profileQueries?: boolean;
}
```

#### LogLevel

```typescript
type LogLevel = 'silent' | 'error' | 'warning' | 'info' | 'debug';
```

### Import/Export Types

#### ImportOptions

```typescript
interface ImportOptions {
  header?: boolean;
  delimiter?: string;
  quote?: string;
  escape?: string;
  nullString?: string;
  skipRows?: number;
  maxRows?: number;
  columns?: string[];
  columnTypes?: Record<string, string>;
  dateFormat?: string;
  timestampFormat?: string;
  encoding?: string;
  sample?: boolean;
  sampleSize?: number;
}
```

#### ExportOptions

```typescript
interface ExportOptions {
  header?: boolean;
  delimiter?: string;
  quote?: string;
  escape?: string;
  nullString?: string;
  dateFormat?: string;
  timestampFormat?: string;
  forceQuote?: boolean;
}
```

#### ImportJSONOptions

```typescript
interface ImportJSONOptions {
  schema?: Record<string, string>;
  replaceTable?: boolean;
  batchSize?: number;
}
```

#### ExportJSONOptions

```typescript
interface ExportJSONOptions {
  format?: 'array' | 'records' | 'values';
  dateFormat?: 'iso' | 'timestamp' | 'string';
  indent?: number;
}
```

## Error Types

### DuckDBError

Custom error class with error codes.

```typescript
class DuckDBError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly originalError?: Error;
  
  constructor(
    message: string, 
    code: ErrorCode, 
    details?: unknown, 
    cause?: Error
  );
  
  static connectionFailed(message: string, cause?: Error): DuckDBError;
  static queryFailed(message: string, query?: string, cause?: Error): DuckDBError;
  static importFailed(message: string, cause?: Error): DuckDBError;
  static exportFailed(message: string, cause?: Error): DuckDBError;
  static notConnected(): DuckDBError;
  static unsupportedOperation(operation: string): DuckDBError;
  static initializationFailed(message: string, cause?: Error): DuckDBError;
}
```

### ErrorCode

```typescript
enum ErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  IMPORT_FAILED = 'IMPORT_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  NOT_CONNECTED = 'NOT_CONNECTED',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED'
}
```

## Query Builder Types

### QueryBuilder

Base interface for query builders.

```typescript
interface QueryBuilder<T = any> {
  build(): string;
  buildWithBindings(): { sql: string; bindings: any[] };
  toSQL(): string;
  bindings(): any[];
  clone(): this;
  debug(enabled?: boolean): this;
}
```

### SelectQueryBuilder

```typescript
interface SelectQueryBuilder<T = any> extends QueryBuilder<T> {
  select<K extends keyof T>(...columns: K[]): SelectQueryBuilder<Pick<T, K>>;
  select(...columns: string[]): SelectQueryBuilder<T>;
  
  from(table: string, alias?: string): this;
  from<U>(subquery: QueryBuilder<U>, alias: string): this;
  
  where<K extends keyof T>(
    column: K, 
    operator?: ComparisonOperator, 
    value?: T[K]
  ): this;
  where(column: string, operator?: ComparisonOperator, value?: any): this;
  where(callback: (builder: WhereBuilder) => void): this;
  
  orWhere<K extends keyof T>(
    column: K, 
    operator?: ComparisonOperator, 
    value?: T[K]
  ): this;
  
  whereIn<K extends keyof T>(column: K, values: T[K][]): this;
  whereNotIn<K extends keyof T>(column: K, values: T[K][]): this;
  whereNull<K extends keyof T>(column: K): this;
  whereNotNull<K extends keyof T>(column: K): this;
  whereBetween<K extends keyof T>(column: K, min: T[K], max: T[K]): this;
  whereRaw(sql: string, bindings?: any[]): this;
  
  join(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
  join(
    table: string, 
    alias: string, 
    callback: (builder: JoinBuilder) => void
  ): this;
  
  leftJoin(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
  
  rightJoin(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
  
  innerJoin(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
  
  outerJoin(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
  
  groupBy<K extends keyof T>(...columns: K[]): this;
  groupBy(...columns: string[]): this;
  
  having(column: string, operator?: ComparisonOperator, value?: any): this;
  orHaving(column: string, operator?: ComparisonOperator, value?: any): this;
  
  orderBy<K extends keyof T>(column: K, direction?: 'ASC' | 'DESC'): this;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): this;
  orderByRaw(sql: string): this;
  
  limit(count: number): this;
  offset(count: number): this;
  
  with(name: string, query: QueryBuilder | string): this;
  withRecursive(name: string, query: QueryBuilder | string): this;
  
  union(query: QueryBuilder | string): this;
  unionAll(query: QueryBuilder | string): this;
  
  whereExists(query: QueryBuilder | string): this;
  whereNotExists(query: QueryBuilder | string): this;
}
```

### InsertQueryBuilder

```typescript
interface InsertQueryBuilder<T = any> extends QueryBuilder<T> {
  into(table: string): this;
  values(data: T | T[]): this;
  values(data: Record<string, any> | Record<string, any>[]): this;
  columns<K extends keyof T>(...columns: K[]): this;
  columns(...columns: string[]): this;
  fromSelect(query: QueryBuilder | string): this;
  onConflict(columns?: string[]): ConflictBuilder;
}
```

### UpdateQueryBuilder

```typescript
interface UpdateQueryBuilder<T = any> extends QueryBuilder<T> {
  table(table: string): this;
  set(data: Partial<T>): this;
  set(data: Record<string, any>): this;
  set<K extends keyof T>(column: K, value: T[K]): this;
  set(column: string, value: any): this;
  increment(column: string, amount?: number): this;
  decrement(column: string, amount?: number): this;
  
  where<K extends keyof T>(
    column: K, 
    operator?: ComparisonOperator, 
    value?: T[K]
  ): this;
  
  join(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
}
```

### DeleteQueryBuilder

```typescript
interface DeleteQueryBuilder<T = any> extends QueryBuilder<T> {
  from(table: string): this;
  
  where<K extends keyof T>(
    column: K, 
    operator?: ComparisonOperator, 
    value?: T[K]
  ): this;
  
  join(
    table: string, 
    alias: string, 
    leftColumn: string, 
    operator: string, 
    rightColumn: string
  ): this;
}
```

### ComparisonOperator

```typescript
type ComparisonOperator = 
  | '=' | '!=' | '<>' | '<' | '<=' | '>' | '>='
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN'
  | 'IS' | 'IS NOT'
  | 'EXISTS' | 'NOT EXISTS'
  | 'BETWEEN' | 'NOT BETWEEN'
  | 'SIMILAR TO' | 'NOT SIMILAR TO'
  | '~' | '!~' | '~*' | '!~*';
```

## React Types

### Hook Types

#### UseQueryOptions

```typescript
interface UseQueryOptions {
  enabled?: boolean;
  initialData?: T[];
  refetchInterval?: number;
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}
```

#### QueryResult

```typescript
interface QueryResult<T> {
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  metadata: ColumnMetadata[] | null;
}
```

#### UseMutationOptions

```typescript
interface UseMutationOptions<T> {
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
  onSettled?: (data: T[] | undefined, error: Error | null) => void;
}
```

#### MutationResult

```typescript
interface MutationResult<T> {
  mutate: (sql: string, params?: unknown[]) => Promise<T[]>;
  mutateAsync: (sql: string, params?: unknown[]) => Promise<T[]>;
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

### Context Types

#### DuckDBContextValue

```typescript
interface DuckDBContextValue {
  connection: Connection | null;
  status: ConnectionStatus;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
}
```

#### DuckDBProviderProps

```typescript
interface DuckDBProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  config?: ConnectionConfig;
  debug?: DebugConfig;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}
```

## Vue Types

### Composable Types

#### MaybeRef

```typescript
type MaybeRef<T> = T | Ref<T>;
```

#### UseQueryReturn

```typescript
interface UseQueryReturn<T> {
  data: Ref<T[] | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  execute: () => Promise<void>;
  refresh: () => Promise<void>;
  metadata: Ref<ColumnMetadata[] | null>;
}
```

#### UseMutationReturn

```typescript
interface UseMutationReturn<T> {
  mutate: (sql: string, params?: unknown[]) => Promise<T[]>;
  mutateAsync: (sql: string, params?: unknown[]) => Promise<T[]>;
  data: Ref<T[] | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reset: () => void;
}
```

### Plugin Types

#### DuckDBPluginOptions

```typescript
interface DuckDBPluginOptions {
  autoConnect?: boolean;
  config?: ConnectionConfig;
  debug?: DebugConfig;
  globalProperty?: string;
}
```

#### DuckDBGlobalAPI

```typescript
interface DuckDBGlobalAPI {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  readonly status: ConnectionStatus;
  readonly isConnected: boolean;
  readonly connection: Connection | null;
  
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute<T>(sql: string, params?: unknown[]): Promise<ResultSet<T>>;
  
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T>(query: string): Promise<T[]>;
  
  clearCache(): void;
  getCacheStats(): CacheStats;
  invalidateCache(pattern: string | RegExp): number;
}
```

## Svelte Types

### Store Types

#### DuckDBOptions

```typescript
interface DuckDBOptions {
  autoConnect?: boolean;
  config?: ConnectionConfig;
  debug?: DebugConfig;
}
```

#### DuckDBStore

```typescript
interface DuckDBStore {
  connection: Readable<Connection | null>;
  status: Readable<ConnectionStatus>;
  error: Readable<Error | null>;
  isConnected: Readable<boolean>;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  query<T>(sql: string, params?: unknown[]): QueryStore<T>;
  execute<T>(sql: string, params?: unknown[]): Promise<ResultSet<T>>;
  
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T>(query: string): Promise<T[]>;
  
  clearCache(): void;
  getCacheStats(): CacheStats;
  invalidateCache(pattern: string | RegExp): number;
}
```

#### QueryStore

```typescript
interface QueryStore<T> extends Readable<QueryState<T>> {
  execute(): Promise<void>;
  refresh(): Promise<void>;
  subscribe(run: (value: QueryState<T>) => void): Unsubscriber;
}
```

#### QueryState

```typescript
interface QueryState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  metadata: ColumnMetadata[] | null;
}
```

#### MutationStore

```typescript
interface MutationStore<T> extends Readable<MutationState<T>> {
  execute(sql: string, params?: unknown[]): Promise<T[]>;
  reset(): void;
  subscribe(run: (value: MutationState<T>) => void): Unsubscriber;
}
```

#### MutationState

```typescript
interface MutationState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}
```

## Utility Types

### Type Guards

```typescript
function isDuckDBError(error: unknown): error is DuckDBError;
function isConnection(obj: unknown): obj is Connection;
function isResultSet<T>(obj: unknown): obj is ResultSet<T>;
```

### Helper Types

#### DeepReadonly

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

#### Optional

```typescript
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
```

#### NonEmptyArray

```typescript
type NonEmptyArray<T> = [T, ...T[]];
```

## Type Augmentation

### Module Augmentation

Extend types for custom use cases:

```typescript
// Custom error codes
declare module '@duckdb-wasm-adapter/core' {
  interface ErrorCode {
    CUSTOM_ERROR: 'CUSTOM_ERROR';
  }
}

// Custom connection config
declare module '@duckdb-wasm-adapter/core' {
  interface ConnectionConfig {
    customOption?: boolean;
  }
}

// Custom cache options
declare module '@duckdb-wasm-adapter/core' {
  interface CacheConfig {
    customStrategy?: 'custom';
  }
}
```

### Global Types

#### Vue Global Properties

```typescript
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $duckdb: DuckDBGlobalAPI;
  }
}
```

## Usage Examples

### Generic Types with Constraints

```typescript
// Define table schema
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  department: string;
}

// Type-safe query building
const query = select<User>('id', 'name', 'email')
  .from('users')
  .where('age', '>', 18)
  .orderBy('name')
  .build();

// Type-safe results
const connection = await createConnection();
const result = await connection.execute<Pick<User, 'id' | 'name' | 'email'>>(query);
const users: Pick<User, 'id' | 'name' | 'email'>[] = result.toArray();
```

### Framework-Specific Types

```typescript
// React
function UserList() {
  const { data, loading, error } = useQuery<User>('SELECT * FROM users');
  // data is typed as User[] | undefined
}

// Vue
const { data, loading, error } = useQuery<User>('SELECT * FROM users');
// data is Ref<User[] | undefined>

// Svelte
const users = db.query<User>('SELECT * FROM users');
// $users.data is User[] | null
```

### Custom Type Definitions

```typescript
// Define custom result type
interface AnalyticsResult {
  metric: string;
  value: number;
  period: string;
}

// Use with query builder
const analyticsQuery = select<AnalyticsResult>('metric', 'value', 'period')
  .from('analytics')
  .where('period', '=', '2024-Q1')
  .build();

// Type-safe export
const analytics = await connection.exportJSON<AnalyticsResult>(analyticsQuery);
```
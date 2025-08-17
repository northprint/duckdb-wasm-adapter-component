# TypeScript Support

DuckDB WASM Adapter provides comprehensive TypeScript support with full type definitions and type safety.

## Installation

TypeScript definitions are included with each package:

```bash
npm install @northprint/duckdb-wasm-adapter-core
npm install @northprint/duckdb-wasm-adapter-react
npm install @northprint/duckdb-wasm-adapter-vue
npm install @northprint/duckdb-wasm-adapter-svelte
```

## Basic Types

### Core Types

```typescript
import type {
  Connection,
  ConnectionConfig,
  ResultSet,
  QueryResult,
  DuckDBError,
  ErrorCode
} from '@northprint/duckdb-wasm-adapter-core';

// Connection configuration
const config: ConnectionConfig = {
  worker: true,
  logLevel: 'warning',
  cache: {
    enabled: true,
    maxEntries: 100,
    ttl: 60000
  }
};

// Connection instance
const connection: Connection = await createConnection(config);

// Query result
const result: ResultSet = await connection.execute('SELECT * FROM users');
const data: any[] = result.toArray();
```

### Generic Types

```typescript
// Define your data structure
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  created_at: Date;
}

// Type-safe query results
async function getUsers(): Promise<User[]> {
  const result = await connection.execute('SELECT * FROM users');
  return result.toArray() as User[];
}

// With generics
async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const result = await connection.execute(sql, params);
  return result.toArray() as T[];
}

// Usage
const users = await query<User>('SELECT * FROM users WHERE age > ?', [18]);
```

## Framework Type Definitions

### React Types

```typescript
import type {
  DuckDBProviderProps,
  UseQueryOptions,
  UseQueryResult,
  UseMutationOptions,
  UseMutationResult
} from '@northprint/duckdb-wasm-adapter-react';

// Provider props
const providerProps: DuckDBProviderProps = {
  autoConnect: true,
  config: {
    worker: true
  },
  onConnect: () => console.log('Connected'),
  children: null
};

// Query hook with types
function useTypedQuery<T = any>(
  sql: string,
  params?: any[],
  options?: UseQueryOptions
): UseQueryResult<T> {
  return useQuery<T>(sql, params, options);
}

// Component with typed data
function UserList() {
  const { data, loading, error } = useTypedQuery<User>(
    'SELECT * FROM users'
  );
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name} ({user.age})</li>
      ))}
    </ul>
  );
}
```

### Vue Types

```typescript
import type {
  DuckDBPluginOptions,
  UseQueryReturn,
  UseMutationReturn
} from '@northprint/duckdb-wasm-adapter-vue';

// Plugin options
const options: DuckDBPluginOptions = {
  autoConnect: true,
  config: {
    worker: true
  }
};

// Composition function with types
import { Ref } from 'vue';

interface UseUserQuery {
  users: Ref<User[] | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
}

function useUserQuery(): UseUserQuery {
  const { data, loading, error, refetch } = useQuery<User>(
    'SELECT * FROM users'
  );
  
  return {
    users: data,
    loading,
    error,
    refetch
  };
}
```

### Svelte Types

```typescript
import type {
  DuckDBOptions,
  DuckDBInstance,
  QueryStore,
  QueryState
} from '@northprint/duckdb-wasm-adapter-svelte';

// Configuration
const options: DuckDBOptions = {
  autoConnect: true,
  config: {
    worker: true
  }
};

// Instance type
const db: DuckDBInstance = createDuckDB(options);

// Store types
const queryStore: QueryStore<User> = db.query<User>('SELECT * FROM users');

// State type
const state: QueryState<User> = {
  data: null,
  loading: false,
  error: null
};
```

## Query Builder Types

```typescript
import { QueryBuilder } from '@northprint/duckdb-wasm-adapter-core';

class TypedQueryBuilder<T> extends QueryBuilder {
  async execute(connection: Connection): Promise<T[]> {
    const sql = this.build();
    const result = await connection.execute(sql);
    return result.toArray() as T[];
  }
}

// Usage
const builder = new TypedQueryBuilder<User>();
const users = await builder
  .select('*')
  .from('users')
  .where('age', '>', 18)
  .orderBy('name', 'ASC')
  .execute(connection);
```

## Error Types

```typescript
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

function handleError(error: unknown): string {
  if (error instanceof DuckDBError) {
    switch (error.code) {
      case ErrorCode.CONNECTION_FAILED:
        return 'Connection failed';
      case ErrorCode.QUERY_FAILED:
        return 'Query failed';
      case ErrorCode.TABLE_NOT_FOUND:
        return 'Table not found';
      default:
        return error.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown error';
}
```

## Custom Type Guards

```typescript
// Type guard for DuckDB errors
function isDuckDBError(error: unknown): error is DuckDBError {
  return error instanceof DuckDBError;
}

// Type guard for result data
function hasData<T>(result: QueryResult<T>): result is { data: T[] } {
  return result.data !== null && Array.isArray(result.data);
}

// Usage
try {
  const result = await connection.execute('SELECT * FROM users');
  
  if (hasData(result)) {
    result.data.forEach(row => console.log(row));
  }
} catch (error) {
  if (isDuckDBError(error)) {
    console.error('DuckDB error:', error.code);
  }
}
```

## Utility Types

```typescript
// Nullable type
type Nullable<T> = T | null;

// Query result type
type QueryResult<T> = {
  data: Nullable<T[]>;
  loading: boolean;
  error: Nullable<Error>;
};

// Table schema type
type TableSchema<T> = {
  [K in keyof T]: {
    type: 'INTEGER' | 'VARCHAR' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP';
    nullable?: boolean;
    primary?: boolean;
    unique?: boolean;
  };
};

// Define schema
const userSchema: TableSchema<User> = {
  id: { type: 'INTEGER', primary: true },
  name: { type: 'VARCHAR', nullable: false },
  email: { type: 'VARCHAR', unique: true },
  age: { type: 'INTEGER' },
  created_at: { type: 'TIMESTAMP' }
};
```

## Advanced Type Patterns

### Repository Pattern

```typescript
interface Repository<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

class UserRepository implements Repository<User> {
  constructor(private connection: Connection) {}
  
  async findAll(): Promise<User[]> {
    const result = await this.connection.execute('SELECT * FROM users');
    return result.toArray() as User[];
  }
  
  async findById(id: number): Promise<User | null> {
    const result = await this.connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    const data = result.toArray() as User[];
    return data[0] || null;
  }
  
  async create(data: Omit<User, 'id'>): Promise<User> {
    await this.connection.execute(
      'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
      [data.name, data.email, data.age]
    );
    
    const result = await this.connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [data.email]
    );
    
    return (result.toArray() as User[])[0];
  }
  
  async update(id: number, data: Partial<User>): Promise<User> {
    const sets = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    
    await this.connection.execute(
      `UPDATE users SET ${sets} WHERE id = ?`,
      [...Object.values(data), id]
    );
    
    return this.findById(id) as Promise<User>;
  }
  
  async delete(id: number): Promise<void> {
    await this.connection.execute('DELETE FROM users WHERE id = ?', [id]);
  }
}
```

### Type-safe Query Builder

```typescript
type WhereOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';

class TypeSafeQueryBuilder<T> {
  private selectColumns: (keyof T)[] = [];
  private whereConditions: Array<{
    column: keyof T;
    operator: WhereOperator;
    value: any;
  }> = [];
  private tableName: string = '';
  
  select(...columns: (keyof T)[]): this {
    this.selectColumns = columns;
    return this;
  }
  
  from(table: string): this {
    this.tableName = table;
    return this;
  }
  
  where(column: keyof T, operator: WhereOperator, value: any): this {
    this.whereConditions.push({ column, operator, value });
    return this;
  }
  
  build(): string {
    const columns = this.selectColumns.length > 0
      ? this.selectColumns.join(', ')
      : '*';
    
    let sql = `SELECT ${columns} FROM ${this.tableName}`;
    
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions
        .map(c => `${String(c.column)} ${c.operator} ?`)
        .join(' AND ');
      sql += ` WHERE ${conditions}`;
    }
    
    return sql;
  }
  
  getParams(): any[] {
    return this.whereConditions.map(c => c.value);
  }
}

// Usage
const builder = new TypeSafeQueryBuilder<User>();
const sql = builder
  .select('id', 'name', 'email')  // Type-safe column names
  .from('users')
  .where('age', '>', 18)           // Type-safe column
  .where('email', 'LIKE', '%@example.com')
  .build();
```

## Declaration Files

### Custom declarations (types.d.ts)

```typescript
declare module '@northprint/duckdb-wasm-adapter-core' {
  export interface Connection {
    execute(sql: string, params?: any[]): Promise<ResultSet>;
    importCSV(file: File, tableName: string, options?: ImportCSVOptions): Promise<void>;
    exportJSON(query: string): Promise<any[]>;
    close(): Promise<void>;
  }
  
  export interface ResultSet {
    toArray(): any[];
    getMetadata(): ColumnMetadata[];
  }
  
  export interface ColumnMetadata {
    name: string;
    type: string;
    nullable: boolean;
  }
}
```

## TSConfig Setup

### Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": [
      "@northprint/duckdb-wasm-adapter-core",
      "@northprint/duckdb-wasm-adapter-react"
    ]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Best Practices

1. **Use strict mode** - Enable TypeScript strict mode
2. **Define interfaces** - Create interfaces for your data structures
3. **Use generics** - Make functions reusable with generics
4. **Type guards** - Create type guards for runtime safety
5. **Avoid any** - Use specific types instead of `any`
6. **Export types** - Export type definitions for reuse
7. **Document types** - Add JSDoc comments to complex types
8. **Test types** - Include type tests in your test suite
# Query Builder API

The Query Builder provides a fluent, type-safe API for constructing SQL queries programmatically.

## Installation

The Query Builder is included in the core package:

```bash
npm install @northprint/duckdb-wasm-adapter-core
```

## Factory Functions

### select()

Creates a SELECT query builder.

```typescript
function select(...columns: string[]): SelectQueryBuilder
```

```typescript
import { select } from '@northprint/duckdb-wasm-adapter-core';

const query = select('id', 'name', 'email')
  .from('users')
  .where('active', '=', true)
  .build();
// SELECT id, name, email FROM users WHERE active = true
```

### insertInto()

Creates an INSERT query builder.

```typescript
function insertInto(table: string): InsertQueryBuilder
```

```typescript
import { insertInto } from '@northprint/duckdb-wasm-adapter-core';

const query = insertInto('users')
  .values({ name: 'Alice', email: 'alice@example.com' })
  .build();
// INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')
```

### update()

Creates an UPDATE query builder.

```typescript
function update(table: string): UpdateQueryBuilder
```

```typescript
import { update } from '@northprint/duckdb-wasm-adapter-core';

const query = update('users')
  .set({ active: false })
  .where('last_login', '<', '2023-01-01')
  .build();
// UPDATE users SET active = false WHERE last_login < '2023-01-01'
```

### deleteFrom()

Creates a DELETE query builder.

```typescript
function deleteFrom(table: string): DeleteQueryBuilder
```

```typescript
import { deleteFrom } from '@northprint/duckdb-wasm-adapter-core';

const query = deleteFrom('users')
  .where('status', '=', 'deleted')
  .build();
// DELETE FROM users WHERE status = 'deleted'
```

## SelectQueryBuilder

### Column Selection

#### select()

Add columns to SELECT clause.

```typescript
select(...columns: string[]): this
```

```typescript
select('id', 'name', 'email')
select('u.name', 'p.title', 'COUNT(*) as post_count')
select('*')
```

### FROM Clause

#### from()

Specify the main table.

```typescript
from(table: string, alias?: string): this
```

```typescript
.from('users')
.from('users', 'u')
.from('(SELECT * FROM active_users)', 'au')
```

### WHERE Conditions

#### where()

Add WHERE conditions.

```typescript
where(column: string, operator?: ComparisonOperator, value?: any): this
where(callback: (builder: WhereBuilder) => void): this
```

```typescript
.where('age', '>', 18)
.where('status', '=', 'active')
.where('name', 'LIKE', '%john%')
.where((builder) => {
  builder.where('role', '=', 'admin')
         .orWhere('role', '=', 'moderator');
})
```

#### orWhere()

Add OR WHERE conditions.

```typescript
orWhere(column: string, operator?: ComparisonOperator, value?: any): this
```

```typescript
.where('role', '=', 'admin')
.orWhere('role', '=', 'moderator')
```

#### whereIn()

Add WHERE IN conditions.

```typescript
whereIn(column: string, values: any[]): this
```

```typescript
.whereIn('status', ['active', 'pending'])
.whereIn('department_id', [1, 2, 3])
```

#### whereNotIn()

Add WHERE NOT IN conditions.

```typescript
whereNotIn(column: string, values: any[]): this
```

```typescript
.whereNotIn('status', ['deleted', 'banned'])
```

#### whereNull()

Add WHERE IS NULL conditions.

```typescript
whereNull(column: string): this
```

```typescript
.whereNull('deleted_at')
```

#### whereNotNull()

Add WHERE IS NOT NULL conditions.

```typescript
whereNotNull(column: string): this
```

```typescript
.whereNotNull('email')
```

#### whereBetween()

Add WHERE BETWEEN conditions.

```typescript
whereBetween(column: string, min: any, max: any): this
```

```typescript
.whereBetween('age', 18, 65)
.whereBetween('created_at', '2024-01-01', '2024-12-31')
```

#### whereRaw()

Add raw WHERE conditions.

```typescript
whereRaw(sql: string, bindings?: any[]): this
```

```typescript
.whereRaw('EXTRACT(year FROM created_at) = ?', [2024])
.whereRaw('salary > (SELECT AVG(salary) FROM employees)')
```

### JOIN Operations

#### join()

Add INNER JOIN.

```typescript
join(table: string, alias: string, leftColumn: string, operator: string, rightColumn: string): this
join(table: string, alias: string, callback: (builder: JoinBuilder) => void): this
```

```typescript
.join('posts', 'p', 'users.id', '=', 'p.user_id')
.join('comments', 'c', (builder) => {
  builder.on('posts.id', '=', 'c.post_id')
         .where('c.approved', '=', true);
})
```

#### leftJoin()

Add LEFT JOIN.

```typescript
leftJoin(table: string, alias: string, leftColumn: string, operator: string, rightColumn: string): this
```

```typescript
.leftJoin('profiles', 'pr', 'users.id', '=', 'pr.user_id')
```

#### rightJoin()

Add RIGHT JOIN.

```typescript
rightJoin(table: string, alias: string, leftColumn: string, operator: string, rightColumn: string): this
```

#### innerJoin()

Alias for join().

#### outerJoin()

Add FULL OUTER JOIN.

```typescript
outerJoin(table: string, alias: string, leftColumn: string, operator: string, rightColumn: string): this
```

### GROUP BY

#### groupBy()

Add GROUP BY clause.

```typescript
groupBy(...columns: string[]): this
```

```typescript
.groupBy('department')
.groupBy('department', 'role')
```

### HAVING

#### having()

Add HAVING conditions.

```typescript
having(column: string, operator?: ComparisonOperator, value?: any): this
```

```typescript
.groupBy('department')
.having('COUNT(*)', '>', 5)
.having('AVG(salary)', '>=', 50000)
```

#### orHaving()

Add OR HAVING conditions.

```typescript
orHaving(column: string, operator?: ComparisonOperator, value?: any): this
```

### ORDER BY

#### orderBy()

Add ORDER BY clause.

```typescript
orderBy(column: string, direction?: 'ASC' | 'DESC'): this
```

```typescript
.orderBy('name')
.orderBy('created_at', 'DESC')
.orderBy('salary', 'ASC')
```

#### orderByRaw()

Add raw ORDER BY clause.

```typescript
orderByRaw(sql: string): this
```

```typescript
.orderByRaw('RANDOM()')
.orderByRaw('LENGTH(name) DESC')
```

### LIMIT and OFFSET

#### limit()

Add LIMIT clause.

```typescript
limit(count: number): this
```

```typescript
.limit(10)
.limit(100)
```

#### offset()

Add OFFSET clause.

```typescript
offset(count: number): this
```

```typescript
.offset(20)
.limit(10)
.offset(50) // LIMIT 10 OFFSET 50
```

### Common Table Expressions (CTEs)

#### with()

Add WITH clause.

```typescript
with(name: string, query: QueryBuilder | string): this
```

```typescript
.with('active_users', 
  select('*').from('users').where('status', '=', 'active')
)
.from('active_users')
```

#### withRecursive()

Add recursive WITH clause.

```typescript
withRecursive(name: string, query: QueryBuilder | string): this
```

### UNION Operations

#### union()

Add UNION.

```typescript
union(query: QueryBuilder | string): this
```

```typescript
select('name', 'email').from('customers')
.union(
  select('name', 'email').from('suppliers')
)
```

#### unionAll()

Add UNION ALL.

```typescript
unionAll(query: QueryBuilder | string): this
```

### Subqueries

#### whereExists()

Add WHERE EXISTS.

```typescript
whereExists(query: QueryBuilder | string): this
```

```typescript
.whereExists(
  select('1').from('orders').where('orders.user_id', '=', 'users.id')
)
```

#### whereNotExists()

Add WHERE NOT EXISTS.

```typescript
whereNotExists(query: QueryBuilder | string): this
```

## InsertQueryBuilder

### values()

Specify values to insert.

```typescript
values(data: Record<string, any> | Record<string, any>[]): this
```

```typescript
// Single row
insertInto('users')
  .values({
    name: 'Alice',
    email: 'alice@example.com',
    age: 25
  })

// Multiple rows
insertInto('users')
  .values([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ])
```

### columns()

Specify columns for insert.

```typescript
columns(...columns: string[]): this
```

```typescript
insertInto('users')
  .columns('name', 'email')
  .values(['Alice', 'alice@example.com'])
```

### fromSelect()

Insert from SELECT query.

```typescript
fromSelect(query: QueryBuilder | string): this
```

```typescript
insertInto('archived_users')
  .columns('name', 'email')
  .fromSelect(
    select('name', 'email')
      .from('users')
      .where('status', '=', 'inactive')
  )
```

### onConflict()

Add ON CONFLICT clause (PostgreSQL-style).

```typescript
onConflict(columns?: string[]): ConflictBuilder
```

```typescript
insertInto('users')
  .values({ email: 'alice@example.com', name: 'Alice Updated' })
  .onConflict(['email'])
  .doUpdate({ name: 'Alice Updated' })
```

## UpdateQueryBuilder

### set()

Specify columns to update.

```typescript
set(data: Record<string, any>): this
set(column: string, value: any): this
```

```typescript
update('users')
  .set({
    status: 'active',
    updated_at: 'NOW()'
  })
  .where('id', '=', 1)

update('users')
  .set('last_login', 'NOW()')
  .where('id', '=', 1)
```

### increment()

Increment a numeric column.

```typescript
increment(column: string, amount?: number): this
```

```typescript
update('users')
  .increment('login_count')
  .increment('points', 10)
  .where('id', '=', 1)
```

### decrement()

Decrement a numeric column.

```typescript
decrement(column: string, amount?: number): this
```

```typescript
update('products')
  .decrement('stock', 1)
  .where('id', '=', productId)
```

## DeleteQueryBuilder

### join()

Add JOIN to DELETE query.

```typescript
join(table: string, alias: string, leftColumn: string, operator: string, rightColumn: string): this
```

```typescript
deleteFrom('users')
  .join('user_sessions', 'us', 'users.id', '=', 'us.user_id')
  .where('us.expired', '=', true)
```

## Type Safety

### Typed Query Builder

Use TypeScript interfaces for type safety:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  department: string;
}

const query = select<User>('id', 'name', 'email')
  .from('users')
  .where('age', '>', 18)
  .build();

// Result will be typed as Pick<User, 'id' | 'name' | 'email'>[]
```

### Generic Constraints

```typescript
interface QueryBuilder<T = any> {
  build(): string;
  buildWithBindings(): { sql: string; bindings: any[] };
}

interface SelectQueryBuilder<T = any> extends QueryBuilder<T> {
  select<K extends keyof T>(...columns: K[]): SelectQueryBuilder<Pick<T, K>>;
  from(table: string, alias?: string): this;
  where<K extends keyof T>(column: K, operator?: ComparisonOperator, value?: T[K]): this;
}
```

## Comparison Operators

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

## Raw SQL

### raw()

Include raw SQL in queries.

```typescript
function raw(sql: string, bindings?: any[]): RawExpression
```

```typescript
import { raw } from '@northprint/duckdb-wasm-adapter-core';

select('name', raw('COUNT(*) as total'))
  .from('users')
  .where('created_at', '>', raw('NOW() - INTERVAL 1 DAY'))
  .groupBy('name')
```

## Utility Methods

### clone()

Clone a query builder.

```typescript
clone(): this
```

```typescript
const baseQuery = select('*').from('users');
const activeUsers = baseQuery.clone().where('active', '=', true);
const inactiveUsers = baseQuery.clone().where('active', '=', false);
```

### toSQL()

Get SQL without executing.

```typescript
toSQL(): string
```

```typescript
const sql = select('*')
  .from('users')
  .where('active', '=', true)
  .toSQL();

console.log(sql); // SELECT * FROM users WHERE active = true
```

### bindings()

Get parameter bindings.

```typescript
bindings(): any[]
```

### debug()

Enable debug mode for this query.

```typescript
debug(enabled?: boolean): this
```

```typescript
select('*')
  .from('users')
  .debug(true)
  .where('id', '=', 1)
```

## Best Practices

1. **Use parameterized queries** to prevent SQL injection
2. **Chain methods** for better readability
3. **Use aliases** for complex queries with joins
4. **Leverage TypeScript** for type safety
5. **Use CTEs** for complex logic instead of nested subqueries
6. **Test generated SQL** during development
7. **Use raw expressions** sparingly and carefully
8. **Cache query builders** when reusing the same patterns
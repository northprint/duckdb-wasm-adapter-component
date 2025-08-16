# Query Builder

Build type-safe SQL queries programmatically with the Query Builder API.

## Overview

The Query Builder provides a fluent, type-safe API for constructing SQL queries. It helps prevent SQL injection, provides IDE autocomplete, and makes complex queries more maintainable.

## Basic Usage

### SELECT Queries

```javascript
import { select } from '@duckdb-wasm-adapter/core';

// Simple select
const query = select('id', 'name', 'email')
  .from('users')
  .build();
// SELECT id, name, email FROM users

// With conditions
const query = select('*')
  .from('users')
  .where('active', '=', true)
  .where('age', '>', 18)
  .build();
// SELECT * FROM users WHERE active = true AND age > 18

// With ordering and limit
const query = select('name', 'salary')
  .from('employees')
  .where('department', '=', 'Engineering')
  .orderBy('salary', 'DESC')
  .limit(10)
  .build();
// SELECT name, salary FROM employees 
// WHERE department = 'Engineering' 
// ORDER BY salary DESC 
// LIMIT 10
```

### INSERT Queries

```javascript
import { insert } from '@duckdb-wasm-adapter/core';

// Single insert
const query = insert('users')
  .values({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  })
  .build();
// INSERT INTO users (name, email, age) 
// VALUES ('John Doe', 'john@example.com', 30)

// Multiple inserts
const query = insert('users')
  .values([
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' }
  ])
  .build();

// Insert with returning
const query = insert('users')
  .values({ name: 'Charlie', email: 'charlie@example.com' })
  .returning('id')
  .build();
// INSERT INTO users (name, email) 
// VALUES ('Charlie', 'charlie@example.com') 
// RETURNING id
```

### UPDATE Queries

```javascript
import { update } from '@duckdb-wasm-adapter/core';

// Simple update
const query = update('users')
  .set({ email: 'newemail@example.com' })
  .where('id', '=', 123)
  .build();
// UPDATE users SET email = 'newemail@example.com' WHERE id = 123

// Multiple updates
const query = update('users')
  .set({
    name: 'Updated Name',
    email: 'updated@example.com',
    modified_at: 'NOW()'
  })
  .where('id', '=', 123)
  .build();

// Conditional update
const query = update('employees')
  .set({ salary: raw('salary * 1.1') })
  .where('performance_rating', '>', 4)
  .where('department', '=', 'Sales')
  .build();
```

### DELETE Queries

```javascript
import { deleteFrom } from '@duckdb-wasm-adapter/core';

// Simple delete
const query = deleteFrom('users')
  .where('id', '=', 123)
  .build();
// DELETE FROM users WHERE id = 123

// Delete with multiple conditions
const query = deleteFrom('logs')
  .where('created_at', '<', '2023-01-01')
  .where('level', '=', 'debug')
  .build();
// DELETE FROM logs 
// WHERE created_at < '2023-01-01' AND level = 'debug'
```

## Advanced Features

### JOINs

```javascript
// Inner join
const query = select('u.name', 'd.name as department')
  .from('users', 'u')
  .innerJoin('departments', 'd', 'u.department_id', '=', 'd.id')
  .build();

// Left join
const query = select('u.name', 'COUNT(o.id) as order_count')
  .from('users', 'u')
  .leftJoin('orders', 'o', 'u.id', '=', 'o.user_id')
  .groupBy('u.id', 'u.name')
  .build();

// Multiple joins
const query = select('u.name', 'd.name as department', 'p.title as project')
  .from('users', 'u')
  .innerJoin('departments', 'd', 'u.department_id', '=', 'd.id')
  .leftJoin('user_projects', 'up', 'u.id', '=', 'up.user_id')
  .leftJoin('projects', 'p', 'up.project_id', '=', 'p.id')
  .where('u.active', '=', true)
  .build();
```

### Aggregations

```javascript
// Group by with aggregations
const query = select('department')
  .count('*', 'employee_count')
  .avg('salary', 'avg_salary')
  .max('salary', 'max_salary')
  .min('salary', 'min_salary')
  .from('employees')
  .groupBy('department')
  .having('COUNT(*)', '>', 5)
  .orderBy('avg_salary', 'DESC')
  .build();

// Window functions
const query = select('name', 'salary', 'department')
  .raw('RANK() OVER (PARTITION BY department ORDER BY salary DESC)', 'salary_rank')
  .from('employees')
  .build();
```

### Subqueries

```javascript
// Subquery in WHERE
const subquery = select('id')
  .from('departments')
  .where('name', '=', 'Engineering');

const query = select('*')
  .from('users')
  .whereIn('department_id', subquery)
  .build();

// Subquery in FROM
const subquery = select('department_id')
  .count('*', 'emp_count')
  .from('employees')
  .groupBy('department_id')
  .as('dept_counts');

const query = select('d.name', 'dc.emp_count')
  .from('departments', 'd')
  .innerJoin(subquery, 'dc', 'd.id', '=', 'dc.department_id')
  .build();
```

### Complex Conditions

```javascript
// OR conditions
const query = select('*')
  .from('users')
  .where('department', '=', 'Engineering')
  .orWhere('department', '=', 'Sales')
  .build();

// Grouped conditions
const query = select('*')
  .from('products')
  .where(q => q
    .where('category', '=', 'Electronics')
    .where('price', '<', 1000)
  )
  .orWhere(q => q
    .where('category', '=', 'Books')
    .where('price', '<', 50)
  )
  .build();

// IN clause
const query = select('*')
  .from('users')
  .whereIn('department', ['Engineering', 'Sales', 'Marketing'])
  .build();

// BETWEEN
const query = select('*')
  .from('orders')
  .whereBetween('created_at', '2024-01-01', '2024-12-31')
  .build();

// NULL checks
const query = select('*')
  .from('users')
  .whereNull('deleted_at')
  .whereNotNull('email')
  .build();
```

## TypeScript Support

### Type-Safe Queries

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  department: string;
}

// Type-safe select
const query = select<User>('id', 'name', 'email')
  .from('users')
  .where('department', '=', 'Engineering')
  .build();

// Type-safe insert
const query = insert<User>('users')
  .values({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering'
  })
  .build();

// Type checking prevents errors
const query = select<User>('id', 'name', 'invalid_column') // TypeScript error!
  .from('users')
  .build();
```

### Custom Types

```typescript
// Define table schemas
type UserTable = {
  id: number;
  name: string;
  email: string;
  created_at: Date;
};

type OrderTable = {
  id: number;
  user_id: number;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled';
};

// Use in queries
const userQuery = select<UserTable>('id', 'name')
  .from('users')
  .where('created_at', '>', new Date('2024-01-01'))
  .build();

const orderQuery = select<OrderTable>('*')
  .from('orders')
  .where('status', '=', 'completed')
  .build();
```

## Query Execution

### With React

```jsx
import { useQueryBuilder } from '@duckdb-wasm-adapter/react';
import { select } from '@duckdb-wasm-adapter/core';

function UserList() {
  const queryBuilder = useQueryBuilder();
  
  const query = select('id', 'name', 'email')
    .from('users')
    .where('active', '=', true)
    .orderBy('name')
    .limit(50);
  
  const { data, loading, error } = queryBuilder.execute(query);
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && (
        <ul>
          {data.map(user => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### With Vue

```vue
<template>
  <div>
    <ul v-if="users">
      <li v-for="user in users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQueryBuilder } from '@duckdb-wasm-adapter/vue';
import { select } from '@duckdb-wasm-adapter/core';

const queryBuilder = useQueryBuilder();

const query = select('id', 'name', 'email')
  .from('users')
  .where('active', '=', true)
  .orderBy('name')
  .limit(50);

const { data: users } = queryBuilder.execute(query);
</script>
```

## Raw SQL

Sometimes you need to use raw SQL expressions:

```javascript
import { raw } from '@duckdb-wasm-adapter/core';

// Raw expressions in select
const query = select('name')
  .raw('EXTRACT(YEAR FROM AGE(birth_date))', 'age')
  .from('users')
  .build();

// Raw WHERE conditions
const query = select('*')
  .from('events')
  .whereRaw('DATE(created_at) = CURRENT_DATE')
  .build();

// Raw in SET clause
const query = update('products')
  .set({
    price: raw('price * 1.1'),
    updated_at: raw('NOW()')
  })
  .where('category', '=', 'Electronics')
  .build();
```

## Query Composition

Build complex queries by composing smaller parts:

```javascript
// Base query
const baseQuery = select('id', 'name', 'email')
  .from('users')
  .where('active', '=', true);

// Add department filter
function addDepartmentFilter(query, department) {
  return query.where('department', '=', department);
}

// Add sorting
function addSorting(query, field, direction = 'ASC') {
  return query.orderBy(field, direction);
}

// Add pagination
function addPagination(query, page, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  return query.limit(pageSize).offset(offset);
}

// Compose final query
let finalQuery = baseQuery;
finalQuery = addDepartmentFilter(finalQuery, 'Engineering');
finalQuery = addSorting(finalQuery, 'name');
finalQuery = addPagination(finalQuery, 1, 10);

const sql = finalQuery.build();
```

## Query Templates

Create reusable query templates:

```javascript
// Query template factory
function createUserQuery(filters = {}) {
  let query = select('id', 'name', 'email', 'department')
    .from('users');
  
  if (filters.active !== undefined) {
    query = query.where('active', '=', filters.active);
  }
  
  if (filters.department) {
    query = query.where('department', '=', filters.department);
  }
  
  if (filters.search) {
    query = query.where('name', 'ILIKE', `%${filters.search}%`);
  }
  
  if (filters.minAge) {
    query = query.where('age', '>=', filters.minAge);
  }
  
  return query;
}

// Usage
const activeEngineers = createUserQuery({
  active: true,
  department: 'Engineering'
}).build();

const searchResults = createUserQuery({
  search: 'john',
  minAge: 25
}).orderBy('name').build();
```

## Performance Tips

1. **Use specific columns** instead of SELECT *
2. **Add indexes** for frequently queried columns
3. **Use LIMIT** for large result sets
4. **Optimize JOIN order** - smaller tables first
5. **Use EXISTS** instead of IN for subqueries
6. **Avoid function calls** in WHERE clauses

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Use TypeScript** for type safety
3. **Create reusable query functions** for common patterns
4. **Test complex queries** before deployment
5. **Document query intentions** with comments
6. **Use meaningful aliases** for readability

## Next Steps

- [Caching](/guide/caching) - Optimize with query caching
- [Performance](/guide/performance) - Advanced optimization
- [TypeScript](/guide/typescript) - Full TypeScript guide
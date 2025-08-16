# Query Builder Examples

Advanced examples using the Query Builder API for programmatic SQL construction.

## Basic Query Building

### Simple SELECT Query

```javascript
import { select } from '@duckdb-wasm-adapter/core';

// Basic select
const query = select('id', 'name', 'email')
  .from('users')
  .build();
// SELECT id, name, email FROM users

// With all columns
const allColumns = select('*')
  .from('users')
  .build();
// SELECT * FROM users

// With alias
const withAlias = select('u.id', 'u.name', 'd.name AS department_name')
  .from('users', 'u')
  .build();
// SELECT u.id, u.name, d.name AS department_name FROM users u
```

### WHERE Conditions

```javascript
// Single condition
const activeUsers = select('*')
  .from('users')
  .where('active', '=', true)
  .build();

// Multiple AND conditions
const filtered = select('*')
  .from('employees')
  .where('department', '=', 'Engineering')
  .where('salary', '>', 100000)
  .where('years_experience', '>=', 3)
  .build();

// OR conditions
const orQuery = select('*')
  .from('products')
  .where('category', '=', 'Electronics')
  .orWhere('category', '=', 'Computers')
  .build();

// Complex conditions with grouping
const complex = select('*')
  .from('orders')
  .where(q => q
    .where('status', '=', 'pending')
    .where('created_at', '>', '2024-01-01')
  )
  .orWhere(q => q
    .where('status', '=', 'processing')
    .where('priority', '=', 'high')
  )
  .build();
```

## Advanced Filtering

### IN and NOT IN

```javascript
// IN clause with array
const inQuery = select('*')
  .from('users')
  .whereIn('department', ['Sales', 'Marketing', 'Support'])
  .build();

// NOT IN clause
const notInQuery = select('*')
  .from('products')
  .whereNotIn('category', ['Discontinued', 'Archive'])
  .build();

// IN with subquery
const subquery = select('department_id')
  .from('departments')
  .where('active', '=', true);

const withSubquery = select('*')
  .from('employees')
  .whereIn('department_id', subquery)
  .build();
```

### BETWEEN and NULL checks

```javascript
// BETWEEN clause
const rangeQuery = select('*')
  .from('orders')
  .whereBetween('total', 100, 1000)
  .whereBetween('created_at', '2024-01-01', '2024-12-31')
  .build();

// NULL checks
const nullCheck = select('*')
  .from('users')
  .whereNull('deleted_at')
  .whereNotNull('email_verified_at')
  .build();

// IS DISTINCT FROM (NULL-safe comparison)
const distinctFrom = select('*')
  .from('products')
  .whereDistinct('old_price', 'new_price')
  .build();
```

### Pattern Matching

```javascript
// LIKE patterns
const likeQuery = select('*')
  .from('users')
  .whereLike('email', '%@gmail.com')
  .whereLike('name', 'John%')
  .build();

// NOT LIKE
const notLike = select('*')
  .from('products')
  .whereNotLike('description', '%discontinued%')
  .build();

// ILIKE for case-insensitive
const ilike = select('*')
  .from('articles')
  .whereILike('title', '%javascript%')
  .build();

// Regular expressions
const regex = select('*')
  .from('logs')
  .whereRegex('message', '^ERROR:.*timeout.*$')
  .build();
```

## JOIN Operations

### Basic JOINs

```javascript
// INNER JOIN
const innerJoin = select('u.name', 'd.name as department')
  .from('users', 'u')
  .innerJoin('departments', 'd', 'u.department_id', '=', 'd.id')
  .build();

// LEFT JOIN
const leftJoin = select('u.name', 'COUNT(o.id) as order_count')
  .from('users', 'u')
  .leftJoin('orders', 'o', 'u.id', '=', 'o.user_id')
  .groupBy('u.id', 'u.name')
  .build();

// RIGHT JOIN
const rightJoin = select('d.name', 'COUNT(u.id) as employee_count')
  .from('users', 'u')
  .rightJoin('departments', 'd', 'd.id', '=', 'u.department_id')
  .groupBy('d.id', 'd.name')
  .build();

// FULL OUTER JOIN
const fullJoin = select('COALESCE(u.name, \'No User\') as user', 
                        'COALESCE(d.name, \'No Dept\') as department')
  .from('users', 'u')
  .fullJoin('departments', 'd', 'u.department_id', '=', 'd.id')
  .build();
```

### Multiple JOINs

```javascript
const multipleJoins = select(
    'u.name as user_name',
    'd.name as department',
    'p.title as project',
    'r.name as role'
  )
  .from('users', 'u')
  .innerJoin('departments', 'd', 'u.department_id', '=', 'd.id')
  .leftJoin('user_projects', 'up', 'u.id', '=', 'up.user_id')
  .leftJoin('projects', 'p', 'up.project_id', '=', 'p.id')
  .leftJoin('roles', 'r', 'u.role_id', '=', 'r.id')
  .where('u.active', '=', true)
  .orderBy('u.name')
  .build();
```

### JOIN with complex conditions

```javascript
// JOIN with multiple conditions
const complexJoin = select('*')
  .from('orders', 'o')
  .innerJoin('order_items', 'oi', (join) => {
    join.on('o.id', '=', 'oi.order_id')
        .on('oi.quantity', '>', 0)
        .on('oi.status', '!=', 'cancelled');
  })
  .build();

// JOIN with subquery
const subqueryJoin = select('u.name', 'us.total_spent')
  .from('users', 'u')
  .innerJoin(
    select('user_id', 'SUM(total) as total_spent')
      .from('orders')
      .groupBy('user_id')
      .as('us'),
    'us',
    'u.id', '=', 'us.user_id'
  )
  .where('us.total_spent', '>', 1000)
  .build();
```

## Aggregation Queries

### Basic Aggregates

```javascript
// Count
const countQuery = select()
  .count('*', 'total_users')
  .from('users')
  .build();

// Multiple aggregates
const stats = select('department')
  .count('*', 'employee_count')
  .avg('salary', 'avg_salary')
  .min('salary', 'min_salary')
  .max('salary', 'max_salary')
  .sum('salary', 'total_payroll')
  .from('employees')
  .groupBy('department')
  .build();

// Conditional aggregates
const conditionalAgg = select('department')
  .count('CASE WHEN active = true THEN 1 END', 'active_count')
  .count('CASE WHEN active = false THEN 1 END', 'inactive_count')
  .avg('CASE WHEN years_experience > 5 THEN salary END', 'senior_avg_salary')
  .from('employees')
  .groupBy('department')
  .build();
```

### GROUP BY and HAVING

```javascript
// GROUP BY with HAVING
const groupQuery = select('department', 'job_title')
  .count('*', 'count')
  .avg('salary', 'avg_salary')
  .from('employees')
  .groupBy('department', 'job_title')
  .having('COUNT(*)', '>', 5)
  .having('AVG(salary)', '>', 50000)
  .orderBy('avg_salary', 'DESC')
  .build();

// GROUPING SETS
const groupingSets = select('department', 'job_title', 'location')
  .count('*', 'count')
  .sum('salary', 'total_salary')
  .from('employees')
  .groupBySets([
    ['department', 'job_title'],
    ['department', 'location'],
    ['job_title', 'location'],
    [] // Grand total
  ])
  .build();

// ROLLUP
const rollup = select('year', 'quarter', 'month')
  .sum('revenue', 'total_revenue')
  .from('sales')
  .groupByRollup('year', 'quarter', 'month')
  .orderBy('year', 'quarter', 'month')
  .build();
```

## Window Functions

### Ranking Functions

```javascript
// ROW_NUMBER
const rowNumber = select('name', 'salary', 'department')
  .raw('ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)', 'rank')
  .from('employees')
  .build();

// RANK and DENSE_RANK
const ranking = select('name', 'score')
  .raw('RANK() OVER (ORDER BY score DESC)', 'rank')
  .raw('DENSE_RANK() OVER (ORDER BY score DESC)', 'dense_rank')
  .raw('PERCENT_RANK() OVER (ORDER BY score DESC)', 'percent_rank')
  .from('results')
  .build();

// NTILE
const quartiles = select('name', 'salary')
  .raw('NTILE(4) OVER (ORDER BY salary)', 'quartile')
  .from('employees')
  .build();
```

### Analytic Functions

```javascript
// Running totals
const runningTotal = select('date', 'amount')
  .raw('SUM(amount) OVER (ORDER BY date)', 'running_total')
  .raw('AVG(amount) OVER (ORDER BY date)', 'running_avg')
  .from('transactions')
  .build();

// Moving window
const movingAvg = select('date', 'value')
  .raw(`
    AVG(value) OVER (
      ORDER BY date 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    )`, 'moving_avg_7day')
  .raw(`
    AVG(value) OVER (
      ORDER BY date 
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    )`, 'moving_avg_30day')
  .from('metrics')
  .build();

// LAG and LEAD
const timeSeries = select('month', 'revenue')
  .raw('LAG(revenue, 1) OVER (ORDER BY month)', 'prev_month')
  .raw('LEAD(revenue, 1) OVER (ORDER BY month)', 'next_month')
  .raw('revenue - LAG(revenue, 1) OVER (ORDER BY month)', 'month_over_month')
  .raw('(revenue - LAG(revenue, 1) OVER (ORDER BY month)) / LAG(revenue, 1) OVER (ORDER BY month) * 100', 'growth_rate')
  .from('monthly_revenue')
  .build();
```

## INSERT Operations

### Basic INSERT

```javascript
import { insert } from '@duckdb-wasm-adapter/core';

// Single row insert
const singleInsert = insert('users')
  .values({
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering',
    active: true
  })
  .build();

// Multiple rows insert
const multiInsert = insert('users')
  .values([
    { name: 'Alice', email: 'alice@example.com', department: 'Sales' },
    { name: 'Bob', email: 'bob@example.com', department: 'Marketing' },
    { name: 'Charlie', email: 'charlie@example.com', department: 'Engineering' }
  ])
  .build();

// Insert with returning
const insertReturning = insert('users')
  .values({ name: 'David', email: 'david@example.com' })
  .returning('id', 'created_at')
  .build();
```

### INSERT SELECT

```javascript
// Insert from select
const insertSelect = insert('archived_users')
  .columns('id', 'name', 'email', 'archived_at')
  .select(
    select('id', 'name', 'email')
      .raw('CURRENT_TIMESTAMP', 'archived_at')
      .from('users')
      .where('active', '=', false)
      .where('last_login', '<', '2023-01-01')
  )
  .build();

// Insert with conflict handling
const upsert = insert('user_settings')
  .values({
    user_id: 123,
    setting_key: 'theme',
    setting_value: 'dark'
  })
  .onConflict('user_id', 'setting_key')
  .doUpdate({
    setting_value: 'dark',
    updated_at: raw('CURRENT_TIMESTAMP')
  })
  .build();
```

## UPDATE Operations

### Basic UPDATE

```javascript
import { update } from '@duckdb-wasm-adapter/core';

// Simple update
const simpleUpdate = update('users')
  .set({ email: 'newemail@example.com' })
  .where('id', '=', 123)
  .build();

// Multiple fields update
const multiFieldUpdate = update('products')
  .set({
    price: 29.99,
    discount: 0.10,
    updated_at: raw('CURRENT_TIMESTAMP')
  })
  .where('category', '=', 'Electronics')
  .where('in_stock', '=', true)
  .build();

// Update with expression
const expressionUpdate = update('employees')
  .set({
    salary: raw('salary * 1.1'),
    bonus: raw('salary * 0.15'),
    last_raise_date: raw('CURRENT_DATE')
  })
  .where('performance_rating', '>=', 4)
  .build();
```

### UPDATE with JOINs

```javascript
// Update with JOIN
const joinUpdate = update('orders', 'o')
  .set({
    status: 'shipped',
    shipped_at: raw('CURRENT_TIMESTAMP')
  })
  .from('customers', 'c')
  .where('o.customer_id', '=', raw('c.id'))
  .where('c.priority', '=', 'high')
  .where('o.status', '=', 'pending')
  .build();

// Update with subquery
const subqueryUpdate = update('products')
  .set({
    bestseller: true
  })
  .whereIn('id', 
    select('product_id')
      .from('order_items')
      .groupBy('product_id')
      .having('SUM(quantity)', '>', 1000)
  )
  .build();
```

## DELETE Operations

### Basic DELETE

```javascript
import { deleteFrom } from '@duckdb-wasm-adapter/core';

// Simple delete
const simpleDelete = deleteFrom('users')
  .where('id', '=', 123)
  .build();

// Delete with multiple conditions
const conditionalDelete = deleteFrom('logs')
  .where('created_at', '<', '2023-01-01')
  .where('level', 'IN', ['debug', 'trace'])
  .build();

// Delete with returning
const deleteReturning = deleteFrom('sessions')
  .where('last_activity', '<', raw('CURRENT_TIMESTAMP - INTERVAL \'30 days\''))
  .returning('*')
  .build();
```

## Common Table Expressions (CTEs)

### Single CTE

```javascript
import { withCTE, select } from '@duckdb-wasm-adapter/core';

const cteQuery = withCTE('active_users', 
    select('*')
      .from('users')
      .where('active', '=', true)
      .where('last_login', '>', '2024-01-01')
  )
  .select('au.name', 'COUNT(o.id) as order_count')
  .from('active_users', 'au')
  .leftJoin('orders', 'o', 'au.id', '=', 'o.user_id')
  .groupBy('au.id', 'au.name')
  .build();
```

### Multiple CTEs

```javascript
const multiCTE = withCTE('high_value_customers',
    select('customer_id')
      .from('orders')
      .groupBy('customer_id')
      .having('SUM(total)', '>', 10000)
  )
  .withCTE('recent_orders',
    select('*')
      .from('orders')
      .where('order_date', '>', raw('CURRENT_DATE - INTERVAL \'30 days\''))
  )
  .select('ro.*', 'c.name as customer_name')
  .from('recent_orders', 'ro')
  .innerJoin('high_value_customers', 'hvc', 'ro.customer_id', '=', 'hvc.customer_id')
  .innerJoin('customers', 'c', 'ro.customer_id', '=', 'c.id')
  .build();
```

### Recursive CTE

```javascript
const recursiveCTE = withRecursiveCTE('category_tree',
    // Anchor query
    select('id', 'name', 'parent_id')
      .raw('0', 'level')
      .raw('name', 'path')
      .from('categories')
      .where('parent_id', 'IS', null),
    // Recursive query
    select('c.id', 'c.name', 'c.parent_id')
      .raw('ct.level + 1', 'level')
      .raw('ct.path || \' > \' || c.name', 'path')
      .from('categories', 'c')
      .innerJoin('category_tree', 'ct', 'c.parent_id', '=', 'ct.id')
  )
  .select('*')
  .from('category_tree')
  .orderBy('path')
  .build();
```

## Dynamic Query Building

### Conditional Query Construction

```javascript
function buildDynamicQuery(filters) {
  let query = select('*').from('products');
  
  // Add conditions based on filters
  if (filters.category) {
    query = query.where('category', '=', filters.category);
  }
  
  if (filters.minPrice !== undefined) {
    query = query.where('price', '>=', filters.minPrice);
  }
  
  if (filters.maxPrice !== undefined) {
    query = query.where('price', '<=', filters.maxPrice);
  }
  
  if (filters.inStock !== undefined) {
    query = query.where('in_stock', '=', filters.inStock);
  }
  
  if (filters.search) {
    query = query.where(q => q
      .whereLike('name', `%${filters.search}%`)
      .orWhereLike('description', `%${filters.search}%`)
    );
  }
  
  // Add sorting
  if (filters.sortBy) {
    query = query.orderBy(filters.sortBy, filters.sortOrder || 'ASC');
  }
  
  // Add pagination
  if (filters.page && filters.pageSize) {
    const offset = (filters.page - 1) * filters.pageSize;
    query = query.limit(filters.pageSize).offset(offset);
  }
  
  return query.build();
}

// Usage
const sql = buildDynamicQuery({
  category: 'Electronics',
  minPrice: 100,
  maxPrice: 1000,
  inStock: true,
  search: 'laptop',
  sortBy: 'price',
  sortOrder: 'ASC',
  page: 1,
  pageSize: 20
});
```

### Query Templates

```javascript
class QueryTemplates {
  static usersByDepartment(department) {
    return select('id', 'name', 'email', 'job_title')
      .from('users')
      .where('department', '=', department)
      .where('active', '=', true)
      .orderBy('name');
  }
  
  static salesReport(startDate, endDate) {
    return select('DATE(order_date) as date')
      .count('*', 'order_count')
      .sum('total', 'revenue')
      .avg('total', 'avg_order_value')
      .from('orders')
      .whereBetween('order_date', startDate, endDate)
      .groupBy('date')
      .orderBy('date');
  }
  
  static topProducts(limit = 10) {
    return select('p.id', 'p.name', 'p.category')
      .count('oi.id', 'times_ordered')
      .sum('oi.quantity', 'total_quantity')
      .sum('oi.quantity * oi.unit_price', 'total_revenue')
      .from('products', 'p')
      .innerJoin('order_items', 'oi', 'p.id', '=', 'oi.product_id')
      .groupBy('p.id', 'p.name', 'p.category')
      .orderBy('total_revenue', 'DESC')
      .limit(limit);
  }
}

// Usage
const engineeringUsers = QueryTemplates.usersByDepartment('Engineering').build();
const monthlySales = QueryTemplates.salesReport('2024-01-01', '2024-01-31').build();
const bestSellers = QueryTemplates.topProducts(20).build();
```

## Query Composition

### Composable Query Parts

```javascript
// Define reusable query parts
const activeUsersFilter = (query) => {
  return query
    .where('active', '=', true)
    .where('email_verified', '=', true);
};

const dateRangeFilter = (query, startDate, endDate) => {
  return query.whereBetween('created_at', startDate, endDate);
};

const paginationFilter = (query, page, pageSize) => {
  const offset = (page - 1) * pageSize;
  return query.limit(pageSize).offset(offset);
};

// Compose query
let query = select('*').from('users');
query = activeUsersFilter(query);
query = dateRangeFilter(query, '2024-01-01', '2024-12-31');
query = paginationFilter(query, 1, 20);
const sql = query.build();
```

## TypeScript Integration

### Type-Safe Query Builder

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  active: boolean;
}

interface Order {
  id: number;
  user_id: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

// Type-safe select
const userQuery = select<User>('id', 'name', 'email')
  .from('users')
  .where('active', '=', true)
  .build();

// Type-safe insert
const insertUser = insert<User>('users')
  .values({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    department: 'Engineering',
    active: true
  })
  .build();

// Type-safe update
const updateUser = update<User>('users')
  .set({
    email: 'newemail@example.com',
    active: false
  })
  .where('id', '=', 1)
  .build();
```

## Best Practices

1. **Use parameterized values** for user input
2. **Build queries incrementally** for complex logic
3. **Create reusable query templates** for common patterns
4. **Use TypeScript** for type safety
5. **Test generated SQL** before execution
6. **Use CTEs** for complex multi-step queries
7. **Optimize with appropriate indexes**

## Next Steps

- [Caching Examples](/examples/caching-examples) - Query result caching
- [Spatial Examples](/examples/spatial-examples) - Spatial data queries
- [Full Apps](/examples/full-apps) - Complete application examples
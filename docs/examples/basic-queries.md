# Basic Queries Examples

Learn fundamental SQL query patterns with DuckDB WASM Adapter.

## Simple SELECT Queries

### Select All Records

```javascript
// React
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function AllUsers() {
  const { data, loading, error } = useQuery('SELECT * FROM users');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Select Specific Columns

```javascript
// Vue
<template>
  <div>
    <h3>User Emails</h3>
    <ul>
      <li v-for="user in data" :key="user.id">
        {{ user.name }}: {{ user.email }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data } = useQuery('SELECT id, name, email FROM users');
</script>
```

### Select with LIMIT

```javascript
// Svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const topUsers = db.query('SELECT * FROM users LIMIT 10');
</script>

{#if $topUsers.data}
  <h3>Top 10 Users</h3>
  <ol>
    {#each $topUsers.data as user}
      <li>{user.name}</li>
    {/each}
  </ol>
{/if}
```

## WHERE Clause Examples

### Simple Conditions

```javascript
// Filter by single condition
const activeUsers = useQuery(`
  SELECT * FROM users 
  WHERE active = true
`);

// Multiple conditions with AND
const engineers = useQuery(`
  SELECT * FROM employees 
  WHERE department = 'Engineering' 
    AND salary > 100000
`);

// Using OR conditions
const priorityOrders = useQuery(`
  SELECT * FROM orders 
  WHERE status = 'urgent' 
     OR priority = 'high'
`);
```

### Comparison Operators

```javascript
// Equality
const user = useQuery(`
  SELECT * FROM users WHERE id = 123
`);

// Inequality
const otherUsers = useQuery(`
  SELECT * FROM users WHERE id != 123
`);

// Greater than / Less than
const highEarners = useQuery(`
  SELECT * FROM employees WHERE salary > 150000
`);

const juniorEmployees = useQuery(`
  SELECT * FROM employees WHERE years_experience <= 2
`);

// BETWEEN
const midLevelEmployees = useQuery(`
  SELECT * FROM employees 
  WHERE years_experience BETWEEN 3 AND 7
`);

// IN clause
const selectedDepartments = useQuery(`
  SELECT * FROM employees 
  WHERE department IN ('Sales', 'Marketing', 'Support')
`);

// NOT IN clause
const technicalStaff = useQuery(`
  SELECT * FROM employees 
  WHERE department NOT IN ('HR', 'Finance', 'Legal')
`);
```

### Pattern Matching

```javascript
// LIKE with wildcards
const johnUsers = useQuery(`
  SELECT * FROM users 
  WHERE name LIKE 'John%'
`);

const emailDomain = useQuery(`
  SELECT * FROM users 
  WHERE email LIKE '%@gmail.com'
`);

const middleMatch = useQuery(`
  SELECT * FROM products 
  WHERE description LIKE '%premium%'
`);

// ILIKE for case-insensitive
const searchResults = useQuery(`
  SELECT * FROM products 
  WHERE name ILIKE '%laptop%'
`);

// Regular expressions
const phoneNumbers = useQuery(`
  SELECT * FROM contacts 
  WHERE phone ~ '^\\+1-\\d{3}-\\d{3}-\\d{4}$'
`);
```

### NULL Handling

```javascript
// Check for NULL
const incompleteProfiles = useQuery(`
  SELECT * FROM users 
  WHERE profile_picture IS NULL
`);

// Check for NOT NULL
const completeProfiles = useQuery(`
  SELECT * FROM users 
  WHERE profile_picture IS NOT NULL
`);

// COALESCE for default values
const usernames = useQuery(`
  SELECT 
    id,
    COALESCE(display_name, username, 'Anonymous') as name
  FROM users
`);

// NULLIF to convert values to NULL
const nonZeroBalances = useQuery(`
  SELECT 
    account_id,
    NULLIF(balance, 0) as balance
  FROM accounts
`);
```

## Sorting Results

### Basic ORDER BY

```javascript
// Ascending order (default)
const sortedByName = useQuery(`
  SELECT * FROM users 
  ORDER BY name
`);

// Descending order
const newestFirst = useQuery(`
  SELECT * FROM posts 
  ORDER BY created_at DESC
`);

// Multiple columns
const sortedEmployees = useQuery(`
  SELECT * FROM employees 
  ORDER BY department ASC, salary DESC
`);

// With NULL handling
const sortedWithNulls = useQuery(`
  SELECT * FROM products 
  ORDER BY price DESC NULLS LAST
`);
```

### Complex Sorting

```javascript
// Sort by expression
const sortedByFullName = useQuery(`
  SELECT * FROM users 
  ORDER BY last_name || ', ' || first_name
`);

// Sort by calculated field
const sortedByTotal = useQuery(`
  SELECT 
    order_id,
    quantity * unit_price as total
  FROM order_items 
  ORDER BY total DESC
`);

// Conditional sorting
function SortableTable({ sortBy, sortOrder }) {
  const { data } = useQuery(`
    SELECT * FROM products 
    ORDER BY 
      CASE 
        WHEN '${sortBy}' = 'name' THEN name
        WHEN '${sortBy}' = 'price' THEN CAST(price AS VARCHAR)
        ELSE created_at::VARCHAR
      END ${sortOrder}
  `);
  
  return <Table data={data} />;
}
```

## Aggregation Queries

### Basic Aggregates

```javascript
// COUNT
const userCount = useQuery(`
  SELECT COUNT(*) as total FROM users
`);

const activeUserCount = useQuery(`
  SELECT COUNT(*) as active_users 
  FROM users 
  WHERE active = true
`);

// SUM
const totalRevenue = useQuery(`
  SELECT SUM(amount) as total_revenue 
  FROM orders
`);

// AVG
const averageSalary = useQuery(`
  SELECT AVG(salary) as avg_salary 
  FROM employees
`);

// MIN/MAX
const salaryRange = useQuery(`
  SELECT 
    MIN(salary) as min_salary,
    MAX(salary) as max_salary
  FROM employees
`);
```

### GROUP BY

```javascript
// Simple grouping
const usersByDepartment = useQuery(`
  SELECT 
    department,
    COUNT(*) as count
  FROM employees 
  GROUP BY department
`);

// Multiple aggregates
const departmentStats = useQuery(`
  SELECT 
    department,
    COUNT(*) as employee_count,
    AVG(salary) as avg_salary,
    MIN(salary) as min_salary,
    MAX(salary) as max_salary
  FROM employees 
  GROUP BY department
`);

// Group by multiple columns
const monthlySales = useQuery(`
  SELECT 
    EXTRACT(YEAR FROM order_date) as year,
    EXTRACT(MONTH FROM order_date) as month,
    COUNT(*) as order_count,
    SUM(total) as revenue
  FROM orders 
  GROUP BY year, month
  ORDER BY year, month
`);
```

### HAVING Clause

```javascript
// Filter grouped results
const largeDepartments = useQuery(`
  SELECT 
    department,
    COUNT(*) as employee_count
  FROM employees 
  GROUP BY department
  HAVING COUNT(*) > 10
`);

// Complex HAVING conditions
const highValueCustomers = useQuery(`
  SELECT 
    customer_id,
    COUNT(*) as order_count,
    SUM(total) as total_spent
  FROM orders 
  GROUP BY customer_id
  HAVING SUM(total) > 10000 
    AND COUNT(*) > 5
`);
```

## DISTINCT Queries

```javascript
// Simple DISTINCT
const uniqueDepartments = useQuery(`
  SELECT DISTINCT department 
  FROM employees
`);

// DISTINCT with multiple columns
const uniqueCombinations = useQuery(`
  SELECT DISTINCT department, job_title 
  FROM employees
`);

// COUNT DISTINCT
const uniqueCustomerCount = useQuery(`
  SELECT COUNT(DISTINCT customer_id) as unique_customers 
  FROM orders
`);

// DISTINCT ON (PostgreSQL-style)
const latestPerCustomer = useQuery(`
  SELECT DISTINCT ON (customer_id) 
    customer_id,
    order_id,
    order_date
  FROM orders 
  ORDER BY customer_id, order_date DESC
`);
```

## Subqueries

### Scalar Subqueries

```javascript
// Subquery in SELECT
const employeesWithAvg = useQuery(`
  SELECT 
    name,
    salary,
    (SELECT AVG(salary) FROM employees) as company_avg
  FROM employees
`);

// Subquery in WHERE
const aboveAverageEarners = useQuery(`
  SELECT * FROM employees 
  WHERE salary > (
    SELECT AVG(salary) FROM employees
  )
`);
```

### IN Subqueries

```javascript
// IN with subquery
const managersEmployees = useQuery(`
  SELECT * FROM employees 
  WHERE department_id IN (
    SELECT department_id 
    FROM departments 
    WHERE manager_id = 123
  )
`);

// NOT IN with subquery
const customersWithoutOrders = useQuery(`
  SELECT * FROM customers 
  WHERE id NOT IN (
    SELECT DISTINCT customer_id 
    FROM orders
  )
`);
```

### EXISTS Subqueries

```javascript
// EXISTS check
const customersWithOrders = useQuery(`
  SELECT * FROM customers c
  WHERE EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.customer_id = c.id
  )
`);

// NOT EXISTS check
const productsNeverOrdered = useQuery(`
  SELECT * FROM products p
  WHERE NOT EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.product_id = p.id
  )
`);
```

## Common Table Expressions (CTEs)

```javascript
// Simple CTE
const withCTE = useQuery(`
  WITH active_users AS (
    SELECT * FROM users WHERE active = true
  )
  SELECT * FROM active_users 
  WHERE created_at > '2024-01-01'
`);

// Multiple CTEs
const complexQuery = useQuery(`
  WITH 
  high_value_customers AS (
    SELECT customer_id 
    FROM orders 
    GROUP BY customer_id 
    HAVING SUM(total) > 10000
  ),
  recent_orders AS (
    SELECT * FROM orders 
    WHERE order_date > CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT ro.* 
  FROM recent_orders ro
  JOIN high_value_customers hvc ON ro.customer_id = hvc.customer_id
`);

// Recursive CTE
const orgHierarchy = useQuery(`
  WITH RECURSIVE org_tree AS (
    -- Anchor: top-level employees
    SELECT 
      id, 
      name, 
      manager_id, 
      1 as level
    FROM employees 
    WHERE manager_id IS NULL
    
    UNION ALL
    
    -- Recursive: employees with managers
    SELECT 
      e.id, 
      e.name, 
      e.manager_id, 
      ot.level + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
  )
  SELECT * FROM org_tree 
  ORDER BY level, name
`);
```

## Window Functions

```javascript
// ROW_NUMBER
const numberedResults = useQuery(`
  SELECT 
    ROW_NUMBER() OVER (ORDER BY salary DESC) as rank,
    name,
    salary
  FROM employees
`);

// RANK and DENSE_RANK
const rankings = useQuery(`
  SELECT 
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as dept_rank,
    DENSE_RANK() OVER (ORDER BY salary DESC) as overall_rank
  FROM employees
`);

// Running totals
const runningTotal = useQuery(`
  SELECT 
    order_date,
    amount,
    SUM(amount) OVER (ORDER BY order_date) as running_total
  FROM orders
`);

// Moving averages
const movingAverage = useQuery(`
  SELECT 
    date,
    value,
    AVG(value) OVER (
      ORDER BY date 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7day
  FROM daily_metrics
`);

// LAG and LEAD
const comparison = useQuery(`
  SELECT 
    month,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY month) as prev_month,
    LEAD(revenue, 1) OVER (ORDER BY month) as next_month,
    revenue - LAG(revenue, 1) OVER (ORDER BY month) as month_over_month
  FROM monthly_revenue
`);
```

## Date and Time Queries

```javascript
// Current date/time
const currentTime = useQuery(`
  SELECT 
    CURRENT_DATE as today,
    CURRENT_TIME as now_time,
    CURRENT_TIMESTAMP as now_full
`);

// Date arithmetic
const dateCalculations = useQuery(`
  SELECT 
    order_date,
    order_date + INTERVAL '7 days' as week_later,
    order_date - INTERVAL '1 month' as month_ago,
    CURRENT_DATE - order_date as days_ago
  FROM orders
`);

// Date extraction
const dateParts = useQuery(`
  SELECT 
    created_at,
    EXTRACT(YEAR FROM created_at) as year,
    EXTRACT(MONTH FROM created_at) as month,
    EXTRACT(DAY FROM created_at) as day,
    EXTRACT(DOW FROM created_at) as day_of_week
  FROM events
`);

// Date formatting
const formattedDates = useQuery(`
  SELECT 
    created_at,
    strftime(created_at, '%Y-%m-%d') as date_only,
    strftime(created_at, '%H:%M:%S') as time_only,
    strftime(created_at, '%B %d, %Y') as formatted
  FROM events
`);
```

## String Functions

```javascript
// String concatenation
const fullNames = useQuery(`
  SELECT 
    first_name || ' ' || last_name as full_name,
    CONCAT(first_name, ' ', last_name) as full_name_alt
  FROM users
`);

// String manipulation
const stringOps = useQuery(`
  SELECT 
    name,
    UPPER(name) as uppercase,
    LOWER(name) as lowercase,
    LENGTH(name) as length,
    TRIM(name) as trimmed,
    SUBSTRING(name, 1, 3) as first_three,
    REPLACE(name, 'old', 'new') as replaced
  FROM products
`);

// String splitting
const splitData = useQuery(`
  SELECT 
    full_name,
    SPLIT_PART(full_name, ' ', 1) as first_name,
    SPLIT_PART(full_name, ' ', 2) as last_name
  FROM contacts
`);
```

## Best Practices

1. **Use parameterized queries** to prevent SQL injection
2. **Limit result sets** with LIMIT for better performance
3. **Use appropriate indexes** for WHERE and JOIN columns
4. **Avoid SELECT \*** in production code
5. **Use CTEs** for complex queries to improve readability
6. **Test queries** with EXPLAIN to understand performance
7. **Handle NULL values** explicitly

## Next Steps

- [Data Import Examples](/examples/data-import) - Import data from various sources
- [Query Builder Examples](/examples/query-builder-examples) - Build queries programmatically
- [Advanced Queries](/guide/advanced-queries) - Complex query patterns
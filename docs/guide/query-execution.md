# Query Execution

Comprehensive guide to executing SQL queries with DuckDB WASM Adapter.

## Overview

DuckDB WASM Adapter provides multiple ways to execute SQL queries, from simple queries to complex transactions. All query execution happens in the browser, providing instant results without server round-trips.

## Basic Query Execution

### React

```jsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function UserList() {
  const { data, loading, error } = useQuery(`
    SELECT id, name, email 
    FROM users 
    WHERE active = true
    ORDER BY name
  `);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name} - {user.email}</li>
      ))}
    </ul>
  );
}
```

### Vue

```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">
        {{ user.name }} - {{ user.email }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const { data, loading, error } = useQuery(`
  SELECT id, name, email 
  FROM users 
  WHERE active = true
  ORDER BY name
`);
</script>
```

### Svelte

```svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const users = db.query(`
    SELECT id, name, email 
    FROM users 
    WHERE active = true
    ORDER BY name
  `);
</script>

{#if $users.loading}
  <div>Loading...</div>
{:else if $users.error}
  <div>Error: {$users.error.message}</div>
{:else if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} - {user.email}</li>
    {/each}
  </ul>
{/if}
```

## Parameterized Queries

Always use parameterized queries to prevent SQL injection and improve performance:

### Static Parameters

```javascript
// React
const { data } = useQuery(
  'SELECT * FROM users WHERE department = ? AND active = ?',
  ['Engineering', true]
);

// Vue
const { data } = useQuery(
  'SELECT * FROM users WHERE department = ? AND active = ?',
  ['Engineering', true]
);

// Svelte
const users = db.query(
  'SELECT * FROM users WHERE department = ? AND active = ?',
  ['Engineering', true]
);
```

### Dynamic Parameters

```javascript
// React
function FilteredUsers() {
  const [department, setDepartment] = useState('Engineering');
  const [active, setActive] = useState(true);

  const { data } = useQuery(
    'SELECT * FROM users WHERE department = ? AND active = ?',
    [department, active]
  );

  return (
    <div>
      <select onChange={(e) => setDepartment(e.target.value)}>
        <option value="Engineering">Engineering</option>
        <option value="Sales">Sales</option>
      </select>
      {/* Display users */}
    </div>
  );
}
```

### Named Parameters

```javascript
// Using named parameters (converted to positional)
const query = `
  SELECT * FROM users 
  WHERE department = :department 
  AND salary > :minSalary
`;

const params = {
  department: 'Engineering',
  minSalary: 50000
};

// Convert to positional parameters
const { data } = useQuery(query, Object.values(params));
```

## Query Types

### SELECT Queries

```sql
-- Simple SELECT
SELECT * FROM users;

-- With WHERE clause
SELECT name, email FROM users WHERE active = true;

-- With JOIN
SELECT u.name, d.name as department
FROM users u
JOIN departments d ON u.department_id = d.id;

-- With aggregation
SELECT department, COUNT(*) as count, AVG(salary) as avg_salary
FROM users
GROUP BY department
HAVING COUNT(*) > 5;

-- With window functions
SELECT 
  name,
  salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank
FROM users;
```

### INSERT Queries

```javascript
// Single insert
const { mutate: insertUser } = useMutation();

await insertUser(
  'INSERT INTO users (name, email, department) VALUES (?, ?, ?)',
  ['John Doe', 'john@example.com', 'Engineering']
);

// Multiple inserts
await insertUser(`
  INSERT INTO users (name, email, department) VALUES 
  (?, ?, ?),
  (?, ?, ?),
  (?, ?, ?)
`, [
  'User 1', 'user1@example.com', 'Sales',
  'User 2', 'user2@example.com', 'Marketing',
  'User 3', 'user3@example.com', 'Engineering'
]);

// Insert with returning
const result = await insertUser(
  'INSERT INTO users (name, email) VALUES (?, ?) RETURNING id',
  ['New User', 'new@example.com']
);
console.log('New user ID:', result[0].id);
```

### UPDATE Queries

```javascript
// Simple update
await updateUser(
  'UPDATE users SET email = ? WHERE id = ?',
  ['newemail@example.com', 123]
);

// Update multiple columns
await updateUser(
  'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ?',
  ['Updated Name', 'updated@example.com', 'New Department', 123]
);

// Conditional update
await updateUser(`
  UPDATE users 
  SET salary = salary * 1.1 
  WHERE department = ? AND performance_rating > ?
`, ['Engineering', 4]);
```

### DELETE Queries

```javascript
// Simple delete
await deleteUser('DELETE FROM users WHERE id = ?', [123]);

// Conditional delete
await deleteUser(
  'DELETE FROM users WHERE created_at < ? AND active = false',
  ['2023-01-01']
);

// Delete with returning
const deleted = await deleteUser(
  'DELETE FROM users WHERE department = ? RETURNING *',
  ['Obsolete']
);
console.log('Deleted users:', deleted);
```

## Transactions

Execute multiple queries as a single atomic transaction:

```javascript
// React
import { useTransaction } from '@northprint/duckdb-wasm-adapter-react';

function TransferFunds() {
  const { execute: transfer } = useTransaction();

  const handleTransfer = async (fromId, toId, amount) => {
    try {
      await transfer(async (conn) => {
        // Start transaction
        await conn.execute('BEGIN TRANSACTION');
        
        // Deduct from sender
        await conn.execute(
          'UPDATE accounts SET balance = balance - ? WHERE id = ?',
          [amount, fromId]
        );
        
        // Add to receiver
        await conn.execute(
          'UPDATE accounts SET balance = balance + ? WHERE id = ?',
          [amount, toId]
        );
        
        // Log transaction
        await conn.execute(
          'INSERT INTO transactions (from_id, to_id, amount) VALUES (?, ?, ?)',
          [fromId, toId, amount]
        );
        
        // Commit transaction
        await conn.execute('COMMIT');
      });
      
      alert('Transfer successful!');
    } catch (error) {
      // Automatic rollback on error
      alert('Transfer failed: ' + error.message);
    }
  };

  return (
    <button onClick={() => handleTransfer(1, 2, 100)}>
      Transfer $100
    </button>
  );
}
```

## Batch Operations

Execute multiple queries efficiently:

```javascript
// Batch inserts
async function batchInsert(users) {
  const batchSize = 1000;
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    const placeholders = batch.map(() => '(?, ?, ?)').join(',');
    const values = batch.flatMap(u => [u.name, u.email, u.department]);
    
    await connection.execute(
      `INSERT INTO users (name, email, department) VALUES ${placeholders}`,
      values
    );
  }
}

// Batch operations with different queries
async function batchOperations(operations) {
  const results = [];
  
  for (const op of operations) {
    const result = await connection.execute(op.sql, op.params);
    results.push(result);
  }
  
  return results;
}
```

## Prepared Statements

Use prepared statements for frequently executed queries:

```javascript
// Create prepared statement
const stmt = await connection.prepare(
  'SELECT * FROM users WHERE department = ? AND salary > ?'
);

// Execute multiple times with different parameters
const engineers = await stmt.execute(['Engineering', 100000]);
const sales = await stmt.execute(['Sales', 80000]);
const marketing = await stmt.execute(['Marketing', 90000]);

// Clean up
stmt.close();
```

## Query Options

### Execution Options

```javascript
const { data } = useQuery(
  'SELECT * FROM large_table',
  undefined,
  {
    // Query options
    enabled: true,           // Enable/disable query execution
    refetchInterval: 5000,   // Auto-refresh every 5 seconds
    refetchOnWindowFocus: true, // Refresh when window gains focus
    staleTime: 60000,       // Consider data stale after 1 minute
    cacheTime: 300000,      // Keep in cache for 5 minutes
    
    // Callbacks
    onSuccess: (data) => {
      console.log('Query successful:', data);
    },
    onError: (error) => {
      console.error('Query failed:', error);
    },
    onSettled: () => {
      console.log('Query completed');
    }
  }
);
```

### Query Timeouts

```javascript
// Set query timeout
const { data } = useQuery(
  'SELECT * FROM large_table',
  undefined,
  {
    timeout: 30000, // 30 second timeout
    onTimeout: () => {
      console.error('Query timed out');
    }
  }
);
```

## Query Metadata

Access query metadata and statistics:

```javascript
// Get query metadata
const { data, meta } = useQuery('SELECT * FROM users');

console.log('Execution time:', meta.executionTime);
console.log('Rows affected:', meta.rowsAffected);
console.log('Column info:', meta.columns);

// Column information
meta.columns.forEach(col => {
  console.log(`Column: ${col.name}, Type: ${col.type}`);
});
```

## Error Handling

Handle different types of query errors:

```javascript
function QueryWithErrorHandling() {
  const { data, loading, error, retry } = useQuery(
    'SELECT * FROM users'
  );

  if (error) {
    // Handle specific error types
    if (error.code === 'TABLE_NOT_FOUND') {
      return <div>Table does not exist. Please create it first.</div>;
    }
    
    if (error.code === 'SYNTAX_ERROR') {
      return <div>SQL syntax error: {error.message}</div>;
    }
    
    if (error.code === 'PERMISSION_DENIED') {
      return <div>Permission denied for this operation.</div>;
    }
    
    // Generic error handling
    return (
      <div>
        <p>Query failed: {error.message}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );
  }

  return <div>{/* Display data */}</div>;
}
```

## Query Cancellation

Cancel long-running queries:

```javascript
function CancellableQuery() {
  const [controller, setController] = useState(null);

  const startQuery = async () => {
    const abortController = new AbortController();
    setController(abortController);

    try {
      const result = await connection.execute(
        'SELECT * FROM very_large_table',
        undefined,
        { signal: abortController.signal }
      );
      console.log('Query completed:', result);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Query was cancelled');
      } else {
        console.error('Query failed:', error);
      }
    }
  };

  const cancelQuery = () => {
    if (controller) {
      controller.abort();
      setController(null);
    }
  };

  return (
    <div>
      <button onClick={startQuery}>Start Query</button>
      <button onClick={cancelQuery} disabled={!controller}>
        Cancel Query
      </button>
    </div>
  );
}
```

## Performance Optimization

### Query Optimization Tips

```javascript
// 1. Use specific columns instead of SELECT *
// ✅ Good
const { data } = useQuery('SELECT id, name, email FROM users');

// ❌ Avoid
const { data } = useQuery('SELECT * FROM users');

// 2. Use LIMIT for large datasets
const { data } = useQuery('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100');

// 3. Create indexes for frequently queried columns
await connection.execute('CREATE INDEX idx_users_email ON users(email)');

// 4. Use query builder for complex queries
const query = select('id', 'name')
  .from('users')
  .where('active', '=', true)
  .orderBy('name')
  .limit(50)
  .build();
```

### Query Profiling

```javascript
// Enable query profiling
const { data, profile } = useQuery(
  'SELECT * FROM users',
  undefined,
  { enableProfiling: true }
);

console.log('Query profile:', profile);
// {
//   executionTime: 45,
//   planningTime: 2,
//   rowsScanned: 1000,
//   rowsReturned: 100,
//   cacheHit: false
// }
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Limit result sets** to improve performance
3. **Use transactions** for related operations
4. **Handle errors gracefully** with specific error messages
5. **Cache frequently accessed data** to reduce query load
6. **Profile slow queries** to identify bottlenecks
7. **Use appropriate indexes** for better query performance

## Next Steps

- [Data Import/Export](/guide/data-import-export) - Learn to import and export data
- [Query Builder](/guide/query-builder) - Build queries programmatically
- [Caching](/guide/caching) - Optimize with caching strategies
- [Performance](/guide/performance) - Advanced performance optimization
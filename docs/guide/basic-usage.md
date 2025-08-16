# Basic Usage

Learn the fundamentals of using DuckDB WASM Adapter in your applications.

## Overview

DuckDB WASM Adapter provides a simple, reactive interface for running SQL queries directly in the browser. This guide covers the essential patterns you'll use in most applications.

## Core Concepts

### 1. Connection Management

Every application needs a database connection. The adapter handles this automatically:

```javascript
// Connection is managed automatically
// No need to manually connect/disconnect in most cases
```

### 2. Query Execution

Queries are executed reactively and return structured results:

```javascript
// Queries return live, reactive data
const users = useQuery('SELECT * FROM users');
```

### 3. Data Import

Import data from various sources into your in-browser database:

```javascript
// Import CSV, JSON, or Parquet files
await importCSV(file, 'table_name');
```

## Basic Patterns

### React

#### Simple Data Fetching

```jsx
import { DuckDBProvider, useQuery } from '@duckdb-wasm-adapter/react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <UserList />
    </DuckDBProvider>
  );
}

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
        <li key={user.id}>
          {user.name} - {user.email}
        </li>
      ))}
    </ul>
  );
}
```

#### Data Mutations

```jsx
import { useMutation } from '@duckdb-wasm-adapter/react';

function CreateUser() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const { mutate, loading, error } = useMutation({
    onSuccess: () => {
      setName('');
      setEmail('');
      alert('User created!');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

### Vue

#### Simple Data Fetching

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
import { useQuery } from '@duckdb-wasm-adapter/vue';

const { data, loading, error } = useQuery(`
  SELECT id, name, email 
  FROM users 
  WHERE active = true
  ORDER BY name
`);
</script>
```

#### Reactive Parameters

```vue
<template>
  <div>
    <input v-model="searchTerm" placeholder="Search users..." />
    <select v-model="department">
      <option value="">All Departments</option>
      <option value="engineering">Engineering</option>
      <option value="sales">Sales</option>
    </select>

    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">
        {{ user.name }} - {{ user.department }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@duckdb-wasm-adapter/vue';

const searchTerm = ref('');
const department = ref('');

const sql = computed(() => {
  let query = 'SELECT * FROM users WHERE 1=1';
  if (searchTerm.value) {
    query += ' AND name LIKE ?';
  }
  if (department.value) {
    query += ' AND department = ?';
  }
  return query + ' ORDER BY name';
});

const params = computed(() => {
  const p = [];
  if (searchTerm.value) p.push(`%${searchTerm.value}%`);
  if (department.value) p.push(department.value);
  return p;
});

const { data, loading, error } = useQuery(sql, params);
</script>
```

### Svelte

#### Simple Data Fetching

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
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

#### Reactive Queries

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let searchTerm = '';
  let department = '';
  
  $: users = db.query(
    `SELECT * FROM users 
     WHERE ($1 = '' OR name LIKE '%' || $1 || '%') 
     AND ($2 = '' OR department = $2)
     ORDER BY name`,
    [searchTerm, department]
  );
</script>

<input bind:value={searchTerm} placeholder="Search users..." />
<select bind:value={department}>
  <option value="">All Departments</option>
  <option value="engineering">Engineering</option>
  <option value="sales">Sales</option>
</select>

{#if $users.loading}
  <div>Loading...</div>
{:else if $users.error}
  <div>Error: {$users.error.message}</div>
{:else if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} - {user.department}</li>
    {/each}
  </ul>
{/if}
```

## Working with Data

### Creating Tables

```sql
-- Create a users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  department VARCHAR,
  salary DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inserting Data

```sql
-- Insert single record
INSERT INTO users (name, email, department, salary) 
VALUES ('Alice Johnson', 'alice@company.com', 'Engineering', 95000);

-- Insert multiple records
INSERT INTO users (name, email, department, salary) VALUES 
  ('Bob Smith', 'bob@company.com', 'Sales', 75000),
  ('Carol White', 'carol@company.com', 'Marketing', 82000),
  ('David Brown', 'david@company.com', 'Engineering', 105000);
```

### Querying Data

```sql
-- Simple select
SELECT * FROM users;

-- With conditions
SELECT name, email FROM users 
WHERE department = 'Engineering' 
AND salary > 90000;

-- Aggregations
SELECT 
  department, 
  COUNT(*) as employee_count,
  AVG(salary) as avg_salary
FROM users 
GROUP BY department 
ORDER BY avg_salary DESC;

-- Joins (with other tables)
SELECT 
  u.name,
  u.email,
  p.title
FROM users u
JOIN projects p ON u.id = p.assigned_user_id
WHERE u.active = true;
```

## Data Import Examples

### CSV Import

```javascript
// React
function CSVImporter() {
  const { importCSV, loading } = useImportCSV();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    await importCSV(file, 'imported_users', {
      header: true,
      delimiter: ','
    });
  };

  return (
    <input 
      type="file" 
      accept=".csv" 
      onChange={handleFileUpload}
      disabled={loading}
    />
  );
}

// Vue
const { importCSV } = useImportCSV();

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  await importCSV(file, 'imported_users');
};

// Svelte
import { importCSV } from '@duckdb-wasm-adapter/svelte';

const csvImporter = importCSV();

async function handleFileUpload(event) {
  const file = event.target.files[0];
  await csvImporter.execute(file, 'imported_users');
}
```

### JSON Import

```javascript
// Import array of objects
const users = [
  { name: 'Alice', email: 'alice@example.com', department: 'Engineering' },
  { name: 'Bob', email: 'bob@example.com', department: 'Sales' }
];

await importJSON(users, 'users');
```

## Common Patterns

### Pagination

```javascript
// React
function PaginatedUsers() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const { data, loading } = useQuery(
    'SELECT * FROM users ORDER BY name LIMIT ? OFFSET ?',
    [pageSize, offset]
  );

  const { data: countData } = useQuery('SELECT COUNT(*) as total FROM users');
  const totalPages = Math.ceil((countData?.[0]?.total || 0) / pageSize);

  return (
    <div>
      {/* Render users */}
      <div>
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Real-time Updates

```javascript
// Auto-refresh data every 30 seconds
const { data, loading } = useQuery(
  'SELECT * FROM analytics_summary',
  undefined,
  {
    refetchInterval: 30000 // 30 seconds
  }
);
```

### Error Handling

```javascript
// React
function DataComponent() {
  const { data, loading, error, refetch } = useQuery('SELECT * FROM users');

  if (loading) return <div>Loading...</div>;
  
  if (error) {
    return (
      <div>
        <p>Error loading data: {error.message}</p>
        <button onClick={refetch}>Try Again</button>
      </div>
    );
  }

  return <div>{/* Render data */}</div>;
}
```

### Conditional Queries

```javascript
// Only run query when conditions are met
const { data } = useQuery(
  'SELECT * FROM users WHERE department = ?',
  [selectedDepartment],
  {
    enabled: Boolean(selectedDepartment) // Only run when department is selected
  }
);
```

## Performance Tips

### 1. Use Indexes

```sql
-- Create indexes for better query performance
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);
```

### 2. Limit Result Sets

```sql
-- Always use LIMIT for large datasets
SELECT * FROM large_table 
WHERE condition = ?
ORDER BY created_at DESC
LIMIT 100;
```

### 3. Enable Caching

```javascript
// Enable caching for better performance
<DuckDBProvider 
  autoConnect
  config={{
    cache: {
      enabled: true,
      ttl: 300000 // 5 minutes
    }
  }}
>
  <App />
</DuckDBProvider>
```

### 4. Use Query Builder for Complex Queries

```javascript
import { select } from '@duckdb-wasm-adapter/core';

const query = select('name', 'email', 'department')
  .from('users')
  .where('active', '=', true)
  .where('salary', '>', 50000)
  .orderBy('name')
  .limit(50)
  .build();

const { data } = useQuery(query);
```

## Best Practices

### 1. Always Handle Loading States

```javascript
// ✅ Good
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
return <div>{/* Render data */}</div>;

// ❌ Bad
return <div>{data?.map(...)}</div>; // Can crash if data is undefined
```

### 2. Use Parameterized Queries

```javascript
// ✅ Good
useQuery('SELECT * FROM users WHERE id = ?', [userId]);

// ❌ Bad - SQL injection risk
useQuery(`SELECT * FROM users WHERE id = ${userId}`);
```

### 3. Handle Empty States

```javascript
// ✅ Good
if (!data || data.length === 0) {
  return <div>No users found</div>;
}

return (
  <ul>
    {data.map(user => <li key={user.id}>{user.name}</li>)}
  </ul>
);
```

### 4. Use TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  department: string;
}

const { data } = useQuery<User>('SELECT * FROM users');
// data is now typed as User[] | undefined
```

### 5. Cleanup Resources

```javascript
// Connections are automatically managed
// Cache is automatically cleaned up
// No manual cleanup needed in most cases
```

## Next Steps

Now that you understand the basics:

1. [Learn about Concepts](/guide/concepts) - Understand the underlying architecture
2. [Explore Query Builder](/guide/query-builder) - Build complex queries safely
3. [Set up Caching](/guide/caching) - Optimize performance
4. [Check out Examples](/examples/) - See complete applications

## Common Questions

**Q: Do I need to manually connect to the database?**
A: No, use `autoConnect: true` and the adapter handles connections automatically.

**Q: Can I use regular SQL?**
A: Yes! DuckDB WASM Adapter supports full SQL including JOINs, aggregations, and window functions.

**Q: How do I handle large datasets?**
A: Use pagination with LIMIT/OFFSET, enable caching, and consider using the Query Builder for optimized queries.

**Q: Is the data persistent?**
A: Data exists in browser memory during the session. For persistence, export data or use browser storage APIs.

**Q: Can I use multiple databases?**
A: You work with one DuckDB instance, but can create multiple schemas or use temporary tables for data isolation.
# Svelte 5 Runes API - Complete Guide

## Overview

The DuckDB WASM Adapter now provides full support for Svelte 5's revolutionary runes system, offering:

- 🚀 Better performance with fine-grained reactivity
- 🔒 Enhanced type safety with TypeScript
- 🎯 More predictable state management
- 💡 Cleaner component APIs with $props and $bindable
- ⚡ Automatic dependency tracking with $effect

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-svelte@latest svelte@^5.0.0
```

## Core Runes Classes

### DuckDBRunes

The main database connection class using Svelte 5 runes:

```javascript
import { createDuckDBRunes } from '@northprint/duckdb-wasm-adapter-svelte';

// Create database instance with runes
const db = createDuckDBRunes({
  autoConnect: true,
  config: {
    worker: true,
    cache: { enabled: true },
    extensions: ['spatial', 'json']
  },
  events: {
    onConnect: () => console.log('Connected'),
    onError: (err) => console.error('Error:', err),
    onQuery: (sql) => console.log('Query:', sql)
  }
});

// State properties (reactive with $state)
console.log(db.connection);  // Connection | null
console.log(db.status);      // 'idle' | 'connecting' | 'connected' | 'error'
console.log(db.error);       // Error | null

// Derived properties (computed with $derived)
console.log(db.isConnected); // boolean
console.log(db.isLoading);   // boolean
console.log(db.hasError);    // boolean

// Methods
await db.connect();
await db.disconnect();
const result = await db.execute('SELECT * FROM users');
```

### QueryRune

Reactive query management with automatic re-execution:

```javascript
import { createQueryRune } from '@northprint/duckdb-wasm-adapter-svelte';

// Basic query
const query = createQueryRune(
  db,
  'SELECT * FROM products'
);

// Dynamic query with reactive SQL
let category = $state('electronics');
const filteredQuery = createQueryRune(
  db,
  () => `SELECT * FROM products WHERE category = '${category}'`,
  undefined,
  {
    immediate: true,        // Execute immediately
    autoRefetch: true,      // Re-execute when db reconnects
    refetchInterval: 30000  // Auto-refresh every 30 seconds
  }
);

// State properties
console.log(query.data);       // T[] | null
console.log(query.loading);    // boolean
console.log(query.error);      // Error | null
console.log(query.metadata);   // ColumnMetadata[] | null

// Derived properties
console.log(query.hasData);    // boolean
console.log(query.isEmpty);    // boolean
console.log(query.rowCount);   // number

// Methods
await query.execute();  // Execute/re-execute query
await query.refetch();  // Alias for execute()
query.reset();         // Clear all state
```

### MutationRune

Handle data modifications with state management:

```javascript
import { createMutationRune } from '@northprint/duckdb-wasm-adapter-svelte';

const mutation = createMutationRune(db, {
  onSuccess: (data) => {
    console.log('Mutation successful:', data);
    // Trigger notifications, refetch queries, etc.
  },
  onError: (error) => {
    console.error('Mutation failed:', error);
    // Handle errors
  }
});

// Execute mutations
const result = await mutation.mutate(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['John Doe', 'john@example.com']
);

// Batch operations
await mutation.mutate(`
  BEGIN TRANSACTION;
  UPDATE users SET status = 'active' WHERE last_login > ?;
  DELETE FROM sessions WHERE expired = true;
  COMMIT;
`, [Date.now() - 86400000]);

// State properties
console.log(mutation.data);      // T[] | null
console.log(mutation.loading);   // boolean
console.log(mutation.error);     // Error | null

// Derived properties
console.log(mutation.isSuccess); // boolean
console.log(mutation.isError);   // boolean

// Methods
mutation.reset(); // Clear mutation state
```

### TableRune

Advanced table management with sorting, filtering, and pagination:

```javascript
import { createTableRune } from '@northprint/duckdb-wasm-adapter-svelte';

// Create table manager from a query
const query = createQueryRune(db, 'SELECT * FROM employees');
const table = createTableRune(query);

// State properties
console.log(table.rows);          // All rows from query
console.log(table.selectedRows);  // Set of selected row indices
console.log(table.sortColumn);    // Current sort column
console.log(table.sortDirection); // 'asc' | 'desc'
console.log(table.filterText);    // Current filter string
console.log(table.page);          // Current page number
console.log(table.pageSize);      // Rows per page

// Derived properties (automatically computed)
console.log(table.filteredRows);   // Rows after filtering
console.log(table.sortedRows);     // Rows after sorting
console.log(table.paginatedRows);  // Current page rows
console.log(table.totalPages);     // Total number of pages
console.log(table.hasNextPage);    // boolean
console.log(table.hasPrevPage);    // boolean

// Methods
table.sort('name');           // Sort by column
table.filter('search term');  // Filter rows
table.selectRow(0);          // Toggle row selection
table.selectAll();           // Toggle all selections
table.nextPage();            // Navigate pages
table.prevPage();
table.goToPage(3);
table.setPageSize(25);       // Change page size
```

## Component Patterns

### Basic Query Component

```svelte
<!-- ProductList.svelte -->
<script>
  import { createDuckDBRunes, createQueryRune } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDBRunes({ autoConnect: true });
  
  // Props with $props rune
  let { category = 'all', limit = 10 } = $props();
  
  // Reactive query that re-executes when props change
  const products = createQueryRune(
    db,
    () => category === 'all'
      ? `SELECT * FROM products LIMIT ${limit}`
      : `SELECT * FROM products WHERE category = '${category}' LIMIT ${limit}`,
    undefined,
    { immediate: true }
  );
  
  // Derived calculations
  const totalValue = $derived(
    products.data?.reduce((sum, p) => sum + p.price * p.stock, 0) || 0
  );
</script>

<div class="product-list">
  {#if products.loading}
    <p>Loading products...</p>
  {:else if products.error}
    <p class="error">Error: {products.error.message}</p>
  {:else if products.hasData}
    <div class="summary">
      <p>Products: {products.rowCount}</p>
      <p>Total Value: ${totalValue.toFixed(2)}</p>
    </div>
    
    <div class="products">
      {#each products.data as product}
        <ProductCard {product} />
      {/each}
    </div>
  {:else}
    <p>No products found</p>
  {/if}
</div>
```

### Interactive Data Table

```svelte
<!-- DataTable.svelte -->
<script>
  import { createDuckDBRunes, createQueryRune, createTableRune } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDBRunes({ autoConnect: true });
  
  // Component props
  let { 
    tableName = 'users',
    columns = [],
    pageSize = 10,
    onRowClick = () => {},
    selectable = true
  } = $props();
  
  // Create query and table manager
  const query = createQueryRune(db, `SELECT * FROM ${tableName}`);
  const table = createTableRune(query);
  
  // Set initial page size
  table.setPageSize(pageSize);
  
  // Handle bulk actions
  async function deleteSelected() {
    if (table.selectedRows.size === 0) return;
    
    const ids = Array.from(table.selectedRows)
      .map(i => table.paginatedRows[i].id);
    
    await db.execute(
      `DELETE FROM ${tableName} WHERE id IN (${ids.join(',')})`
    );
    
    query.refetch();
    table.selectedRows.clear();
  }
  
  // Export filtered data
  function exportData() {
    const data = table.filteredRows;
    const csv = convertToCSV(data);
    downloadFile(csv, `${tableName}.csv`);
  }
</script>

<div class="data-table">
  <!-- Controls -->
  <div class="controls">
    <input 
      type="text"
      placeholder="Search..."
      oninput={(e) => table.filter(e.target.value)}
    />
    
    {#if selectable}
      <button 
        onclick={deleteSelected}
        disabled={table.selectedRows.size === 0}
      >
        Delete Selected ({table.selectedRows.size})
      </button>
    {/if}
    
    <button onclick={exportData}>
      Export CSV
    </button>
  </div>
  
  <!-- Table -->
  <table>
    <thead>
      <tr>
        {#if selectable}
          <th>
            <input 
              type="checkbox"
              checked={table.selectedRows.size === table.paginatedRows.length}
              onchange={() => table.selectAll()}
            />
          </th>
        {/if}
        
        {#each columns as column}
          <th 
            class="sortable"
            onclick={() => table.sort(column.key)}
          >
            {column.label}
            {#if table.sortColumn === column.key}
              <span class="sort-arrow">
                {table.sortDirection === 'asc' ? '▲' : '▼'}
              </span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    
    <tbody>
      {#each table.paginatedRows as row, i}
        <tr 
          class:selected={table.selectedRows.has(i)}
          onclick={() => onRowClick(row)}
        >
          {#if selectable}
            <td>
              <input 
                type="checkbox"
                checked={table.selectedRows.has(i)}
                onclick={(e) => {
                  e.stopPropagation();
                  table.selectRow(i);
                }}
              />
            </td>
          {/if}
          
          {#each columns as column}
            <td>
              {#if column.render}
                {@html column.render(row[column.key], row)}
              {:else}
                {row[column.key] ?? 'NULL'}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
  
  <!-- Pagination -->
  <div class="pagination">
    <button 
      onclick={() => table.goToPage(1)}
      disabled={!table.hasPrevPage}
    >
      First
    </button>
    
    <button 
      onclick={() => table.prevPage()}
      disabled={!table.hasPrevPage}
    >
      Previous
    </button>
    
    <span>
      Page {table.page} of {table.totalPages}
      ({table.filteredRows.length} total rows)
    </span>
    
    <button 
      onclick={() => table.nextPage()}
      disabled={!table.hasNextPage}
    >
      Next
    </button>
    
    <button 
      onclick={() => table.goToPage(table.totalPages)}
      disabled={!table.hasNextPage}
    >
      Last
    </button>
    
    <select 
      onchange={(e) => table.setPageSize(parseInt(e.target.value))}
      value={table.pageSize}
    >
      <option value="5">5 per page</option>
      <option value="10">10 per page</option>
      <option value="25">25 per page</option>
      <option value="50">50 per page</option>
      <option value="100">100 per page</option>
    </select>
  </div>
</div>
```

### Form with Mutations

```svelte
<!-- UserForm.svelte -->
<script>
  import { createDuckDBRunes, createMutationRune } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDBRunes({ autoConnect: true });
  
  // Props with $bindable for two-way binding
  let { 
    user = $bindable(null),
    onSave = () => {},
    onCancel = () => {}
  } = $props();
  
  // Local form state
  let formData = $state({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || '',
    salary: user?.salary || 0
  });
  
  // Form validation
  const errors = $derived(() => {
    const errs = {};
    if (!formData.name) errs.name = 'Name is required';
    if (!formData.email) errs.email = 'Email is required';
    if (!formData.email.includes('@')) errs.email = 'Invalid email';
    if (formData.salary < 0) errs.salary = 'Salary must be positive';
    return errs;
  });
  
  const isValid = $derived(Object.keys(errors).length === 0);
  
  // Create mutation
  const saveMutation = createMutationRune(db, {
    onSuccess: (data) => {
      console.log('User saved:', data);
      onSave(data[0]);
      resetForm();
    },
    onError: (error) => {
      console.error('Save failed:', error);
      alert('Failed to save user: ' + error.message);
    }
  });
  
  // Form actions
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!isValid) return;
    
    const sql = user?.id
      ? `UPDATE users SET name = ?, email = ?, department = ?, salary = ? 
         WHERE id = ? RETURNING *`
      : `INSERT INTO users (name, email, department, salary) 
         VALUES (?, ?, ?, ?) RETURNING *`;
    
    const params = user?.id
      ? [formData.name, formData.email, formData.department, formData.salary, user.id]
      : [formData.name, formData.email, formData.department, formData.salary];
    
    await saveMutation.mutate(sql, params);
  }
  
  function resetForm() {
    formData = {
      name: '',
      email: '',
      department: '',
      salary: 0
    };
  }
  
  // Update form when user prop changes
  $effect(() => {
    if (user) {
      formData = {
        name: user.name,
        email: user.email,
        department: user.department,
        salary: user.salary
      };
    }
  });
</script>

<form onsubmit={handleSubmit}>
  <h2>{user?.id ? 'Edit User' : 'New User'}</h2>
  
  <div class="field">
    <label for="name">Name</label>
    <input 
      id="name"
      type="text"
      bind:value={formData.name}
      class:error={errors.name}
    />
    {#if errors.name}
      <span class="error-message">{errors.name}</span>
    {/if}
  </div>
  
  <div class="field">
    <label for="email">Email</label>
    <input 
      id="email"
      type="email"
      bind:value={formData.email}
      class:error={errors.email}
    />
    {#if errors.email}
      <span class="error-message">{errors.email}</span>
    {/if}
  </div>
  
  <div class="field">
    <label for="department">Department</label>
    <select 
      id="department"
      bind:value={formData.department}
    >
      <option value="">Select...</option>
      <option value="Engineering">Engineering</option>
      <option value="Sales">Sales</option>
      <option value="Marketing">Marketing</option>
      <option value="HR">HR</option>
    </select>
  </div>
  
  <div class="field">
    <label for="salary">Salary</label>
    <input 
      id="salary"
      type="number"
      bind:value={formData.salary}
      class:error={errors.salary}
    />
    {#if errors.salary}
      <span class="error-message">{errors.salary}</span>
    {/if}
  </div>
  
  <div class="actions">
    <button 
      type="submit"
      disabled={!isValid || saveMutation.loading}
    >
      {saveMutation.loading ? 'Saving...' : 'Save'}
    </button>
    
    <button 
      type="button"
      onclick={onCancel}
      disabled={saveMutation.loading}
    >
      Cancel
    </button>
  </div>
</form>
```

### Real-time Dashboard

```svelte
<!-- Dashboard.svelte -->
<script>
  import { 
    createDuckDBRunes, 
    createQueryRune 
  } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDBRunes({ autoConnect: true });
  
  // Multiple queries with auto-refresh
  const stats = createQueryRune(
    db,
    `SELECT 
      COUNT(*) as total_users,
      COUNT(DISTINCT department) as departments,
      AVG(salary) as avg_salary,
      MAX(salary) as max_salary
     FROM users`,
    undefined,
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );
  
  const recentActivity = createQueryRune(
    db,
    `SELECT * FROM activity_log 
     ORDER BY timestamp DESC 
     LIMIT 10`,
    undefined,
    { refetchInterval: 5000 } // Refresh every 5 seconds
  );
  
  const departmentStats = createQueryRune(
    db,
    `SELECT 
      department,
      COUNT(*) as employee_count,
      AVG(salary) as avg_salary
     FROM users
     GROUP BY department
     ORDER BY employee_count DESC`
  );
  
  // Computed dashboard state
  const isLoading = $derived(
    stats.loading || recentActivity.loading || departmentStats.loading
  );
  
  const hasError = $derived(
    stats.error || recentActivity.error || departmentStats.error
  );
  
  // Refresh all data
  function refreshAll() {
    stats.refetch();
    recentActivity.refetch();
    departmentStats.refetch();
  }
  
  // Auto-refresh indicator
  let lastRefresh = $state(new Date());
  
  $effect(() => {
    // Update timestamp when any query completes
    if (stats.data || recentActivity.data || departmentStats.data) {
      lastRefresh = new Date();
    }
  });
</script>

<div class="dashboard">
  <header>
    <h1>Analytics Dashboard</h1>
    <div class="controls">
      <button onclick={refreshAll} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh Now'}
      </button>
      <span class="last-update">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </span>
    </div>
  </header>
  
  {#if hasError}
    <div class="error-banner">
      <p>Error loading dashboard data</p>
      <button onclick={refreshAll}>Retry</button>
    </div>
  {/if}
  
  <!-- Key Metrics -->
  {#if stats.hasData}
    <div class="metrics">
      <div class="metric">
        <span class="label">Total Users</span>
        <span class="value">{stats.data[0].total_users}</span>
      </div>
      <div class="metric">
        <span class="label">Departments</span>
        <span class="value">{stats.data[0].departments}</span>
      </div>
      <div class="metric">
        <span class="label">Avg Salary</span>
        <span class="value">${stats.data[0].avg_salary.toFixed(0)}</span>
      </div>
      <div class="metric">
        <span class="label">Max Salary</span>
        <span class="value">${stats.data[0].max_salary.toFixed(0)}</span>
      </div>
    </div>
  {/if}
  
  <div class="grid">
    <!-- Department Stats -->
    <div class="panel">
      <h2>Departments</h2>
      {#if departmentStats.hasData}
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Employees</th>
              <th>Avg Salary</th>
            </tr>
          </thead>
          <tbody>
            {#each departmentStats.data as dept}
              <tr>
                <td>{dept.department}</td>
                <td>{dept.employee_count}</td>
                <td>${dept.avg_salary.toFixed(0)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if departmentStats.loading}
        <p>Loading...</p>
      {/if}
    </div>
    
    <!-- Recent Activity -->
    <div class="panel">
      <h2>Recent Activity</h2>
      {#if recentActivity.hasData}
        <ul class="activity-list">
          {#each recentActivity.data as activity}
            <li>
              <span class="time">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </span>
              <span class="action">{activity.action}</span>
              <span class="user">{activity.user}</span>
            </li>
          {/each}
        </ul>
      {:else if recentActivity.loading}
        <p>Loading...</p>
      {/if}
    </div>
  </div>
</div>
```

## Advanced Patterns

### Custom Hooks with Runes

```javascript
// hooks/useQueryWithCache.svelte.js
import { createQueryRune } from '@northprint/duckdb-wasm-adapter-svelte';

export function useQueryWithCache(db, sql, params, options = {}) {
  const cacheKey = `${sql}-${JSON.stringify(params)}`;
  const cache = $state(new Map());
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  
  const query = createQueryRune(db, sql, params, {
    ...options,
    initialData: cachedData
  });
  
  // Update cache on successful query
  $effect(() => {
    if (query.hasData) {
      cache.set(cacheKey, query.data);
    }
  });
  
  // Clear cache after TTL
  $effect(() => {
    const ttl = options.cacheTTL || 60000; // 1 minute default
    const timer = setTimeout(() => {
      cache.delete(cacheKey);
    }, ttl);
    
    return () => clearTimeout(timer);
  });
  
  return query;
}
```

### Optimistic Updates

```javascript
// hooks/useOptimisticMutation.svelte.js
export function useOptimisticMutation(db, queryToRefetch) {
  let optimisticData = $state(null);
  
  const mutation = createMutationRune(db, {
    onSuccess: () => {
      // Clear optimistic data and refetch
      optimisticData = null;
      queryToRefetch.refetch();
    },
    onError: () => {
      // Revert optimistic update
      optimisticData = null;
    }
  });
  
  function optimisticMutate(sql, params, optimisticUpdate) {
    // Apply optimistic update immediately
    optimisticData = optimisticUpdate(queryToRefetch.data);
    
    // Execute actual mutation
    return mutation.mutate(sql, params);
  }
  
  // Merge optimistic data with real data
  const data = $derived(
    optimisticData || queryToRefetch.data
  );
  
  return {
    ...mutation,
    optimisticMutate,
    data
  };
}
```

## Best Practices

### 1. Use Runes for New Projects

For new Svelte 5 projects, prefer runes over stores:

```javascript
// ✅ Good - Using runes
const db = createDuckDBRunes({ autoConnect: true });
const query = createQueryRune(db, 'SELECT * FROM users');

// ❌ Avoid - Using legacy stores
const db = createDuckDB({ autoConnect: true });
const query = db.query('SELECT * FROM users');
```

### 2. Leverage $derived for Computed Values

```javascript
// ✅ Good - Using $derived for computed values
const stats = $derived({
  total: query.rowCount,
  average: query.data ? 
    query.data.reduce((sum, row) => sum + row.value, 0) / query.rowCount : 0
});

// ❌ Avoid - Manual computation in effects
let stats = {};
$effect(() => {
  if (query.data) {
    stats = {
      total: query.data.length,
      average: query.data.reduce((sum, row) => sum + row.value, 0) / query.data.length
    };
  }
});
```

### 3. Clean Up Effects

Always return cleanup functions from effects:

```javascript
// ✅ Good - Proper cleanup
$effect(() => {
  const interval = setInterval(() => {
    query.refetch();
  }, 5000);
  
  return () => clearInterval(interval);
});

// ❌ Avoid - No cleanup
$effect(() => {
  setInterval(() => {
    query.refetch();
  }, 5000);
});
```

### 4. Type Safety with TypeScript

```typescript
// types.ts
interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
}

// UserList.svelte
<script lang="ts">
  import { createDuckDBRunes, createQueryRune } from '@northprint/duckdb-wasm-adapter-svelte';
  import type { User } from './types';
  
  const db = createDuckDBRunes({ autoConnect: true });
  const users = createQueryRune<User>(db, 'SELECT * FROM users');
  
  // TypeScript knows users.data is User[] | null
  const highEarners = $derived(
    users.data?.filter(u => u.salary > 100000) || []
  );
</script>
```

## Migration Guide

### From Stores to Runes

```javascript
// Before (Svelte 4 with stores)
import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';

const db = createDuckDB({ autoConnect: true });
const query = db.query('SELECT * FROM users');

// In component
$: userData = $query.data;
$: isLoading = $query.loading;

// After (Svelte 5 with runes)
import { createDuckDBRunes, createQueryRune } from '@northprint/duckdb-wasm-adapter-svelte';

const db = createDuckDBRunes({ autoConnect: true });
const query = createQueryRune(db, 'SELECT * FROM users');

// Direct access to reactive properties
const userData = $derived(query.data);
const isLoading = $derived(query.loading);
```

## Performance Tips

1. **Use autoRefetch sparingly** - Only enable for data that truly needs real-time updates
2. **Implement pagination** - Use TableRune for large datasets
3. **Cache query results** - Implement caching for expensive queries
4. **Debounce user input** - Avoid excessive query execution on every keystroke
5. **Use Web Workers** - Enable worker mode for heavy computations

## Troubleshooting

### Common Issues

1. **Queries not updating**
   - Ensure autoRefetch is enabled
   - Check that reactive dependencies are properly tracked
   - Verify database connection status

2. **Memory leaks**
   - Always clean up effects
   - Dispose of unused queries
   - Clear large datasets when unmounting

3. **Type errors**
   - Ensure TypeScript is configured for Svelte 5
   - Import types correctly
   - Use generic parameters for type safety

## Further Resources

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/runes)
- [DuckDB WASM Adapter Core](../api/core.md)
- [Example Applications](../../examples/svelte5-runes-example)
- [API Reference](../api/svelte.md)
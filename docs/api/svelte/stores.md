# Svelte Stores

The Svelte adapter provides reactive stores for DuckDB operations using Svelte's built-in reactivity system.

## Installation

```bash
npm install @northprint/duckdb-wasm-adapter-svelte
```

## Basic Usage

```javascript
// App.svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
</script>
```

## Core Store

### duckdb()

Creates the main DuckDB store with connection management.

```typescript
function duckdb(options?: DuckDBOptions): DuckDBStore
```

#### DuckDBOptions

```typescript
interface DuckDBOptions {
  autoConnect?: boolean;           // Auto-connect on initialization
  config?: ConnectionConfig;       // Connection configuration
  debug?: DebugConfig;            // Debug configuration
}
```

#### DuckDBStore

```typescript
interface DuckDBStore {
  // Connection state
  connection: Readable<Connection | null>;
  status: Readable<ConnectionStatus>;
  error: Readable<Error | null>;
  isConnected: Readable<boolean>;
  
  // Connection methods
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Query methods
  query<T>(sql: string, params?: unknown[]): QueryStore<T>;
  execute<T>(sql: string, params?: unknown[]): Promise<ResultSet<T>>;
  
  // Data import/export
  importCSV(file: File | string, tableName: string, options?: ImportOptions): Promise<void>;
  importJSON(data: unknown[], tableName: string): Promise<void>;
  exportCSV(query: string, options?: ExportOptions): Promise<string>;
  exportJSON<T>(query: string): Promise<T[]>;
  
  // Cache management
  clearCache(): void;
  getCacheStats(): CacheStats;
  invalidateCache(pattern: string | RegExp): number;
}
```

#### Basic Connection Example

```svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({
    autoConnect: true,
    debug: {
      enabled: true,
      logQueries: true
    }
  });
  
  $: status = $db.status;
  $: error = $db.error;
  $: isConnected = $db.isConnected;
</script>

<div>
  <h2>Database Status</h2>
  <p>Status: {$status}</p>
  
  {#if $error}
    <p class="error">Error: {$error.message}</p>
  {/if}
  
  {#if !$isConnected}
    <button on:click={db.connect}>Connect</button>
  {:else}
    <button on:click={db.disconnect}>Disconnect</button>
  {/if}
</div>
```

## Query Store

### query()

Creates a reactive store for query execution.

```typescript
function query<T>(sql: string, params?: unknown[], options?: QueryOptions): QueryStore<T>
```

#### QueryStore

```typescript
interface QueryStore<T> extends Readable<QueryState<T>> {
  execute(): Promise<void>;
  refresh(): Promise<void>;
  subscribe(run: (value: QueryState<T>) => void): Unsubscriber;
}

interface QueryState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
  metadata: ColumnMetadata[] | null;
}
```

#### Basic Query Example

```svelte
<script>
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const users = db.query('SELECT * FROM users ORDER BY created_at DESC');
</script>

{#if $users.loading}
  <div>Loading users...</div>
{:else if $users.error}
  <div class="error">Error: {$users.error.message}</div>
{:else if $users.data}
  <div>
    <button on:click={users.refresh}>Refresh</button>
    <table>
      <thead>
        <tr>
          {#each $users.metadata as col}
            <th>{col.name}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $users.data as user}
          <tr>
            <td>{user.id}</td>
            <td>{user.name}</td>
            <td>{user.email}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
```

#### Reactive Parameters

```svelte
<script>
  import { writable } from 'svelte/store';
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let department = '';
  let minSalary = 0;
  
  $: employees = db.query(
    `SELECT * FROM employees 
     WHERE ($1 = '' OR department = $1) 
     AND ($2 = 0 OR salary >= $2) 
     ORDER BY salary DESC`,
    [department, minSalary]
  );
</script>

<div>
  <label>
    Department:
    <select bind:value={department}>
      <option value="">All Departments</option>
      <option value="engineering">Engineering</option>
      <option value="sales">Sales</option>
      <option value="marketing">Marketing</option>
    </select>
  </label>
  
  <label>
    Min Salary:
    <input type="number" bind:value={minSalary} />
  </label>
  
  {#if $employees.loading}
    <div>Loading...</div>
  {:else if $employees.error}
    <div>Error: {$employees.error.message}</div>
  {:else}
    <div>
      <p>Found {$employees.data?.length || 0} employees</p>
      <ul>
        {#each $employees.data || [] as emp}
          <li>{emp.name} - {emp.department} - ${emp.salary}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
```

## Mutation Store

### mutation()

Creates a store for executing mutations (INSERT, UPDATE, DELETE).

```typescript
function mutation<T>(options?: MutationOptions<T>): MutationStore<T>
```

#### MutationStore

```typescript
interface MutationStore<T> extends Readable<MutationState<T>> {
  execute(sql: string, params?: unknown[]): Promise<T[]>;
  reset(): void;
  subscribe(run: (value: MutationState<T>) => void): Unsubscriber;
}

interface MutationState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}
```

#### Basic Mutation Example

```svelte
<script>
  import { duckdb, mutation } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const createUser = mutation({
    onSuccess: (data) => {
      console.log('User created:', data);
      // Reset form
      name = '';
      email = '';
      department = '';
      // Refresh users list
      users.refresh();
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });
  
  const users = db.query('SELECT * FROM users');
  
  let name = '';
  let email = '';
  let department = '';
  
  async function handleSubmit() {
    await createUser.execute(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?) RETURNING *',
      [name, email, department]
    );
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <input bind:value={name} placeholder="Name" required />
  <input bind:value={email} type="email" placeholder="Email" required />
  <input bind:value={department} placeholder="Department" required />
  
  <button type="submit" disabled={$createUser.loading}>
    {$createUser.loading ? 'Creating...' : 'Create User'}
  </button>
  
  {#if $createUser.error}
    <div class="error">{$createUser.error.message}</div>
  {/if}
  
  {#if $createUser.data}
    <div class="success">User created successfully!</div>
  {/if}
</form>

<!-- Users list -->
{#if $users.data}
  <ul>
    {#each $users.data as user}
      <li>{user.name} - {user.email}</li>
    {/each}
  </ul>
{/if}
```

## Import/Export Stores

### importCSV() / importJSON()

Stores for data import operations.

```svelte
<script>
  import { duckdb, importCSV } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const csvImporter = importCSV({
    onSuccess: () => {
      console.log('CSV imported successfully');
      // Refresh data
      data.refresh();
    }
  });
  
  const data = db.query('SELECT * FROM imported_data');
  
  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    await csvImporter.execute(file, 'imported_data', {
      header: true,
      delimiter: ','
    });
  }
</script>

<div>
  <input 
    type="file" 
    accept=".csv" 
    on:change={handleFileChange}
    disabled={$csvImporter.loading}
  />
  
  {#if $csvImporter.loading}
    <div>Importing CSV...</div>
  {/if}
  
  {#if $csvImporter.error}
    <div class="error">{$csvImporter.error.message}</div>
  {/if}
  
  {#if $data.data}
    <table>
      <thead>
        <tr>
          {#each $data.metadata as col}
            <th>{col.name}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each $data.data as row}
          <tr>
            {#each Object.values(row) as value}
              <td>{value}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
```

## Advanced Store Patterns

### Derived Stores

Create derived stores for computed queries:

```svelte
<script>
  import { derived } from 'svelte/store';
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  
  const employees = db.query('SELECT * FROM employees');
  const departments = db.query('SELECT DISTINCT department FROM employees');
  
  // Derived store for statistics
  const stats = derived(employees, ($employees) => {
    if (!$employees.data) return null;
    
    const data = $employees.data;
    return {
      total: data.length,
      avgSalary: data.reduce((sum, emp) => sum + emp.salary, 0) / data.length,
      byDepartment: data.reduce((acc, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
        return acc;
      }, {})
    };
  });
</script>

{#if $stats}
  <div class="stats">
    <h3>Employee Statistics</h3>
    <p>Total: {$stats.total}</p>
    <p>Average Salary: ${Math.round($stats.avgSalary).toLocaleString()}</p>
    
    <h4>By Department:</h4>
    <ul>
      {#each Object.entries($stats.byDepartment) as [dept, count]}
        <li>{dept}: {count}</li>
      {/each}
    </ul>
  </div>
{/if}
```

### Custom Store Factory

Create reusable store factories:

```javascript
// stores/useUsers.js
import { writable, derived } from 'svelte/store';
import { duckdb, mutation } from '@northprint/duckdb-wasm-adapter-svelte';

export function createUserStore() {
  const db = duckdb({ autoConnect: true });
  
  // Filters
  const filters = writable({
    department: '',
    active: true,
    search: ''
  });
  
  // Dynamic query based on filters
  const users = derived(filters, ($filters) => {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if ($filters.department) {
      sql += ' AND department = ?';
      params.push($filters.department);
    }
    
    if ($filters.search) {
      sql += ' AND name LIKE ?';
      params.push(`%${$filters.search}%`);
    }
    
    if ($filters.active !== null) {
      sql += ' AND active = ?';
      params.push($filters.active);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    return db.query(sql, params);
  });
  
  // Mutations
  const createUser = mutation({
    onSuccess: () => {
      // Trigger users refresh
      filters.update(f => ({ ...f }));
    }
  });
  
  const updateUser = mutation({
    onSuccess: () => {
      filters.update(f => ({ ...f }));
    }
  });
  
  const deleteUser = mutation({
    onSuccess: () => {
      filters.update(f => ({ ...f }));
    }
  });
  
  return {
    filters,
    users,
    createUser: (userData) => createUser.execute(
      'INSERT INTO users (name, email, department, active) VALUES (?, ?, ?, ?)',
      [userData.name, userData.email, userData.department, userData.active]
    ),
    updateUser: (id, userData) => updateUser.execute(
      'UPDATE users SET name = ?, email = ?, department = ?, active = ? WHERE id = ?',
      [userData.name, userData.email, userData.department, userData.active, id]
    ),
    deleteUser: (id) => deleteUser.execute('DELETE FROM users WHERE id = ?', [id]),
    
    // Computed states
    loading: derived([users, createUser, updateUser, deleteUser], 
      ([$users, $create, $update, $delete]) => 
        $users.loading || $create.loading || $update.loading || $delete.loading
    ),
    
    error: derived([users, createUser, updateUser, deleteUser], 
      ([$users, $create, $update, $delete]) => 
        $users.error || $create.error || $update.error || $delete.error
    )
  };
}
```

Usage:

```svelte
<script>
  import { createUserStore } from './stores/useUsers.js';
  
  const userStore = createUserStore();
  const { filters, users, createUser, updateUser, deleteUser, loading, error } = userStore;
</script>

<div>
  <!-- Filters -->
  <input 
    bind:value={$filters.search} 
    placeholder="Search users..." 
  />
  
  <select bind:value={$filters.department}>
    <option value="">All Departments</option>
    <option value="engineering">Engineering</option>
    <option value="sales">Sales</option>
  </select>
  
  <!-- Loading/Error states -->
  {#if $loading}
    <div>Loading...</div>
  {:else if $error}
    <div class="error">{$error.message}</div>
  {:else if $users.data}
    <!-- Users list -->
    <ul>
      {#each $users.data as user}
        <li>
          {user.name} - {user.department}
          <button on:click={() => deleteUser(user.id)}>Delete</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

## Cache Store

Manage cache state reactively:

```svelte
<script>
  import { writable } from 'svelte/store';
  import { duckdb } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  const cacheStats = writable(db.getCacheStats());
  
  // Update stats periodically
  setInterval(() => {
    cacheStats.set(db.getCacheStats());
  }, 1000);
  
  function clearCache() {
    db.clearCache();
    cacheStats.set(db.getCacheStats());
  }
  
  function clearUserQueries() {
    const cleared = db.invalidateCache(/users/);
    console.log(`Cleared ${cleared} user queries`);
    cacheStats.set(db.getCacheStats());
  }
</script>

<div class="cache-panel">
  <h3>Cache Statistics</h3>
  <div class="stats">
    <div>Hits: {$cacheStats.hits}</div>
    <div>Misses: {$cacheStats.misses}</div>
    <div>Hit Rate: {($cacheStats.hitRate * 100).toFixed(1)}%</div>
    <div>Entries: {$cacheStats.entries}</div>
  </div>
  
  <div class="actions">
    <button on:click={clearCache}>Clear All</button>
    <button on:click={clearUserQueries}>Clear User Queries</button>
  </div>
</div>
```

## Best Practices

1. **Use reactive statements** (`$:`) to create dynamic queries based on changing parameters
2. **Leverage derived stores** for computed values and statistics
3. **Create custom store factories** for reusable domain logic
4. **Handle loading and error states** in your templates
5. **Use mutations with callbacks** to refresh related queries
6. **Batch related operations** using transactions when needed
7. **Clean up subscriptions** when components are destroyed (Svelte handles this automatically for stores)
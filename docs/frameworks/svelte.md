# Svelte Framework Guide

Complete guide to using DuckDB WASM Adapter with Svelte applications.

## Quick Start

### Installation

```bash
npm install @duckdb-wasm-adapter/svelte
```

### Basic Setup

```javascript
// src/App.svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ 
    autoConnect: true,
    config: {
      worker: true,
      cache: { enabled: true }
    }
  });
</script>

<main>
  <h1>My DuckDB App</h1>
  <!-- Your components -->
</main>
```

### First Query

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  const result = db.query('SELECT 42 as answer');
</script>

<h1>Dashboard</h1>

{#if $result.loading}
  <div>Loading...</div>
{:else if $result.error}
  <div>Error: {$result.error.message}</div>
{:else if $result.data}
  <p>The answer is: {$result.data[0].answer}</p>
{/if}
```

## Core Concepts

### Store-Based Architecture

Svelte adapter uses reactive stores for state management:

```javascript
// All state is managed through Svelte stores
const db = duckdb({ autoConnect: true });

// Reactive stores
$: status = $db.status;           // Connection status
$: isConnected = $db.isConnected; // Connection state
$: error = $db.error;             // Error state
```

### Reactive Queries

Queries automatically update when dependencies change:

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let department = '';
  let searchTerm = '';
  
  // Reactive query - re-runs when department or searchTerm changes
  $: users = db.query(
    `SELECT * FROM users 
     WHERE ($1 = '' OR department = $1)
     AND ($2 = '' OR name ILIKE '%' || $2 || '%')
     ORDER BY name`,
    [department, searchTerm]
  );
</script>

<select bind:value={department}>
  <option value="">All Departments</option>
  <option value="Engineering">Engineering</option>
  <option value="Sales">Sales</option>
</select>

<input bind:value={searchTerm} placeholder="Search users..." />

{#if $users.loading}
  <div>Loading...</div>
{:else if $users.error}
  <div>Error: {$users.error.message}</div>
{:else if $users.data}
  <p>Found {$users.data.length} users</p>
  
  {#each $users.data as user}
    <div class="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  {/each}
{/if}
```

## Data Fetching Patterns

### Simple Queries

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  const users = db.query(`
    SELECT id, name, email, department 
    FROM users 
    WHERE active = true
    ORDER BY name
  `);
</script>

<div class="user-list">
  <h2>Active Users</h2>
  
  {#if $users.loading}
    <div class="loading">Loading users...</div>
  {:else if $users.error}
    <div class="error">Failed to load users: {$users.error.message}</div>
  {:else if $users.data}
    <p>{$users.data.length} users found</p>
    
    <div class="user-grid">
      {#each $users.data as user (user.id)}
        <div class="user-card">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <span class="department">{user.department}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .user-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .user-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .loading, .error {
    text-align: center;
    padding: 2rem;
  }
  
  .error {
    color: #d32f2f;
  }
</style>
```

### Conditional Queries

```svelte
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let selectedUserId = null;
  
  // Only run when user is selected
  $: user = selectedUserId ? 
    db.query('SELECT * FROM users WHERE id = ?', [selectedUserId]) : 
    { data: null, loading: false, error: null };
  
  // Only run when user is loaded
  $: orders = $user.data ? 
    db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [selectedUserId]) :
    { data: null, loading: false, error: null };
</script>

<UserSelector bind:selectedUserId />

{#if !selectedUserId}
  <div class="no-selection">
    Please select a user to view details
  </div>
{:else if $user.loading}
  <div class="loading">Loading user details...</div>
{:else if $user.error}
  <div class="error">Error loading user: {$user.error.message}</div>
{:else if $user.data}
  <div class="user-details">
    <h2>{$user.data.name}</h2>
    <p>Email: {$user.data.email}</p>
    <p>Department: {$user.data.department}</p>
    
    {#if $orders.loading}
      <div class="loading">Loading orders...</div>
    {:else if $orders.data && $orders.data.length > 0}
      <h3>Recent Orders</h3>
      <OrdersList orders={$orders.data} />
    {:else}
      <p>No orders found</p>
    {/if}
  </div>
{/if}
```

## Data Mutations

### Creating Records

```svelte
<script>
  import { duckdb, mutation } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  
  const createUser = mutation({
    onSuccess: (result) => {
      console.log('User created:', result);
      // Reset form
      form = { name: '', email: '', department: '' };
      // Refresh users list if needed
      users.refresh();
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });
  
  // Refresh users when needed
  const users = db.query('SELECT * FROM users ORDER BY name');
  
  let form = {
    name: '',
    email: '',
    department: ''
  };
  
  async function handleSubmit() {
    await createUser.execute(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?) RETURNING *',
      [form.name, form.email, form.department]
    );
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <h2>Create New User</h2>
  
  <div class="form-group">
    <label for="name">Name:</label>
    <input 
      id="name"
      bind:value={form.name} 
      type="text" 
      required 
    />
  </div>

  <div class="form-group">
    <label for="email">Email:</label>
    <input 
      id="email"
      bind:value={form.email} 
      type="email" 
      required 
    />
  </div>

  <div class="form-group">
    <label for="department">Department:</label>
    <select id="department" bind:value={form.department} required>
      <option value="">Select Department</option>
      <option value="Engineering">Engineering</option>
      <option value="Sales">Sales</option>
      <option value="Marketing">Marketing</option>
    </select>
  </div>

  <button type="submit" disabled={$createUser.loading}>
    {$createUser.loading ? 'Creating...' : 'Create User'}
  </button>

  {#if $createUser.error}
    <div class="error">
      Error: {$createUser.error.message}
    </div>
  {/if}

  {#if $createUser.data}
    <div class="success">
      User created successfully!
    </div>
  {/if}
</form>

<style>
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  input, select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .error {
    color: #d32f2f;
    margin-top: 1rem;
  }
  
  .success {
    color: #2e7d32;
    margin-top: 1rem;
  }
</style>
```

### Updating Records

```svelte
<script>
  import { mutation } from '@duckdb-wasm-adapter/svelte';
  
  export let user;
  
  const updateUser = mutation({
    onSuccess: (result) => {
      dispatch('updated', result[0]);
    }
  });
  
  let form = { ...user };
  
  async function handleSubmit() {
    await updateUser.execute(
      'UPDATE users SET name = ?, email = ?, department = ? WHERE id = ? RETURNING *',
      [form.name, form.email, form.department, user.id]
    );
  }
  
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<form on:submit|preventDefault={handleSubmit}>
  <h2>Edit User</h2>
  
  <div class="form-group">
    <label>Name:</label>
    <input bind:value={form.name} type="text" required />
  </div>

  <div class="form-group">
    <label>Email:</label>
    <input bind:value={form.email} type="email" required />
  </div>

  <div class="form-group">
    <label>Department:</label>
    <select bind:value={form.department} required>
      <option value="Engineering">Engineering</option>
      <option value="Sales">Sales</option>
      <option value="Marketing">Marketing</option>
    </select>
  </div>

  <div class="form-actions">
    <button type="submit" disabled={$updateUser.loading}>
      {$updateUser.loading ? 'Updating...' : 'Update User'}
    </button>
    <button type="button" on:click={() => dispatch('cancel')}>
      Cancel
    </button>
  </div>
</form>
```

## Data Import/Export

### CSV Import

```svelte
<script>
  import { importCSV } from '@duckdb-wasm-adapter/svelte';
  
  const csvImporter = importCSV({
    onSuccess: (result) => {
      console.log('Import completed:', result);
      success = true;
      setTimeout(() => { success = false; }, 3000);
    },
    onError: (error) => {
      console.error('Import failed:', error);
    }
  });
  
  let success = false;
  let options = {
    header: true,
    delimiter: ','
  };
  
  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    await csvImporter.execute(file, 'imported_users', {
      header: options.header,
      delimiter: options.delimiter,
      nullString: 'NULL'
    });
  }
</script>

<div class="csv-importer">
  <h3>Import Users from CSV</h3>
  
  <div class="import-options">
    <label>
      <input bind:checked={options.header} type="checkbox" />
      First row contains headers
    </label>
    
    <label>
      Delimiter:
      <select bind:value={options.delimiter}>
        <option value=",">Comma (,)</option>
        <option value=";">Semicolon (;)</option>
        <option value="\t">Tab</option>
      </select>
    </label>
  </div>
  
  <div class="upload-area">
    <input 
      type="file" 
      accept=".csv" 
      on:change={handleFileChange}
      disabled={$csvImporter.loading}
    />
    
    {#if $csvImporter.loading}
      <div class="progress">
        <div class="spinner"></div>
        <p>Importing CSV file...</p>
      </div>
    {/if}
    
    {#if $csvImporter.error}
      <div class="error">
        Import failed: {$csvImporter.error.message}
      </div>
    {/if}
    
    {#if success}
      <div class="success">
        CSV imported successfully!
      </div>
    {/if}
  </div>
</div>

<style>
  .upload-area {
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    margin: 1rem 0;
  }
  
  .import-options {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>
```

## Advanced Patterns

### Custom Stores

```javascript
// stores/userStore.js
import { writable, derived } from 'svelte/store';
import { duckdb } from '@duckdb-wasm-adapter/svelte';

// Initialize database
const db = duckdb({ autoConnect: true });

// Filters store
export const userFilters = writable({
  department: '',
  active: true,
  search: ''
});

// Derived query based on filters
export const filteredUsers = derived(
  userFilters,
  ($filters) => {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if ($filters.department) {
      sql += ' AND department = ?';
      params.push($filters.department);
    }
    
    if ($filters.search) {
      sql += ' AND name ILIKE ?';
      params.push(`%${$filters.search}%`);
    }
    
    if ($filters.active !== null) {
      sql += ' AND active = ?';
      params.push($filters.active);
    }
    
    sql += ' ORDER BY name';
    
    return db.query(sql, params);
  }
);

// User statistics
export const userStats = derived(
  filteredUsers,
  ($users) => {
    if (!$users.data) return null;
    
    const data = $users.data;
    return {
      total: data.length,
      byDepartment: data.reduce((acc, user) => {
        acc[user.department] = (acc[user.department] || 0) + 1;
        return acc;
      }, {}),
      avgAge: data.reduce((sum, user) => sum + (user.age || 0), 0) / data.length
    };
  }
);
```

### Component Actions

```javascript
// actions/duckdbAction.js
export function duckdbAction(node, options = {}) {
  let db;
  
  async function initialize() {
    const { duckdb } = await import('@duckdb-wasm-adapter/svelte');
    db = duckdb(options);
    
    // Add database reference to the node
    node.duckdb = db;
    
    // Dispatch ready event
    node.dispatchEvent(new CustomEvent('duckdb:ready', {
      detail: { db }
    }));
  }
  
  initialize();
  
  return {
    update(newOptions) {
      // Handle option updates
      Object.assign(options, newOptions);
    },
    
    destroy() {
      // Cleanup if needed
      if (db) {
        // Close connections, etc.
      }
    }
  };
}
```

Usage:

```svelte
<script>
  import { duckdbAction } from './actions/duckdbAction.js';
  
  let dbContainer;
  
  function handleDbReady(event) {
    const { db } = event.detail;
    console.log('Database ready:', db);
  }
</script>

<div 
  bind:this={dbContainer}
  use:duckdbAction={{ autoConnect: true }}
  on:duckdb:ready={handleDbReady}
>
  <!-- Database-connected component -->
</div>
```

### Error Boundaries

```svelte
<!-- ErrorBoundary.svelte -->
<script>
  import { onDestroy } from 'svelte';
  
  export let fallback = null;
  
  let hasError = false;
  let errorDetails = '';
  
  function handleError(event) {
    console.error('Svelte Error:', event.error);
    hasError = true;
    errorDetails = event.error.message;
  }
  
  function reset() {
    hasError = false;
    errorDetails = '';
  }
  
  // Global error handler
  if (typeof window !== 'undefined') {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError({ error: event.reason });
    });
    
    onDestroy(() => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    });
  }
</script>

{#if hasError}
  {#if fallback}
    <svelte:component this={fallback} {errorDetails} {reset} />
  {:else}
    <div class="error-boundary">
      <h3>Something went wrong</h3>
      <details>
        <summary>Error Details</summary>
        <pre>{errorDetails}</pre>
      </details>
      <button on:click={reset}>Try Again</button>
    </div>
  {/if}
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    border: 1px solid #d32f2f;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    background-color: #ffebee;
  }
  
  details {
    margin: 1rem 0;
  }
  
  pre {
    background-color: #f5f5f5;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
  }
</style>
```

## Performance Optimization

### Lazy Loading

```svelte
<script>
  import { onMount } from 'svelte';
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let currentPage = 1;
  let hasMore = true;
  let allUsers = [];
  
  const PAGE_SIZE = 20;
  
  async function loadMoreUsers() {
    const offset = (currentPage - 1) * PAGE_SIZE;
    const users = db.query(
      'SELECT * FROM users ORDER BY name LIMIT ? OFFSET ?',
      [PAGE_SIZE, offset]
    );
    
    // Wait for query to complete
    users.subscribe(result => {
      if (result.data) {
        if (result.data.length < PAGE_SIZE) {
          hasMore = false;
        }
        
        allUsers = [...allUsers, ...result.data];
        currentPage++;
      }
    });
  }
  
  onMount(() => {
    loadMoreUsers();
  });
  
  // Intersection observer for infinite scroll
  function observeLastElement(node) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreUsers();
      }
    });
    
    observer.observe(node);
    
    return {
      destroy() {
        observer.disconnect();
      }
    };
  }
</script>

<div class="user-list">
  {#each allUsers as user, index (user.id)}
    <div 
      class="user-card"
      use:observeLastElement={index === allUsers.length - 1}
    >
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  {/each}
  
  {#if hasMore}
    <div class="loading">Loading more users...</div>
  {/if}
</div>
```

### Virtual Scrolling

```svelte
<script>
  import { onMount, tick } from 'svelte';
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  const users = db.query('SELECT * FROM users ORDER BY name');
  
  let scrollContainer;
  let itemHeight = 60;
  let containerHeight = 400;
  let scrollTop = 0;
  
  $: totalHeight = ($users.data?.length || 0) * itemHeight;
  $: visibleStart = Math.floor(scrollTop / itemHeight);
  $: visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    $users.data?.length || 0
  );
  $: visibleItems = $users.data?.slice(visibleStart, visibleEnd) || [];
  $: offsetY = visibleStart * itemHeight;
  
  function handleScroll() {
    scrollTop = scrollContainer.scrollTop;
  }
</script>

<div 
  class="virtual-scroll-container"
  style="height: {containerHeight}px"
  bind:this={scrollContainer}
  on:scroll={handleScroll}
>
  <div style="height: {totalHeight}px; position: relative;">
    <div style="transform: translateY({offsetY}px);">
      {#each visibleItems as user, index (user.id)}
        <div 
          class="virtual-item"
          style="height: {itemHeight}px"
        >
          <h4>{user.name}</h4>
          <p>{user.email}</p>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .virtual-scroll-container {
    overflow-y: auto;
    border: 1px solid #ddd;
  }
  
  .virtual-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 1rem;
    border-bottom: 1px solid #eee;
  }
  
  .virtual-item h4 {
    margin: 0;
  }
  
  .virtual-item p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }
</style>
```

## Testing

### Component Testing

```javascript
// tests/UserList.test.js
import { render, fireEvent } from '@testing-library/svelte';
import UserList from '../src/components/UserList.svelte';

test('renders user list', async () => {
  const { getByText, getByRole } = render(UserList);
  
  // Should show loading initially
  expect(getByText('Loading...')).toBeInTheDocument();
  
  // Wait for data to load
  await waitFor(() => {
    expect(getByText('Users')).toBeInTheDocument();
  });
});

test('filters users by department', async () => {
  const { getByRole, getByText } = render(UserList);
  
  const select = getByRole('combobox');
  await fireEvent.change(select, { target: { value: 'Engineering' } });
  
  // Should filter results
  await waitFor(() => {
    expect(getByText(/Engineering/)).toBeInTheDocument();
  });
});
```

### Store Testing

```javascript
// tests/userStore.test.js
import { get } from 'svelte/store';
import { userFilters, filteredUsers } from '../src/stores/userStore.js';

test('filters users correctly', () => {
  // Set filter
  userFilters.set({ department: 'Engineering', active: true, search: '' });
  
  // Get filtered results
  const filters = get(userFilters);
  expect(filters.department).toBe('Engineering');
  
  // Test derived store
  const unsubscribe = filteredUsers.subscribe(users => {
    // Assert query parameters are correct
    expect(users).toBeDefined();
  });
  
  unsubscribe();
});
```

## Best Practices

### 1. Use TypeScript

```typescript
// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  active: boolean;
}

// Component with TypeScript
<script lang="ts">
  import type { User } from './types.js';
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  const users = db.query<User>('SELECT * FROM users');
  
  // users is now typed as QueryStore<User>
</script>
```

### 2. Handle Loading States

```svelte
{#if $users.loading}
  <div class="loading-state">
    <div class="spinner"></div>
    <p>Loading users...</p>
  </div>
{:else if $users.error}
  <div class="error-state">
    <h3>Failed to load users</h3>
    <p>{$users.error.message}</p>
    <button on:click={() => users.refresh()}>
      Try Again
    </button>
  </div>
{:else}
  <!-- Render data -->
{/if}
```

### 3. Optimize Re-renders

```svelte
<script>
  import { derived } from 'svelte/store';
  
  // Use derived stores for expensive computations
  const userStats = derived(users, ($users) => {
    if (!$users.data) return null;
    
    return {
      total: $users.data.length,
      departments: [...new Set($users.data.map(u => u.department))]
    };
  });
  
  // Memoize expensive functions
  function expensiveCalculation(data) {
    // Expensive operation
    return result;
  }
  
  $: memoizedResult = $users.data ? expensiveCalculation($users.data) : null;
</script>
```

### 4. Use Actions for Reusability

```svelte
<script>
  function tooltipAction(node, text) {
    // Add tooltip functionality
    return {
      update(newText) {
        // Update tooltip
      },
      destroy() {
        // Cleanup
      }
    };
  }
</script>

<div use:tooltipAction="User information">
  <!-- Content -->
</div>
```

This guide covers the essential patterns for building Svelte applications with DuckDB WASM Adapter. The reactive store system makes it intuitive to build responsive, data-driven applications with automatic updates when data changes.
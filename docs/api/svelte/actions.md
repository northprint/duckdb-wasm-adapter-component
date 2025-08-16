# Svelte Actions API

Custom Svelte actions for DuckDB WASM integration.

## Overview

Svelte actions provide directive-based functionality for DuckDB operations, making it easy to bind queries to DOM elements and handle database interactions declaratively.

## Query Action

Bind SQL queries directly to elements.

### Basic Usage

```svelte
<script>
  import { query } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let sql = 'SELECT * FROM users LIMIT 10';
  let queryResult = {};
</script>

<div use:query={{ sql, result: queryResult }}>
  {#if queryResult.loading}
    <p>Loading...</p>
  {:else if queryResult.error}
    <p>Error: {queryResult.error.message}</p>
  {:else if queryResult.data}
    <ul>
      {#each queryResult.data as row}
        <li>{row.name}</li>
      {/each}
    </ul>
  {/if}
</div>
```

### Advanced Configuration

```svelte
<script>
  import { query } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let searchTerm = '';
  let queryResult = {};
  
  $: queryConfig = {
    sql: `SELECT * FROM users WHERE name LIKE ?`,
    params: [`%${searchTerm}%`],
    result: queryResult,
    options: {
      enabled: searchTerm.length > 2,
      debounce: 300,
      cache: true,
      staleTime: 60000
    },
    onSuccess: (data) => {
      console.log('Query successful:', data);
    },
    onError: (error) => {
      console.error('Query failed:', error);
    }
  };
</script>

<input bind:value={searchTerm} placeholder="Search users..." />

<div use:query={queryConfig}>
  <!-- Results display -->
</div>
```

## Table Action

Create interactive data tables with sorting, filtering, and pagination.

### Basic Table

```svelte
<script>
  import { table } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let tableConfig = {
    sql: 'SELECT * FROM employees',
    columns: ['id', 'name', 'department', 'salary'],
    pageSize: 20
  };
</script>

<table use:table={tableConfig}>
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      <th>Department</th>
      <th>Salary</th>
    </tr>
  </thead>
  <tbody>
    <!-- Auto-populated by action -->
  </tbody>
</table>
```

### Advanced Table Features

```svelte
<script>
  import { table } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let tableState = {};
  
  let tableConfig = {
    sql: 'SELECT * FROM products',
    state: tableState,
    features: {
      sort: true,
      filter: true,
      pagination: true,
      search: true,
      export: true,
      columnResize: true,
      rowSelection: true
    },
    columns: [
      { 
        key: 'id', 
        label: 'ID', 
        sortable: true,
        width: 80 
      },
      { 
        key: 'name', 
        label: 'Product Name', 
        sortable: true,
        searchable: true 
      },
      { 
        key: 'price', 
        label: 'Price', 
        sortable: true,
        format: (value) => `$${value.toFixed(2)}`,
        align: 'right'
      },
      { 
        key: 'stock', 
        label: 'Stock', 
        sortable: true,
        cellClass: (value) => value < 10 ? 'low-stock' : '',
        align: 'center'
      }
    ],
    onRowClick: (row) => {
      console.log('Row clicked:', row);
    },
    onSelectionChange: (selectedRows) => {
      console.log('Selection changed:', selectedRows);
    }
  };
</script>

<div use:table={tableConfig}>
  <!-- Table controls (search, filters, etc.) are auto-generated -->
  
  {#if tableState.selectedRows?.length > 0}
    <p>{tableState.selectedRows.length} rows selected</p>
    <button on:click={() => exportSelected(tableState.selectedRows)}>
      Export Selected
    </button>
  {/if}
</div>

<style>
  :global(.low-stock) {
    color: red;
    font-weight: bold;
  }
</style>
```

## Chart Action

Bind query results to charts.

### Basic Chart

```svelte
<script>
  import { chart } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let chartConfig = {
    sql: `
      SELECT department, COUNT(*) as count 
      FROM employees 
      GROUP BY department
    `,
    type: 'bar',
    xField: 'department',
    yField: 'count'
  };
</script>

<div use:chart={chartConfig} style="height: 400px;">
  <!-- Chart renders here -->
</div>
```

### Advanced Chart Configuration

```svelte
<script>
  import { chart } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let timeRange = '30d';
  
  $: chartConfig = {
    sql: `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as orders,
        SUM(amount) as revenue
      FROM orders
      WHERE created_at > NOW() - INTERVAL '${timeRange}'
      GROUP BY date
      ORDER BY date
    `,
    type: 'line',
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        },
        y: [
          {
            id: 'orders',
            position: 'left',
            title: 'Order Count'
          },
          {
            id: 'revenue',
            position: 'right',
            title: 'Revenue ($)',
            grid: {
              drawOnChartArea: false
            }
          }
        ]
      },
      datasets: [
        {
          data: 'orders',
          label: 'Orders',
          yAxisID: 'orders',
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)'
        },
        {
          data: 'revenue',
          label: 'Revenue',
          yAxisID: 'revenue',
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)'
        }
      ]
    },
    updateInterval: 60000, // Refresh every minute
    onDataUpdate: (newData) => {
      console.log('Chart data updated:', newData);
    }
  };
</script>

<select bind:value={timeRange}>
  <option value="7d">Last 7 days</option>
  <option value="30d">Last 30 days</option>
  <option value="90d">Last 90 days</option>
</select>

<div use:chart={chartConfig} style="height: 400px;">
  <!-- Chart with multiple datasets -->
</div>
```

## Form Action

Handle form submissions with database operations.

### Basic Form

```svelte
<script>
  import { form } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let formConfig = {
    table: 'users',
    operation: 'insert',
    onSuccess: (result) => {
      alert('User created successfully!');
    },
    onError: (error) => {
      alert('Error: ' + error.message);
    }
  };
</script>

<form use:form={formConfig}>
  <input name="name" placeholder="Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="department" placeholder="Department" />
  <button type="submit">Create User</button>
</form>
```

### Advanced Form with Validation

```svelte
<script>
  import { form } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let userId = null;
  let formState = {};
  
  $: formConfig = {
    table: 'users',
    operation: userId ? 'update' : 'insert',
    where: userId ? { id: userId } : undefined,
    state: formState,
    validation: {
      name: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        custom: async (value) => {
          const exists = await checkEmailExists(value);
          return exists ? 'Email already exists' : null;
        }
      },
      age: {
        type: 'number',
        min: 18,
        max: 120
      },
      department: {
        required: true,
        enum: ['Engineering', 'Sales', 'Marketing', 'HR']
      }
    },
    transform: (data) => {
      // Transform data before saving
      return {
        ...data,
        email: data.email.toLowerCase(),
        updated_at: new Date().toISOString()
      };
    },
    onSubmit: async (data) => {
      // Custom submit logic
      console.log('Submitting:', data);
    },
    onSuccess: (result) => {
      formState.success = true;
      formState.message = 'Saved successfully!';
    },
    onError: (error) => {
      formState.error = true;
      formState.message = error.message;
    }
  };
  
  async function checkEmailExists(email) {
    const result = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );
    return result[0].count > 0;
  }
</script>

<form use:form={formConfig}>
  {#if formState.error}
    <div class="error">{formState.message}</div>
  {/if}
  
  {#if formState.success}
    <div class="success">{formState.message}</div>
  {/if}

  <label>
    Name:
    <input name="name" required />
    {#if formState.errors?.name}
      <span class="field-error">{formState.errors.name}</span>
    {/if}
  </label>

  <label>
    Email:
    <input name="email" type="email" required />
    {#if formState.errors?.email}
      <span class="field-error">{formState.errors.email}</span>
    {/if}
  </label>

  <label>
    Age:
    <input name="age" type="number" min="18" max="120" />
    {#if formState.errors?.age}
      <span class="field-error">{formState.errors.age}</span>
    {/if}
  </label>

  <label>
    Department:
    <select name="department" required>
      <option value="">Select...</option>
      <option value="Engineering">Engineering</option>
      <option value="Sales">Sales</option>
      <option value="Marketing">Marketing</option>
      <option value="HR">HR</option>
    </select>
    {#if formState.errors?.department}
      <span class="field-error">{formState.errors.department}</span>
    {/if}
  </label>

  <button type="submit" disabled={formState.submitting}>
    {formState.submitting ? 'Saving...' : 'Save'}
  </button>
</form>
```

## Autocomplete Action

Add database-driven autocomplete to inputs.

```svelte
<script>
  import { autocomplete } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let selectedUser = null;
  
  let autocompleteConfig = {
    sql: (search) => `
      SELECT id, name, email 
      FROM users 
      WHERE name ILIKE ? OR email ILIKE ?
      LIMIT 10
    `,
    params: (search) => [`%${search}%`, `%${search}%`],
    displayField: 'name',
    valueField: 'id',
    minChars: 2,
    debounce: 300,
    renderItem: (item) => `
      <div class="autocomplete-item">
        <strong>${item.name}</strong>
        <small>${item.email}</small>
      </div>
    `,
    onSelect: (item) => {
      selectedUser = item;
      console.log('Selected:', item);
    }
  };
</script>

<input 
  use:autocomplete={autocompleteConfig}
  placeholder="Search users..."
/>

{#if selectedUser}
  <p>Selected: {selectedUser.name} ({selectedUser.email})</p>
{/if}
```

## Export Action

Export query results in various formats.

```svelte
<script>
  import { export as exportAction } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let exportConfig = {
    sql: 'SELECT * FROM orders WHERE created_at > NOW() - INTERVAL \'30 days\'',
    format: 'csv', // 'csv', 'json', 'excel', 'parquet'
    filename: 'orders-export',
    options: {
      headers: true,
      delimiter: ',',
      dateFormat: 'YYYY-MM-DD'
    }
  };
</script>

<button use:exportAction={exportConfig}>
  Export Last 30 Days Orders
</button>

<!-- Or with dynamic format selection -->
<select bind:value={exportConfig.format}>
  <option value="csv">CSV</option>
  <option value="json">JSON</option>
  <option value="excel">Excel</option>
  <option value="parquet">Parquet</option>
</select>
<button use:exportAction={exportConfig}>
  Export as {exportConfig.format.toUpperCase()}
</button>
```

## Infinite Scroll Action

Load data progressively as user scrolls.

```svelte
<script>
  import { infiniteScroll } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let items = [];
  
  let scrollConfig = {
    sql: 'SELECT * FROM posts ORDER BY created_at DESC',
    pageSize: 20,
    threshold: 100, // Load more when 100px from bottom
    items: items,
    onLoad: (newItems, page) => {
      console.log(`Loaded page ${page} with ${newItems.length} items`);
    },
    onComplete: () => {
      console.log('All items loaded');
    }
  };
</script>

<div use:infiniteScroll={scrollConfig} class="scroll-container">
  {#each items as item}
    <div class="item">
      <h3>{item.title}</h3>
      <p>{item.content}</p>
    </div>
  {/each}
  
  {#if scrollConfig.loading}
    <div class="loading">Loading more...</div>
  {/if}
  
  {#if scrollConfig.complete}
    <div class="complete">No more items</div>
  {/if}
</div>

<style>
  .scroll-container {
    height: 600px;
    overflow-y: auto;
  }
</style>
```

## Realtime Action

Subscribe to query changes.

```svelte
<script>
  import { realtime } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let realtimeData = [];
  
  let realtimeConfig = {
    sql: 'SELECT * FROM live_metrics ORDER BY timestamp DESC LIMIT 100',
    interval: 5000, // Refresh every 5 seconds
    data: realtimeData,
    transform: (data) => {
      // Process data before updating
      return data.map(row => ({
        ...row,
        value: parseFloat(row.value)
      }));
    },
    onChange: (newData, oldData) => {
      console.log('Data updated:', { new: newData.length, old: oldData.length });
    }
  };
</script>

<div use:realtime={realtimeConfig}>
  <h3>Live Metrics (Updates every 5s)</h3>
  {#each realtimeData as metric}
    <div class="metric">
      <span>{metric.name}</span>
      <strong>{metric.value}</strong>
    </div>
  {/each}
</div>
```

## Drag and Drop Action

Handle file drops for data import.

```svelte
<script>
  import { dropzone } from '@northprint/duckdb-wasm-adapter-svelte';
  
  let dropzoneConfig = {
    accept: ['.csv', '.json', '.parquet'],
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: async (files) => {
      for (const file of files) {
        const tableName = file.name.replace(/\.[^/.]+$/, '');
        
        if (file.name.endsWith('.csv')) {
          await importCSV(file, tableName);
        } else if (file.name.endsWith('.json')) {
          await importJSON(file, tableName);
        } else if (file.name.endsWith('.parquet')) {
          await importParquet(file, tableName);
        }
      }
    },
    onError: (error) => {
      console.error('Drop error:', error);
    }
  };
</script>

<div 
  use:dropzone={dropzoneConfig}
  class="dropzone"
  class:dragging={dropzoneConfig.isDragging}
>
  <p>Drop CSV, JSON, or Parquet files here</p>
  <p>or click to browse</p>
  
  {#if dropzoneConfig.files?.length > 0}
    <ul>
      {#each dropzoneConfig.files as file}
        <li>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .dropzone {
    border: 2px dashed #ccc;
    padding: 40px;
    text-align: center;
    cursor: pointer;
  }
  
  .dropzone.dragging {
    border-color: #007bff;
    background-color: #f0f8ff;
  }
</style>
```

## Custom Actions

Create your own custom actions.

```javascript
// customActions.js
export function customQuery(node, config) {
  let query;
  let unsubscribe;
  
  const execute = async () => {
    const result = await connection.execute(config.sql, config.params);
    
    if (config.onResult) {
      config.onResult(result);
    }
    
    // Update DOM
    if (config.updateDOM) {
      node.innerHTML = config.updateDOM(result);
    }
  };
  
  // Initial execution
  execute();
  
  // Set up auto-refresh if configured
  if (config.refreshInterval) {
    const interval = setInterval(execute, config.refreshInterval);
    unsubscribe = () => clearInterval(interval);
  }
  
  return {
    update(newConfig) {
      config = newConfig;
      execute();
    },
    destroy() {
      if (unsubscribe) unsubscribe();
    }
  };
}

// Usage
<div use:customQuery={{
  sql: 'SELECT COUNT(*) as count FROM users',
  updateDOM: (result) => `User count: ${result[0].count}`,
  refreshInterval: 10000
}} />
```

## TypeScript Support

```typescript
import type { Action } from 'svelte/action';

interface QueryConfig {
  sql: string;
  params?: any[];
  result?: any;
  options?: QueryOptions;
}

export const query: Action<HTMLElement, QueryConfig> = (node, config) => {
  // Implementation
};

interface TableConfig {
  sql: string;
  columns: ColumnDefinition[];
  features?: TableFeatures;
}

export const table: Action<HTMLTableElement, TableConfig> = (node, config) => {
  // Implementation
};
```

## Best Practices

1. **Use reactive statements** - Update action configs with `$:` for reactive updates
2. **Clean up resources** - Actions should return destroy functions
3. **Handle errors gracefully** - Always provide error callbacks
4. **Debounce user input** - Prevent excessive queries
5. **Cache results** - Use caching for frequently accessed data
6. **Validate inputs** - Validate before database operations
7. **Provide feedback** - Show loading and error states

## Next Steps

- [Svelte Stores](/api/svelte/stores) - Svelte store integration
- [Svelte Components](/api/svelte/components) - Pre-built components
- [Query API](/api/query) - Query execution API
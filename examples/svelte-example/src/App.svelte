<script>
  import { createDuckDB, downloadFile, resultToCSV } from '@northprint/duckdb-wasm-adapter-svelte';
  import { onMount } from 'svelte';

  // Create DuckDB instance
  const db = createDuckDB();
  
  // Extract individual stores - these are Svelte stores
  const connection = db.connection;
  const status = db.status;
  const error = db.error;
  
  let sqlQuery = 'SELECT * FROM employees';
  let customQuery = 'SELECT * FROM employees';
  let importFile = null;
  let tableName = 'imported_data';
  
  // Sample data creation query
  const setupQuery = `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER,
      name VARCHAR,
      department VARCHAR,
      salary DECIMAL(10,2),
      hire_date DATE
    );
    
    INSERT INTO employees VALUES 
      (1, 'Alice Johnson', 'Engineering', 95000.00, '2020-03-15'),
      (2, 'Bob Smith', 'Sales', 75000.00, '2019-07-22'),
      (3, 'Carol White', 'Marketing', 82000.00, '2021-01-10'),
      (4, 'David Brown', 'Engineering', 105000.00, '2018-11-05'),
      (5, 'Eve Davis', 'HR', 68000.00, '2022-02-28');
  `;
  
  let setupComplete = false;
  
  // Setup initial data
  $: if ($connection && !setupComplete) {
    setupComplete = true;
    $connection.execute(setupQuery).catch(console.error);
  }
  
  onMount(async () => {
    console.log('App mounted, connecting to database...');
    try {
      await db.connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
    }
  });
  
  // Create reactive query - only when connected
  $: queryStore = $connection ? db.query(sqlQuery) : null;
  
  // Execute custom query
  async function executeCustomQuery() {
    if (!customQuery || !$connection) {
      console.log('Cannot execute query:', { customQuery, connection: $connection });
      return;
    }
    console.log('Executing query:', customQuery);
    sqlQuery = customQuery;
  }
  
  // Handle file import
  async function handleImport() {
    if (!importFile || !$connection) return;
    
    try {
      if (importFile.name.endsWith('.csv')) {
        await db.importCSV(importFile, tableName);
      } else if (importFile.name.endsWith('.json')) {
        const text = await importFile.text();
        const data = JSON.parse(text);
        await db.importJSON(data, tableName);
      }
      
      alert(`Successfully imported ${importFile.name} into table ${tableName}`);
      sqlQuery = `SELECT * FROM ${tableName}`;
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  }
  
  // Export data as CSV
  async function exportAsCSV() {
    if (!$queryStore.data) return;
    
    const csv = resultToCSV($queryStore.data);
    downloadFile(csv, 'export.csv', 'text/csv');
  }
  
  // Export data as JSON
  async function exportAsJSON() {
    if (!$connection) return;
    
    try {
      const json = await db.exportJSON(sqlQuery);
      downloadFile(JSON.stringify(json, null, 2), 'export.json', 'application/json');
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  }
</script>

<main>
  <h1>🦆 DuckDB WASM Svelte Example</h1>
  
  <section class="status">
    <h2>Connection Status</h2>
    <p>Status: <span class="status-badge {$status}">{$status}</span></p>
    {#if $error}
      <p class="error">Error: {$error.message}</p>
    {/if}
    {#if $status !== 'connected'}
      <button on:click={() => db.connect()}>Connect to Database</button>
    {:else}
      <button on:click={() => db.disconnect()}>Disconnect</button>
    {/if}
  </section>
  
  <section class="query-editor">
    <h2>Query Editor</h2>
    <textarea 
      bind:value={customQuery} 
      placeholder="Enter SQL query..."
      rows="4"
    />
    <button on:click={executeCustomQuery}>Execute Query</button>
  </section>
  
  <section class="import">
    <h2>Import Data</h2>
    <div class="import-controls">
      <input 
        type="file" 
        accept=".csv,.json" 
        on:change={(e) => importFile = e.target.files[0]}
      />
      <input 
        type="text" 
        bind:value={tableName} 
        placeholder="Table name"
      />
      <button on:click={handleImport} disabled={!importFile}>
        Import
      </button>
    </div>
  </section>
  
  <section class="results">
    <h2>Query Results</h2>
    
    {#if !queryStore}
      <p>Not connected to database</p>
    {:else if $queryStore.loading}
      <p>Loading...</p>
    {:else if $queryStore.error}
      <p class="error">Error: {$queryStore.error.message}</p>
    {:else if $queryStore.data && $queryStore.data.length > 0}
      <div class="export-buttons">
        <button on:click={exportAsCSV}>Export as CSV</button>
        <button on:click={exportAsJSON}>Export as JSON</button>
      </div>
      
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              {#each Object.keys($queryStore.data[0]) as column}
                <th>{column}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each $queryStore.data as row}
              <tr>
                {#each Object.values(row) as value}
                  <td>{value ?? 'NULL'}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      <p class="row-count">Rows: {$queryStore.data.length}</p>
    {:else}
      <p>No results</p>
    {/if}
  </section>
  
  <section class="examples">
    <h2>Example Queries</h2>
    <div class="example-buttons">
      <button on:click={() => sqlQuery = 'SELECT * FROM employees'}>
        All Employees
      </button>
      <button on:click={() => sqlQuery = 'SELECT name, salary FROM employees WHERE salary > 80000'}>
        High Earners
      </button>
      <button on:click={() => sqlQuery = 'SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department'}>
        Avg Salary by Dept
      </button>
      <button on:click={() => sqlQuery = 'SELECT name, hire_date FROM employees ORDER BY hire_date DESC LIMIT 3'}>
        Recent Hires
      </button>
    </div>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h1 {
    color: white;
    text-align: center;
    margin-bottom: 2rem;
    font-size: 2.5rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  }
  
  section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  h2 {
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #667eea;
    padding-bottom: 0.5rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.875rem;
  }
  
  .status-badge.idle {
    background: #e0e0e0;
    color: #666;
  }
  
  .status-badge.connecting {
    background: #fff3cd;
    color: #856404;
  }
  
  .status-badge.connected {
    background: #d4edda;
    color: #155724;
  }
  
  .status-badge.error {
    background: #f8d7da;
    color: #721c24;
  }
  
  .status-badge.disconnected {
    background: #cce5ff;
    color: #004085;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    resize: vertical;
  }
  
  textarea:focus {
    outline: none;
    border-color: #667eea;
  }
  
  button {
    background: #667eea;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.3s;
    margin: 0.5rem 0.5rem 0.5rem 0;
  }
  
  button:hover:not(:disabled) {
    background: #5a67d8;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .import-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  input[type="file"] {
    padding: 0.5rem;
  }
  
  input[type="text"] {
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
  }
  
  input[type="text"]:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .export-buttons {
    margin-bottom: 1rem;
  }
  
  .table-wrapper {
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
  }
  
  th {
    background: #f8f9fa;
    font-weight: bold;
    color: #333;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
  
  .row-count {
    color: #666;
    font-size: 0.875rem;
    margin-top: 1rem;
  }
  
  .error {
    color: #dc3545;
    padding: 0.75rem;
    background: #f8d7da;
    border-radius: 8px;
    margin: 0.5rem 0;
  }
  
  .example-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .example-buttons button {
    background: #764ba2;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
  
  .example-buttons button:hover {
    background: #5e3a85;
  }
</style>
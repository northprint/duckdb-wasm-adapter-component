<script>
  import { 
    createDuckDBRunes, 
    createQueryRune, 
    createMutationRune,
    createTableRune,
    downloadFile, 
    resultToCSV 
  } from '@northprint/duckdb-wasm-adapter-svelte';
  
  // Create DuckDB instance with Svelte 5 runes
  const db = createDuckDBRunes({ autoConnect: true });
  
  // Reactive state with $state rune
  let customQuery = $state('SELECT * FROM employees');
  let importFile = $state(null);
  let tableName = $state('imported_data');
  let activeTab = $state('query');
  
  // Sample data setup
  const setupMutation = createMutationRune(db);
  
  // Create reactive query with runes
  const queryRune = createQueryRune(
    db,
    () => customQuery,
    undefined,
    { immediate: false, autoRefetch: true }
  );
  
  // Create table rune for advanced table features
  const tableRune = createTableRune(queryRune);
  
  // Derived state using $derived rune
  const queryStats = $derived({
    rowCount: queryRune.rowCount,
    hasData: queryRune.hasData,
    isEmpty: queryRune.isEmpty,
    columnCount: queryRune.metadata?.length || 0
  });
  
  // Local reactive state
  let dbConnected = $state(false);
  let queryResults = $state([]);
  let queryMetadata = $state([]);
  let isLoading = $state(false);
  let paginatedRows = $state([]);
  
  
  const canExport = $derived(queryResults.length > 0 && !isLoading);
  
  // Setup initial data when connected
  async function setupInitialData() {
    if (db.isConnected && !queryRune.data) {
      const setupQuery = `
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY,
          name VARCHAR,
          department VARCHAR,
          salary DECIMAL(10,2),
          hire_date DATE
        );
        
        INSERT OR REPLACE INTO employees VALUES 
          (1, 'Alice Johnson', 'Engineering', 95000.00, '2020-03-15'),
          (2, 'Bob Smith', 'Sales', 75000.00, '2019-07-22'),
          (3, 'Carol White', 'Marketing', 82000.00, '2021-01-10'),
          (4, 'David Brown', 'Engineering', 105000.00, '2018-11-05'),
          (5, 'Eve Davis', 'HR', 68000.00, '2022-02-28'),
          (6, 'Frank Miller', 'Engineering', 110000.00, '2017-09-12'),
          (7, 'Grace Lee', 'Sales', 85000.00, '2020-11-30'),
          (8, 'Henry Wilson', 'Marketing', 78000.00, '2019-04-18');
          
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY,
          name VARCHAR,
          budget DECIMAL(12,2)
        );
        
        INSERT OR REPLACE INTO departments VALUES
          (1, 'Engineering', 500000.00),
          (2, 'Sales', 300000.00),
          (3, 'Marketing', 250000.00),
          (4, 'HR', 150000.00);
      `;
      
      try {
        await setupMutation.mutate(setupQuery);
        await queryRune.execute();
      } catch (error) {
        console.error('Setup failed:', error);
      }
    }
  }
  
  // Wait for connection then setup data
  setTimeout(() => {
    setupInitialData();
  }, 2000);
  
  // Sync state from queryRune to local reactive state
  function syncState() {
    dbConnected = db.isConnected;
    // Always create new arrays to trigger reactivity
    queryResults = [...(queryRune.data || [])];
    queryMetadata = [...(queryRune.metadata || [])];
    isLoading = queryRune.loading;
    // Ensure paginatedRows is also a new array
    paginatedRows = [...(tableRune.paginatedRows || [])];
  }
  // Watch for state changes
  $effect(() => {
    // Poll for changes every 100ms
    const interval = setInterval(syncState, 100);
    return () => clearInterval(interval);
  });
  
  // Also trigger on reactive state change
  $effect(() => {
    if (dbConnected && queryResults.length === 0) {
      setupInitialData();
    }
  });
  
  
  // Example queries
  const exampleQueries = [
    { label: 'All Employees', sql: 'SELECT * FROM employees' },
    { label: 'High Earners', sql: 'SELECT name, salary FROM employees WHERE salary > 80000 ORDER BY salary DESC' },
    { label: 'Department Stats', sql: 'SELECT department, COUNT(*) as count, AVG(salary) as avg_salary FROM employees GROUP BY department' },
    { label: 'Recent Hires', sql: 'SELECT name, hire_date FROM employees ORDER BY hire_date DESC LIMIT 3' },
    { label: 'Join Example', sql: 'SELECT e.name, e.department, d.budget FROM employees e JOIN departments d ON e.department = d.name' }
  ];
  
  // Handle file import
  async function handleImport() {
    if (!importFile || !db.connection) return;
    
    try {
      if (importFile.name.endsWith('.csv')) {
        await db.connection.importCSV(importFile, tableName);
      } else if (importFile.name.endsWith('.json')) {
        const text = await importFile.text();
        const data = JSON.parse(text);
        await db.connection.importJSON(data, tableName);
      }
      
      alert(`Successfully imported ${importFile.name} into table ${tableName}`);
      customQuery = `SELECT * FROM ${tableName}`;
      queryRune.execute();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  }
  
  // Export functions
  async function exportAsCSV() {
    if (!queryRune.data) return;
    const csv = resultToCSV(queryRune.data);
    downloadFile(csv, 'export.csv', 'text/csv');
  }
  
  async function exportAsJSON() {
    if (!queryRune.data) return;
    downloadFile(
      JSON.stringify(queryRune.data, null, 2), 
      'export.json', 
      'application/json'
    );
  }
  
  // Table interaction handlers
  function handleSort(column) {
    tableRune.sort(column);
  }
  
  function handleFilter(event) {
    tableRune.filter(event.target.value);
  }
  
  function handlePageSize(event) {
    tableRune.setPageSize(parseInt(event.target.value));
  }
</script>

<main>
  <h1>🦆 DuckDB WASM Svelte 5 Runes Example</h1>
  
  <!-- Connection Status -->
  <section class="status">
    <h2>Connection Status</h2>
    <div class="status-info">
      <span class="status-badge {dbConnected ? 'connected' : 'disconnected'}">{dbConnected ? 'connected' : 'disconnected'}</span>
      {#if db.error}
        <span class="error-message">{db.error.message}</span>
      {/if}
    </div>
    
    {#if !dbConnected}
      <button onclick={() => db.connect()}>Connect to Database</button>
    {:else}
      <button onclick={() => db.disconnect()}>Disconnect</button>
    {/if}
  </section>
  
  <!-- Tabs -->
  <div class="tabs">
    <button 
      class="tab {activeTab === 'query' ? 'active' : ''}"
      onclick={() => activeTab = 'query'}
    >
      Query Editor
    </button>
    <button 
      class="tab {activeTab === 'table' ? 'active' : ''}"
      onclick={() => activeTab = 'table'}
    >
      Advanced Table
    </button>
    <button 
      class="tab {activeTab === 'import' ? 'active' : ''}"
      onclick={() => activeTab = 'import'}
    >
      Import/Export
    </button>
  </div>
  
  <!-- Query Editor Tab -->
  {#if activeTab === 'query'}
    <section class="query-editor">
      <h2>Query Editor</h2>
      
      <textarea 
        bind:value={customQuery}
        placeholder="Enter SQL query..."
        rows="6"
      ></textarea>
      
      <div class="query-controls">
        <button onclick={async () => {
          try {
            // Execute query through queryRune
            await queryRune.execute();
            // Immediately sync state
            syncState();
          } catch (error) {
            console.error('Query execution failed:', error);
          }
        }}>
          Execute Query
        </button>
        
        {#if isLoading}
          <span class="loading">Executing...</span>
        {/if}
      </div>
      
      <!-- Example Queries -->
      <div class="examples">
        <h3>Example Queries:</h3>
        <div class="example-buttons">
          {#each exampleQueries as example}
            <button 
              class="example-btn"
              onclick={async () => {
                customQuery = example.sql;
                try {
                  // Execute query through queryRune
                  await queryRune.execute();
                  // Immediately sync state
                  syncState();
                } catch (error) {
                  console.error('Example query failed:', error);
                }
              }}
            >
              {example.label}
            </button>
          {/each}
        </div>
      </div>
      
      <!-- Query Stats -->
      {#if queryStats.hasData}
        <div class="stats">
          <span>Rows: {queryStats.rowCount}</span>
          <span>Columns: {queryStats.columnCount}</span>
        </div>
      {/if}
    </section>
  {/if}
  
  <!-- Advanced Table Tab -->
  {#if activeTab === 'table'}
    <section class="advanced-table">
      <h2>Advanced Table View</h2>
      
      {#if queryResults.length > 0}
        <div class="table-controls">
          <input 
            type="text"
            placeholder="Filter..."
            oninput={handleFilter}
            value={tableRune.filterText}
          />
          
          <select onchange={handlePageSize} value={tableRune.pageSize}>
            <option value="5">5 rows</option>
            <option value="10">10 rows</option>
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
          </select>
          
          <button onclick={() => tableRune.selectAll()}>
            {tableRune.selectedRows.size === tableRune.paginatedRows.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                {#if queryRune.metadata}
                  <th>
                    <input 
                      type="checkbox"
                      checked={tableRune.selectedRows.size === tableRune.paginatedRows.length}
                      onchange={() => tableRune.selectAll()}
                    />
                  </th>
                  {#each queryMetadata as column}
                    <th 
                      class="sortable"
                      onclick={() => handleSort(column.name)}
                    >
                      {column.name}
                      {#if tableRune.sortColumn === column.name}
                        <span class="sort-indicator">
                          {tableRune.sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      {/if}
                    </th>
                  {/each}
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each paginatedRows as row, index}
                <tr class:selected={tableRune.selectedRows.has(index)}>
                  <td>
                    <input 
                      type="checkbox"
                      checked={tableRune.selectedRows.has(index)}
                      onchange={() => tableRune.selectRow(index)}
                    />
                  </td>
                  {#each Object.values(row) as value}
                    <td>{value ?? 'NULL'}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="pagination">
          <button 
            onclick={() => tableRune.prevPage()}
            disabled={!tableRune.hasPrevPage}
          >
            Previous
          </button>
          
          <span>
            Page {tableRune.page} of {tableRune.totalPages}
          </span>
          
          <button 
            onclick={() => tableRune.nextPage()}
            disabled={!tableRune.hasNextPage}
          >
            Next
          </button>
        </div>
      {:else}
        <p>No data to display. Execute a query first.</p>
      {/if}
    </section>
  {/if}
  
  <!-- Import/Export Tab -->
  {#if activeTab === 'import'}
    <section class="import-export">
      <h2>Import Data</h2>
      <div class="import-controls">
        <input 
          type="file"
          accept=".csv,.json"
          onchange={(e) => importFile = e.target.files[0]}
        />
        <input 
          type="text"
          bind:value={tableName}
          placeholder="Table name"
        />
        <button onclick={handleImport} disabled={!importFile}>
          Import
        </button>
      </div>
      
      <h2>Export Data</h2>
      <div class="export-controls">
        <button onclick={exportAsCSV} disabled={!canExport}>
          Export as CSV
        </button>
        <button onclick={exportAsJSON} disabled={!canExport}>
          Export as JSON
        </button>
      </div>
    </section>
  {/if}
  
  <!-- Results Display -->
  {#if queryRune.error}
    <section class="error">
      <h3>Error</h3>
      <pre>{queryRune.error.message}</pre>
    </section>
  {/if}
  
  {#if queryResults.length > 0 && activeTab === 'query'}
    <section class="results">
      <h2>Query Results</h2>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              {#if queryMetadata}
                {#each queryMetadata as column}
                  <th>{column.name}</th>
                {/each}
              {/if}
            </tr>
          </thead>
          <tbody>
            {#each queryResults as row}
              <tr>
                {#each Object.values(row) as value}
                  <td>{value ?? 'NULL'}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  
  h3 {
    color: #555;
    margin-top: 1rem;
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    background: white;
    padding: 0.5rem;
    border-radius: 12px;
  }
  
  .tab {
    background: #f0f0f0;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .tab.active {
    background: #667eea;
    color: white;
  }
  
  .tab:hover:not(.active) {
    background: #e0e0e0;
  }
  
  .status-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.875rem;
  }
  
  .status-badge.connected {
    background: #d4edda;
    color: #155724;
  }
  
  .status-badge.disconnected {
    background: #f8d7da;
    color: #721c24;
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
  }
  
  button:hover:not(:disabled) {
    background: #5a67d8;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .query-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .loading {
    color: #667eea;
    font-style: italic;
  }
  
  .example-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  
  .example-btn {
    background: #764ba2;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
  
  .example-btn:hover {
    background: #5e3a85;
  }
  
  .stats {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #666;
  }
  
  .table-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: center;
  }
  
  .table-controls input[type="text"] {
    flex: 1;
    padding: 0.5rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
  }
  
  .table-controls select {
    padding: 0.5rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
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
  
  th.sortable {
    cursor: pointer;
    user-select: none;
  }
  
  th.sortable:hover {
    background: #e9ecef;
  }
  
  .sort-indicator {
    margin-left: 0.5rem;
    color: #667eea;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
  
  tr.selected {
    background: #e7f0ff;
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .import-controls, .export-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin: 1rem 0;
  }
  
  input[type="file"] {
    padding: 0.5rem;
  }
  
  input[type="text"] {
    padding: 0.5rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
  }
  
  .error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }
  
  .error pre {
    margin: 0;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    overflow-x: auto;
  }
</style>
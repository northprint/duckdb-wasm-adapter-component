<script>
  console.log('SimpleApp: Starting initialization...');
  
  import { 
    createDuckDBRunes, 
    createQueryRune, 
    createMutationRune,
    downloadFile, 
    resultToCSV 
  } from '@northprint/duckdb-wasm-adapter-svelte';
  
  console.log('SimpleApp: Imports successful');
  
  // Create DuckDB instance with Svelte 5 runes
  let db;
  try {
    db = createDuckDBRunes({ autoConnect: false });
    console.log('SimpleApp: DuckDB instance created:', db);
  } catch (error) {
    console.error('SimpleApp: Failed to create DuckDB instance:', error);
  }
  
  // Simple reactive state
  let status = $state('Not connected');
  let error = $state(null);
  let data = $state([]);
  
  // Connect function
  async function connect() {
    console.log('SimpleApp: Connecting...');
    status = 'Connecting...';
    try {
      await db.connect();
      status = 'Connected';
      console.log('SimpleApp: Connected successfully');
    } catch (err) {
      error = err.message;
      status = 'Error';
      console.error('SimpleApp: Connection failed:', err);
    }
  }
  
  // Run query function
  async function runQuery() {
    if (!db.connection) {
      error = 'Not connected';
      return;
    }
    
    console.log('SimpleApp: Running query...');
    status = 'Running query...';
    
    try {
      const result = await db.connection.execute('SELECT 1 as test, 2 as value');
      data = result.rows;
      status = 'Query completed';
      console.log('SimpleApp: Query result:', result);
    } catch (err) {
      error = err.message;
      status = 'Query error';
      console.error('SimpleApp: Query failed:', err);
    }
  }
  
  console.log('SimpleApp: Setup complete');
</script>

<main>
  <h1>Simple DuckDB Test</h1>
  
  <div class="status">
    <p>Status: {status}</p>
    {#if error}
      <p class="error">Error: {error}</p>
    {/if}
  </div>
  
  <div class="controls">
    <button onclick={connect} disabled={db?.isConnected}>
      Connect
    </button>
    <button onclick={runQuery} disabled={!db?.isConnected}>
      Run Test Query
    </button>
  </div>
  
  {#if data.length > 0}
    <div class="results">
      <h2>Results:</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  {/if}
</main>

<style>
  main {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    color: #ff3e00;
  }
  
  .status {
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    margin: 1rem 0;
  }
  
  .error {
    color: red;
  }
  
  .controls {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: #ff3e00;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  button:hover:not(:disabled) {
    background: #ff5733;
  }
  
  .results {
    margin-top: 2rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 4px;
  }
  
  pre {
    margin: 0;
    overflow-x: auto;
  }
</style>
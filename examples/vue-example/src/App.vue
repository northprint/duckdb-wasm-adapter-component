<template>
  <div class="container">
    <h1>🦆 DuckDB WASM Vue Example</h1>
    
    <section class="status-section">
      <h2>Connection Status</h2>
      <p>Status: <span :class="['status-badge', status]">{{ status }}</span></p>
      <p v-if="error" class="error">Error: {{ error.message }}</p>
      <div class="button-group">
        <button v-if="!isConnected" @click="connect">Connect</button>
        <template v-else>
          <button @click="disconnect">Disconnect</button>
          <button @click="setupSampleData">Setup Sample Data</button>
        </template>
      </div>
    </section>
    
    <section class="query-editor">
      <h2>Query Editor</h2>
      <textarea
        v-model="customQuery"
        :placeholder="currentQuery"
        rows="4"
      ></textarea>
      <button @click="executeCustomQuery">Execute Query</button>
    </section>
    
    <section class="import-section">
      <h2>Import Data</h2>
      <div class="import-controls">
        <input
          type="file"
          accept=".csv,.json"
          @change="handleFileSelect"
        />
        <input
          type="text"
          v-model="tableName"
          placeholder="Table name"
        />
        <button 
          @click="handleImport" 
          :disabled="!importFile || csvLoading || jsonLoading"
        >
          {{ csvLoading || jsonLoading ? 'Importing...' : 'Import' }}
        </button>
      </div>
    </section>
    
    <section class="results-section">
      <h2>Query Results</h2>
      
      <p v-if="loading">Loading...</p>
      <p v-else-if="queryError" class="error">Error: {{ queryError.message }}</p>
      <template v-else-if="data && data.length > 0">
        <div class="export-buttons">
          <button @click="handleExportCSV">Export as CSV</button>
          <button @click="handleExportJSON">Export as JSON</button>
          <button @click="execute">Refresh</button>
        </div>
        
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th v-for="column in columns" :key="column">{{ column }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in data" :key="i">
                <td v-for="column in columns" :key="column">
                  {{ row[column] ?? 'NULL' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p class="row-count">Rows: {{ data.length }}</p>
      </template>
      <p v-else-if="data && data.length === 0">No results</p>
    </section>
    
    <section class="examples-section">
      <h2>Example Queries</h2>
      <div class="example-buttons">
        <button 
          v-for="(example, i) in exampleQueries" 
          :key="i"
          @click="() => { currentQuery = example.query; if (isConnected) execute(); }"
        >
          {{ example.label }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import {
  useDuckDB,
  useQuery,
  useMutation,
  useImportCSV,
  useImportJSON,
  useExportCSV,
  useExportJSON,
  downloadFile,
  resultToCSV
} from '@duckdb-wasm-adapter/vue';

// Initialize DuckDB without autoConnect to control timing
const db = useDuckDB();
const { connection, status, error, isConnected, connect, disconnect } = db;

// State
const currentQuery = ref('SELECT * FROM employees');
const customQuery = ref('');
const importFile = ref(null);
const tableName = ref('imported_data');

// Setup mutation
const setupMutation = useMutation();

// Query with immediate flag
const { data, loading, error: queryError, metadata, execute } = useQuery(
  currentQuery,
  undefined,
  { immediate: false }  // Don't execute immediately, wait for connection
);

// Removed automatic execution on query change to prevent unnecessary calls

// Computed columns
const columns = computed(() => {
  const currentData = data.value;
  if (currentData && currentData.length > 0) {
    // Avoid reactive proxy issues with DuckDB results
    return Object.keys(currentData[0]);
  }
  return [];
});

// Import hooks
const { importCSV, loading: csvLoading } = useImportCSV();
const { importJSON, loading: jsonLoading } = useImportJSON();
const exportCSV = useExportCSV();
const exportJSON = useExportJSON();

// Track if setup is done
const setupDone = ref(false);

// Auto connect and setup on mount
onMounted(async () => {
  await connect();
});

// Watch for connection and setup data
watch(isConnected, async (connected) => {
  if (connected && !setupDone.value) {
    setupDone.value = true;
    
    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const setupQuery = `
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER,
        name VARCHAR,
        department VARCHAR,
        salary DECIMAL(10,2),
        hire_date DATE
      );
      
      DELETE FROM employees;
      
      INSERT INTO employees VALUES 
        (1, 'Alice Johnson', 'Engineering', 95000.00, '2020-03-15'),
        (2, 'Bob Smith', 'Sales', 75000.00, '2019-07-22'),
        (3, 'Carol White', 'Marketing', 82000.00, '2021-01-10'),
        (4, 'David Brown', 'Engineering', 105000.00, '2018-11-05'),
        (5, 'Eve Davis', 'HR', 68000.00, '2022-02-28');
    `;
    
    try {
      if (connection.value) {
        await connection.value.execute(setupQuery);
        // Execute query after setup
        execute();
      }
    } catch (err) {
      setupDone.value = false;
    }
  }
});

// Setup sample data function
const setupSampleData = async () => {
  if (!connection.value) return;
  
  const setupQuery = `
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER,
      name VARCHAR,
      department VARCHAR,
      salary DECIMAL(10,2),
      hire_date DATE
    );
    
    DELETE FROM employees;
    
    INSERT INTO employees VALUES 
      (1, 'Alice Johnson', 'Engineering', 95000.00, '2020-03-15'),
      (2, 'Bob Smith', 'Sales', 75000.00, '2019-07-22'),
      (3, 'Carol White', 'Marketing', 82000.00, '2021-01-10'),
      (4, 'David Brown', 'Engineering', 105000.00, '2018-11-05'),
      (5, 'Eve Davis', 'HR', 68000.00, '2022-02-28');
  `;
  
  try {
    // Use connection directly instead of mutation
    await connection.value.execute(setupQuery);
    execute();
  } catch (err) {
    // Error handling
  }
};

// Execute custom query
const executeCustomQuery = () => {
  if (customQuery.value) {
    currentQuery.value = customQuery.value;
    // Directly execute the query
    if (isConnected.value) {
      execute();
    }
  }
};

// Handle file select
const handleFileSelect = (event) => {
  importFile.value = event.target.files[0];
};

// Handle import
const handleImport = async () => {
  if (!importFile.value) return;
  
  try {
    if (importFile.value.name.endsWith('.csv')) {
      await importCSV(importFile.value, tableName.value);
    } else if (importFile.value.name.endsWith('.json')) {
      const text = await importFile.value.text();
      const jsonData = JSON.parse(text);
      await importJSON(jsonData, tableName.value);
    }
    
    alert(`Successfully imported ${importFile.value.name} into table ${tableName.value}`);
    currentQuery.value = `SELECT * FROM ${tableName.value}`;
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
};

// Export as CSV
const handleExportCSV = () => {
  if (!data.value) return;
  
  const csv = resultToCSV(data.value);
  downloadFile(csv, 'export.csv', 'text/csv');
};

// Export as JSON
const handleExportJSON = async () => {
  try {
    const json = await exportJSON(currentQuery.value);
    downloadFile(JSON.stringify(json, null, 2), 'export.json', 'application/json');
  } catch (err) {
    alert(`Export failed: ${err.message}`);
  }
};

// Example queries
const exampleQueries = [
  { label: 'All Employees', query: 'SELECT * FROM employees' },
  { label: 'High Earners', query: 'SELECT name, salary FROM employees WHERE salary > 80000' },
  { label: 'Avg Salary by Dept', query: 'SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department' },
  { label: 'Recent Hires', query: 'SELECT name, hire_date FROM employees ORDER BY hire_date DESC LIMIT 3' },
];
</script>
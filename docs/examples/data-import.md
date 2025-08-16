# Data Import Examples

Practical examples for importing data from various sources into DuckDB.

## CSV Import Examples

### Basic CSV Import from File

```javascript
// React Component
import React, { useState } from 'react';
import { useImportCSV, useQuery } from '@duckdb-wasm-adapter/react';

function CSVImporter() {
  const { importCSV, loading, error } = useImportCSV();
  const [tableName, setTableName] = useState('');
  const { data: preview, refetch } = useQuery(
    tableName ? `SELECT * FROM ${tableName} LIMIT 5` : null,
    { enabled: false }
  );

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const name = file.name.replace(/\.csv$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
    setTableName(name);

    await importCSV(file, name, {
      header: true,
      delimiter: ',',
      dateFormat: '%Y-%m-%d',
      timestampFormat: '%Y-%m-%d %H:%M:%S'
    });

    refetch();
  };

  return (
    <div>
      <h3>CSV Import</h3>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload}
        disabled={loading}
      />
      
      {loading && <p>Importing CSV...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
      
      {preview && (
        <div>
          <h4>Preview of {tableName}:</h4>
          <pre>{JSON.stringify(preview, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### CSV with Custom Parsing

```javascript
// Handle different CSV formats
async function importCustomCSV(file, connection) {
  const text = await file.text();
  
  // Detect delimiter
  const firstLine = text.split('\n')[0];
  const delimiter = detectDelimiter(firstLine);
  
  // Detect if has header
  const hasHeader = detectHeader(text);
  
  // Import with detected settings
  await connection.execute(`
    CREATE TABLE custom_data AS 
    SELECT * FROM read_csv_auto(
      '${text}',
      delim='${delimiter}',
      header=${hasHeader},
      dateformat='%Y-%m-%d',
      timestampformat='%Y-%m-%d %H:%M:%S',
      null_padding=true,
      ignore_errors=true
    )
  `);
}

function detectDelimiter(line) {
  const delimiters = [',', ';', '\t', '|'];
  let maxCount = 0;
  let bestDelimiter = ',';
  
  for (const delim of delimiters) {
    const count = (line.match(new RegExp(delim, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }
  
  return bestDelimiter;
}

function detectHeader(text) {
  const lines = text.split('\n').slice(0, 2);
  if (lines.length < 2) return true;
  
  const firstLine = lines[0].split(',');
  const secondLine = lines[1].split(',');
  
  // Check if first line contains non-numeric values
  // and second line contains numeric values
  return firstLine.some(val => isNaN(val)) && 
         secondLine.some(val => !isNaN(val));
}
```

### Streaming CSV Import

```javascript
// Import large CSV files in chunks
import { useState } from 'react';

function StreamingCSVImport() {
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);

  const importLargeCSV = async (file) => {
    setImporting(true);
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const tableName = file.name.replace(/\.csv$/, '');
    
    const reader = file.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let isFirstChunk = true;
    let headers = [];
    let rowCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split('\n');
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';
        
        if (isFirstChunk) {
          headers = lines[0].split(',');
          await connection.execute(`
            CREATE TABLE ${tableName} (
              ${headers.map(h => `${h} VARCHAR`).join(', ')}
            )
          `);
          lines.shift(); // Remove header row
          isFirstChunk = false;
        }
        
        // Insert batch of rows
        if (lines.length > 0) {
          const values = lines.map(line => 
            `(${line.split(',').map(v => `'${v}'`).join(', ')})`
          ).join(', ');
          
          await connection.execute(`
            INSERT INTO ${tableName} VALUES ${values}
          `);
          
          rowCount += lines.length;
          setProgress((rowCount / file.size) * 100);
        }
      }
      
      // Process remaining buffer
      if (buffer) {
        await connection.execute(`
          INSERT INTO ${tableName} VALUES 
          (${buffer.split(',').map(v => `'${v}'`).join(', ')})
        `);
      }
      
      console.log(`Imported ${rowCount} rows into ${tableName}`);
    } finally {
      reader.releaseLock();
      setImporting(false);
      setProgress(100);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".csv"
        onChange={(e) => importLargeCSV(e.target.files[0])}
        disabled={importing}
      />
      
      {importing && (
        <div>
          <progress value={progress} max="100" />
          <span>{progress.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
```

## JSON Import Examples

### Import JSON Array

```javascript
// Vue Component
<template>
  <div>
    <h3>JSON Import</h3>
    <textarea 
      v-model="jsonInput" 
      placeholder="Paste JSON array here..."
      rows="10"
      cols="50"
    />
    <button @click="importJSON" :disabled="loading">
      Import JSON
    </button>
    
    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="success" class="success">
      Imported {{ rowCount }} rows successfully!
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useConnection } from '@duckdb-wasm-adapter/vue';

const jsonInput = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);
const rowCount = ref(0);
const { connection } = useConnection();

const importJSON = async () => {
  loading.value = true;
  error.value = '';
  success.value = false;
  
  try {
    const data = JSON.parse(jsonInput.value);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('JSON must be a non-empty array');
    }
    
    // Infer schema from first object
    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const columnDefs = columns.map(col => {
      const value = firstRow[col];
      let type = 'VARCHAR';
      
      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE';
      } else if (typeof value === 'boolean') {
        type = 'BOOLEAN';
      } else if (value instanceof Date) {
        type = 'TIMESTAMP';
      }
      
      return `${col} ${type}`;
    });
    
    // Create table
    await connection.execute(`
      CREATE TABLE json_import (${columnDefs.join(', ')})
    `);
    
    // Insert data
    for (const row of data) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        return val;
      });
      
      await connection.execute(`
        INSERT INTO json_import VALUES (${values.join(', ')})
      `);
    }
    
    rowCount.value = data.length;
    success.value = true;
    jsonInput.value = '';
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};
</script>
```

### Import Nested JSON

```javascript
// Handle complex nested JSON structures
async function importNestedJSON(jsonData, tableName) {
  // Flatten nested objects
  const flattened = jsonData.map(item => flattenObject(item));
  
  // Get all unique columns
  const allColumns = new Set();
  flattened.forEach(row => {
    Object.keys(row).forEach(key => allColumns.add(key));
  });
  
  // Create table with all columns
  const columns = Array.from(allColumns);
  const columnDefs = columns.map(col => `"${col}" VARCHAR`).join(', ');
  
  await connection.execute(`
    CREATE TABLE ${tableName} (${columnDefs})
  `);
  
  // Insert flattened data
  for (const row of flattened) {
    const values = columns.map(col => {
      const val = row[col];
      if (val === undefined || val === null) return 'NULL';
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    
    await connection.execute(`
      INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')})
      VALUES (${values.join(', ')})
    `);
  }
}

function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      flattened[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else if (Array.isArray(value)) {
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = value;
    }
  }
  
  return flattened;
}
```

### JSON Lines Import

```javascript
// Import JSONL (newline-delimited JSON)
async function importJSONLines(file) {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  const tableName = file.name.replace(/\.jsonl?$/, '');
  
  const data = lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      console.warn('Skipping invalid JSON line:', line);
      return null;
    }
  }).filter(Boolean);
  
  if (data.length === 0) {
    throw new Error('No valid JSON lines found');
  }
  
  // Use first valid object for schema
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  
  // Create and populate table
  await createTableFromJSON(tableName, columns, data);
}
```

## Parquet Import Examples

### Direct Parquet Import

```javascript
// Svelte Component
<script>
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  let files = [];
  let tables = [];
  
  async function importParquet(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Register the file with DuckDB
    const fileName = file.name;
    await db.connection.registerFileBuffer(fileName, uint8Array);
    
    // Create table from Parquet file
    const tableName = fileName.replace(/\.parquet$/, '');
    await db.connection.execute(`
      CREATE TABLE ${tableName} AS 
      SELECT * FROM read_parquet('${fileName}')
    `);
    
    // Get table info
    const info = await db.connection.execute(`
      SELECT COUNT(*) as row_count FROM ${tableName}
    `);
    
    tables = [...tables, {
      name: tableName,
      rowCount: info[0].row_count,
      file: fileName
    }];
  }
  
  function handleFiles(event) {
    files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.name.endsWith('.parquet')) {
        importParquet(file);
      }
    });
  }
</script>

<div>
  <h3>Parquet Import</h3>
  <input 
    type="file" 
    accept=".parquet" 
    multiple
    on:change={handleFiles}
  />
  
  {#if tables.length > 0}
    <h4>Imported Tables:</h4>
    <ul>
      {#each tables as table}
        <li>
          {table.name} - {table.rowCount} rows
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

### Parquet from URL

```javascript
// Import Parquet files from remote URLs
async function importParquetFromURL(url, tableName) {
  try {
    // For remote files, DuckDB can read directly
    await connection.execute(`
      CREATE TABLE ${tableName} AS 
      SELECT * FROM read_parquet('${url}')
    `);
    
    // Get statistics
    const stats = await connection.execute(`
      SELECT 
        COUNT(*) as row_count,
        COUNT(DISTINCT *) as unique_rows
      FROM ${tableName}
    `);
    
    console.log(`Imported ${stats[0].row_count} rows from ${url}`);
    return stats[0];
  } catch (error) {
    console.error('Failed to import Parquet from URL:', error);
    
    // Fallback: download and import locally
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], tableName + '.parquet');
    return importParquet(file);
  }
}

// Example: Import from S3
await importParquetFromURL(
  'https://my-bucket.s3.amazonaws.com/data.parquet',
  'my_data'
);
```

## Excel Import Examples

### Excel to JSON to DuckDB

```javascript
// Using SheetJS to read Excel files
import * as XLSX from 'xlsx';

function ExcelImporter() {
  const [sheets, setSheets] = useState([]);
  const [importing, setImporting] = useState(false);

  const handleExcelFile = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    
    setSheets(workbook.SheetNames);
    
    // Import each sheet as a separate table
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length > 0) {
        await importJSONToTable(
          jsonData, 
          sheetName.replace(/[^a-zA-Z0-9_]/g, '_')
        );
      }
    }
  };

  const importJSONToTable = async (data, tableName) => {
    setImporting(true);
    
    try {
      // Get columns and types from first row
      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      
      // Create table
      const columnDefs = columns.map(col => {
        const value = firstRow[col];
        let type = 'VARCHAR';
        
        // Try to infer type
        if (!isNaN(value)) {
          type = Number.isInteger(Number(value)) ? 'INTEGER' : 'DOUBLE';
        } else if (value instanceof Date) {
          type = 'DATE';
        }
        
        return `"${col}" ${type}`;
      });
      
      await connection.execute(`
        CREATE TABLE ${tableName} (${columnDefs.join(', ')})
      `);
      
      // Insert data in batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        
        const values = batch.map(row => {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          });
          return `(${vals.join(', ')})`;
        }).join(', ');
        
        await connection.execute(`
          INSERT INTO ${tableName} VALUES ${values}
        `);
      }
      
      console.log(`Imported ${data.length} rows into ${tableName}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h3>Excel Import</h3>
      <input 
        type="file" 
        accept=".xlsx,.xls"
        onChange={(e) => handleExcelFile(e.target.files[0])}
        disabled={importing}
      />
      
      {sheets.length > 0 && (
        <div>
          <h4>Imported Sheets:</h4>
          <ul>
            {sheets.map(sheet => (
              <li key={sheet}>{sheet}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Database Import Examples

### Import from Another Database

```javascript
// Import data from external database via API
async function importFromPostgreSQL(config) {
  const { host, database, table, query } = config;
  
  // Fetch data from PostgreSQL via API
  const response = await fetch('/api/postgresql/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host,
      database,
      query: query || `SELECT * FROM ${table}`
    })
  });
  
  const data = await response.json();
  
  // Import into DuckDB
  if (data.rows && data.rows.length > 0) {
    const columns = data.fields.map(f => `"${f.name}" ${mapPostgreSQLType(f.type)}`);
    
    await connection.execute(`
      CREATE TABLE ${table} (${columns.join(', ')})
    `);
    
    // Insert data
    for (const row of data.rows) {
      const values = data.fields.map(f => {
        const val = row[f.name];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        return val;
      });
      
      await connection.execute(`
        INSERT INTO ${table} VALUES (${values.join(', ')})
      `);
    }
  }
}

function mapPostgreSQLType(pgType) {
  const typeMap = {
    'int4': 'INTEGER',
    'int8': 'BIGINT',
    'float4': 'REAL',
    'float8': 'DOUBLE',
    'varchar': 'VARCHAR',
    'text': 'VARCHAR',
    'bool': 'BOOLEAN',
    'date': 'DATE',
    'timestamp': 'TIMESTAMP',
    'json': 'VARCHAR',
    'jsonb': 'VARCHAR'
  };
  
  return typeMap[pgType] || 'VARCHAR';
}
```

## API Data Import

### REST API Import

```javascript
// Import data from REST API
async function importFromAPI(endpoint, tableName) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const fetchAllPages = async () => {
    setLoading(true);
    let allData = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`${endpoint}?page=${page}&limit=100`);
      const result = await response.json();
      
      allData = [...allData, ...result.data];
      hasMore = result.hasNextPage;
      page++;
      
      setProgress((page / result.totalPages) * 100);
    }
    
    return allData;
  };
  
  const importData = async () => {
    try {
      const data = await fetchAllPages();
      
      if (data.length === 0) {
        throw new Error('No data received from API');
      }
      
      // Create table from API data
      await createTableFromJSON(tableName, Object.keys(data[0]), data);
      
      console.log(`Imported ${data.length} records from API`);
    } finally {
      setLoading(false);
    }
  };
  
  return { importData, loading, progress };
}
```

### GraphQL Import

```javascript
// Import data from GraphQL endpoint
async function importFromGraphQL(endpoint, query, tableName) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  
  // Extract data from GraphQL response
  const data = extractDataFromGraphQL(result.data);
  
  // Import into DuckDB
  await importJSONData(data, tableName);
}

function extractDataFromGraphQL(graphqlData) {
  // Find the first array in the response
  for (const key in graphqlData) {
    if (Array.isArray(graphqlData[key])) {
      return graphqlData[key];
    }
  }
  return [];
}

// Example usage
const USERS_QUERY = `
  query GetUsers {
    users {
      id
      name
      email
      createdAt
    }
  }
`;

await importFromGraphQL(
  'https://api.example.com/graphql',
  USERS_QUERY,
  'users'
);
```

## Bulk Import UI

### Complete Import Component

```javascript
// React component for multiple import methods
function DataImportManager() {
  const [importMethod, setImportMethod] = useState('file');
  const [importStatus, setImportStatus] = useState({});
  
  return (
    <div className="import-manager">
      <h2>Data Import</h2>
      
      <div className="import-tabs">
        <button 
          onClick={() => setImportMethod('file')}
          className={importMethod === 'file' ? 'active' : ''}
        >
          File Upload
        </button>
        <button 
          onClick={() => setImportMethod('url')}
          className={importMethod === 'url' ? 'active' : ''}
        >
          From URL
        </button>
        <button 
          onClick={() => setImportMethod('api')}
          className={importMethod === 'api' ? 'active' : ''}
        >
          From API
        </button>
        <button 
          onClick={() => setImportMethod('paste')}
          className={importMethod === 'paste' ? 'active' : ''}
        >
          Paste Data
        </button>
      </div>
      
      <div className="import-content">
        {importMethod === 'file' && <FileImport onImport={setImportStatus} />}
        {importMethod === 'url' && <URLImport onImport={setImportStatus} />}
        {importMethod === 'api' && <APIImport onImport={setImportStatus} />}
        {importMethod === 'paste' && <PasteImport onImport={setImportStatus} />}
      </div>
      
      {importStatus.message && (
        <div className={`status ${importStatus.type}`}>
          {importStatus.message}
        </div>
      )}
    </div>
  );
}
```

## Best Practices

1. **Validate data** before importing
2. **Handle errors gracefully** with try-catch blocks
3. **Use transactions** for atomic imports
4. **Show progress** for large imports
5. **Infer schemas** from data when possible
6. **Clean column names** to be SQL-compliant
7. **Support multiple formats** for flexibility
8. **Provide preview** before final import

## Next Steps

- [Query Builder Examples](/examples/query-builder-examples) - Programmatic query construction
- [Export Examples](/guide/data-import-export#csv-export) - Export data in various formats
- [Caching Examples](/examples/caching-examples) - Optimize with caching
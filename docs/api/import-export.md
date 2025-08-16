# Import/Export API

The Import/Export API provides comprehensive data import and export capabilities for various file formats.

## Overview

The DuckDB WASM Adapter supports importing and exporting data in multiple formats:
- **CSV** - Comma-separated values
- **JSON** - JavaScript Object Notation
- **Parquet** - Columnar storage format
- **Arrow** - In-memory columnar format

## Import Operations

### CSV Import

#### importCSV()

Import CSV data into a DuckDB table.

```typescript
importCSV(
  source: File | string | URL,
  tableName: string,
  options?: ImportCSVOptions
): Promise<void>
```

#### ImportCSVOptions

```typescript
interface ImportCSVOptions {
  header?: boolean;              // First row contains headers (default: true)
  delimiter?: string;            // Column delimiter (default: ',')
  quote?: string;               // Quote character (default: '"')
  escape?: string;              // Escape character (default: '"')
  nullString?: string;          // String representing NULL (default: '')
  skipRows?: number;            // Number of rows to skip (default: 0)
  maxRows?: number;             // Maximum rows to import
  columns?: string[];           // Column names (if no header)
  columnTypes?: Record<string, string>; // Column type overrides
  dateFormat?: string;          // Date format string
  timestampFormat?: string;     // Timestamp format string
  encoding?: string;            // File encoding (default: 'utf-8')
  sample?: boolean;             // Auto-detect types from sample (default: true)
  sampleSize?: number;          // Sample size for type detection (default: 1000)
}
```

#### Basic CSV Import

```typescript
// Import from File object
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
await connection.importCSV(file, 'employees');

// Import from URL
await connection.importCSV(
  'https://example.com/data/employees.csv',
  'employees'
);

// Import from local path (Node.js)
await connection.importCSV('./data/employees.csv', 'employees');
```

#### Advanced CSV Import

```typescript
await connection.importCSV(file, 'employees', {
  header: true,
  delimiter: ',',
  quote: '"',
  nullString: 'NULL',
  skipRows: 1,                    // Skip first row after header
  maxRows: 10000,                 // Limit import size
  dateFormat: '%Y-%m-%d',         // YYYY-MM-DD format
  timestampFormat: '%Y-%m-%d %H:%M:%S',
  columnTypes: {
    'employee_id': 'INTEGER',
    'salary': 'DECIMAL(10,2)',
    'hire_date': 'DATE'
  }
});
```

#### Framework Integration

##### React

```jsx
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-react';

function CSVImporter() {
  const { importCSV, loading, error, progress } = useImportCSV({
    onSuccess: (result) => {
      console.log('Import completed:', result);
    },
    onProgress: (progress) => {
      console.log('Import progress:', progress);
    }
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await importCSV(file, 'imported_data', {
      header: true,
      delimiter: ',',
      nullString: 'NULL'
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
      />
      {loading && (
        <div>
          Importing... {progress && `${progress.percentage}%`}
        </div>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

##### Vue

```vue
<template>
  <div>
    <input
      type="file"
      accept=".csv"
      @change="handleFileChange"
      :disabled="loading"
    />
    <div v-if="loading">
      Importing... {{ progress?.percentage }}%
    </div>
    <div v-if="error">Error: {{ error.message }}</div>
  </div>
</template>

<script setup>
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-vue';

const { importCSV, loading, error, progress } = useImportCSV({
  onSuccess: (result) => {
    console.log('Import completed:', result);
  }
});

const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  await importCSV(file, 'imported_data');
};
</script>
```

##### Svelte

```svelte
<script>
  import { importCSV } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const csvImporter = importCSV({
    onSuccess: (result) => {
      console.log('Import completed:', result);
    }
  });
  
  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    await csvImporter.execute(file, 'imported_data');
  }
</script>

<input
  type="file"
  accept=".csv"
  on:change={handleFileChange}
  disabled={$csvImporter.loading}
/>

{#if $csvImporter.loading}
  <div>Importing...</div>
{/if}

{#if $csvImporter.error}
  <div>Error: {$csvImporter.error.message}</div>
{/if}
```

### JSON Import

#### importJSON()

Import JSON data into a DuckDB table.

```typescript
importJSON(
  data: unknown[] | Record<string, unknown>[],
  tableName: string,
  options?: ImportJSONOptions
): Promise<void>
```

#### ImportJSONOptions

```typescript
interface ImportJSONOptions {
  schema?: Record<string, string>;  // Column type definitions
  replaceTable?: boolean;           // Replace existing table (default: false)
  batchSize?: number;              // Batch size for large datasets (default: 1000)
}
```

#### Basic JSON Import

```typescript
// Array of objects
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 },
  { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 },
  { id: 3, name: 'Carol', email: 'carol@example.com', age: 28 }
];

await connection.importJSON(users, 'users');
```

#### Advanced JSON Import

```typescript
const employees = [
  {
    id: 1,
    name: 'Alice Johnson',
    department: 'Engineering',
    salary: 95000.00,
    hire_date: '2020-03-15',
    metadata: { skills: ['JavaScript', 'Python'], remote: true }
  },
  // ... more employees
];

await connection.importJSON(employees, 'employees', {
  schema: {
    id: 'INTEGER',
    name: 'VARCHAR',
    department: 'VARCHAR',
    salary: 'DECIMAL(10,2)',
    hire_date: 'DATE',
    metadata: 'JSON'
  },
  replaceTable: true,
  batchSize: 500
});
```

### Parquet Import

#### importParquet()

Import Parquet files into DuckDB.

```typescript
importParquet(
  source: File | ArrayBuffer | URL,
  tableName: string,
  options?: ImportParquetOptions
): Promise<void>
```

#### ImportParquetOptions

```typescript
interface ImportParquetOptions {
  schema?: Record<string, string>;  // Column type overrides
  columns?: string[];               // Specific columns to import
  filter?: string;                  // WHERE clause for filtering
}
```

#### Basic Parquet Import

```typescript
// From File object
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
await connection.importParquet(file, 'large_dataset');

// From URL
await connection.importParquet(
  'https://example.com/data/dataset.parquet',
  'remote_data'
);

// From ArrayBuffer
const response = await fetch('/data/dataset.parquet');
const buffer = await response.arrayBuffer();
await connection.importParquet(buffer, 'fetched_data');
```

#### Advanced Parquet Import

```typescript
await connection.importParquet(file, 'sales_data', {
  columns: ['date', 'product_id', 'quantity', 'revenue'],
  filter: 'revenue > 1000',
  schema: {
    date: 'DATE',
    product_id: 'INTEGER',
    quantity: 'INTEGER',
    revenue: 'DECIMAL(10,2)'
  }
});
```

## Export Operations

### CSV Export

#### exportCSV()

Export query results as CSV.

```typescript
exportCSV(
  query: string,
  options?: ExportCSVOptions
): Promise<string>
```

#### ExportCSVOptions

```typescript
interface ExportCSVOptions {
  header?: boolean;              // Include headers (default: true)
  delimiter?: string;            // Column delimiter (default: ',')
  quote?: string;               // Quote character (default: '"')
  escape?: string;              // Escape character (default: '"')
  nullString?: string;          // String for NULL values (default: '')
  dateFormat?: string;          // Date format string
  timestampFormat?: string;     // Timestamp format string
  forceQuote?: boolean;         // Quote all values (default: false)
}
```

#### Basic CSV Export

```typescript
// Simple export
const csv = await connection.exportCSV('SELECT * FROM users');

// Export with custom delimiter
const tsv = await connection.exportCSV('SELECT * FROM users', {
  delimiter: '\t',
  header: true
});

// Download as file
function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const csv = await connection.exportCSV('SELECT * FROM users');
downloadCSV(csv, 'users.csv');
```

#### Framework Integration

##### React

```jsx
import { useExportCSV } from '@northprint/duckdb-wasm-adapter-react';

function DataExporter() {
  const { exportCSV, loading, error } = useExportCSV();

  const handleExport = async () => {
    try {
      const csv = await exportCSV('SELECT * FROM users', {
        header: true,
        delimiter: ','
      });
      
      downloadCSV(csv, 'users.csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <button onClick={handleExport} disabled={loading}>
      {loading ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
```

### JSON Export

#### exportJSON()

Export query results as JSON.

```typescript
exportJSON<T = Record<string, unknown>>(
  query: string,
  options?: ExportJSONOptions
): Promise<T[]>
```

#### ExportJSONOptions

```typescript
interface ExportJSONOptions {
  format?: 'array' | 'records' | 'values';  // Output format (default: 'records')
  dateFormat?: 'iso' | 'timestamp' | 'string'; // Date serialization (default: 'iso')
  indent?: number;                          // JSON indentation (default: 0)
}
```

#### Basic JSON Export

```typescript
// Export as array of objects (default)
const users = await connection.exportJSON('SELECT * FROM users');
console.log(users);
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]

// Export with formatting
const formattedUsers = await connection.exportJSON('SELECT * FROM users', {
  indent: 2,
  dateFormat: 'iso'
});

// Save as JSON file
function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const users = await connection.exportJSON('SELECT * FROM users');
downloadJSON(users, 'users.json');
```

### Parquet Export

#### exportParquet()

Export query results as Parquet.

```typescript
exportParquet(
  query: string,
  options?: ExportParquetOptions
): Promise<ArrayBuffer>
```

#### ExportParquetOptions

```typescript
interface ExportParquetOptions {
  compression?: 'snappy' | 'gzip' | 'lz4' | 'none'; // Compression (default: 'snappy')
  rowGroupSize?: number;                            // Row group size (default: 100000)
}
```

#### Basic Parquet Export

```typescript
// Export as Parquet
const parquetBuffer = await connection.exportParquet('SELECT * FROM large_table');

// Download as file
function downloadParquet(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

downloadParquet(parquetBuffer, 'data.parquet');
```

## Batch Operations

### Batch Import

Import multiple files or datasets in batch.

```typescript
class BatchImporter {
  constructor(private connection: Connection) {}

  async importFiles(files: File[], tableName: string) {
    const results = [];
    
    for (const file of files) {
      try {
        if (file.name.endsWith('.csv')) {
          await this.connection.importCSV(file, `${tableName}_${Date.now()}`);
        } else if (file.name.endsWith('.json')) {
          const text = await file.text();
          const data = JSON.parse(text);
          await this.connection.importJSON(data, `${tableName}_${Date.now()}`);
        }
        
        results.push({ file: file.name, status: 'success' });
      } catch (error) {
        results.push({ file: file.name, status: 'error', error: error.message });
      }
    }
    
    return results;
  }

  async consolidateTables(tablePattern: string, finalTableName: string) {
    // Get all tables matching pattern
    const tables = await this.connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '${tablePattern}%'
    `);

    if (tables.rowCount === 0) return;

    // Create union query
    const unionQuery = tables.toArray()
      .map(row => `SELECT * FROM ${row.table_name}`)
      .join(' UNION ALL ');

    // Create final consolidated table
    await this.connection.execute(`
      CREATE TABLE ${finalTableName} AS ${unionQuery}
    `);

    // Drop temporary tables
    for (const row of tables.toArray()) {
      await this.connection.execute(`DROP TABLE ${row.table_name}`);
    }
  }
}

// Usage
const batchImporter = new BatchImporter(connection);
const results = await batchImporter.importFiles(fileList, 'temp_import');
await batchImporter.consolidateTables('temp_import', 'final_data');
```

### Streaming Import

Handle large files with streaming import.

```typescript
class StreamingImporter {
  constructor(private connection: Connection) {}

  async importLargeCSV(file: File, tableName: string, chunkSize: number = 10000) {
    const reader = file.stream().getReader();
    let buffer = '';
    let lineCount = 0;
    let isFirstChunk = true;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            await this.processChunk(buffer, tableName, isFirstChunk);
          }
          break;
        }

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        if (lines.length >= chunkSize) {
          const chunk = lines.slice(0, chunkSize).join('\n');
          await this.processChunk(chunk, tableName, isFirstChunk);
          isFirstChunk = false;
          lineCount += chunkSize;
          
          console.log(`Processed ${lineCount} lines...`);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async processChunk(chunk: string, tableName: string, isFirst: boolean) {
    const tempTableName = `temp_${tableName}_${Date.now()}`;
    
    // Create temporary table from chunk
    const blob = new Blob([chunk], { type: 'text/csv' });
    const file = new File([blob], 'chunk.csv');
    
    await this.connection.importCSV(file, tempTableName, {
      header: isFirst
    });

    if (isFirst) {
      // Rename temp table to main table
      await this.connection.execute(`
        ALTER TABLE ${tempTableName} RENAME TO ${tableName}
      `);
    } else {
      // Insert into main table
      await this.connection.execute(`
        INSERT INTO ${tableName} SELECT * FROM ${tempTableName}
      `);
      
      // Drop temp table
      await this.connection.execute(`DROP TABLE ${tempTableName}`);
    }
  }
}
```

## Data Transformation

### Transform During Import

Apply transformations during data import.

```typescript
async function importWithTransformations(
  connection: Connection,
  file: File,
  tableName: string
) {
  // Import to temporary table
  const tempTable = `temp_${tableName}`;
  await connection.importCSV(file, tempTable);

  // Create final table with transformations
  await connection.execute(`
    CREATE TABLE ${tableName} AS
    SELECT 
      id,
      UPPER(name) as name,
      LOWER(email) as email,
      CASE 
        WHEN age < 18 THEN 'Minor'
        WHEN age >= 65 THEN 'Senior'
        ELSE 'Adult'
      END as age_category,
      CAST(salary AS DECIMAL(10,2)) as salary,
      DATE(hire_date) as hire_date
    FROM ${tempTable}
    WHERE email IS NOT NULL
      AND email LIKE '%@%'
  `);

  // Clean up
  await connection.execute(`DROP TABLE ${tempTable}`);
}
```

## Error Handling

### Import Error Recovery

```typescript
async function safeImport(
  connection: Connection,
  file: File,
  tableName: string
) {
  try {
    // Try normal import first
    await connection.importCSV(file, tableName);
  } catch (error) {
    console.warn('Normal import failed, trying with error recovery:', error);
    
    try {
      // Try with more permissive settings
      await connection.importCSV(file, tableName, {
        header: true,
        nullString: '',
        skipRows: 0,
        sample: true,
        sampleSize: 1000
      });
    } catch (secondError) {
      console.error('Import failed completely:', secondError);
      throw new Error(`Failed to import file: ${secondError.message}`);
    }
  }
}
```

### Validation

```typescript
async function validateImport(
  connection: Connection,
  tableName: string,
  expectedColumns: string[]
) {
  // Check if table exists
  const tableExists = await connection.execute(`
    SELECT COUNT(*) as count 
    FROM information_schema.tables 
    WHERE table_name = '${tableName}'
  `);

  if (tableExists.toArray()[0].count === 0) {
    throw new Error(`Table ${tableName} was not created`);
  }

  // Check columns
  const columns = await connection.execute(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = '${tableName}'
    ORDER BY ordinal_position
  `);

  const actualColumns = columns.toArray().map(row => row.column_name);
  const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Missing columns: ${missingColumns.join(', ')}`);
  }

  // Check row count
  const rowCount = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
  const count = rowCount.toArray()[0].count;

  console.log(`Import validation passed: ${count} rows in ${actualColumns.length} columns`);
  return { rowCount: count, columns: actualColumns };
}
```

## Best Practices

### 1. Performance Optimization

```typescript
// ✅ Good: Batch operations for large datasets
const batchSize = 1000;
for (let i = 0; i < largeDataset.length; i += batchSize) {
  const batch = largeDataset.slice(i, i + batchSize);
  await connection.importJSON(batch, 'large_table');
}

// ❌ Bad: Row-by-row operations
for (const row of largeDataset) {
  await connection.importJSON([row], 'large_table');
}
```

### 2. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
try {
  await connection.importCSV(file, 'users');
} catch (error) {
  if (error.message.includes('duplicate')) {
    console.log('Data already exists, skipping import');
  } else {
    console.error('Import failed:', error);
    throw error;
  }
}
```

### 3. Type Safety

```typescript
// ✅ Good: Define interfaces for imported data
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

const users = await connection.exportJSON<User>('SELECT * FROM users');
```

### 4. Resource Management

```typescript
// ✅ Good: Clean up temporary resources
const tempTableName = `temp_${Date.now()}`;
try {
  await connection.importCSV(file, tempTableName);
  // Process data...
} finally {
  // Always clean up
  await connection.execute(`DROP TABLE IF EXISTS ${tempTableName}`);
}
```
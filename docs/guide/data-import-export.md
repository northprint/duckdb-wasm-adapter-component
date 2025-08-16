# Data Import/Export

Complete guide for importing and exporting data with DuckDB WASM Adapter.

## Overview

DuckDB WASM Adapter supports importing and exporting data in various formats including CSV, JSON, and Parquet. All operations happen entirely in the browser, making it perfect for data processing without server dependencies.

## Supported Formats

- **CSV** - Comma-separated values
- **JSON** - JavaScript Object Notation
- **Parquet** - Columnar storage format
- **Arrow** - Apache Arrow format

## CSV Import

### Basic CSV Import

```javascript
// React
import { useImportCSV } from '@northprint/duckdb-wasm-adapter-react';

function CSVImporter() {
  const { importCSV, loading, error } = useImportCSV({
    onSuccess: (result) => {
      console.log('Import successful:', result);
    },
    onError: (error) => {
      console.error('Import failed:', error);
    }
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await importCSV(file, 'users', {
      header: true,        // First row contains headers
      delimiter: ',',      // Column delimiter
      nullString: 'NULL'   // String representing NULL values
    });
  };

  return (
    <div>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload}
        disabled={loading}
      />
      {loading && <div>Importing...</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Advanced CSV Options

```javascript
const options = {
  // Column detection
  header: true,              // First row contains headers
  columns: ['id', 'name', 'email'], // Explicit column names
  
  // Parsing options
  delimiter: ',',            // Column delimiter
  quote: '"',               // Quote character
  escape: '"',              // Escape character
  nullString: 'NULL',       // String representing NULL
  dateFormat: '%Y-%m-%d',   // Date format
  timestampFormat: '%Y-%m-%d %H:%M:%S',
  
  // Type inference
  autoDetect: true,         // Auto-detect column types
  sampleSize: 100,          // Rows to sample for type detection
  
  // Performance
  parallel: true,           // Use parallel parsing
  compression: 'auto'       // Auto-detect compression (gzip, etc.)
};

await importCSV(file, 'table_name', options);
```

### CSV Import from URL

```javascript
async function importCSVFromURL(url, tableName) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], 'data.csv', { type: 'text/csv' });
    
    await importCSV(file, tableName, {
      header: true,
      delimiter: ','
    });
    
    console.log('CSV imported from URL successfully');
  } catch (error) {
    console.error('Failed to import CSV from URL:', error);
  }
}

// Usage
await importCSVFromURL(
  'https://example.com/data.csv',
  'remote_data'
);
```

## JSON Import

### Basic JSON Import

```javascript
// React
import { useImportJSON } from '@northprint/duckdb-wasm-adapter-react';

function JSONImporter() {
  const { importJSON, loading, error } = useImportJSON();

  const handleImport = async () => {
    const data = [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ];

    await importJSON(data, 'users');
  };

  return (
    <button onClick={handleImport} disabled={loading}>
      Import JSON Data
    </button>
  );
}
```

### JSON File Import

```javascript
async function importJSONFile(file, tableName) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // Handle different JSON structures
  if (Array.isArray(data)) {
    // Array of objects
    await importJSON(data, tableName);
  } else if (data.records) {
    // Nested structure
    await importJSON(data.records, tableName);
  } else {
    // Single object - wrap in array
    await importJSON([data], tableName);
  }
}
```

### Streaming JSON Import

```javascript
async function importLargeJSON(file, tableName, batchSize = 1000) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  // Import in batches for large datasets
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    if (i === 0) {
      // Create table with first batch
      await importJSON(batch, tableName);
    } else {
      // Append subsequent batches
      await appendJSON(batch, tableName);
    }
    
    // Update progress
    const progress = Math.min(100, (i / data.length) * 100);
    console.log(`Import progress: ${progress.toFixed(1)}%`);
  }
}
```

## Parquet Import

### Basic Parquet Import

```javascript
// React
import { useImportParquet } from '@northprint/duckdb-wasm-adapter-react';

function ParquetImporter() {
  const { importParquet, loading, error } = useImportParquet();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await importParquet(file, 'analytics_data');
  };

  return (
    <input 
      type="file" 
      accept=".parquet" 
      onChange={handleFileUpload}
      disabled={loading}
    />
  );
}
```

### Parquet from URL

```javascript
async function importParquetFromURL(url, tableName) {
  // DuckDB can read Parquet files directly from URLs
  await connection.execute(`
    CREATE TABLE ${tableName} AS 
    SELECT * FROM read_parquet('${url}')
  `);
}

// Import from S3
await connection.execute(`
  CREATE TABLE sales_data AS 
  SELECT * FROM read_parquet('s3://bucket/path/to/file.parquet')
`);
```

## CSV Export

### Basic CSV Export

```javascript
// React
import { useExportCSV } from '@northprint/duckdb-wasm-adapter-react';

function CSVExporter() {
  const { exportCSV } = useExportCSV();

  const handleExport = async () => {
    const csv = await exportCSV('SELECT * FROM users ORDER BY name');
    
    // Download the CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport}>
      Export to CSV
    </button>
  );
}
```

### Advanced CSV Export Options

```javascript
const csv = await exportCSV(
  'SELECT * FROM users',
  {
    header: true,           // Include column headers
    delimiter: ',',         // Column delimiter
    quote: '"',            // Quote character
    escape: '"',           // Escape character
    nullString: '',        // How to represent NULL
    dateFormat: '%Y-%m-%d', // Date formatting
    bom: true              // Include BOM for Excel compatibility
  }
);
```

## JSON Export

### Basic JSON Export

```javascript
// React
import { useExportJSON } from '@northprint/duckdb-wasm-adapter-react';

function JSONExporter() {
  const { exportJSON } = useExportJSON();

  const handleExport = async () => {
    const data = await exportJSON('SELECT * FROM users');
    
    // Download as JSON file
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport}>
      Export to JSON
    </button>
  );
}
```

### Formatted JSON Export

```javascript
async function exportFormattedJSON(query) {
  const data = await exportJSON(query);
  
  // Custom formatting
  const formatted = {
    metadata: {
      exportDate: new Date().toISOString(),
      recordCount: data.length,
      query: query
    },
    records: data
  };
  
  return JSON.stringify(formatted, null, 2);
}
```

## Parquet Export

### Basic Parquet Export

```javascript
async function exportToParquet(query, filename) {
  // Export query results to Parquet
  await connection.execute(`
    COPY (${query}) 
    TO '${filename}.parquet' 
    (FORMAT PARQUET, COMPRESSION 'SNAPPY')
  `);
  
  // Get the file for download
  const result = await connection.execute(
    `SELECT * FROM read_blob('${filename}.parquet')`
  );
  
  return result;
}
```

## Bulk Import Operations

### Import Multiple Files

```javascript
function MultiFileImporter() {
  const [files, setFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFilesSelect = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const importAllFiles = async () => {
    setImporting(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tableName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      
      try {
        if (file.name.endsWith('.csv')) {
          await importCSV(file, tableName, { header: true });
        } else if (file.name.endsWith('.json')) {
          const text = await file.text();
          const data = JSON.parse(text);
          await importJSON(data, tableName);
        } else if (file.name.endsWith('.parquet')) {
          await importParquet(file, tableName);
        }
        
        setProgress(((i + 1) / files.length) * 100);
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
      }
    }
    
    setImporting(false);
    setProgress(0);
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept=".csv,.json,.parquet"
        onChange={handleFilesSelect}
      />
      
      {files.length > 0 && (
        <div>
          <p>Selected {files.length} files</p>
          <button onClick={importAllFiles} disabled={importing}>
            Import All Files
          </button>
          
          {importing && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
              <span>{progress.toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Data Transformation

### Transform During Import

```javascript
async function importWithTransformation(file, tableName) {
  // First, import to temporary table
  const tempTable = `temp_${Date.now()}`;
  await importCSV(file, tempTable, { header: true });
  
  // Transform and create final table
  await connection.execute(`
    CREATE TABLE ${tableName} AS
    SELECT 
      id,
      UPPER(name) as name,
      LOWER(email) as email,
      CAST(salary AS DECIMAL(10,2)) as salary,
      strptime(hire_date, '%m/%d/%Y') as hire_date
    FROM ${tempTable}
    WHERE salary > 0
  `);
  
  // Clean up temp table
  await connection.execute(`DROP TABLE ${tempTable}`);
}
```

### Data Validation

```javascript
async function importWithValidation(data, tableName) {
  // Validate data before import
  const errors = [];
  const validRecords = [];
  
  data.forEach((record, index) => {
    const recordErrors = [];
    
    // Email validation
    if (!record.email || !record.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      recordErrors.push('Invalid email');
    }
    
    // Required fields
    if (!record.name) {
      recordErrors.push('Name is required');
    }
    
    // Numeric validation
    if (record.salary && isNaN(record.salary)) {
      recordErrors.push('Salary must be numeric');
    }
    
    if (recordErrors.length > 0) {
      errors.push({ row: index + 1, errors: recordErrors });
    } else {
      validRecords.push(record);
    }
  });
  
  if (errors.length > 0) {
    console.warn('Validation errors:', errors);
    
    // Optionally import only valid records
    if (validRecords.length > 0) {
      await importJSON(validRecords, tableName);
      console.log(`Imported ${validRecords.length} valid records`);
    }
  } else {
    await importJSON(data, tableName);
  }
  
  return { validRecords: validRecords.length, errors };
}
```

## Performance Optimization

### Batch Import

```javascript
async function optimizedImport(largeDataset, tableName) {
  const batchSize = 10000;
  const totalBatches = Math.ceil(largeDataset.length / batchSize);
  
  // Create table with first batch
  const firstBatch = largeDataset.slice(0, batchSize);
  await importJSON(firstBatch, tableName);
  
  // Import remaining batches
  for (let i = 1; i < totalBatches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, largeDataset.length);
    const batch = largeDataset.slice(start, end);
    
    // Use INSERT for subsequent batches
    const columns = Object.keys(batch[0]);
    const placeholders = batch.map(() => 
      `(${columns.map(() => '?').join(',')})`
    ).join(',');
    
    const values = batch.flatMap(record => 
      columns.map(col => record[col])
    );
    
    await connection.execute(
      `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${placeholders}`,
      values
    );
    
    console.log(`Imported batch ${i + 1} of ${totalBatches}`);
  }
}
```

### Memory-Efficient Export

```javascript
async function* streamExport(query, batchSize = 1000) {
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const batchQuery = `${query} LIMIT ${batchSize} OFFSET ${offset}`;
    const batch = await connection.execute(batchQuery);
    
    if (batch.length < batchSize) {
      hasMore = false;
    }
    
    yield batch;
    offset += batchSize;
  }
}

// Usage
async function exportLargeDataset() {
  const csvLines = [];
  
  for await (const batch of streamExport('SELECT * FROM large_table')) {
    const csv = convertToCSV(batch);
    csvLines.push(csv);
  }
  
  return csvLines.join('\n');
}
```

## Best Practices

1. **Validate data** before importing to prevent errors
2. **Use appropriate formats** - Parquet for analytics, CSV for compatibility
3. **Handle large files** with streaming or batch processing
4. **Transform data** during import to optimize storage
5. **Use compression** for large exports
6. **Provide progress feedback** for long operations
7. **Clean up temporary tables** after transformations

## Next Steps

- [Query Builder](/guide/query-builder) - Build complex queries
- [Caching](/guide/caching) - Optimize performance with caching
- [Performance](/guide/performance) - Advanced optimization techniques
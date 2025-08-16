import React, { useState, useEffect } from 'react';
import { 
  DuckDBProvider, 
  useDuckDB, 
  useQuery, 
  useMutation,
  useImportCSV,
  useImportJSON,
  useExportCSV,
  useExportJSON,
  downloadFile,
  resultToCSV 
} from '@duckdb-wasm-adapter/react';
import QueryBuilderDemo from './components/QueryBuilderDemo';
import CacheDemo from './components/CacheDemo';
import SpatialDemo from './components/SpatialDemo';

function DuckDBExample() {
  const { connection, status, error, connect, disconnect } = useDuckDB();
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM employees');
  const [customQuery, setCustomQuery] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [tableName, setTableName] = useState('imported_data');
  const [tableReady, setTableReady] = useState(false);
  
  // Setup mutation for creating initial data
  const setupMutation = useMutation();
  
  // Query hook - only run after table is ready
  const { data, loading, error: queryError, refetch } = useQuery(
    sqlQuery,
    undefined,
    { enabled: status === 'connected' && tableReady }
  );
  
  // Import hooks
  const { importCSV, loading: csvLoading } = useImportCSV();
  const { importJSON, loading: jsonLoading } = useImportJSON();
  const exportCSV = useExportCSV();
  const exportJSON = useExportJSON();
  
  // Setup initial data
  useEffect(() => {
    if (status === 'connected' && connection) {
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
      
      setupMutation.mutate(setupQuery).then(() => {
        console.log('Sample data created successfully');
        setTableReady(true); // Mark table as ready
        refetch(); // データ作成後にクエリを再実行
      }).catch(console.error);
    }
  }, [status, connection]);
  
  // Execute custom query
  const executeCustomQuery = () => {
    if (customQuery) {
      setSqlQuery(customQuery);
    }
  };
  
  // Handle file import
  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      if (importFile.name.endsWith('.csv')) {
        await importCSV(importFile, tableName);
      } else if (importFile.name.endsWith('.json')) {
        const text = await importFile.text();
        const data = JSON.parse(text);
        await importJSON(data, tableName);
      }
      
      alert(`Successfully imported ${importFile.name} into table ${tableName}`);
      setSqlQuery(`SELECT * FROM ${tableName}`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  };
  
  // Export as CSV
  const handleExportCSV = async () => {
    if (!data) return;
    
    const csv = resultToCSV(data);
    downloadFile(csv, 'export.csv', 'text/csv');
  };
  
  // Export as JSON
  const handleExportJSON = async () => {
    try {
      const json = await exportJSON(sqlQuery);
      downloadFile(JSON.stringify(json, null, 2), 'export.json', 'application/json');
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    }
  };
  
  const exampleQueries = [
    { label: 'All Employees', query: 'SELECT * FROM employees' },
    { label: 'High Earners', query: 'SELECT name, salary FROM employees WHERE salary > 80000' },
    { label: 'Avg Salary by Dept', query: 'SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department' },
    { label: 'Recent Hires', query: 'SELECT name, hire_date FROM employees ORDER BY hire_date DESC LIMIT 3' },
  ];
  
  return (
    <div className="container">
      <h1>🦆 DuckDB WASM React Example</h1>
      
      <section className="status-section">
        <h2>Connection Status</h2>
        <p>Status: <span className={`status-badge ${status}`}>{status}</span></p>
        {error && <p className="error">Error: {error.message}</p>}
        <div className="button-group">
          {status !== 'connected' ? (
            <button onClick={connect}>Connect</button>
          ) : (
            <>
              <button onClick={disconnect}>Disconnect</button>
              <button onClick={() => {
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
                setupMutation.mutate(setupQuery).then(() => {
                  console.log('Sample data created successfully');
                  refetch();
                }).catch(console.error);
              }}>Setup Sample Data</button>
            </>
          )}
        </div>
      </section>
      
      <section className="query-editor">
        <h2>Query Editor</h2>
        <textarea
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          placeholder={sqlQuery}
          rows={4}
        />
        <button onClick={executeCustomQuery}>Execute Query</button>
        <button onClick={refetch}>Refresh Results</button>
      </section>
      
      <section className="import-section">
        <h2>Import Data</h2>
        <div className="import-controls">
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => setImportFile(e.target.files[0])}
          />
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Table name"
          />
          <button 
            onClick={handleImport} 
            disabled={!importFile || csvLoading || jsonLoading}
          >
            {csvLoading || jsonLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </section>
      
      <section className="results-section">
        <h2>Query Results</h2>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Status: {status} | Table Ready: {tableReady ? 'Yes' : 'No'} | 
          Data: {data ? `${data.length} rows` : 'No data'}
        </p>
        
        {loading && <p>Loading...</p>}
        {queryError && <p className="error">Error: {queryError.message}</p>}
        {data && data.length > 0 && (
          <>
            <div className="export-buttons">
              <button onClick={handleExportCSV}>Export as CSV</button>
              <button onClick={handleExportJSON}>Export as JSON</button>
              <button onClick={refetch}>Refresh</button>
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {Object.keys(data[0]).map(column => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value, j) => (
                        <td key={j}>{value ?? 'NULL'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <p className="row-count">Rows: {data.length}</p>
          </>
        )}
        {data && data.length === 0 && <p>No results</p>}
      </section>
      
      <section className="examples-section">
        <h2>Example Queries</h2>
        <div className="example-buttons">
          {exampleQueries.map((example, i) => (
            <button
              key={i}
              onClick={() => setSqlQuery(example.query)}
            >
              {example.label}
            </button>
          ))}
        </div>
      </section>

      <section className="query-builder-section">
        <QueryBuilderDemo />
      </section>

      <section className="cache-section">
        <CacheDemo />
      </section>

      <section className="spatial-section">
        <SpatialDemo />
      </section>
    </div>
  );
}

function App() {
  // Enable debug mode for development
  const debugConfig = {
    enabled: true,
    logQueries: true,
    logTiming: true,
    slowQueryThreshold: 50, // 50ms
    logMemory: true,
    profileQueries: false, // Set to true for detailed profiling
  };

  // Enable cache for better performance
  const cacheConfig = {
    enabled: true,
    options: {
      maxEntries: 50,
      ttl: 60000, // 1 minute
      evictionStrategy: 'lru',
      enableStats: true,
    }
  };
  
  return (
    <DuckDBProvider 
      autoConnect 
      debug={debugConfig}
      config={{ cache: cacheConfig }}
    >
      <DuckDBExample />
    </DuckDBProvider>
  );
}

export default App;
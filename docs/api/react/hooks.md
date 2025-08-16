# React Hooks

The React adapter provides a comprehensive set of hooks for database operations.

## Installation

```bash
npm install @duckdb-wasm-adapter/react
```

## Query Hooks

### useQuery

Execute SELECT queries and automatically manage loading states.

```typescript
function useQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
  options?: UseQueryOptions
): QueryResult<T>
```

#### Basic Usage

```jsx
import { useQuery } from '@duckdb-wasm-adapter/react';

function UserList() {
  const { data, loading, error, refetch } = useQuery(
    'SELECT * FROM users WHERE active = ?',
    [true]
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {data?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### UseQueryOptions

```typescript
interface UseQueryOptions {
  enabled?: boolean;           // Enable/disable query execution
  initialData?: T[];          // Initial data while loading
  refetchInterval?: number;   // Auto-refetch interval in ms
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}
```

#### Advanced Usage

```jsx
function Dashboard() {
  const [enabled, setEnabled] = useState(false);
  
  const { data, loading, error, refetch, metadata } = useQuery(
    'SELECT department, COUNT(*) as count FROM employees GROUP BY department',
    undefined,
    {
      enabled,
      refetchInterval: 30000, // Refresh every 30 seconds
      onSuccess: (data) => {
        console.log('Query completed:', data.length, 'rows');
      },
      onError: (error) => {
        console.error('Query failed:', error);
      }
    }
  );

  return (
    <div>
      <button onClick={() => setEnabled(!enabled)}>
        {enabled ? 'Disable' : 'Enable'} Auto-refresh
      </button>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {data && (
        <table>
          <thead>
            <tr>
              {metadata?.map(col => (
                <th key={col.name}>{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.department}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### QueryResult

```typescript
interface QueryResult<T> {
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  metadata: ColumnMetadata[] | null;
}
```

## Mutation Hooks

### useMutation

Execute INSERT, UPDATE, DELETE operations.

```typescript
function useMutation<T = Record<string, unknown>>(
  options?: UseMutationOptions<T>
): MutationResult<T>
```

#### Basic Usage

```jsx
import { useMutation } from '@duckdb-wasm-adapter/react';

function CreateUser() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const { mutate, loading, error } = useMutation({
    onSuccess: (data) => {
      console.log('User created:', data);
      setName('');
      setEmail('');
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate(
      'INSERT INTO users (name, email) VALUES (?, ?) RETURNING *',
      [name, email]
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

#### MutationResult

```typescript
interface MutationResult<T> {
  mutate: (sql: string, params?: unknown[]) => Promise<T[]>;
  mutateAsync: (sql: string, params?: unknown[]) => Promise<T[]>;
  data: T[] | undefined;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

## Batch Operations

### useBatch

Execute multiple operations in a transaction.

```jsx
import { useBatch } from '@duckdb-wasm-adapter/react';

function BulkOperations() {
  const batch = useBatch();

  const handleBulkUpdate = async () => {
    try {
      await batch([
        { sql: 'UPDATE users SET active = ? WHERE department = ?', params: [false, 'old-dept'] },
        { sql: 'DELETE FROM logs WHERE created_at < ?', params: ['2023-01-01'] },
        { sql: 'INSERT INTO audit_log (action, timestamp) VALUES (?, ?)', params: ['bulk_cleanup', new Date()] }
      ]);
      console.log('Bulk operations completed');
    } catch (error) {
      console.error('Bulk operations failed:', error);
    }
  };

  return (
    <button onClick={handleBulkUpdate}>
      Execute Bulk Operations
    </button>
  );
}
```

### useTransaction

Execute operations within a transaction with rollback support.

```jsx
import { useTransaction } from '@duckdb-wasm-adapter/react';

function TransferFunds() {
  const transaction = useTransaction();

  const handleTransfer = async (fromId, toId, amount) => {
    try {
      await transaction(async (exec) => {
        // Debit from source account
        await exec(
          'UPDATE accounts SET balance = balance - ? WHERE id = ?',
          [amount, fromId]
        );
        
        // Credit to destination account
        await exec(
          'UPDATE accounts SET balance = balance + ? WHERE id = ?',
          [amount, toId]
        );
        
        // Log the transaction
        await exec(
          'INSERT INTO transactions (from_id, to_id, amount, timestamp) VALUES (?, ?, ?, ?)',
          [fromId, toId, amount, new Date()]
        );
      });
      
      console.log('Transfer completed successfully');
    } catch (error) {
      console.error('Transfer failed and rolled back:', error);
    }
  };

  return (
    <button onClick={() => handleTransfer(1, 2, 100)}>
      Transfer $100
    </button>
  );
}
```

## Data Import/Export Hooks

### useImportCSV

Import CSV files into DuckDB.

```jsx
import { useImportCSV } from '@duckdb-wasm-adapter/react';

function CSVImporter() {
  const { importCSV, loading, error } = useImportCSV();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await importCSV(file, 'imported_data', {
        header: true,
        delimiter: ',',
        quote: '"'
      });
      console.log('CSV imported successfully');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
      />
      {loading && <div>Importing...</div>}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### useImportJSON

Import JSON data into DuckDB.

```jsx
import { useImportJSON } from '@duckdb-wasm-adapter/react';

function JSONImporter() {
  const { importJSON, loading, error } = useImportJSON();

  const handleImport = async () => {
    const data = [
      { id: 1, name: 'Alice', age: 25 },
      { id: 2, name: 'Bob', age: 30 }
    ];

    try {
      await importJSON(data, 'users');
      console.log('JSON data imported');
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  return (
    <button onClick={handleImport} disabled={loading}>
      {loading ? 'Importing...' : 'Import JSON Data'}
    </button>
  );
}
```

### useExportCSV / useExportJSON

Export query results.

```jsx
import { useExportCSV, useExportJSON } from '@duckdb-wasm-adapter/react';

function DataExporter() {
  const exportCSV = useExportCSV();
  const exportJSON = useExportJSON();

  const handleExportCSV = async () => {
    try {
      const csv = await exportCSV('SELECT * FROM users', {
        header: true,
        delimiter: ','
      });
      
      // Download the CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportJSON('SELECT * FROM users');
      console.log('Exported data:', data);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleExportCSV}>Export as CSV</button>
      <button onClick={handleExportJSON}>Export as JSON</button>
    </div>
  );
}
```

## Query Builder Integration

### useQueryBuilder

Build queries programmatically with the Query Builder.

```jsx
import { useQueryBuilder } from '@duckdb-wasm-adapter/react';
import { select } from '@duckdb-wasm-adapter/core';

function QueryBuilderExample() {
  const { execute } = useQueryBuilder();
  const [department, setDepartment] = useState('');

  const { data, loading } = execute(
    select('name', 'email', 'salary')
      .from('employees')
      .where('department', '=', department)
      .where('active', '=', true)
      .orderBy('salary', 'DESC')
      .limit(10),
    { enabled: Boolean(department) }
  );

  return (
    <div>
      <select value={department} onChange={(e) => setDepartment(e.target.value)}>
        <option value="">Select Department</option>
        <option value="engineering">Engineering</option>
        <option value="sales">Sales</option>
        <option value="marketing">Marketing</option>
      </select>

      {loading && <div>Loading...</div>}
      {data && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Salary</th>
            </tr>
          </thead>
          <tbody>
            {data.map((emp, i) => (
              <tr key={i}>
                <td>{emp.name}</td>
                <td>{emp.email}</td>
                <td>${emp.salary.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

## Cache Management

### useCache

Manage query result cache.

```jsx
import { useCache } from '@duckdb-wasm-adapter/react';

function CacheManager() {
  const { clearCache, getCacheStats, invalidateCache } = useCache();
  const [stats, setStats] = useState(getCacheStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats());
    }, 1000);
    return () => clearInterval(interval);
  }, [getCacheStats]);

  return (
    <div>
      <h3>Cache Statistics</h3>
      <p>Hits: {stats.hits}</p>
      <p>Misses: {stats.misses}</p>
      <p>Hit Rate: {(stats.hitRate * 100).toFixed(1)}%</p>
      <p>Entries: {stats.entries}</p>

      <div>
        <button onClick={clearCache}>Clear All Cache</button>
        <button onClick={() => invalidateCache(/users/)}>
          Clear User Queries
        </button>
      </div>
    </div>
  );
}
```

## Hook Composition

Combine multiple hooks for complex scenarios:

```jsx
function AdvancedDataManager() {
  const { mutate: createUser } = useMutation({
    onSuccess: () => refetchUsers()
  });
  
  const { data: users, refetch: refetchUsers } = useQuery(
    'SELECT * FROM users ORDER BY created_at DESC'
  );
  
  const { importCSV } = useImportCSV();
  const { clearCache } = useCache();

  const handleBulkImport = async (file) => {
    try {
      await importCSV(file, 'temp_users');
      await mutate(`
        INSERT INTO users (name, email)
        SELECT name, email FROM temp_users
        WHERE email NOT IN (SELECT email FROM users)
      `);
      clearCache(); // Clear cache after bulk operation
    } catch (error) {
      console.error('Bulk import failed:', error);
    }
  };

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
}
```
# Concepts

Understand the core concepts and architecture of DuckDB WASM Adapter.

## Overview

DuckDB WASM Adapter bridges the gap between DuckDB's powerful analytical capabilities and modern frontend frameworks. This guide explains the fundamental concepts that make this possible.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Framework     │    │     Adapter      │    │   DuckDB WASM   │
│   Components    │◄──►│    Layer         │◄──►│     Engine      │
│                 │    │                  │    │                 │
│ React/Vue/      │    │ • Hooks/         │    │ • SQL Engine    │
│ Svelte Apps     │    │   Composables    │    │ • WASM Runtime  │
│                 │    │ • State Mgmt     │    │ • Web Workers   │
│                 │    │ • Caching        │    │ • Memory Mgmt   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Layers

1. **Framework Layer**: React hooks, Vue composables, Svelte stores
2. **Adapter Layer**: Shared logic, caching, state management
3. **Core Layer**: Connection management, query execution
4. **DuckDB Layer**: SQL engine, WASM runtime, data processing

## Core Concepts

### 1. In-Browser Database

Unlike traditional web applications that query remote databases, DuckDB WASM Adapter runs a complete analytical database in your browser:

**Traditional Architecture:**
```
Browser ──HTTP──► Server ──SQL──► Database
```

**DuckDB WASM Architecture:**
```
Browser Components ──SQL──► DuckDB WASM Engine
```

**Benefits:**
- No network latency
- Works offline
- Privacy (data never leaves browser)
- Scales with client resources
- No server infrastructure needed

### 2. Reactive Data Flow

The adapter provides reactive interfaces that automatically update when data changes:

```javascript
// Data flows reactively from database to UI
const users = useQuery('SELECT * FROM users');
// users.data updates automatically when the query result changes
```

**React Flow:**
```
State Change → Hook Re-render → Component Update
```

**Vue Flow:**
```
Ref Change → Computed Re-evaluation → Template Update
```

**Svelte Flow:**
```
Store Update → Reactive Statement → DOM Update
```

### 3. Connection Management

Connections are managed automatically with sensible defaults:

```javascript
// Automatic connection management
<DuckDBProvider autoConnect>
  <App />
</DuckDBProvider>
```

**Connection Lifecycle:**
1. **Initialization**: WASM module loading
2. **Connection**: Database instance creation
3. **Ready State**: Available for queries
4. **Cleanup**: Automatic resource management

### 4. Query Execution

Queries are executed asynchronously with automatic state management:

```javascript
const { data, loading, error } = useQuery('SELECT * FROM users');
```

**Execution Flow:**
1. Query validation
2. Cache check (if enabled)
3. DuckDB execution
4. Result processing
5. State update
6. Cache storage (if applicable)

### 5. Data Import/Export

Seamless data exchange with various formats:

```javascript
// Import from files
await importCSV(file, 'table_name');
await importJSON(data, 'table_name');

// Export to formats
const csv = await exportCSV('SELECT * FROM table_name');
const json = await exportJSON('SELECT * FROM table_name');
```

**Supported Formats:**
- CSV (Comma-separated values)
- JSON (JavaScript Object Notation)
- Parquet (Columnar storage)
- Arrow (In-memory columnar)

## Advanced Concepts

### 1. Web Workers

DuckDB WASM runs in a Web Worker to avoid blocking the main thread:

```javascript
// Worker usage (enabled by default)
const connection = await createConnection({
  worker: true // Recommended for production
});
```

**Benefits:**
- Non-blocking UI
- Better performance
- Parallel processing
- Memory isolation

**Considerations:**
- Data serialization overhead
- Debugging complexity
- Browser compatibility

### 2. Memory Management

DuckDB WASM manages memory efficiently within browser constraints:

```javascript
// Memory is managed automatically
// But you can influence it through configuration
const connection = await createConnection({
  cache: {
    maxSize: 50 * 1024 * 1024 // 50MB cache limit
  }
});
```

**Memory Usage:**
- WASM heap for DuckDB
- JavaScript objects for results
- Cache storage
- Temporary data during operations

### 3. Caching Strategy

Intelligent caching improves performance for repeated queries:

```javascript
const config = {
  cache: {
    enabled: true,
    evictionStrategy: 'lru', // Least Recently Used
    ttl: 300000, // 5 minutes
    maxEntries: 100
  }
};
```

**Cache Types:**
- **LRU**: Least Recently Used
- **LFU**: Least Frequently Used
- **FIFO**: First In, First Out
- **TTL**: Time To Live

### 4. Query Builder

Type-safe query construction with fluent API:

```javascript
import { select } from '@duckdb-wasm-adapter/core';

const query = select('name', 'email')
  .from('users')
  .where('active', '=', true)
  .orderBy('name')
  .limit(10)
  .build();
```

**Benefits:**
- SQL injection prevention
- Type safety
- IDE autocomplete
- Reusable patterns

### 5. Error Handling

Comprehensive error management with specific error types:

```javascript
try {
  await connection.execute('SELECT * FROM non_existent_table');
} catch (error) {
  if (error instanceof DuckDBError) {
    switch (error.code) {
      case 'QUERY_FAILED':
        // Handle query errors
        break;
      case 'CONNECTION_FAILED':
        // Handle connection errors
        break;
    }
  }
}
```

## Data Models

### 1. Tables and Schemas

DuckDB supports standard SQL table structures:

```sql
-- Create schema
CREATE SCHEMA analytics;

-- Create table with types
CREATE TABLE analytics.users (
  id INTEGER PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE,
  metadata JSON,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Data Types

DuckDB supports rich data types:

- **Numeric**: INTEGER, DECIMAL, DOUBLE
- **Text**: VARCHAR, TEXT
- **Temporal**: DATE, TIME, TIMESTAMP
- **Structured**: JSON, ARRAY, MAP, STRUCT
- **Binary**: BLOB
- **Boolean**: BOOLEAN

### 3. Temporary Data

Perfect for analytics workflows:

```sql
-- Temporary tables for processing
CREATE TEMP TABLE processing_data AS
SELECT * FROM raw_data WHERE condition = true;

-- Common table expressions
WITH filtered_users AS (
  SELECT * FROM users WHERE active = true
)
SELECT department, COUNT(*) 
FROM filtered_users 
GROUP BY department;
```

## Performance Concepts

### 1. Query Optimization

DuckDB includes a sophisticated query optimizer:

```sql
-- Automatically optimized
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5;
```

**Optimizations:**
- Predicate pushdown
- Join reordering
- Index usage
- Parallel execution

### 2. Columnar Storage

Efficient for analytical queries:

```javascript
// Columnar format is optimal for aggregations
const stats = await connection.execute(`
  SELECT 
    department,
    AVG(salary) as avg_salary,
    COUNT(*) as employee_count
  FROM employees
  GROUP BY department
`);
```

### 3. Vectorized Execution

SIMD operations for better performance:

```javascript
// Vectorized operations on large datasets
const analysis = await connection.execute(`
  SELECT 
    EXTRACT(month FROM date) as month,
    SUM(revenue) as total_revenue
  FROM sales
  WHERE date >= '2024-01-01'
  GROUP BY month
  ORDER BY month
`);
```

## Framework Integration Patterns

### React Patterns

```jsx
// Context for global state
const DuckDBContext = React.createContext();

// Custom hooks for reusable logic
function useUsers() {
  return useQuery('SELECT * FROM users');
}

// Higher-order components for data fetching
function withData(Component, query) {
  return function WrappedComponent(props) {
    const result = useQuery(query);
    return <Component {...props} {...result} />;
  };
}
```

### Vue Patterns

```javascript
// Plugin for global registration
app.use(DuckDBPlugin);

// Composables for reusable logic
function useUsers() {
  return useQuery('SELECT * FROM users');
}

// Provide/inject for dependency injection
provide('duckdb', connection);
const connection = inject('duckdb');
```

### Svelte Patterns

```javascript
// Stores for global state
export const users = writable([]);

// Actions for reusable functionality
export function duckdbAction(node, options) {
  // Setup DuckDB functionality
  return {
    update(newOptions) {},
    destroy() {}
  };
}

// Context for component communication
setContext('duckdb', connection);
const connection = getContext('duckdb');
```

## Security Considerations

### 1. Client-Side Only

Data processing happens entirely in the browser:

```javascript
// Data never leaves the browser
const sensitiveData = [
  { ssn: '123-45-6789', name: 'Alice' }
];
await importJSON(sensitiveData, 'private_data');
```

### 2. SQL Injection Prevention

Always use parameterized queries:

```javascript
// ✅ Safe: Parameterized query
const users = await connection.execute(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);

// ❌ Dangerous: String concatenation
const users = await connection.execute(
  `SELECT * FROM users WHERE id = ${userId}`
);
```

### 3. Memory Limits

Browser memory constraints provide natural security boundaries:

```javascript
// Automatic memory management within browser limits
const config = {
  cache: {
    maxSize: 100 * 1024 * 1024 // 100MB limit
  }
};
```

## Best Practices

### 1. Design for Analytics

DuckDB excels at analytical workloads:

```sql
-- ✅ Good: Analytical queries
SELECT 
  DATE_TRUNC('month', created_at) as month,
  department,
  COUNT(*) as hires,
  AVG(salary) as avg_salary
FROM employees
GROUP BY month, department
ORDER BY month, department;

-- ❌ Less optimal: OLTP-style queries
SELECT * FROM employees WHERE id = 123;
```

### 2. Batch Operations

Process data in batches for better performance:

```javascript
// ✅ Good: Batch insert
const batchSize = 1000;
for (let i = 0; i < largeDataset.length; i += batchSize) {
  const batch = largeDataset.slice(i, i + batchSize);
  await importJSON(batch, 'large_table');
}

// ❌ Inefficient: Row-by-row
for (const row of largeDataset) {
  await connection.execute('INSERT INTO table VALUES (?)', [row]);
}
```

### 3. Use Appropriate Data Types

Choose efficient data types:

```sql
-- ✅ Good: Appropriate types
CREATE TABLE events (
  id INTEGER,
  timestamp TIMESTAMP,
  user_id INTEGER,
  event_type VARCHAR(50),
  properties JSON
);

-- ❌ Inefficient: Everything as TEXT
CREATE TABLE events (
  id TEXT,
  timestamp TEXT,
  user_id TEXT,
  event_type TEXT,
  properties TEXT
);
```

## Common Patterns

### 1. ETL Workflows

Extract, Transform, Load in the browser:

```javascript
// Extract
const data = await fetch('/api/raw-data').then(r => r.json());

// Transform
await importJSON(data, 'raw_data');
await connection.execute(`
  CREATE TABLE clean_data AS
  SELECT 
    id,
    UPPER(name) as name,
    CAST(score AS DECIMAL) as score
  FROM raw_data
  WHERE score IS NOT NULL
`);

// Load (export or use)
const cleanData = await exportJSON('SELECT * FROM clean_data');
```

### 2. Real-time Dashboards

Combine reactive queries with real-time data:

```javascript
// Real-time metrics
const metrics = useQuery(
  'SELECT COUNT(*) as total, AVG(value) as average FROM events',
  undefined,
  { refetchInterval: 5000 } // Update every 5 seconds
);

// Historical trends
const trends = useQuery(`
  SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as event_count
  FROM events
  WHERE timestamp >= NOW() - INTERVAL 24 HOURS
  GROUP BY hour
  ORDER BY hour
`);
```

### 3. Interactive Analytics

Build interactive data exploration tools:

```javascript
function DataExplorer() {
  const [filters, setFilters] = useState({});
  const [groupBy, setGroupBy] = useState('department');
  
  const query = useMemo(() => {
    return buildDynamicQuery(filters, groupBy);
  }, [filters, groupBy]);
  
  const { data } = useQuery(query);
  
  return (
    <div>
      <FilterPanel filters={filters} onChange={setFilters} />
      <GroupBySelector value={groupBy} onChange={setGroupBy} />
      <ResultsChart data={data} />
    </div>
  );
}
```

## Debugging and Development

### 1. Debug Mode

Enable detailed logging during development:

```javascript
const connection = await createConnection({
  debug: {
    enabled: true,
    logQueries: true,
    logTiming: true,
    slowQueryThreshold: 100
  }
});
```

### 2. Query Profiling

Analyze query performance:

```javascript
// Profile a complex query
const result = await connection.execute(`
  EXPLAIN ANALYZE
  SELECT department, COUNT(*), AVG(salary)
  FROM employees
  GROUP BY department
`);
```

### 3. Error Handling

Implement comprehensive error handling:

```javascript
function QueryComponent() {
  const { data, loading, error, refetch } = useQuery(complexQuery);
  
  if (error) {
    return (
      <div>
        <h3>Query Failed</h3>
        <pre>{error.message}</pre>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }
  
  return <div>{/* Render data */}</div>;
}
```

Understanding these concepts will help you build efficient, maintainable applications with DuckDB WASM Adapter. The reactive patterns, combined with DuckDB's analytical power, enable sophisticated data applications entirely in the browser.
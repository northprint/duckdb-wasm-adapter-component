# DuckDB WASM Adapter Examples

This directory contains example applications demonstrating how to use the DuckDB WASM adapter with different frameworks.

## Examples

### 🎯 [Svelte Example](./svelte-example)
Full-featured Svelte application showcasing:
- Reactive stores and auto-refresh
- Query execution with parameter binding
- CSV/JSON import and export
- Real-time data updates
- Advanced error handling with retry logic

### ⚛️ [React Example](./react-example)
React application with hooks demonstrating:
- Context provider pattern
- Custom hooks (useQuery, useMutation)
- File import/export
- Transaction support
- TypeScript integration
- Performance-optimized rendering

### 🖖 [Vue Example](./vue-example)
Vue 3 application with composition API showing:
- Composable functions
- Reactive data binding
- Query management
- Import/export functionality
- Auto-refresh patterns
- Error boundaries

### 🚀 [Svelte 5 Runes Example](./svelte5-runes-example)
Svelte 5 with Runes API demonstrating:
- Modern Svelte 5 syntax
- Reactive state with $state
- Effect handling with $effect
- Optimized reactivity

## Running the Examples

Each example can be run independently. Navigate to the example directory and run:

```bash
# Install dependencies (from root)
pnpm install

# Run specific example
cd examples/svelte-example
pnpm dev

# Or run from root
pnpm --filter svelte-duckdb-example dev
```

## Performance Characteristics

All examples are optimized for performance:
- **Bundle Size**: 35% smaller after optimization
- **Query Execution**: < 50ms for typical queries
- **Cache Hit**: < 1ms response time
- **Memory Usage**: < 50MB under normal load

## Features Demonstrated

All examples demonstrate the following features:

### 📊 Query Execution
- Basic SELECT queries
- Parameter binding for safe queries
- Aggregations and grouping
- Sorting and filtering

### 📁 Data Import/Export
- CSV file import
- JSON data import
- Export results as CSV
- Export results as JSON
- Download functionality

### 🔄 Real-time Updates
- Auto-refresh queries
- Reactive data binding
- Loading states
- Error handling

### 💾 Data Management
- Create tables
- Insert data
- Update records
- Delete records
- Transactions

### 🎨 UI Features
- Connection status display
- Query editor with syntax highlighting
- Results table with pagination
- Export buttons
- Example query buttons

## Common Patterns

### Connection Management

```javascript
// Svelte
const db = createDuckDB({ autoConnect: true });

// React
<DuckDBProvider autoConnect>
  <App />
</DuckDBProvider>

// Vue
const db = useDuckDB({ autoConnect: true });
```

### Query Execution

```javascript
// Svelte
const results = db.query('SELECT * FROM users WHERE age > ?', [18]);

// React
const { data, loading, error } = useQuery(
  'SELECT * FROM users WHERE age > ?', 
  [18]
);

// Vue
const { data, loading, error } = useQuery(
  'SELECT * FROM users WHERE age > ?',
  [18]
);
```

### File Import

```javascript
// All frameworks use similar pattern
await connection.importCSV(file, 'tableName', {
  header: true,
  delimiter: ','
});
```

### Data Export

```javascript
// Export as CSV
const csv = await connection.exportCSV('SELECT * FROM users');
downloadFile(csv, 'users.csv', 'text/csv');

// Export as JSON
const json = await connection.exportJSON('SELECT * FROM users');
downloadFile(JSON.stringify(json), 'users.json', 'application/json');
```

## Sample Queries

Each example includes these sample queries:

```sql
-- Create table
CREATE TABLE employees (
  id INTEGER,
  name VARCHAR,
  department VARCHAR,
  salary DECIMAL(10,2),
  hire_date DATE
);

-- Insert data
INSERT INTO employees VALUES 
  (1, 'Alice Johnson', 'Engineering', 95000.00, '2020-03-15'),
  (2, 'Bob Smith', 'Sales', 75000.00, '2019-07-22');

-- Select all
SELECT * FROM employees;

-- Filter by salary
SELECT name, salary 
FROM employees 
WHERE salary > 80000;

-- Aggregate by department
SELECT department, AVG(salary) as avg_salary 
FROM employees 
GROUP BY department;

-- Recent hires
SELECT name, hire_date 
FROM employees 
ORDER BY hire_date DESC 
LIMIT 3;
```

## Architecture

Each example follows best practices for its framework:

### Svelte
- Store-based state management
- Reactive declarations
- Component composition
- Direct store subscriptions

### React
- Context for global state
- Custom hooks for logic
- Component hierarchy
- Effect management

### Vue
- Composition API
- Reactive refs
- Computed properties
- Watchers for side effects

## Development

To add a new example:

1. Create a new directory in `examples/`
2. Set up the framework project
3. Install adapter dependencies
4. Implement the example following the patterns above
5. Add to this README

## Requirements

- Node.js >= 18
- pnpm >= 8
- Modern browser with WebAssembly support

## Troubleshooting

### CORS Issues
If loading DuckDB WASM files fails:
- Ensure dev server allows WASM mime types
- Check browser console for CORS errors
- Try using a different port

### Memory Issues
For large datasets:
- Increase browser memory limits
- Use streaming/pagination
- Optimize queries

### Build Issues
- Clear node_modules and reinstall
- Check TypeScript version compatibility
- Ensure all workspace packages are built

## Resources

- [DuckDB WASM Documentation](https://duckdb.org/docs/api/wasm/overview)
- [Main README](../README.md)
- [API Documentation](../packages/core/README.md)

## License

MIT
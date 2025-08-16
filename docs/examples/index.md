# Examples

Practical examples showing how to use DuckDB WASM Adapter in different scenarios.

## Framework Examples

### React Examples

#### Basic CRUD Application
A complete user management system with Create, Read, Update, Delete operations.

```jsx
// src/App.jsx
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import UserManagement from './components/UserManagement';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <div className="App">
        <h1>User Management System</h1>
        <UserManagement />
      </div>
    </DuckDBProvider>
  );
}

export default App;
```

```jsx
// src/components/UserManagement.jsx
import { useState } from 'react';
import { useQuery, useMutation } from '@northprint/duckdb-wasm-adapter-react';

function UserManagement() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: ''
  });

  // Fetch users
  const { data: users, loading, error, refetch } = useQuery(`
    SELECT id, name, email, department, created_at 
    FROM users 
    ORDER BY created_at DESC
  `);

  // Create user mutation
  const { mutate: createUser, loading: creating } = useMutation({
    onSuccess: () => {
      setFormData({ name: '', email: '', department: '' });
      refetch();
    }
  });

  // Delete user mutation
  const { mutate: deleteUser } = useMutation({
    onSuccess: () => refetch()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createUser(
      'INSERT INTO users (name, email, department) VALUES (?, ?, ?)',
      [formData.name, formData.email, formData.department]
    );
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure?')) {
      deleteUser('DELETE FROM users WHERE id = ?', [id]);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {/* Create Form */}
      <form onSubmit={handleSubmit}>
        <input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Name"
          required
        />
        <input
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
          type="email"
          required
        />
        <select
          value={formData.department}
          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          required
        >
          <option value="">Select Department</option>
          <option value="Engineering">Engineering</option>
          <option value="Sales">Sales</option>
          <option value="Marketing">Marketing</option>
        </select>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create User'}
        </button>
      </form>

      {/* Users List */}
      <div>
        <h2>Users ({users?.length || 0})</h2>
        {users?.map(user => (
          <div key={user.id} style={{ border: '1px solid #ddd', padding: '1rem', margin: '0.5rem' }}>
            <h3>{user.name}</h3>
            <p>Email: {user.email}</p>
            <p>Department: {user.department}</p>
            <button onClick={() => handleDelete(user.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserManagement;
```

#### Data Analytics Dashboard
Real-time analytics dashboard with charts and metrics.

```jsx
// src/components/AnalyticsDashboard.jsx
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';
import { useMemo } from 'react';

function AnalyticsDashboard() {
  // Department statistics
  const { data: deptStats } = useQuery(`
    SELECT 
      department,
      COUNT(*) as employee_count,
      AVG(salary) as avg_salary,
      MAX(salary) as max_salary,
      MIN(salary) as min_salary
    FROM employees 
    GROUP BY department 
    ORDER BY employee_count DESC
  `);

  // Monthly hiring trends
  const { data: hiringTrends } = useQuery(`
    SELECT 
      DATE_TRUNC('month', hired_date) as month,
      COUNT(*) as hires
    FROM employees 
    WHERE hired_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
    GROUP BY month 
    ORDER BY month
  `);

  // Performance metrics
  const { data: metrics } = useQuery(`
    SELECT 
      COUNT(*) as total_employees,
      AVG(salary) as avg_salary,
      COUNT(DISTINCT department) as departments,
      AVG(performance_score) as avg_performance
    FROM employees 
    WHERE active = true
  `);

  const formatCurrency = (value) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="dashboard">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Employees</h3>
          <p className="metric-value">{metrics?.[0]?.total_employees || 0}</p>
        </div>
        <div className="metric-card">
          <h3>Average Salary</h3>
          <p className="metric-value">{formatCurrency(metrics?.[0]?.avg_salary || 0)}</p>
        </div>
        <div className="metric-card">
          <h3>Departments</h3>
          <p className="metric-value">{metrics?.[0]?.departments || 0}</p>
        </div>
        <div className="metric-card">
          <h3>Avg Performance</h3>
          <p className="metric-value">{(metrics?.[0]?.avg_performance || 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Department Statistics */}
      <div className="chart-section">
        <h2>Department Statistics</h2>
        <div className="dept-stats">
          {deptStats?.map(dept => (
            <div key={dept.department} className="dept-card">
              <h3>{dept.department}</h3>
              <p>Employees: {dept.employee_count}</p>
              <p>Avg Salary: {formatCurrency(dept.avg_salary)}</p>
              <p>Salary Range: {formatCurrency(dept.min_salary)} - {formatCurrency(dept.max_salary)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hiring Trends */}
      <div className="chart-section">
        <h2>Hiring Trends (Last 12 Months)</h2>
        <div className="trend-chart">
          {hiringTrends?.map(trend => (
            <div key={trend.month} className="trend-bar">
              <div className="bar" style={{ height: `${trend.hires * 10}px` }}></div>
              <span>{new Date(trend.month).toLocaleDateString('en-US', { month: 'short' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
```

### Vue Examples

#### CSV Data Importer
Upload and analyze CSV files interactively.

```vue
<!-- src/components/CSVAnalyzer.vue -->
<template>
  <div class="csv-analyzer">
    <h1>CSV Data Analyzer</h1>
    
    <!-- File Upload -->
    <div class="upload-section">
      <input 
        ref="fileInput"
        type="file" 
        accept=".csv" 
        @change="handleFileUpload"
        :disabled="importing"
      />
      
      <div v-if="importing" class="progress">
        <div class="spinner"></div>
        <p>Importing {{ importProgress }}%</p>
      </div>
      
      <div v-if="importError" class="error">
        Import failed: {{ importError.message }}
      </div>
    </div>

    <!-- Data Analysis -->
    <div v-if="tableName && !importing" class="analysis-section">
      <h2>Data Analysis: {{ tableName }}</h2>
      
      <!-- Basic Statistics -->
      <div v-if="basicStats" class="stats-grid">
        <div class="stat-card">
          <h3>Total Rows</h3>
          <p>{{ basicStats.total_rows }}</p>
        </div>
        <div class="stat-card">
          <h3>Columns</h3>
          <p>{{ basicStats.column_count }}</p>
        </div>
      </div>

      <!-- Column Information -->
      <div v-if="columnInfo" class="columns-section">
        <h3>Column Information</h3>
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Type</th>
              <th>Non-Null Count</th>
              <th>Sample Values</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="col in columnInfo" :key="col.column_name">
              <td>{{ col.column_name }}</td>
              <td>{{ col.data_type }}</td>
              <td>{{ col.non_null_count }}</td>
              <td>{{ col.sample_values }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Data Preview -->
      <div v-if="previewData" class="preview-section">
        <h3>Data Preview (First 10 rows)</h3>
        <table>
          <thead>
            <tr>
              <th v-for="header in Object.keys(previewData[0] || {})" :key="header">
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in previewData" :key="index">
              <td v-for="(value, key) in row" :key="key">
                {{ value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Quick Queries -->
      <div class="quick-queries">
        <h3>Quick Analysis</h3>
        <button @click="runNumericAnalysis">Numeric Column Analysis</button>
        <button @click="runTextAnalysis">Text Column Analysis</button>
        <button @click="runMissingDataAnalysis">Missing Data Analysis</button>
      </div>

      <!-- Analysis Results -->
      <div v-if="analysisResults" class="analysis-results">
        <h3>Analysis Results</h3>
        <pre>{{ JSON.stringify(analysisResults, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useImportCSV, useQuery } from '@northprint/duckdb-wasm-adapter-vue';

const fileInput = ref(null);
const tableName = ref('');
const analysisResults = ref(null);

// CSV Import
const { 
  importCSV, 
  loading: importing, 
  error: importError, 
  progress: importProgress 
} = useImportCSV({
  onSuccess: (result) => {
    tableName.value = result.tableName;
    console.log('CSV imported successfully:', result);
  }
});

// Basic statistics query
const { data: basicStats } = useQuery(
  computed(() => tableName.value ? `
    SELECT 
      COUNT(*) as total_rows,
      COUNT(DISTINCT 1) as column_count
    FROM ${tableName.value}
  ` : ''),
  undefined,
  { enabled: computed(() => Boolean(tableName.value)) }
);

// Column information
const { data: columnInfo } = useQuery(
  computed(() => tableName.value ? `
    SELECT 
      column_name,
      data_type,
      COUNT(*) as non_null_count,
      STRING_AGG(DISTINCT CAST(column_name AS VARCHAR), ', ') as sample_values
    FROM information_schema.columns 
    WHERE table_name = '${tableName.value}'
    GROUP BY column_name, data_type
  ` : ''),
  undefined,
  { enabled: computed(() => Boolean(tableName.value)) }
);

// Data preview
const { data: previewData } = useQuery(
  computed(() => tableName.value ? `SELECT * FROM ${tableName.value} LIMIT 10` : ''),
  undefined,
  { enabled: computed(() => Boolean(tableName.value)) }
);

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const timestamp = Date.now();
  const fileName = `csv_data_${timestamp}`;
  
  await importCSV(file, fileName, {
    header: true,
    delimiter: ',',
    nullString: ''
  });
};

const runNumericAnalysis = async () => {
  // Implementation for numeric analysis
  analysisResults.value = { type: 'numeric', message: 'Numeric analysis would go here' };
};

const runTextAnalysis = async () => {
  // Implementation for text analysis  
  analysisResults.value = { type: 'text', message: 'Text analysis would go here' };
};

const runMissingDataAnalysis = async () => {
  // Implementation for missing data analysis
  analysisResults.value = { type: 'missing', message: 'Missing data analysis would go here' };
};
</script>

<style scoped>
.csv-analyzer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.stat-card {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

th, td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
}

th {
  background-color: #f5f5f5;
}

.progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  color: #d32f2f;
  margin: 1rem 0;
}

.quick-queries button {
  margin: 0.5rem;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.analysis-results {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.analysis-results pre {
  overflow-x: auto;
}
</style>
```

### Svelte Examples

#### Real-time Data Monitor
Live updating dashboard with WebSocket integration.

```svelte
<!-- src/components/DataMonitor.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { duckdb, mutation } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = duckdb({ autoConnect: true });
  
  // Reactive queries
  $: metrics = db.query(`
    SELECT 
      COUNT(*) as total_events,
      AVG(value) as avg_value,
      MAX(timestamp) as last_update
    FROM events 
    WHERE timestamp >= datetime('now', '-1 hour')
  `);
  
  $: recentEvents = db.query(`
    SELECT * FROM events 
    ORDER BY timestamp DESC 
    LIMIT 10
  `);
  
  $: eventsByType = db.query(`
    SELECT 
      event_type,
      COUNT(*) as count,
      AVG(value) as avg_value
    FROM events 
    WHERE timestamp >= datetime('now', '-1 hour')
    GROUP BY event_type 
    ORDER BY count DESC
  `);
  
  // Mutation for inserting new events
  const insertEvent = mutation({
    onSuccess: () => {
      // Data will automatically refresh due to reactive queries
      console.log('Event inserted');
    }
  });
  
  // WebSocket connection for real-time data
  let socket;
  let connected = false;
  
  onMount(() => {
    // Initialize table
    insertEvent.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY,
        event_type VARCHAR,
        value DECIMAL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON
      )
    `);
    
    // Connect to WebSocket for real-time data
    connectWebSocket();
  });
  
  function connectWebSocket() {
    socket = new WebSocket('ws://localhost:8080/events');
    
    socket.onopen = () => {
      connected = true;
      console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Insert new event into DuckDB
      insertEvent.execute(
        'INSERT INTO events (event_type, value, metadata) VALUES (?, ?, ?)',
        [data.type, data.value, JSON.stringify(data.metadata || {})]
      );
    };
    
    socket.onclose = () => {
      connected = false;
      console.log('WebSocket disconnected');
      
      // Attempt to reconnect
      setTimeout(connectWebSocket, 5000);
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  function generateMockEvent() {
    const eventTypes = ['page_view', 'click', 'purchase', 'signup'];
    const mockEvent = {
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      value: Math.random() * 100,
      metadata: {
        user_id: Math.floor(Math.random() * 1000),
        page: '/example'
      }
    };
    
    insertEvent.execute(
      'INSERT INTO events (event_type, value, metadata) VALUES (?, ?, ?)',
      [mockEvent.type, mockEvent.value, JSON.stringify(mockEvent.metadata)]
    );
  }
  
  onDestroy(() => {
    if (socket) {
      socket.close();
    }
  });
</script>

<div class="data-monitor">
  <header>
    <h1>Real-time Data Monitor</h1>
    <div class="status" class:connected>
      Status: {connected ? 'Connected' : 'Disconnected'}
    </div>
  </header>

  <!-- Controls -->
  <div class="controls">
    <button on:click={generateMockEvent}>Generate Mock Event</button>
    <button on:click={() => metrics.refresh()}>Refresh Data</button>
  </div>

  <!-- Metrics Dashboard -->
  <div class="metrics-grid">
    {#if $metrics.loading}
      <div class="loading">Loading metrics...</div>
    {:else if $metrics.data}
      <div class="metric-card">
        <h3>Total Events (1h)</h3>
        <div class="metric-value">{$metrics.data[0]?.total_events || 0}</div>
      </div>
      
      <div class="metric-card">
        <h3>Average Value</h3>
        <div class="metric-value">{($metrics.data[0]?.avg_value || 0).toFixed(2)}</div>
      </div>
      
      <div class="metric-card">
        <h3>Last Update</h3>
        <div class="metric-value">{$metrics.data[0]?.last_update || 'Never'}</div>
      </div>
    {/if}
  </div>

  <!-- Events by Type -->
  <div class="events-by-type">
    <h2>Events by Type (Last Hour)</h2>
    {#if $eventsByType.loading}
      <div class="loading">Loading...</div>
    {:else if $eventsByType.data}
      <div class="type-grid">
        {#each $eventsByType.data as eventType}
          <div class="type-card">
            <h4>{eventType.event_type}</h4>
            <p>Count: {eventType.count}</p>
            <p>Avg Value: {eventType.avg_value.toFixed(2)}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Recent Events -->
  <div class="recent-events">
    <h2>Recent Events</h2>
    {#if $recentEvents.loading}
      <div class="loading">Loading events...</div>
    {:else if $recentEvents.data}
      <div class="events-list">
        {#each $recentEvents.data as event}
          <div class="event-item">
            <div class="event-type">{event.event_type}</div>
            <div class="event-value">{event.value}</div>
            <div class="event-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .data-monitor {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  .status {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    background: #f44336;
    color: white;
  }
  
  .status.connected {
    background: #4caf50;
  }
  
  .controls {
    margin-bottom: 2rem;
  }
  
  .controls button {
    margin-right: 1rem;
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .metric-card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
  }
  
  .metric-value {
    font-size: 2rem;
    font-weight: bold;
    color: #007bff;
    margin-top: 0.5rem;
  }
  
  .type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .type-card {
    background: #e3f2fd;
    padding: 1rem;
    border-radius: 4px;
  }
  
  .events-list {
    max-height: 400px;
    overflow-y: auto;
  }
  
  .event-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  
  .event-type {
    font-weight: bold;
    color: #007bff;
  }
  
  .event-value {
    color: #28a745;
  }
  
  .event-time {
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .loading {
    text-align: center;
    color: #6c757d;
    padding: 2rem;
  }
</style>
```

## Performance Examples

### Query Optimization

```javascript
// Bad: Multiple queries
const users = useQuery('SELECT * FROM users');
const departments = useQuery('SELECT * FROM departments');
const projects = useQuery('SELECT * FROM projects');

// Good: Single optimized query
const dashboard = useQuery(`
  SELECT 
    u.id,
    u.name,
    u.email,
    d.name as department_name,
    COUNT(p.id) as project_count
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
  LEFT JOIN user_projects up ON u.id = up.user_id
  LEFT JOIN projects p ON up.project_id = p.id
  GROUP BY u.id, u.name, u.email, d.name
  ORDER BY u.name
`);
```

### Caching Strategy

```javascript
// Configure intelligent caching
<DuckDBProvider 
  autoConnect
  config={{
    cache: {
      enabled: true,
      evictionStrategy: 'lru',
      maxEntries: 1000,
      ttl: 300000, // 5 minutes
      memoryLimit: 100 * 1024 * 1024 // 100MB
    }
  }}
>
  <App />
</DuckDBProvider>
```

### Large Dataset Handling

```javascript
// Efficient pagination for large datasets
function LargeDataTable() {
  const [page, setPage] = useState(1);
  const pageSize = 100;
  
  const { data, loading } = useQuery(`
    SELECT * FROM large_table 
    ORDER BY id 
    LIMIT ${pageSize} 
    OFFSET ${(page - 1) * pageSize}
  `);
  
  const { data: countData } = useQuery(
    'SELECT COUNT(*) as total FROM large_table'
  );
  
  const totalPages = Math.ceil((countData?.[0]?.total || 0) / pageSize);
  
  return (
    <div>
      {/* Table content */}
      <Pagination 
        current={page}
        total={totalPages}
        onChange={setPage}
      />
    </div>
  );
}
```

## Integration Examples

### With Chart Libraries

```javascript
// Chart.js integration
import { Chart as ChartJS } from 'chart.js/auto';
import { Line } from 'react-chartjs-2';

function SalesChart() {
  const { data } = useQuery(`
    SELECT 
      DATE(created_at) as date,
      SUM(amount) as total_sales
    FROM orders 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAYS)
    GROUP BY DATE(created_at)
    ORDER BY date
  `);

  const chartData = {
    labels: data?.map(d => d.date) || [],
    datasets: [{
      label: 'Daily Sales',
      data: data?.map(d => d.total_sales) || [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  return <Line data={chartData} />;
}
```

### With State Management

```javascript
// Redux integration
const salesSlice = createSlice({
  name: 'sales',
  initialState: { data: [], loading: false },
  reducers: {
    setSalesData: (state, action) => {
      state.data = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

function SalesComponent() {
  const dispatch = useDispatch();
  const { data: salesData } = useQuery(`
    SELECT * FROM sales ORDER BY date DESC
  `, undefined, {
    onSuccess: (data) => {
      dispatch(salesSlice.actions.setSalesData(data));
    }
  });

  return <div>{/* Component content */}</div>;
}
```

## Testing Examples

### Unit Testing

```javascript
// Testing React components
import { render, waitFor } from '@testing-library/react';
import { DuckDBProvider } from '@northprint/duckdb-wasm-adapter-react';
import UserList from './UserList';

const TestWrapper = ({ children }) => (
  <DuckDBProvider config={{ worker: false }}>
    {children}
  </DuckDBProvider>
);

test('renders user list', async () => {
  render(<UserList />, { wrapper: TestWrapper });
  
  await waitFor(() => {
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
```

### Integration Testing

```javascript
// E2E testing with Playwright
test('user can import CSV and view data', async ({ page }) => {
  await page.goto('/csv-importer');
  
  // Upload CSV file
  await page.setInputFiles('input[type="file"]', 'test-data.csv');
  
  // Wait for import to complete
  await page.waitForText('Import completed');
  
  // Verify data is displayed
  await expect(page.locator('.data-table')).toBeVisible();
  await expect(page.locator('.data-table tr')).toHaveCount(6); // 5 rows + header
});
```

These examples demonstrate real-world usage patterns and best practices for building applications with DuckDB WASM Adapter. Each example is designed to be practical and easily adaptable to your specific needs.
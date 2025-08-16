# Full Application Examples

Complete, production-ready applications using DuckDB WASM Adapter.

## Analytics Dashboard

### Complete Analytics Application

```javascript
// React - Full analytics dashboard
import React, { useState, useEffect } from 'react';
import { 
  DuckDBProvider, 
  useQuery, 
  useMutation,
  useConnection 
} from '@duckdb-wasm-adapter/react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// Main Dashboard Component
function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  return (
    <DuckDBProvider config={{ autoConnect: true }}>
      <div className="dashboard">
        <Header />
        <DateRangePicker 
          value={dateRange} 
          onChange={setDateRange} 
        />
        <MetricsGrid dateRange={dateRange} />
        <ChartsSection 
          dateRange={dateRange} 
          metric={selectedMetric} 
        />
        <DataTable dateRange={dateRange} />
      </div>
    </DuckDBProvider>
  );
}

// Metrics Grid Component
function MetricsGrid({ dateRange }) {
  const { data: metrics } = useQuery(`
    SELECT 
      COUNT(DISTINCT customer_id) as total_customers,
      COUNT(*) as total_orders,
      SUM(amount) as total_revenue,
      AVG(amount) as avg_order_value
    FROM orders
    WHERE order_date BETWEEN ? AND ?
  `, [dateRange.start, dateRange.end]);

  const { data: comparison } = useQuery(`
    WITH current_period AS (
      SELECT 
        COUNT(DISTINCT customer_id) as customers,
        SUM(amount) as revenue
      FROM orders
      WHERE order_date BETWEEN ? AND ?
    ),
    previous_period AS (
      SELECT 
        COUNT(DISTINCT customer_id) as customers,
        SUM(amount) as revenue
      FROM orders
      WHERE order_date BETWEEN 
        ? - INTERVAL '${getDaysBetween(dateRange.start, dateRange.end)} days'
        AND ?
    )
    SELECT 
      c.customers,
      c.revenue,
      ((c.customers - p.customers) / p.customers::FLOAT) * 100 as customer_growth,
      ((c.revenue - p.revenue) / p.revenue::FLOAT) * 100 as revenue_growth
    FROM current_period c, previous_period p
  `, [dateRange.start, dateRange.end, dateRange.start, dateRange.start]);

  if (!metrics || !metrics[0]) return <div>Loading metrics...</div>;

  const metric = metrics[0];
  const comp = comparison?.[0] || {};

  return (
    <div className="metrics-grid">
      <MetricCard
        title="Total Customers"
        value={metric.total_customers}
        change={comp.customer_growth}
        format="number"
      />
      <MetricCard
        title="Total Orders"
        value={metric.total_orders}
        format="number"
      />
      <MetricCard
        title="Revenue"
        value={metric.total_revenue}
        change={comp.revenue_growth}
        format="currency"
      />
      <MetricCard
        title="Avg Order Value"
        value={metric.avg_order_value}
        format="currency"
      />
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, change, format }) {
  const formatValue = (val) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(val);
    }
    return new Intl.NumberFormat('en-US').format(val);
  };

  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <div className="value">{formatValue(value)}</div>
      {change !== undefined && (
        <div className={`change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// Charts Section
function ChartsSection({ dateRange, metric }) {
  const { data: timeSeriesData } = useQuery(`
    SELECT 
      DATE_TRUNC('day', order_date) as date,
      COUNT(*) as orders,
      SUM(amount) as revenue,
      COUNT(DISTINCT customer_id) as customers
    FROM orders
    WHERE order_date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `, [dateRange.start, dateRange.end]);

  const { data: categoryData } = useQuery(`
    SELECT 
      category,
      SUM(amount) as revenue,
      COUNT(*) as orders
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE order_date BETWEEN ? AND ?
    GROUP BY category
    ORDER BY revenue DESC
    LIMIT 10
  `, [dateRange.start, dateRange.end]);

  const { data: customerSegments } = useQuery(`
    WITH customer_totals AS (
      SELECT 
        customer_id,
        SUM(amount) as total_spent,
        COUNT(*) as order_count
      FROM orders
      WHERE order_date BETWEEN ? AND ?
      GROUP BY customer_id
    )
    SELECT 
      CASE 
        WHEN total_spent >= 10000 THEN 'VIP'
        WHEN total_spent >= 5000 THEN 'Premium'
        WHEN total_spent >= 1000 THEN 'Regular'
        ELSE 'New'
      END as segment,
      COUNT(*) as customer_count,
      SUM(total_spent) as segment_revenue
    FROM customer_totals
    GROUP BY segment
  `, [dateRange.start, dateRange.end]);

  return (
    <div className="charts-section">
      <div className="chart-container">
        <h3>Trend Over Time</h3>
        <LineChart width={600} height={300} data={timeSeriesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={metric} 
            stroke="#8884d8" 
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </div>

      <div className="chart-container">
        <h3>Revenue by Category</h3>
        <BarChart width={600} height={300} data={categoryData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#82ca9d" />
        </BarChart>
      </div>

      <div className="chart-container">
        <h3>Customer Segments</h3>
        <PieChart width={400} height={300}>
          <Pie
            data={customerSegments}
            dataKey="customer_count"
            nameKey="segment"
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#8884d8"
            label
          />
          <Tooltip />
        </PieChart>
      </div>
    </div>
  );
}

// Data Table with Filtering and Sorting
function DataTable({ dateRange }) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('order_date');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [filters, setFilters] = useState({});

  const buildWhereClause = () => {
    const conditions = [`order_date BETWEEN '${dateRange.start.toISOString()}' AND '${dateRange.end.toISOString()}'`];
    
    if (filters.customer) {
      conditions.push(`customer_name ILIKE '%${filters.customer}%'`);
    }
    if (filters.status) {
      conditions.push(`status = '${filters.status}'`);
    }
    if (filters.minAmount) {
      conditions.push(`amount >= ${filters.minAmount}`);
    }
    
    return conditions.join(' AND ');
  };

  const { data: orders, loading } = useQuery(`
    SELECT 
      o.id,
      o.order_date,
      c.name as customer_name,
      o.amount,
      o.status,
      COUNT(oi.id) as item_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE ${buildWhereClause()}
    GROUP BY o.id, o.order_date, c.name, o.amount, o.status
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${pageSize} OFFSET ${page * pageSize}
  `);

  const { data: totalCount } = useQuery(`
    SELECT COUNT(*) as count
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE ${buildWhereClause()}
  `);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('ASC');
    }
  };

  return (
    <div className="data-table">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Filter by customer..."
          value={filters.customer || ''}
          onChange={(e) => setFilters({...filters, customer: e.target.value})}
        />
        <select 
          value={filters.status || ''} 
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="number"
          placeholder="Min amount..."
          value={filters.minAmount || ''}
          onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
        />
      </div>

      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('id')}>
              Order ID {sortBy === 'id' && (sortOrder === 'ASC' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('order_date')}>
              Date {sortBy === 'order_date' && (sortOrder === 'ASC' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('customer_name')}>
              Customer {sortBy === 'customer_name' && (sortOrder === 'ASC' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('amount')}>
              Amount {sortBy === 'amount' && (sortOrder === 'ASC' ? '▲' : '▼')}
            </th>
            <th>Items</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan="6">Loading...</td>
            </tr>
          )}
          {orders?.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{new Date(order.order_date).toLocaleDateString()}</td>
              <td>{order.customer_name}</td>
              <td>${order.amount.toFixed(2)}</td>
              <td>{order.item_count}</td>
              <td>
                <span className={`status ${order.status}`}>
                  {order.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>
          Page {page + 1} of {Math.ceil((totalCount?.[0]?.count || 0) / pageSize)}
        </span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!orders || orders.length < pageSize}
        >
          Next
        </button>
        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>
    </div>
  );
}

// Export functionality
function ExportButton({ query, filename }) {
  const { connection } = useConnection();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    
    try {
      const data = await connection.execute(query);
      
      if (format === 'csv') {
        const csv = convertToCSV(data);
        downloadFile(csv, `${filename}.csv`, 'text/csv');
      } else if (format === 'json') {
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `${filename}.json`, 'application/json');
      } else if (format === 'excel') {
        await exportToExcel(data, filename);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-button">
      <button disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export'}
      </button>
      <div className="export-options">
        <button onClick={() => handleExport('csv')}>CSV</button>
        <button onClick={() => handleExport('json')}>JSON</button>
        <button onClick={() => handleExport('excel')}>Excel</button>
      </div>
    </div>
  );
}
```

## Data Explorer Application

### Interactive Data Explorer

```javascript
// Vue 3 - Complete data explorer
<template>
  <div class="data-explorer">
    <div class="sidebar">
      <SchemaExplorer 
        :tables="tables"
        @select-table="selectTable"
      />
    </div>
    
    <div class="main-content">
      <QueryEditor
        v-model="currentQuery"
        @execute="executeQuery"
      />
      
      <ResultsView
        :results="queryResults"
        :loading="loading"
        :error="error"
      />
      
      <QueryHistory
        :history="queryHistory"
        @select="selectHistoryItem"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useConnection } from '@duckdb-wasm-adapter/vue';

// Schema Explorer Component
const SchemaExplorer = {
  props: ['tables'],
  template: `
    <div class="schema-explorer">
      <h3>Database Schema</h3>
      <div class="search">
        <input 
          v-model="searchTerm" 
          placeholder="Search tables..."
        />
      </div>
      <div class="tables-list">
        <div 
          v-for="table in filteredTables" 
          :key="table.name"
          class="table-item"
          @click="$emit('select-table', table)"
        >
          <div class="table-header" @click="toggleTable(table.name)">
            <span class="icon">{{ expanded[table.name] ? '▼' : '▶' }}</span>
            <span class="name">{{ table.name }}</span>
            <span class="count">{{ table.row_count }} rows</span>
          </div>
          <div v-if="expanded[table.name]" class="columns">
            <div 
              v-for="column in table.columns" 
              :key="column.name"
              class="column"
            >
              <span class="col-name">{{ column.name }}</span>
              <span class="col-type">{{ column.type }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const searchTerm = ref('');
    const expanded = ref({});
    
    const filteredTables = computed(() => {
      if (!searchTerm.value) return tables.value;
      return tables.value.filter(t => 
        t.name.toLowerCase().includes(searchTerm.value.toLowerCase())
      );
    });
    
    const toggleTable = (name) => {
      expanded.value[name] = !expanded.value[name];
    };
    
    return { searchTerm, expanded, filteredTables, toggleTable };
  }
};

// Query Editor Component
const QueryEditor = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'execute'],
  template: `
    <div class="query-editor">
      <div class="editor-toolbar">
        <button @click="$emit('execute')" :disabled="!modelValue">
          Run Query (Ctrl+Enter)
        </button>
        <button @click="formatQuery">Format</button>
        <button @click="saveQuery">Save</button>
        <select @change="loadTemplate">
          <option value="">Query Templates...</option>
          <option value="select">SELECT Template</option>
          <option value="join">JOIN Template</option>
          <option value="aggregate">Aggregate Template</option>
        </select>
      </div>
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown="handleKeydown"
        placeholder="Enter SQL query..."
        class="sql-editor"
      />
      <div class="editor-status">
        Line {{ cursorLine }}, Col {{ cursorCol }}
      </div>
    </div>
  `,
  setup(props, { emit }) {
    const cursorLine = ref(1);
    const cursorCol = ref(1);
    
    const handleKeydown = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        emit('execute');
      }
    };
    
    const formatQuery = () => {
      // Simple SQL formatting
      let formatted = props.modelValue
        .replace(/\s+/g, ' ')
        .replace(/,/g, ',\n  ')
        .replace(/FROM/gi, '\nFROM')
        .replace(/WHERE/gi, '\nWHERE')
        .replace(/GROUP BY/gi, '\nGROUP BY')
        .replace(/ORDER BY/gi, '\nORDER BY');
      
      emit('update:modelValue', formatted);
    };
    
    const loadTemplate = (e) => {
      const templates = {
        select: 'SELECT \n  *\nFROM \n  table_name\nWHERE \n  condition',
        join: 'SELECT \n  t1.*, \n  t2.column\nFROM \n  table1 t1\nJOIN \n  table2 t2 ON t1.id = t2.foreign_id',
        aggregate: 'SELECT \n  group_column,\n  COUNT(*) as count,\n  SUM(value) as total\nFROM \n  table_name\nGROUP BY \n  group_column'
      };
      
      if (templates[e.target.value]) {
        emit('update:modelValue', templates[e.target.value]);
      }
    };
    
    return { cursorLine, cursorCol, handleKeydown, formatQuery, loadTemplate };
  }
};

// Results View Component
const ResultsView = {
  props: ['results', 'loading', 'error'],
  template: `
    <div class="results-view">
      <div v-if="loading" class="loading">
        Executing query...
      </div>
      
      <div v-else-if="error" class="error">
        <h4>Error</h4>
        <pre>{{ error }}</pre>
      </div>
      
      <div v-else-if="results">
        <div class="results-header">
          <span>{{ results.length }} rows returned in {{ executionTime }}ms</span>
          <div class="actions">
            <button @click="exportCSV">Export CSV</button>
            <button @click="exportJSON">Export JSON</button>
            <button @click="createChart">Visualize</button>
          </div>
        </div>
        
        <div class="results-table-wrapper">
          <table class="results-table">
            <thead>
              <tr>
                <th v-for="col in columns" :key="col">
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in paginatedResults" :key="idx">
                <td v-for="col in columns" :key="col">
                  {{ formatValue(row[col]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="pagination">
          <button @click="page--" :disabled="page === 0">Previous</button>
          <span>Page {{ page + 1 }} of {{ totalPages }}</span>
          <button @click="page++" :disabled="page >= totalPages - 1">Next</button>
        </div>
      </div>
      
      <div v-else class="empty">
        No results to display. Execute a query to see results.
      </div>
    </div>
  `,
  setup(props) {
    const page = ref(0);
    const pageSize = ref(100);
    const executionTime = ref(0);
    
    const columns = computed(() => {
      if (!props.results || props.results.length === 0) return [];
      return Object.keys(props.results[0]);
    });
    
    const paginatedResults = computed(() => {
      if (!props.results) return [];
      const start = page.value * pageSize.value;
      return props.results.slice(start, start + pageSize.value);
    });
    
    const totalPages = computed(() => {
      if (!props.results) return 0;
      return Math.ceil(props.results.length / pageSize.value);
    });
    
    const formatValue = (value) => {
      if (value === null) return 'NULL';
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    };
    
    const exportCSV = () => {
      const csv = convertToCSV(props.results);
      downloadFile(csv, 'query-results.csv', 'text/csv');
    };
    
    const exportJSON = () => {
      const json = JSON.stringify(props.results, null, 2);
      downloadFile(json, 'query-results.json', 'application/json');
    };
    
    return {
      page,
      pageSize,
      executionTime,
      columns,
      paginatedResults,
      totalPages,
      formatValue,
      exportCSV,
      exportJSON
    };
  }
};

// Main Application Setup
const { connection } = useConnection();
const tables = ref([]);
const currentQuery = ref('');
const queryResults = ref(null);
const loading = ref(false);
const error = ref(null);
const queryHistory = ref([]);

const loadSchema = async () => {
  const tablesResult = await connection.execute(`
    SELECT 
      table_name,
      COUNT(*) as row_count
    FROM information_schema.tables t
    LEFT JOIN (
      SELECT table_name as tn, COUNT(*) as cnt
      FROM information_schema.columns
      GROUP BY table_name
    ) c ON t.table_name = c.tn
    WHERE table_schema = 'main'
    GROUP BY table_name
  `);
  
  for (const table of tablesResult) {
    const columns = await connection.execute(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = ?
    `, [table.table_name]);
    
    tables.value.push({
      name: table.table_name,
      row_count: table.row_count,
      columns: columns.map(c => ({
        name: c.column_name,
        type: c.data_type
      }))
    });
  }
};

const executeQuery = async () => {
  loading.value = true;
  error.value = null;
  
  const startTime = Date.now();
  
  try {
    queryResults.value = await connection.execute(currentQuery.value);
    
    queryHistory.value.unshift({
      query: currentQuery.value,
      timestamp: new Date(),
      rowCount: queryResults.value.length,
      executionTime: Date.now() - startTime
    });
    
    // Keep only last 50 queries in history
    if (queryHistory.value.length > 50) {
      queryHistory.value = queryHistory.value.slice(0, 50);
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
};

const selectTable = (table) => {
  currentQuery.value = `SELECT * FROM ${table.name} LIMIT 100`;
};

const selectHistoryItem = (item) => {
  currentQuery.value = item.query;
};

onMounted(() => {
  loadSchema();
});
</script>
```

## Real-time Dashboard with WebSocket

### Live Data Monitoring

```javascript
// Svelte - Real-time monitoring dashboard
<script>
  import { onMount, onDestroy } from 'svelte';
  import { duckdb } from '@duckdb-wasm-adapter/svelte';
  
  const db = duckdb({ autoConnect: true });
  
  let websocket;
  let metrics = [];
  let alerts = [];
  let realtimeData = [];
  let chartData = [];
  
  // Initialize WebSocket connection
  onMount(() => {
    websocket = new WebSocket('ws://localhost:8080/stream');
    
    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      // Store in DuckDB for analysis
      await db.connection.execute(`
        INSERT INTO realtime_events VALUES (?, ?, ?, ?)
      `, [data.timestamp, data.type, data.value, JSON.stringify(data.metadata)]);
      
      // Update displays
      await updateMetrics();
      await checkAlerts();
      updateCharts();
    };
    
    // Initial setup
    setupDatabase();
    startPolling();
  });
  
  onDestroy(() => {
    if (websocket) websocket.close();
  });
  
  async function setupDatabase() {
    await db.connection.execute(`
      CREATE TABLE IF NOT EXISTS realtime_events (
        timestamp TIMESTAMP,
        type VARCHAR,
        value DOUBLE,
        metadata JSON
      )
    `);
    
    await db.connection.execute(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY,
        name VARCHAR,
        condition VARCHAR,
        threshold DOUBLE,
        action VARCHAR
      )
    `);
    
    // Insert default alert rules
    await db.connection.execute(`
      INSERT INTO alert_rules VALUES 
      (1, 'High CPU', 'cpu_usage > threshold', 80, 'notify'),
      (2, 'Low Memory', 'memory_available < threshold', 1000, 'alert'),
      (3, 'Error Rate', 'error_rate > threshold', 5, 'critical')
    `);
  }
  
  async function updateMetrics() {
    const result = await db.connection.execute(`
      WITH recent_events AS (
        SELECT * FROM realtime_events
        WHERE timestamp > NOW() - INTERVAL '5 minutes'
      )
      SELECT 
        type,
        COUNT(*) as count,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        STDDEV(value) as std_dev
      FROM recent_events
      GROUP BY type
    `);
    
    metrics = result;
  }
  
  async function checkAlerts() {
    const rules = await db.connection.execute(`
      SELECT * FROM alert_rules
    `);
    
    for (const rule of rules) {
      const result = await db.connection.execute(`
        WITH latest AS (
          SELECT value 
          FROM realtime_events 
          WHERE type = ?
          ORDER BY timestamp DESC 
          LIMIT 1
        )
        SELECT 
          CASE WHEN value > ? THEN true ELSE false END as triggered
        FROM latest
      `, [rule.name.toLowerCase().replace(' ', '_'), rule.threshold]);
      
      if (result[0]?.triggered) {
        alerts = [...alerts, {
          rule: rule.name,
          timestamp: new Date(),
          severity: rule.action,
          message: `${rule.name} threshold exceeded: ${rule.threshold}`
        }];
      }
    }
  }
  
  function updateCharts() {
    // Update chart data with latest values
    db.connection.execute(`
      SELECT 
        DATE_TRUNC('minute', timestamp) as time,
        type,
        AVG(value) as avg_value
      FROM realtime_events
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY time, type
      ORDER BY time
    `).then(result => {
      chartData = result;
    });
  }
  
  function startPolling() {
    setInterval(async () => {
      await updateMetrics();
      await checkAlerts();
      updateCharts();
    }, 5000); // Update every 5 seconds
  }
</script>

<div class="realtime-dashboard">
  <header>
    <h1>Real-time Monitoring Dashboard</h1>
    <div class="status">
      {#if websocket?.readyState === WebSocket.OPEN}
        <span class="connected">● Connected</span>
      {:else}
        <span class="disconnected">● Disconnected</span>
      {/if}
    </div>
  </header>
  
  <div class="alerts-panel">
    <h2>Active Alerts ({alerts.length})</h2>
    {#each alerts as alert}
      <div class="alert {alert.severity}">
        <span class="time">{alert.timestamp.toLocaleTimeString()}</span>
        <span class="rule">{alert.rule}</span>
        <span class="message">{alert.message}</span>
      </div>
    {/each}
  </div>
  
  <div class="metrics-grid">
    {#each metrics as metric}
      <div class="metric-panel">
        <h3>{metric.type}</h3>
        <div class="metric-value">{metric.avg_value?.toFixed(2)}</div>
        <div class="metric-stats">
          <span>Min: {metric.min_value?.toFixed(2)}</span>
          <span>Max: {metric.max_value?.toFixed(2)}</span>
          <span>Count: {metric.count}</span>
        </div>
      </div>
    {/each}
  </div>
  
  <div class="chart-container">
    <TimeSeriesChart data={chartData} />
  </div>
  
  <div class="controls">
    <button on:click={() => exportData()}>Export Data</button>
    <button on:click={() => clearOldData()}>Clear Old Data</button>
    <button on:click={() => configureAlerts()}>Configure Alerts</button>
  </div>
</div>

<style>
  .realtime-dashboard {
    display: grid;
    grid-template-areas:
      "header header"
      "alerts metrics"
      "chart chart"
      "controls controls";
    gap: 20px;
    padding: 20px;
  }
  
  .alerts-panel {
    grid-area: alerts;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .alert {
    padding: 10px;
    margin: 5px 0;
    border-radius: 4px;
  }
  
  .alert.critical {
    background: #ff4444;
    color: white;
  }
  
  .alert.alert {
    background: #ff9944;
  }
  
  .alert.notify {
    background: #ffdd44;
  }
  
  .metrics-grid {
    grid-area: metrics;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  .metric-panel {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
  }
  
  .metric-value {
    font-size: 2em;
    font-weight: bold;
    color: #333;
  }
</style>
```

## Best Practices

1. **Component organization** - Keep components small and focused
2. **State management** - Use appropriate state management patterns
3. **Error handling** - Implement comprehensive error handling
4. **Performance** - Optimize queries and use caching
5. **User experience** - Provide loading states and feedback
6. **Accessibility** - Ensure applications are accessible
7. **Testing** - Write tests for critical functionality
8. **Documentation** - Document complex logic and APIs

## Next Steps

- [Deployment Guide](/guide/deployment) - Deploy to production
- [Performance Guide](/guide/performance) - Optimize applications
- [API Reference](/api/) - Complete API documentation
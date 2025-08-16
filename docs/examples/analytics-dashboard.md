# Analytics Dashboard Example

A comprehensive analytics dashboard showcasing advanced data visualization and real-time metrics with DuckDB WASM Adapter.

## Overview

This example demonstrates how to build a powerful analytics dashboard that processes and visualizes large datasets entirely in the browser. We'll create a sales analytics dashboard with real-time metrics, charts, and interactive filters.

## Features

- Real-time metric calculations
- Interactive charts and visualizations
- Advanced filtering and date range selection
- Export functionality
- Responsive design
- Performance optimizations for large datasets

## React Implementation

### Main Dashboard Component

```jsx
// src/components/AnalyticsDashboard.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';
import MetricsGrid from './MetricsGrid';
import SalesChart from './SalesChart';
import RegionBreakdown from './RegionBreakdown';
import TopProducts from './TopProducts';
import FilterPanel from './FilterPanel';
import ExportPanel from './ExportPanel';
import './AnalyticsDashboard.css';

function AnalyticsDashboard() {
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
    region: '',
    category: '',
    salesperson: ''
  });

  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Build dynamic WHERE clause based on filters
  const whereClause = useMemo(() => {
    const conditions = [];
    const params = [];

    conditions.push('sale_date >= ?');
    params.push(filters.startDate.toISOString().split('T')[0]);

    conditions.push('sale_date <= ?');
    params.push(filters.endDate.toISOString().split('T')[0]);

    if (filters.region) {
      conditions.push('region = ?');
      params.push(filters.region);
    }

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.salesperson) {
      conditions.push('salesperson = ?');
      params.push(filters.salesperson);
    }

    return {
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }, [filters]);

  // Key Performance Metrics
  const { data: metrics, loading: metricsLoading } = useQuery(
    `SELECT 
       COUNT(*) as total_sales,
       SUM(amount) as total_revenue,
       AVG(amount) as avg_order_value,
       COUNT(DISTINCT customer_id) as unique_customers,
       SUM(quantity) as total_units,
       AVG(profit_margin) as avg_profit_margin
     FROM sales s
     JOIN products p ON s.product_id = p.id
     ${whereClause.where}`,
    whereClause.params,
    {
      refetchInterval: refreshInterval
    }
  );

  // Sales trend over time
  const { data: salesTrend } = useQuery(
    `SELECT 
       DATE_TRUNC('day', sale_date) as date,
       SUM(amount) as daily_revenue,
       COUNT(*) as daily_orders,
       AVG(amount) as avg_order_value
     FROM sales s
     JOIN products p ON s.product_id = p.id
     ${whereClause.where}
     GROUP BY DATE_TRUNC('day', sale_date)
     ORDER BY date`,
    whereClause.params,
    {
      refetchInterval: refreshInterval
    }
  );

  // Regional performance
  const { data: regionData } = useQuery(
    `SELECT 
       region,
       SUM(amount) as revenue,
       COUNT(*) as orders,
       AVG(amount) as avg_order_value,
       COUNT(DISTINCT customer_id) as customers
     FROM sales s
     JOIN products p ON s.product_id = p.id
     ${whereClause.where}
     GROUP BY region
     ORDER BY revenue DESC`,
    whereClause.params,
    {
      refetchInterval: refreshInterval
    }
  );

  // Top performing products
  const { data: topProducts } = useQuery(
    `SELECT 
       p.name,
       p.category,
       SUM(s.quantity) as units_sold,
       SUM(s.amount) as revenue,
       AVG(s.amount / s.quantity) as avg_price,
       AVG(p.profit_margin) as profit_margin
     FROM sales s
     JOIN products p ON s.product_id = p.id
     ${whereClause.where}
     GROUP BY p.id, p.name, p.category
     ORDER BY revenue DESC
     LIMIT 10`,
    whereClause.params,
    {
      refetchInterval: refreshInterval
    }
  );

  // Salesperson performance
  const { data: salesperformance } = useQuery(
    `SELECT 
       salesperson,
       SUM(amount) as revenue,
       COUNT(*) as sales_count,
       AVG(amount) as avg_deal_size,
       COUNT(DISTINCT customer_id) as customers_served
     FROM sales s
     JOIN products p ON s.product_id = p.id
     ${whereClause.where}
     GROUP BY salesperson
     ORDER BY revenue DESC`,
    whereClause.params,
    {
      refetchInterval: refreshInterval
    }
  );

  // Customer analytics
  const { data: customerAnalytics } = useQuery(
    `SELECT 
       COUNT(DISTINCT customer_id) as total_customers,
       AVG(customer_orders.order_count) as avg_orders_per_customer,
       AVG(customer_orders.total_spent) as avg_customer_value,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY customer_orders.total_spent) as median_customer_value
     FROM (
       SELECT 
         customer_id,
         COUNT(*) as order_count,
         SUM(amount) as total_spent
       FROM sales s
       JOIN products p ON s.product_id = p.id
       ${whereClause.where}
       GROUP BY customer_id
     ) customer_orders`,
    whereClause.params,
    {
      refetchInterval: refreshInterval
    }
  );

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>Sales Analytics Dashboard</h1>
        <div className="header-controls">
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
            <option value={0}>Manual only</option>
          </select>
          <ExportPanel 
            filters={filters}
            whereClause={whereClause}
          />
        </div>
      </div>

      <FilterPanel 
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <MetricsGrid 
        metrics={metrics?.[0]}
        customerAnalytics={customerAnalytics?.[0]}
        loading={metricsLoading}
        formatCurrency={formatCurrency}
        formatNumber={formatNumber}
      />

      <div className="charts-grid">
        <div className="chart-container">
          <SalesChart 
            data={salesTrend}
            title="Sales Trend"
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="chart-container">
          <RegionBreakdown 
            data={regionData}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="chart-container">
          <TopProducts 
            data={topProducts}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        </div>

        <div className="chart-container">
          <SalespersonPerformance 
            data={salesperformance}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
          />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
```

### Metrics Grid Component

```jsx
// src/components/MetricsGrid.jsx
import React from 'react';

function MetricsGrid({ metrics, customerAnalytics, loading, formatCurrency, formatNumber }) {
  if (loading) {
    return (
      <div className="metrics-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="metric-card loading">
            <div className="skeleton-text"></div>
            <div className="skeleton-number"></div>
          </div>
        ))}
      </div>
    );
  }

  const metricsData = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics?.total_revenue),
      change: '+12.5%',
      changeType: 'positive',
      icon: '💰'
    },
    {
      title: 'Total Orders',
      value: formatNumber(metrics?.total_sales),
      change: '+8.2%',
      changeType: 'positive',
      icon: '📊'
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(metrics?.avg_order_value),
      change: '+3.1%',
      changeType: 'positive',
      icon: '🛒'
    },
    {
      title: 'Unique Customers',
      value: formatNumber(metrics?.unique_customers),
      change: '+15.7%',
      changeType: 'positive',
      icon: '👥'
    },
    {
      title: 'Units Sold',
      value: formatNumber(metrics?.total_units),
      change: '+6.4%',
      changeType: 'positive',
      icon: '📦'
    },
    {
      title: 'Avg Profit Margin',
      value: `${(metrics?.avg_profit_margin || 0).toFixed(1)}%`,
      change: '-1.2%',
      changeType: 'negative',
      icon: '📈'
    }
  ];

  return (
    <div className="metrics-grid">
      {metricsData.map((metric, index) => (
        <div key={index} className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">{metric.icon}</span>
            <span className="metric-title">{metric.title}</span>
          </div>
          <div className="metric-value">{metric.value}</div>
          <div className={`metric-change ${metric.changeType}`}>
            {metric.change} vs last period
          </div>
        </div>
      ))}
    </div>
  );
}

export default MetricsGrid;
```

### Sales Chart Component

```jsx
// src/components/SalesChart.jsx
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

function SalesChart({ data, title, formatCurrency }) {
  const chartData = useMemo(() => {
    if (!data) return [];

    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      revenue: item.daily_revenue,
      orders: item.daily_orders,
      avgOrderValue: item.avg_order_value
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-revenue">
            Revenue: {formatCurrency(payload[0]?.value)}
          </p>
          <p className="tooltip-orders">
            Orders: {payload[1]?.value || 0}
          </p>
          <p className="tooltip-avg">
            Avg Order: {formatCurrency(payload[2]?.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="revenue" orientation="left" />
          <YAxis yAxisId="orders" orientation="right" />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            yAxisId="revenue"
            type="monotone" 
            dataKey="revenue" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
          />
          <Line 
            yAxisId="orders"
            type="monotone" 
            dataKey="orders" 
            stroke="#82ca9d" 
            strokeWidth={2}
            dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SalesChart;
```

### Region Breakdown Component

```jsx
// src/components/RegionBreakdown.jsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

function RegionBreakdown({ data, formatCurrency }) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const chartData = data?.map((item, index) => ({
    name: item.region,
    value: item.revenue,
    orders: item.orders,
    customers: item.customers,
    fill: COLORS[index % COLORS.length]
  })) || [];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{data.name}</p>
          <p>Revenue: {formatCurrency(data.value)}</p>
          <p>Orders: {data.orders}</p>
          <p>Customers: {data.customers}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Revenue by Region</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RegionBreakdown;
```

### Top Products Component

```jsx
// src/components/TopProducts.jsx
import React from 'react';

function TopProducts({ data, formatCurrency, formatNumber }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-wrapper">
        <h3 className="chart-title">Top Products</h3>
        <div className="no-data">No data available</div>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <h3 className="chart-title">Top Products by Revenue</h3>
      <div className="products-list">
        {data.map((product, index) => (
          <div key={index} className="product-item">
            <div className="product-rank">#{index + 1}</div>
            <div className="product-info">
              <div className="product-name">{product.name}</div>
              <div className="product-category">{product.category}</div>
            </div>
            <div className="product-metrics">
              <div className="product-revenue">
                {formatCurrency(product.revenue)}
              </div>
              <div className="product-units">
                {formatNumber(product.units_sold)} units
              </div>
              <div className="product-margin">
                {product.profit_margin.toFixed(1)}% margin
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopProducts;
```

### Filter Panel Component

```jsx
// src/components/FilterPanel.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@northprint/duckdb-wasm-adapter-react';

function FilterPanel({ filters, onFilterChange }) {
  const [localFilters, setLocalFilters] = useState(filters);

  // Get filter options from database
  const { data: regions } = useQuery(
    'SELECT DISTINCT region FROM sales ORDER BY region'
  );

  const { data: categories } = useQuery(
    'SELECT DISTINCT category FROM products ORDER BY category'
  );

  const { data: salespeople } = useQuery(
    'SELECT DISTINCT salesperson FROM sales ORDER BY salesperson'
  );

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleInputChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (field, value) => {
    const date = value ? new Date(value) : new Date();
    handleInputChange(field, date);
  };

  const clearFilters = () => {
    const clearedFilters = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      region: '',
      category: '',
      salesperson: ''
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="filter-panel">
      <h3>Filters</h3>
      <div className="filter-grid">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={localFilters.startDate.toISOString().split('T')[0]}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={localFilters.endDate.toISOString().split('T')[0]}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Region</label>
          <select
            value={localFilters.region}
            onChange={(e) => handleInputChange('region', e.target.value)}
          >
            <option value="">All Regions</option>
            {regions?.map(item => (
              <option key={item.region} value={item.region}>
                {item.region}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Category</label>
          <select
            value={localFilters.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories?.map(item => (
              <option key={item.category} value={item.category}>
                {item.category}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Salesperson</label>
          <select
            value={localFilters.salesperson}
            onChange={(e) => handleInputChange('salesperson', e.target.value)}
          >
            <option value="">All Salespeople</option>
            {salespeople?.map(item => (
              <option key={item.salesperson} value={item.salesperson}>
                {item.salesperson}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-actions">
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;
```

### Export Panel Component

```jsx
// src/components/ExportPanel.jsx
import React, { useState } from 'react';
import { useExportCSV, useExportJSON } from '@northprint/duckdb-wasm-adapter-react';

function ExportPanel({ filters, whereClause }) {
  const [exporting, setExporting] = useState(false);
  const { exportCSV } = useExportCSV();
  const { exportJSON } = useExportJSON();

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const query = `
        SELECT 
          s.*,
          p.name as product_name,
          p.category,
          p.profit_margin
        FROM sales s
        JOIN products p ON s.product_id = p.id
        ${whereClause.where}
        ORDER BY sale_date DESC
      `;

      if (format === 'csv') {
        const csv = await exportCSV(query, whereClause.params, {
          header: true
        });
        downloadFile(csv, 'sales-data.csv', 'text/csv');
      } else if (format === 'json') {
        const data = await exportJSON(query, whereClause.params);
        downloadFile(
          JSON.stringify(data, null, 2),
          'sales-data.json',
          'application/json'
        );
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-panel">
      <button
        onClick={() => handleExport('csv')}
        disabled={exporting}
        className="btn btn-outline"
      >
        {exporting ? 'Exporting...' : 'Export CSV'}
      </button>
      <button
        onClick={() => handleExport('json')}
        disabled={exporting}
        className="btn btn-outline"
      >
        {exporting ? 'Exporting...' : 'Export JSON'}
      </button>
    </div>
  );
}

export default ExportPanel;
```

### Styling

```css
/* src/components/AnalyticsDashboard.css */
.analytics-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dashboard-header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
}

.header-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.filter-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-panel h3 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  margin-bottom: 4px;
  font-weight: 500;
  color: #495057;
}

.filter-group input,
.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.metric-card.loading {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.metric-icon {
  font-size: 1.5rem;
}

.metric-title {
  font-weight: 500;
  color: #6c757d;
  font-size: 0.9rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 8px;
}

.metric-change {
  font-size: 0.85rem;
  font-weight: 500;
}

.metric-change.positive {
  color: #28a745;
}

.metric-change.negative {
  color: #dc3545;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 24px;
}

.chart-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chart-wrapper {
  height: 100%;
}

.chart-title {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.chart-tooltip {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.tooltip-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
}

.tooltip-revenue,
.tooltip-orders,
.tooltip-avg {
  margin: 4px 0;
  font-size: 0.9rem;
}

.products-list {
  max-height: 300px;
  overflow-y: auto;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e9ecef;
}

.product-item:last-child {
  border-bottom: none;
}

.product-rank {
  width: 40px;
  height: 40px;
  background: #007bff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 16px;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.product-category {
  font-size: 0.85rem;
  color: #6c757d;
}

.product-metrics {
  text-align: right;
}

.product-revenue {
  font-weight: 600;
  color: #28a745;
  margin-bottom: 4px;
}

.product-units,
.product-margin {
  font-size: 0.85rem;
  color: #6c757d;
}

.export-panel {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: white;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.skeleton-text {
  height: 14px;
  background: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  width: 60%;
}

.skeleton-number {
  height: 32px;
  background: #e0e0e0;
  border-radius: 4px;
  width: 80%;
}

.no-data {
  text-align: center;
  color: #6c757d;
  padding: 40px;
  font-style: italic;
}

@media (max-width: 768px) {
  .analytics-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .product-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .product-metrics {
    text-align: left;
    width: 100%;
  }
}
```

## Key Features

This analytics dashboard demonstrates:

1. **Real-time Metrics**: Automatic data refresh with configurable intervals
2. **Interactive Filtering**: Date ranges, regions, categories, and salespeople
3. **Advanced Visualizations**: Charts, graphs, and custom components
4. **Performance Optimization**: Efficient queries and caching
5. **Export Functionality**: CSV and JSON export capabilities
6. **Responsive Design**: Works on desktop and mobile devices
7. **Professional UI**: Clean, modern interface with hover effects and animations

## Sample Data Setup

To use this dashboard, you'll need to create sample data:

```sql
-- Create tables
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name VARCHAR,
  category VARCHAR,
  profit_margin DECIMAL(5,2)
);

CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  customer_id INTEGER,
  salesperson VARCHAR,
  region VARCHAR,
  amount DECIMAL(10,2),
  quantity INTEGER,
  sale_date DATE
);

-- Insert sample data (you would typically import from CSV files)
INSERT INTO products VALUES 
  (1, 'Laptop Pro', 'Electronics', 15.5),
  (2, 'Wireless Mouse', 'Electronics', 25.0),
  (3, 'Office Chair', 'Furniture', 35.0);

INSERT INTO sales VALUES
  (1, 1, 1001, 'John Smith', 'North', 1299.99, 1, '2024-01-15'),
  (2, 2, 1002, 'Jane Doe', 'South', 79.99, 2, '2024-01-16'),
  (3, 3, 1003, 'Bob Johnson', 'East', 399.99, 1, '2024-01-17');
```

This dashboard provides a comprehensive foundation for building sophisticated analytics applications with DuckDB WASM Adapter.
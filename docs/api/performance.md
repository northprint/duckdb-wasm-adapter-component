# Performance API

Comprehensive performance optimization and monitoring tools for DuckDB WASM Adapter.

## Overview

The Performance API provides tools for monitoring, analyzing, and optimizing the performance of your DuckDB WASM applications. It includes query optimization, caching strategies, memory management, and performance metrics.

## Query Optimization

### Query Analyzer

```typescript
interface QueryAnalysis {
  executionTime: number;
  rowsProcessed: number;
  memoryUsed: number;
  cacheHit: boolean;
  optimizations: string[];
  recommendations: string[];
}

interface QueryOptimizer {
  analyze(sql: string, params?: any[]): Promise<QueryAnalysis>;
  optimize(sql: string): Promise<string>;
  explainPlan(sql: string): Promise<ExecutionPlan>;
  suggestIndexes(sql: string): Promise<IndexSuggestion[]>;
}
```

### Using the Query Optimizer

```javascript
import { useQueryOptimizer } from '@northprint/duckdb-wasm-adapter-react';

function OptimizedQuery() {
  const optimizer = useQueryOptimizer();
  const [analysis, setAnalysis] = useState(null);

  const analyzeQuery = async (sql) => {
    const result = await optimizer.analyze(sql);
    setAnalysis(result);
    
    // Show recommendations
    if (result.recommendations.length > 0) {
      console.log('Query optimization recommendations:', result.recommendations);
    }
  };

  const { data, loading, error } = useQuery(
    `SELECT 
       u.name,
       COUNT(o.id) as order_count,
       SUM(o.amount) as total_spent
     FROM users u
     LEFT JOIN orders o ON u.id = o.user_id
     WHERE u.active = true
     GROUP BY u.id, u.name
     ORDER BY total_spent DESC
     LIMIT 100`,
    undefined,
    {
      onExecute: (sql) => analyzeQuery(sql)
    }
  );

  return (
    <div>
      <QueryResults data={data} loading={loading} error={error} />
      {analysis && <QueryAnalysisPanel analysis={analysis} />}
    </div>
  );
}
```

### Execution Plan Analysis

```javascript
function ExecutionPlanViewer({ sql }) {
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const result = await connection.execute(`EXPLAIN ANALYZE ${sql}`);
        setPlan(result);
      } catch (error) {
        console.error('Failed to get execution plan:', error);
      }
    };

    fetchPlan();
  }, [sql]);

  if (!plan) return <div>Loading execution plan...</div>;

  return (
    <div className="execution-plan">
      <h3>Query Execution Plan</h3>
      <div className="plan-tree">
        {plan.map((node, index) => (
          <PlanNode key={index} node={node} />
        ))}
      </div>
    </div>
  );
}

function PlanNode({ node }) {
  const getNodeColor = (type) => {
    const colors = {
      'SCAN': '#e3f2fd',
      'JOIN': '#f3e5f5',
      'AGGREGATE': '#e8f5e8',
      'SORT': '#fff3e0',
      'FILTER': '#fce4ec'
    };
    return colors[type] || '#f5f5f5';
  };

  return (
    <div 
      className="plan-node"
      style={{ backgroundColor: getNodeColor(node.type) }}
    >
      <div className="node-header">
        <span className="node-type">{node.type}</span>
        <span className="node-timing">{node.timing}ms</span>
      </div>
      <div className="node-details">
        <div>Rows: {node.rows}</div>
        <div>Cost: {node.cost}</div>
        {node.description && <div>{node.description}</div>}
      </div>
    </div>
  );
}
```

## Caching Optimization

### Cache Performance Monitoring

```typescript
interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  evictions: number;
  memoryUsed: number;
  averageQueryTime: number;
  topQueries: CacheEntry[];
}

interface CacheEntry {
  queryHash: string;
  sql: string;
  hitCount: number;
  lastAccessed: Date;
  memorySize: number;
  createdAt: Date;
}
```

### Cache Monitor Component

```javascript
function CacheMonitor() {
  const [metrics, setMetrics] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const updateMetrics = () => {
      const cacheMetrics = getCacheMetrics();
      const cacheEntries = getCacheEntries();
      
      setMetrics(cacheMetrics);
      setEntries(cacheEntries);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearCache = () => {
    clearQueryCache();
    setEntries([]);
    setMetrics(prev => ({ ...prev, totalHits: 0, totalMisses: 0 }));
  };

  if (!metrics) return <div>Loading cache metrics...</div>;

  return (
    <div className="cache-monitor">
      <div className="cache-header">
        <h3>Cache Performance</h3>
        <button onClick={clearCache} className="btn btn-outline">
          Clear Cache
        </button>
      </div>

      <div className="cache-metrics">
        <div className="metric-card">
          <h4>Hit Rate</h4>
          <div className="metric-value">
            {(metrics.hitRate * 100).toFixed(1)}%
          </div>
          <div className="metric-change">
            {metrics.totalHits} hits / {metrics.totalRequests} requests
          </div>
        </div>

        <div className="metric-card">
          <h4>Memory Usage</h4>
          <div className="metric-value">
            {(metrics.memoryUsed / 1024 / 1024).toFixed(1)} MB
          </div>
          <div className="metric-change">
            {entries.length} cached queries
          </div>
        </div>

        <div className="metric-card">
          <h4>Avg Query Time</h4>
          <div className="metric-value">
            {metrics.averageQueryTime.toFixed(1)}ms
          </div>
          <div className="metric-change">
            {metrics.evictions} evictions
          </div>
        </div>
      </div>

      <div className="cache-entries">
        <h4>Top Cached Queries</h4>
        <div className="entries-list">
          {entries.slice(0, 10).map(entry => (
            <CacheEntryItem key={entry.queryHash} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CacheEntryItem({ entry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="cache-entry">
      <div className="entry-header" onClick={() => setExpanded(!expanded)}>
        <div className="entry-sql">
          {entry.sql.slice(0, 80)}...
        </div>
        <div className="entry-stats">
          <span>Hits: {entry.hitCount}</span>
          <span>Size: {(entry.memorySize / 1024).toFixed(1)}KB</span>
        </div>
      </div>
      
      {expanded && (
        <div className="entry-details">
          <div className="full-sql">
            <strong>Full Query:</strong>
            <pre>{entry.sql}</pre>
          </div>
          <div className="entry-meta">
            <div>Created: {entry.createdAt.toLocaleString()}</div>
            <div>Last Accessed: {entry.lastAccessed.toLocaleString()}</div>
            <div>Hash: {entry.queryHash}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Smart Cache Configuration

```javascript
function SmartCacheConfig() {
  const [config, setConfig] = useState({
    enabled: true,
    evictionStrategy: 'lru',
    maxEntries: 1000,
    maxMemory: 100 * 1024 * 1024, // 100MB
    ttl: 300000, // 5 minutes
    adaptiveSize: true,
    preloadQueries: true
  });

  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    // Analyze usage patterns and provide recommendations
    const analyzeUsage = async () => {
      const metrics = getCacheMetrics();
      const newRecommendations = [];

      if (metrics.hitRate < 0.5) {
        newRecommendations.push({
          type: 'warning',
          message: 'Low cache hit rate. Consider increasing cache size or TTL.',
          action: 'increase_size'
        });
      }

      if (metrics.evictions > metrics.totalHits * 0.1) {
        newRecommendations.push({
          type: 'warning',
          message: 'High eviction rate. Consider increasing max entries.',
          action: 'increase_entries'
        });
      }

      if (metrics.memoryUsed > config.maxMemory * 0.9) {
        newRecommendations.push({
          type: 'error',
          message: 'Cache memory usage is near limit.',
          action: 'increase_memory'
        });
      }

      setRecommendations(newRecommendations);
    };

    const interval = setInterval(analyzeUsage, 30000);
    return () => clearInterval(interval);
  }, [config]);

  const applyRecommendation = (action) => {
    switch (action) {
      case 'increase_size':
        setConfig(prev => ({ ...prev, maxEntries: prev.maxEntries * 1.5 }));
        break;
      case 'increase_entries':
        setConfig(prev => ({ ...prev, maxEntries: prev.maxEntries + 500 }));
        break;
      case 'increase_memory':
        setConfig(prev => ({ ...prev, maxMemory: prev.maxMemory * 1.5 }));
        break;
    }
  };

  return (
    <div className="cache-config">
      <h3>Cache Configuration</h3>
      
      <div className="config-form">
        <div className="form-group">
          <label>Eviction Strategy</label>
          <select
            value={config.evictionStrategy}
            onChange={(e) => setConfig(prev => ({ ...prev, evictionStrategy: e.target.value }))}
          >
            <option value="lru">Least Recently Used</option>
            <option value="lfu">Least Frequently Used</option>
            <option value="fifo">First In, First Out</option>
            <option value="ttl">Time To Live</option>
          </select>
        </div>

        <div className="form-group">
          <label>Max Entries</label>
          <input
            type="number"
            value={config.maxEntries}
            onChange={(e) => setConfig(prev => ({ ...prev, maxEntries: Number(e.target.value) }))}
          />
        </div>

        <div className="form-group">
          <label>Max Memory (MB)</label>
          <input
            type="number"
            value={config.maxMemory / 1024 / 1024}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              maxMemory: Number(e.target.value) * 1024 * 1024 
            }))}
          />
        </div>

        <div className="form-group">
          <label>TTL (seconds)</label>
          <input
            type="number"
            value={config.ttl / 1000}
            onChange={(e) => setConfig(prev => ({ ...prev, ttl: Number(e.target.value) * 1000 }))}
          />
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendations">
          <h4>Recommendations</h4>
          {recommendations.map((rec, index) => (
            <div key={index} className={`recommendation ${rec.type}`}>
              <span>{rec.message}</span>
              <button onClick={() => applyRecommendation(rec.action)}>
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Memory Management

### Memory Profiler

```javascript
interface MemoryProfile {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  duckdbHeap: number;
  jsHeap: number;
  cacheMemory: number;
  queryBuffers: number;
  gcActivity: GCMetrics[];
}

interface GCMetrics {
  timestamp: Date;
  type: 'minor' | 'major';
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryReclaimed: number;
}

function MemoryProfiler() {
  const [profile, setProfile] = useState(null);
  const [gcHistory, setGcHistory] = useState([]);
  const [monitoring, setMonitoring] = useState(false);

  useEffect(() => {
    if (!monitoring) return;

    const updateProfile = () => {
      const memoryProfile = getMemoryProfile();
      setProfile(memoryProfile);
      
      // Check for memory pressure
      if (memoryProfile.usedMemory / memoryProfile.totalMemory > 0.85) {
        console.warn('High memory usage detected:', memoryProfile);
        triggerGarbageCollection();
      }
    };

    const interval = setInterval(updateProfile, 1000);
    return () => clearInterval(interval);
  }, [monitoring]);

  const startMonitoring = () => {
    setMonitoring(true);
    
    // Set up GC observation
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.name.includes('gc')) {
            const gcMetric = {
              timestamp: new Date(),
              type: entry.name.includes('major') ? 'major' : 'minor',
              duration: entry.duration,
              memoryBefore: entry.detail?.before || 0,
              memoryAfter: entry.detail?.after || 0,
              memoryReclaimed: entry.detail?.reclaimed || 0
            };
            
            setGcHistory(prev => [gcMetric, ...prev.slice(0, 49)]);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
    }
  };

  const stopMonitoring = () => {
    setMonitoring(false);
  };

  const forceGC = () => {
    if (window.gc) {
      window.gc();
    } else {
      // Fallback: create memory pressure to trigger GC
      const temp = new Array(1000000).fill(Math.random());
      temp.length = 0;
    }
  };

  if (!profile) {
    return (
      <div className="memory-profiler">
        <button onClick={startMonitoring}>Start Memory Monitoring</button>
      </div>
    );
  }

  return (
    <div className="memory-profiler">
      <div className="profiler-header">
        <h3>Memory Profiler</h3>
        <div className="profiler-controls">
          <button onClick={monitoring ? stopMonitoring : startMonitoring}>
            {monitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button onClick={forceGC}>Force GC</button>
        </div>
      </div>

      <div className="memory-overview">
        <MemoryChart profile={profile} />
        
        <div className="memory-breakdown">
          <div className="memory-item">
            <label>Total Memory</label>
            <span>{(profile.totalMemory / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="memory-item">
            <label>Used Memory</label>
            <span>{(profile.usedMemory / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="memory-item">
            <label>DuckDB Heap</label>
            <span>{(profile.duckdbHeap / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="memory-item">
            <label>JS Heap</label>
            <span>{(profile.jsHeap / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="memory-item">
            <label>Cache Memory</label>
            <span>{(profile.cacheMemory / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <div className="memory-item">
            <label>Query Buffers</label>
            <span>{(profile.queryBuffers / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
      </div>

      <div className="gc-history">
        <h4>Garbage Collection Activity</h4>
        <div className="gc-list">
          {gcHistory.map((gc, index) => (
            <div key={index} className="gc-item">
              <span className="gc-time">{gc.timestamp.toLocaleTimeString()}</span>
              <span className={`gc-type ${gc.type}`}>{gc.type}</span>
              <span className="gc-duration">{gc.duration.toFixed(1)}ms</span>
              <span className="gc-reclaimed">
                -{(gc.memoryReclaimed / 1024 / 1024).toFixed(1)}MB
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Query Performance Monitoring

### Real-time Performance Dashboard

```javascript
function QueryPerformanceDashboard() {
  const [queries, setQueries] = useState([]);
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    avgExecutionTime: 0,
    slowQueries: 0,
    errorRate: 0
  });

  useEffect(() => {
    // Subscribe to query events
    const unsubscribe = subscribeToQueryEvents((event) => {
      const queryInfo = {
        id: event.queryId,
        sql: event.sql,
        parameters: event.parameters,
        startTime: event.startTime,
        endTime: event.endTime,
        executionTime: event.endTime - event.startTime,
        rowsReturned: event.rowsReturned,
        success: event.success,
        error: event.error,
        cacheHit: event.cacheHit,
        memoryUsed: event.memoryUsed
      };

      setQueries(prev => [queryInfo, ...prev.slice(0, 99)]);
      
      // Update metrics
      setMetrics(prev => {
        const newTotal = prev.totalQueries + 1;
        const newAvg = (prev.avgExecutionTime * prev.totalQueries + queryInfo.executionTime) / newTotal;
        const newSlow = prev.slowQueries + (queryInfo.executionTime > 1000 ? 1 : 0);
        const newErrors = prev.errorRate * prev.totalQueries + (queryInfo.success ? 0 : 1);
        
        return {
          totalQueries: newTotal,
          avgExecutionTime: newAvg,
          slowQueries: newSlow,
          errorRate: newErrors / newTotal
        };
      });
    });

    return unsubscribe;
  }, []);

  const slowQueryThreshold = 1000; // 1 second
  const recentQueries = queries.slice(0, 20);
  const slowQueries = queries.filter(q => q.executionTime > slowQueryThreshold);

  return (
    <div className="performance-dashboard">
      <div className="dashboard-header">
        <h3>Query Performance Dashboard</h3>
        <button onClick={() => setQueries([])}>Clear History</button>
      </div>

      <div className="performance-metrics">
        <div className="metric-card">
          <h4>Total Queries</h4>
          <div className="metric-value">{metrics.totalQueries}</div>
        </div>
        
        <div className="metric-card">
          <h4>Avg Execution Time</h4>
          <div className="metric-value">{metrics.avgExecutionTime.toFixed(1)}ms</div>
        </div>
        
        <div className="metric-card">
          <h4>Slow Queries</h4>
          <div className="metric-value">{metrics.slowQueries}</div>
        </div>
        
        <div className="metric-card">
          <h4>Error Rate</h4>
          <div className="metric-value">{(metrics.errorRate * 100).toFixed(1)}%</div>
        </div>
      </div>

      <div className="performance-charts">
        <div className="chart-section">
          <h4>Query Timeline</h4>
          <QueryTimelineChart queries={recentQueries} />
        </div>
        
        <div className="chart-section">
          <h4>Execution Time Distribution</h4>
          <ExecutionTimeHistogram queries={queries} />
        </div>
      </div>

      <div className="slow-queries">
        <h4>Slow Queries (&gt; {slowQueryThreshold}ms)</h4>
        <div className="query-list">
          {slowQueries.slice(0, 10).map(query => (
            <SlowQueryItem key={query.id} query={query} />
          ))}
        </div>
      </div>

      <div className="recent-queries">
        <h4>Recent Queries</h4>
        <div className="query-list">
          {recentQueries.map(query => (
            <QueryItem key={query.id} query={query} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QueryItem({ query }) {
  const getStatusColor = () => {
    if (!query.success) return '#f44336';
    if (query.executionTime > 1000) return '#ff9800';
    if (query.cacheHit) return '#4caf50';
    return '#2196f3';
  };

  return (
    <div className="query-item">
      <div className="query-header">
        <span 
          className="query-status"
          style={{ backgroundColor: getStatusColor() }}
        ></span>
        <span className="query-time">{query.executionTime}ms</span>
        {query.cacheHit && <span className="cache-hit">CACHE</span>}
        <span className="query-rows">{query.rowsReturned} rows</span>
      </div>
      
      <div className="query-sql">
        {query.sql.slice(0, 100)}...
      </div>
      
      {query.error && (
        <div className="query-error">{query.error}</div>
      )}
    </div>
  );
}

function SlowQueryItem({ query }) {
  const [showOptimization, setShowOptimization] = useState(false);

  return (
    <div className="slow-query-item">
      <QueryItem query={query} />
      
      <div className="slow-query-actions">
        <button onClick={() => setShowOptimization(!showOptimization)}>
          {showOptimization ? 'Hide' : 'Show'} Optimization
        </button>
      </div>
      
      {showOptimization && (
        <QueryOptimizationSuggestions sql={query.sql} />
      )}
    </div>
  );
}
```

## Performance Best Practices

### 1. Query Optimization Guidelines

```javascript
const QUERY_OPTIMIZATION_RULES = {
  // Use LIMIT to prevent large result sets
  limitResultSets: {
    check: (sql) => !sql.toLowerCase().includes('limit'),
    message: 'Consider adding LIMIT clause to prevent large result sets',
    severity: 'warning'
  },

  // Avoid SELECT *
  avoidSelectStar: {
    check: (sql) => sql.includes('SELECT *'),
    message: 'Avoid SELECT * - specify only needed columns',
    severity: 'info'
  },

  // Use indexes for WHERE clauses
  indexedWhere: {
    check: (sql) => {
      const whereMatch = sql.match(/WHERE\s+(\w+)/i);
      return whereMatch && !hasIndex(whereMatch[1]);
    },
    message: 'Consider creating an index on WHERE clause column',
    severity: 'warning'
  },

  // Use JOINs instead of subqueries when possible
  preferJoins: {
    check: (sql) => sql.includes('IN (SELECT'),
    message: 'Consider using JOIN instead of IN (SELECT ...)',
    severity: 'info'
  }
};

function analyzeQueryPerformance(sql) {
  const issues = [];
  
  Object.entries(QUERY_OPTIMIZATION_RULES).forEach(([rule, config]) => {
    if (config.check(sql)) {
      issues.push({
        rule,
        message: config.message,
        severity: config.severity
      });
    }
  });
  
  return issues;
}
```

### 2. Batch Operations

```javascript
// Efficient batch processing
async function batchInsert(data, tableName, batchSize = 1000) {
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    // Build parameterized query
    const placeholders = batch.map(() => '(?)').join(',');
    const sql = `INSERT INTO ${tableName} VALUES ${placeholders}`;
    
    try {
      const result = await connection.execute(sql, batch);
      results.push(result);
    } catch (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
      throw error;
    }
  }
  
  return results;
}

// Efficient bulk updates
async function bulkUpdate(updates, tableName) {
  const caseStatements = Object.keys(updates[0])
    .filter(key => key !== 'id')
    .map(column => {
      const cases = updates.map(update => 
        `WHEN id = ${update.id} THEN '${update[column]}'`
      ).join(' ');
      
      return `${column} = CASE ${cases} END`;
    });

  const ids = updates.map(u => u.id).join(',');
  const sql = `
    UPDATE ${tableName} 
    SET ${caseStatements.join(', ')}
    WHERE id IN (${ids})
  `;

  return await connection.execute(sql);
}
```

### 3. Connection Pooling

```javascript
class ConnectionPool {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections || 10;
    this.connections = [];
    this.waitQueue = [];
    this.activeConnections = 0;
  }

  async getConnection() {
    if (this.connections.length > 0) {
      return this.connections.pop();
    }

    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return await createConnection();
    }

    // Wait for available connection
    return new Promise((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  releaseConnection(connection) {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift();
      resolve(connection);
    } else {
      this.connections.push(connection);
    }
  }

  async execute(sql, params) {
    const connection = await this.getConnection();
    try {
      return await connection.execute(sql, params);
    } finally {
      this.releaseConnection(connection);
    }
  }
}
```

The Performance API provides comprehensive tools for monitoring, analyzing, and optimizing your DuckDB WASM applications to ensure optimal performance across all scenarios.
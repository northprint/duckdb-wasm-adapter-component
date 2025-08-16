# Debug API

Advanced debugging and profiling capabilities for DuckDB WASM Adapter.

## Overview

The Debug API provides comprehensive tools for monitoring, profiling, and troubleshooting your DuckDB WASM applications. These tools help you optimize performance, identify bottlenecks, and debug issues during development.

## Configuration

### Basic Debug Configuration

```javascript
import { createConnection } from '@duckdb-wasm-adapter/core';

const connection = await createConnection({
  debug: {
    enabled: true,              // Enable debug mode
    logQueries: true,           // Log all SQL queries
    logTiming: true,            // Log execution timing
    logResults: false,          // Log query results (be careful with large datasets)
    slowQueryThreshold: 100,    // Log queries slower than 100ms
    enableProfiler: true,       // Enable query profiler
    traceMemory: true,          // Track memory usage
    verboseErrors: true         // Include detailed error information
  }
});
```

### Framework-Specific Configuration

#### React

```jsx
<DuckDBProvider
  autoConnect
  config={{
    debug: {
      enabled: process.env.NODE_ENV === 'development',
      logQueries: true,
      logTiming: true,
      slowQueryThreshold: 50
    }
  }}
>
  <App />
</DuckDBProvider>
```

#### Vue

```javascript
app.use(DuckDBPlugin, {
  autoConnect: true,
  config: {
    debug: {
      enabled: import.meta.env.DEV,
      logQueries: true,
      logTiming: true,
      enableProfiler: true
    }
  }
});
```

#### Svelte

```javascript
const db = duckdb({
  autoConnect: true,
  config: {
    debug: {
      enabled: __APP_ENV__ === 'development',
      logQueries: true,
      logTiming: true,
      traceMemory: true
    }
  }
});
```

## Debug Logger

### Logger Interface

```typescript
interface DebugLogger {
  log(level: LogLevel, message: string, data?: any): void;
  query(sql: string, params?: any[], timing?: number): void;
  error(error: Error, context?: string): void;
  performance(operation: string, timing: number): void;
  memory(usage: MemoryInfo): void;
  getLog(): LogEntry[];
  clearLog(): void;
  exportLog(): string;
}

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  type: 'query' | 'performance' | 'memory' | 'error' | 'general';
}
```

### Using the Debug Logger

```javascript
import { useDebugLogger } from '@duckdb-wasm-adapter/react';

function MyComponent() {
  const logger = useDebugLogger();

  const handleComplexOperation = async () => {
    logger.log('info', 'Starting complex operation');
    
    try {
      const startTime = performance.now();
      
      // Your operation here
      const result = await complexQuery();
      
      const timing = performance.now() - startTime;
      logger.performance('complex_operation', timing);
      
      if (timing > 1000) {
        logger.log('warn', 'Complex operation took longer than expected', { timing });
      }
      
      return result;
    } catch (error) {
      logger.error(error, 'complex_operation');
      throw error;
    }
  };

  return (
    <div>
      <button onClick={handleComplexOperation}>
        Run Complex Operation
      </button>
      <DebugPanel logger={logger} />
    </div>
  );
}
```

## Query Profiling

### EXPLAIN ANALYZE

```javascript
import { useQuery } from '@duckdb-wasm-adapter/react';

function ProfiledQuery() {
  // Get query execution plan
  const { data: queryPlan } = useQuery(`
    EXPLAIN ANALYZE
    SELECT 
      department,
      COUNT(*) as employee_count,
      AVG(salary) as avg_salary
    FROM employees
    WHERE active = true
    GROUP BY department
    ORDER BY avg_salary DESC
  `);

  return (
    <div>
      <h3>Query Execution Plan</h3>
      <pre>{JSON.stringify(queryPlan, null, 2)}</pre>
    </div>
  );
}
```

### Query Timing

```javascript
import { useProfiler } from '@duckdb-wasm-adapter/core';

function TimedQuery() {
  const profiler = useProfiler();

  const runQuery = async () => {
    const queryId = profiler.startQuery('user_analytics');
    
    try {
      const result = await connection.execute(`
        SELECT 
          u.id,
          u.name,
          COUNT(o.id) as order_count,
          SUM(o.amount) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        GROUP BY u.id, u.name
        ORDER BY total_spent DESC
        LIMIT 100
      `);
      
      profiler.endQuery(queryId, result.length);
      return result;
    } catch (error) {
      profiler.queryError(queryId, error);
      throw error;
    }
  };

  return (
    <div>
      <button onClick={runQuery}>Run Profiled Query</button>
      <ProfilerReport profiler={profiler} />
    </div>
  );
}
```

## Performance Monitoring

### Memory Usage Tracking

```javascript
interface MemoryInfo {
  totalHeapSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  cacheSize: number;
  connectionCount: number;
}

function MemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);

  useEffect(() => {
    const monitor = setInterval(() => {
      const info = getMemoryInfo();
      setMemoryInfo(info);
      
      // Warn if memory usage is high
      if (info.usedHeapSize / info.heapSizeLimit > 0.8) {
        console.warn('High memory usage detected:', info);
      }
    }, 1000);

    return () => clearInterval(monitor);
  }, []);

  if (!memoryInfo) return <div>Loading memory info...</div>;

  return (
    <div className="memory-monitor">
      <h3>Memory Usage</h3>
      <div className="memory-stats">
        <div>
          Heap Used: {(memoryInfo.usedHeapSize / 1024 / 1024).toFixed(1)} MB
        </div>
        <div>
          Heap Total: {(memoryInfo.totalHeapSize / 1024 / 1024).toFixed(1)} MB
        </div>
        <div>
          Cache Size: {(memoryInfo.cacheSize / 1024 / 1024).toFixed(1)} MB
        </div>
        <div>
          Usage: {((memoryInfo.usedHeapSize / memoryInfo.heapSizeLimit) * 100).toFixed(1)}%
        </div>
      </div>
      <MemoryChart data={memoryInfo} />
    </div>
  );
}
```

### Query Performance Metrics

```javascript
interface QueryMetrics {
  queryId: string;
  sql: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  memoryUsed: number;
  timestamp: Date;
}

function QueryMetricsPanel() {
  const [metrics, setMetrics] = useState<QueryMetrics[]>([]);

  const addMetric = (metric: QueryMetrics) => {
    setMetrics(prev => [metric, ...prev.slice(0, 99)]); // Keep last 100
  };

  const averageExecutionTime = useMemo(() => {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
  }, [metrics]);

  const slowQueries = useMemo(() => {
    return metrics.filter(m => m.executionTime > 100);
  }, [metrics]);

  const cacheHitRate = useMemo(() => {
    if (metrics.length === 0) return 0;
    const hits = metrics.filter(m => m.cacheHit).length;
    return (hits / metrics.length) * 100;
  }, [metrics]);

  return (
    <div className="query-metrics">
      <h3>Query Performance</h3>
      
      <div className="metrics-summary">
        <div className="metric">
          <label>Avg Execution Time</label>
          <value>{averageExecutionTime.toFixed(2)}ms</value>
        </div>
        <div className="metric">
          <label>Cache Hit Rate</label>
          <value>{cacheHitRate.toFixed(1)}%</value>
        </div>
        <div className="metric">
          <label>Slow Queries</label>
          <value>{slowQueries.length}</value>
        </div>
      </div>

      <div className="query-list">
        <h4>Recent Queries</h4>
        {metrics.slice(0, 10).map(metric => (
          <div key={metric.queryId} className="query-item">
            <div className="query-sql">{metric.sql.slice(0, 100)}...</div>
            <div className="query-timing">{metric.executionTime}ms</div>
            <div className="query-cache">{metric.cacheHit ? '✓' : '✗'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Error Debugging

### Error Tracking

```javascript
interface DebugError {
  id: string;
  message: string;
  stack?: string;
  sql?: string;
  params?: any[];
  context?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
}

class ErrorTracker {
  private errors: DebugError[] = [];

  captureError(error: Error, context?: {
    sql?: string;
    params?: any[];
    operation?: string;
  }): void {
    const debugError: DebugError = {
      id: generateId(),
      message: error.message,
      stack: error.stack,
      sql: context?.sql,
      params: context?.params,
      context: context?.operation,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.unshift(debugError);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(0, 100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('DuckDB Error:', debugError);
    }
  }

  getErrors(): DebugError[] {
    return this.errors;
  }

  clearErrors(): void {
    this.errors = [];
  }

  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }
}

// Usage with React
function ErrorDebugPanel() {
  const [errorTracker] = useState(() => new ErrorTracker());
  const [errors, setErrors] = useState<DebugError[]>([]);

  useEffect(() => {
    // Set up global error handler
    const handleError = (event: ErrorEvent) => {
      errorTracker.captureError(event.error);
      setErrors(errorTracker.getErrors());
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [errorTracker]);

  return (
    <div className="error-debug">
      <h3>Error Log ({errors.length})</h3>
      
      <div className="error-actions">
        <button onClick={() => {
          errorTracker.clearErrors();
          setErrors([]);
        }}>
          Clear Errors
        </button>
        <button onClick={() => {
          const errorData = errorTracker.exportErrors();
          downloadFile(errorData, 'errors.json', 'application/json');
        }}>
          Export Errors
        </button>
      </div>

      <div className="error-list">
        {errors.map(error => (
          <ErrorItem key={error.id} error={error} />
        ))}
      </div>
    </div>
  );
}

function ErrorItem({ error }: { error: DebugError }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="error-item">
      <div className="error-header" onClick={() => setExpanded(!expanded)}>
        <span className="error-time">
          {error.timestamp.toLocaleTimeString()}
        </span>
        <span className="error-message">{error.message}</span>
        <span className="error-toggle">{expanded ? '−' : '+'}</span>
      </div>
      
      {expanded && (
        <div className="error-details">
          {error.sql && (
            <div className="error-sql">
              <strong>SQL:</strong>
              <pre>{error.sql}</pre>
            </div>
          )}
          
          {error.params && (
            <div className="error-params">
              <strong>Parameters:</strong>
              <pre>{JSON.stringify(error.params, null, 2)}</pre>
            </div>
          )}
          
          {error.stack && (
            <div className="error-stack">
              <strong>Stack Trace:</strong>
              <pre>{error.stack}</pre>
            </div>
          )}
          
          <div className="error-meta">
            <div><strong>Context:</strong> {error.context || 'Unknown'}</div>
            <div><strong>URL:</strong> {error.url}</div>
            <div><strong>User Agent:</strong> {error.userAgent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Debug Utilities

### Query Formatter

```javascript
function formatSQL(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')
    .replace(/,\s*/g, ',\n  ')
    .replace(/\bSELECT\b/gi, 'SELECT')
    .replace(/\bFROM\b/gi, '\nFROM')
    .replace(/\bWHERE\b/gi, '\nWHERE')
    .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
    .replace(/\bORDER BY\b/gi, '\nORDER BY')
    .replace(/\bLIMIT\b/gi, '\nLIMIT')
    .trim();
}

function QueryFormatter({ sql }: { sql: string }) {
  const [formatted, setFormatted] = useState(sql);

  useEffect(() => {
    setFormatted(formatSQL(sql));
  }, [sql]);

  return (
    <div className="query-formatter">
      <h4>Formatted Query</h4>
      <pre className="formatted-sql">{formatted}</pre>
      <button onClick={() => navigator.clipboard.writeText(formatted)}>
        Copy to Clipboard
      </button>
    </div>
  );
}
```

### Connection Inspector

```javascript
interface ConnectionInfo {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  version: string;
  workerMode: boolean;
  cacheEnabled: boolean;
  memoryUsage: number;
  uptime: number;
  queryCount: number;
  errorCount: number;
}

function ConnectionInspector() {
  const [info, setInfo] = useState<ConnectionInfo | null>(null);

  useEffect(() => {
    const updateInfo = () => {
      const connectionInfo = getConnectionInfo();
      setInfo(connectionInfo);
    };

    updateInfo();
    const interval = setInterval(updateInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!info) return <div>Loading connection info...</div>;

  return (
    <div className="connection-inspector">
      <h3>Connection Status</h3>
      
      <div className="connection-grid">
        <div className="info-item">
          <label>Status</label>
          <span className={`status ${info.status}`}>{info.status}</span>
        </div>
        
        <div className="info-item">
          <label>DuckDB Version</label>
          <span>{info.version}</span>
        </div>
        
        <div className="info-item">
          <label>Worker Mode</label>
          <span>{info.workerMode ? 'Enabled' : 'Disabled'}</span>
        </div>
        
        <div className="info-item">
          <label>Cache</label>
          <span>{info.cacheEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        
        <div className="info-item">
          <label>Memory Usage</label>
          <span>{(info.memoryUsage / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        
        <div className="info-item">
          <label>Uptime</label>
          <span>{Math.floor(info.uptime / 1000)}s</span>
        </div>
        
        <div className="info-item">
          <label>Queries Executed</label>
          <span>{info.queryCount}</span>
        </div>
        
        <div className="info-item">
          <label>Errors</label>
          <span className={info.errorCount > 0 ? 'error' : ''}>{info.errorCount}</span>
        </div>
      </div>
    </div>
  );
}
```

## Development Tools

### Debug Console

```javascript
function DebugConsole() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);

  const executeQuery = async () => {
    if (!input.trim()) return;

    try {
      const result = await connection.execute(input);
      setResults(prev => [...prev, { type: 'success', sql: input, data: result }]);
      setHistory(prev => [...prev, input]);
      setInput('');
    } catch (error) {
      setResults(prev => [...prev, { type: 'error', sql: input, error: error.message }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeQuery();
    }
  };

  return (
    <div className="debug-console">
      <h3>Debug Console</h3>
      
      <div className="console-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter SQL query... (Ctrl+Enter to execute)"
          rows={4}
        />
        <button onClick={executeQuery}>Execute</button>
      </div>

      <div className="console-output">
        {results.map((result, index) => (
          <div key={index} className={`result ${result.type}`}>
            <div className="result-sql">{result.sql}</div>
            {result.type === 'success' ? (
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            ) : (
              <div className="error">{result.error}</div>
            )}
          </div>
        ))}
      </div>

      <div className="query-history">
        <h4>Query History</h4>
        {history.map((query, index) => (
          <div 
            key={index} 
            className="history-item"
            onClick={() => setInput(query)}
          >
            {query}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices

### 1. Development vs Production

```javascript
// Only enable detailed debugging in development
const debugConfig = {
  enabled: process.env.NODE_ENV === 'development',
  logQueries: process.env.NODE_ENV === 'development',
  logTiming: true, // Always useful for performance monitoring
  slowQueryThreshold: process.env.NODE_ENV === 'development' ? 50 : 1000,
  enableProfiler: process.env.NODE_ENV === 'development'
};
```

### 2. Selective Logging

```javascript
// Use log levels appropriately
logger.debug('Detailed debugging info'); // Only in development
logger.info('General information');       // Always useful
logger.warn('Potential issues');          // Always log
logger.error('Actual errors');            // Always log
```

### 3. Performance Impact

```javascript
// Minimize performance impact in production
const config = {
  debug: {
    enabled: true,
    logQueries: false,           // Disable query logging in production
    logResults: false,           // Never log results in production
    logTiming: true,             // Keep timing for monitoring
    slowQueryThreshold: 1000,    // Higher threshold in production
    enableProfiler: false        // Disable detailed profiling
  }
};
```

### 4. Memory Management

```javascript
// Limit log retention to prevent memory leaks
class DebugLogger {
  private maxEntries = 1000;
  
  addEntry(entry: LogEntry) {
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
  }
}
```

The Debug API provides comprehensive tools for developing and maintaining robust DuckDB WASM applications with excellent observability and troubleshooting capabilities.
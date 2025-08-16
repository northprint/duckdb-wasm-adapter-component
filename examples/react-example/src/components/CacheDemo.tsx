import React, { useState, useEffect } from 'react';
import { useQuery, useCache } from '@duckdb-wasm-adapter/react';

export default function CacheDemo() {
  const { clearCache, getCacheStats, invalidateCache } = useCache();
  const [stats, setStats] = useState(getCacheStats());
  const [queryCount, setQueryCount] = useState(0);
  const [cacheDemoEnabled, setCacheDemoEnabled] = useState(false);
  
  // Multiple queries to demonstrate caching
  const query1 = useQuery('SELECT COUNT(*) as count FROM employees', undefined, {
    enabled: cacheDemoEnabled && queryCount > 0,
  });
  
  const query2 = useQuery('SELECT department, COUNT(*) as count FROM employees GROUP BY department', undefined, {
    enabled: cacheDemoEnabled && queryCount > 1,
  });
  
  const query3 = useQuery('SELECT * FROM employees WHERE salary > 60000', undefined, {
    enabled: cacheDemoEnabled && queryCount > 2,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getCacheStats());
    }, 1000);
    return () => clearInterval(interval);
  }, [getCacheStats]);

  const handleRunQueries = () => {
    setCacheDemoEnabled(true);
    setQueryCount((prev) => prev + 1);
  };

  const handleClearCache = () => {
    clearCache();
    setStats(getCacheStats());
  };

  const handleInvalidatePattern = () => {
    const invalidated = invalidateCache(/employees/);
    alert(`Invalidated ${invalidated} cache entries`);
    setStats(getCacheStats());
  };

  return (
    <div className="cache-demo">
      <h2>Cache Demo</h2>
      
      <div className="cache-stats">
        <h3>Cache Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Hits:</span>
            <span className="stat-value">{stats.hits}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Misses:</span>
            <span className="stat-value">{stats.misses}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Hit Rate:</span>
            <span className="stat-value">{(stats.hitRate * 100).toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Entries:</span>
            <span className="stat-value">{stats.entries}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Evictions:</span>
            <span className="stat-value">{stats.evictions}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Size:</span>
            <span className="stat-value">{(stats.totalSize / 1024).toFixed(2)} KB</span>
          </div>
        </div>
      </div>

      <div className="cache-controls">
        <h3>Cache Controls</h3>
        <div className="button-group">
          <button onClick={handleRunQueries}>
            Run Queries (Run #{queryCount + 1})
          </button>
          <button onClick={() => query1.refetch()}>
            Refetch Query 1 (Should Hit Cache)
          </button>
          <button onClick={() => query2.refetch()}>
            Refetch Query 2 (Should Hit Cache)
          </button>
          <button onClick={handleClearCache}>
            Clear All Cache
          </button>
          <button onClick={handleInvalidatePattern}>
            Invalidate 'employees' Queries
          </button>
        </div>
      </div>

      <div className="query-results">
        <h3>Query Results</h3>
        
        {query1.data && (
          <div className="result-section">
            <h4>Query 1: Total Employees</h4>
            <p>Count: {query1.data[0]?.count}</p>
            <p className="status">{query1.loading ? 'Loading...' : 'Loaded'}</p>
          </div>
        )}
        
        {query2.data && (
          <div className="result-section">
            <h4>Query 2: Employees by Department</h4>
            <ul>
              {query2.data.map((row: any) => (
                <li key={row.department}>
                  {row.department}: {row.count} employees
                </li>
              ))}
            </ul>
            <p className="status">{query2.loading ? 'Loading...' : 'Loaded'}</p>
          </div>
        )}
        
        {query3.data && (
          <div className="result-section">
            <h4>Query 3: High Earners (Salary &gt; $60k)</h4>
            <p>Count: {query3.data.length} employees</p>
            <p className="status">{query3.loading ? 'Loading...' : 'Loaded'}</p>
          </div>
        )}
      </div>

      <style>{`
        .cache-demo {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .cache-stats {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-top: 15px;
        }

        .stat-item {
          background: white;
          padding: 10px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
        }

        .stat-label {
          font-weight: 600;
          color: #666;
        }

        .stat-value {
          color: #2563eb;
          font-weight: bold;
        }

        .cache-controls {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .button-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 15px;
        }

        button {
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        button:hover {
          background: #1d4ed8;
        }

        .query-results {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
        }

        .result-section {
          background: white;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
        }

        .result-section h4 {
          margin-top: 0;
          color: #333;
        }

        .status {
          color: #666;
          font-size: 0.9em;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
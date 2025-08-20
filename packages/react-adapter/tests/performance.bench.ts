import { describe, bench, beforeAll } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { DuckDBProvider, useDuckDB, useQuery } from '../src/index.js';
import { DuckDBAdapter } from '@duckdb-wasm-adapter/core';

describe('React Hooks Performance', () => {
  let adapter: DuckDBAdapter;

  beforeAll(async () => {
    adapter = new DuckDBAdapter();
    await adapter.connect();
    
    // Setup test data
    await adapter.execute(`
      CREATE TABLE react_test (
        id INTEGER,
        name VARCHAR,
        value DOUBLE
      )
    `);
    
    await adapter.execute(`
      INSERT INTO react_test 
      SELECT i, 'Name_' || i, random() * 1000
      FROM generate_series(1, 1000) as s(i)
    `);
  });

  bench('useDuckDB hook initialization', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider adapter={adapter}>
        {children}
      </DuckDBProvider>
    );
    
    const { result } = renderHook(() => useDuckDB(), { wrapper });
    expect(result.current).toBeDefined();
  });

  bench('useQuery hook - simple query', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider adapter={adapter}>
        {children}
      </DuckDBProvider>
    );
    
    const { result } = renderHook(
      () => useQuery('SELECT * FROM react_test LIMIT 10'),
      { wrapper }
    );
    
    // Wait for query to complete
    await act(async () => {
      while (result.current.loading) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
  });

  bench('useQuery hook - with dependencies', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider adapter={adapter}>
        {children}
      </DuckDBProvider>
    );
    
    let limit = 10;
    const { result, rerender } = renderHook(
      () => useQuery(`SELECT * FROM react_test LIMIT ${limit}`, [limit]),
      { wrapper }
    );
    
    // Change dependency and trigger re-query
    limit = 20;
    rerender();
    
    await act(async () => {
      while (result.current.loading) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
  });

  bench('multiple concurrent queries', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider adapter={adapter}>
        {children}
      </DuckDBProvider>
    );
    
    const { result: result1 } = renderHook(
      () => useQuery('SELECT COUNT(*) FROM react_test'),
      { wrapper }
    );
    
    const { result: result2 } = renderHook(
      () => useQuery('SELECT AVG(value) FROM react_test'),
      { wrapper }
    );
    
    const { result: result3 } = renderHook(
      () => useQuery('SELECT MAX(value) FROM react_test'),
      { wrapper }
    );
    
    // Wait for all queries to complete
    await act(async () => {
      while (
        result1.current.loading || 
        result2.current.loading || 
        result3.current.loading
      ) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
  });
});

describe('React Provider Performance', () => {
  bench('provider mounting', () => {
    const adapter = new DuckDBAdapter();
    
    const TestComponent = () => {
      const db = useDuckDB();
      return <div>{db ? 'Connected' : 'Disconnected'}</div>;
    };
    
    const { container } = render(
      <DuckDBProvider adapter={adapter}>
        <TestComponent />
      </DuckDBProvider>
    );
    
    expect(container.textContent).toBe('Connected');
  });

  bench('provider with multiple children', () => {
    const adapter = new DuckDBAdapter();
    
    const TestComponent = ({ id }: { id: number }) => {
      const db = useDuckDB();
      return <div>Component {id}</div>;
    };
    
    const { container } = render(
      <DuckDBProvider adapter={adapter}>
        {Array.from({ length: 100 }, (_, i) => (
          <TestComponent key={i} id={i} />
        ))}
      </DuckDBProvider>
    );
    
    expect(container.children.length).toBe(100);
  });
});

describe('State Management Performance', () => {
  let adapter: DuckDBAdapter;

  beforeAll(async () => {
    adapter = new DuckDBAdapter();
    await adapter.connect();
    
    await adapter.execute(`
      CREATE TABLE state_test (
        id INTEGER,
        status VARCHAR
      )
    `);
  });

  bench('state updates on query execution', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider adapter={adapter}>
        {children}
      </DuckDBProvider>
    );
    
    const { result } = renderHook(() => {
      const [count, setCount] = React.useState(0);
      const query = useQuery(
        `SELECT * FROM state_test WHERE id = ${count}`,
        [count]
      );
      
      return { query, setCount };
    }, { wrapper });
    
    // Trigger multiple state updates
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.setCount(i);
      });
      
      await act(async () => {
        while (result.current.query.loading) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      });
    }
  });
});

// Helper to suppress console errors in tests
function render(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  const root = ReactDOM.createRoot(container);
  act(() => {
    root.render(element);
  });
  
  return { container };
}
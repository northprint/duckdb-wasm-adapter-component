# React Context API

Advanced React Context API for DuckDB WASM Adapter.

## Overview

The React Context API provides advanced control over DuckDB connections, query management, and state synchronization across your React application.

## DuckDBContext

The main context for managing DuckDB connections and state.

### Provider Setup

```jsx
import { DuckDBProvider } from '@duckdb-wasm-adapter/react';

function App() {
  return (
    <DuckDBProvider
      config={{
        autoConnect: true,
        worker: true,
        query: {
          defaultTimeout: 30000,
          defaultRetryCount: 3
        }
      }}
      onConnect={(connection) => {
        console.log('Connected to DuckDB');
      }}
      onError={(error) => {
        console.error('DuckDB error:', error);
      }}
    >
      <YourApp />
    </DuckDBProvider>
  );
}
```

### Context Hook

```jsx
import { useDuckDBContext } from '@duckdb-wasm-adapter/react';

function Component() {
  const {
    connection,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    reset
  } = useDuckDBContext();

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      {!isConnected && (
        <button onClick={connect}>Connect</button>
      )}
      {isConnected && (
        <button onClick={disconnect}>Disconnect</button>
      )}
    </div>
  );
}
```

## QueryClientContext

Context for managing query cache and state.

### Provider Configuration

```jsx
import { QueryClientProvider, QueryClient } from '@duckdb-wasm-adapter/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 2,
      retryDelay: 1000
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DuckDBProvider>
        <YourApp />
      </DuckDBProvider>
    </QueryClientProvider>
  );
}
```

### Using QueryClient

```jsx
import { useQueryClient } from '@duckdb-wasm-adapter/react';

function DataManager() {
  const queryClient = useQueryClient();

  const invalidateAllQueries = () => {
    queryClient.invalidateQueries();
  };

  const invalidateUserQueries = () => {
    queryClient.invalidateQueries(['users']);
  };

  const prefetchData = async () => {
    await queryClient.prefetchQuery(
      ['users', 'active'],
      () => connection.execute('SELECT * FROM users WHERE active = true')
    );
  };

  const setQueryData = () => {
    queryClient.setQueryData(['users', 1], {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    });
  };

  return (
    <div>
      <button onClick={invalidateAllQueries}>Refresh All</button>
      <button onClick={invalidateUserQueries}>Refresh Users</button>
      <button onClick={prefetchData}>Prefetch Active Users</button>
      <button onClick={setQueryData}>Set User Data</button>
    </div>
  );
}
```

## Custom Contexts

### Creating Custom Context

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDuckDBContext } from '@duckdb-wasm-adapter/react';

// Create context for app-specific database state
const DatabaseStateContext = createContext();

export function DatabaseStateProvider({ children }) {
  const { connection, isConnected } = useDuckDBContext();
  const [tables, setTables] = useState([]);
  const [currentTable, setCurrentTable] = useState(null);
  const [schema, setSchema] = useState({});

  // Load available tables
  useEffect(() => {
    if (!isConnected) return;

    const loadTables = async () => {
      const result = await connection.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'main'
      `);
      setTables(result.map(row => row.table_name));
    };

    loadTables();
  }, [connection, isConnected]);

  // Load schema for current table
  useEffect(() => {
    if (!currentTable || !isConnected) return;

    const loadSchema = async () => {
      const result = await connection.execute(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ?
      `, [currentTable]);
      
      setSchema({
        [currentTable]: result
      });
    };

    loadSchema();
  }, [currentTable, connection, isConnected]);

  const value = {
    tables,
    currentTable,
    setCurrentTable,
    schema,
    refreshTables: async () => {
      const result = await connection.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'main'
      `);
      setTables(result.map(row => row.table_name));
    }
  };

  return (
    <DatabaseStateContext.Provider value={value}>
      {children}
    </DatabaseStateContext.Provider>
  );
}

export function useDatabaseState() {
  const context = useContext(DatabaseStateContext);
  if (!context) {
    throw new Error('useDatabaseState must be used within DatabaseStateProvider');
  }
  return context;
}
```

### Using Custom Context

```jsx
function TableExplorer() {
  const { tables, currentTable, setCurrentTable, schema } = useDatabaseState();

  return (
    <div>
      <h3>Tables</h3>
      <select 
        value={currentTable || ''} 
        onChange={(e) => setCurrentTable(e.target.value)}
      >
        <option value="">Select a table</option>
        {tables.map(table => (
          <option key={table} value={table}>{table}</option>
        ))}
      </select>

      {currentTable && schema[currentTable] && (
        <div>
          <h4>Schema for {currentTable}</h4>
          <ul>
            {schema[currentTable].map(col => (
              <li key={col.column_name}>
                {col.column_name}: {col.data_type}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## Context Composition

### Multiple Context Providers

```jsx
import { 
  DuckDBProvider,
  QueryClientProvider,
  CacheProvider,
  ThemeProvider 
} from '@duckdb-wasm-adapter/react';

function App() {
  return (
    <ThemeProvider theme="dark">
      <QueryClientProvider client={queryClient}>
        <DuckDBProvider config={duckdbConfig}>
          <CacheProvider strategy="LRU" maxSize={100}>
            <DatabaseStateProvider>
              <YourApp />
            </DatabaseStateProvider>
          </CacheProvider>
        </DuckDBProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

### Context Utilities

```jsx
// Create a higher-order component for context composition
function withProviders(Component, providers) {
  return providers.reduceRight(
    (WrappedComponent, Provider) => (props) => (
      <Provider>
        <WrappedComponent {...props} />
      </Provider>
    ),
    Component
  );
}

// Use the HOC
const AppWithProviders = withProviders(App, [
  ThemeProvider,
  QueryClientProvider,
  DuckDBProvider,
  CacheProvider
]);
```

## Context State Management

### Global State Manager

```jsx
import { createContext, useContext, useReducer } from 'react';

// Define actions
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_DATA: 'SET_DATA',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESET: 'RESET'
};

// Reducer
function globalReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case ACTIONS.SET_DATA:
      return { ...state, data: action.payload, loading: false, error: null };
    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    case ACTIONS.RESET:
      return initialState;
    default:
      return state;
  }
}

const initialState = {
  loading: false,
  error: null,
  data: null
};

const GlobalStateContext = createContext();

export function GlobalStateProvider({ children }) {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  const actions = {
    setLoading: (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: ACTIONS.SET_ERROR, payload: error }),
    setData: (data) => dispatch({ type: ACTIONS.SET_DATA, payload: data }),
    clearError: () => dispatch({ type: ACTIONS.CLEAR_ERROR }),
    reset: () => dispatch({ type: ACTIONS.RESET })
  };

  return (
    <GlobalStateContext.Provider value={{ state, ...actions }}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return context;
}
```

## Context Synchronization

### Cross-Context Communication

```jsx
import { createContext, useContext, useEffect } from 'react';
import { useDuckDBContext, useQueryClient } from '@duckdb-wasm-adapter/react';

const SyncContext = createContext();

export function SyncProvider({ children }) {
  const { connection, isConnected } = useDuckDBContext();
  const queryClient = useQueryClient();

  // Sync query cache with database changes
  useEffect(() => {
    if (!isConnected) return;

    const syncInterval = setInterval(async () => {
      // Check for database changes
      const result = await connection.execute(`
        SELECT COUNT(*) as count, MAX(updated_at) as last_update 
        FROM change_log
      `);

      const { count, last_update } = result[0];
      
      // Invalidate queries if changes detected
      if (last_update > queryClient.getQueryData(['lastSync'])) {
        queryClient.invalidateQueries();
        queryClient.setQueryData(['lastSync'], last_update);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(syncInterval);
  }, [connection, isConnected, queryClient]);

  return (
    <SyncContext.Provider value={{}}>
      {children}
    </SyncContext.Provider>
  );
}
```

## Context DevTools

### Debug Context

```jsx
import { createContext, useContext, useEffect } from 'react';

const DebugContext = createContext();

export function DebugProvider({ children, enabled = false }) {
  const logContextChange = (contextName, value) => {
    if (!enabled) return;
    
    console.group(`[Context Update] ${contextName}`);
    console.log('New Value:', value);
    console.log('Timestamp:', new Date().toISOString());
    console.trace('Update Stack');
    console.groupEnd();
  };

  useEffect(() => {
    if (!enabled) return;
    
    // Add React DevTools integration
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected');
    }
  }, [enabled]);

  return (
    <DebugContext.Provider value={{ logContextChange, enabled }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  return useContext(DebugContext);
}
```

### Context Inspector

```jsx
function ContextInspector() {
  const duckdbContext = useDuckDBContext();
  const queryClient = useQueryClient();
  const { state: globalState } = useGlobalState();

  return (
    <div className="context-inspector">
      <h3>Context States</h3>
      
      <details>
        <summary>DuckDB Context</summary>
        <pre>{JSON.stringify(duckdbContext, null, 2)}</pre>
      </details>
      
      <details>
        <summary>Query Cache</summary>
        <pre>{JSON.stringify(queryClient.getQueryCache().getAll(), null, 2)}</pre>
      </details>
      
      <details>
        <summary>Global State</summary>
        <pre>{JSON.stringify(globalState, null, 2)}</pre>
      </details>
    </div>
  );
}
```

## Performance Optimization

### Context Memoization

```jsx
import { createContext, useContext, useMemo, useCallback } from 'react';

function OptimizedProvider({ children }) {
  const [state, setState] = useState(initialState);

  // Memoize complex computations
  const derivedData = useMemo(() => {
    return computeExpensiveData(state);
  }, [state]);

  // Memoize callbacks
  const updateData = useCallback((newData) => {
    setState(prev => ({ ...prev, data: newData }));
  }, []);

  const clearData = useCallback(() => {
    setState(prev => ({ ...prev, data: null }));
  }, []);

  // Memoize context value
  const contextValue = useMemo(() => ({
    ...state,
    derivedData,
    updateData,
    clearData
  }), [state, derivedData, updateData, clearData]);

  return (
    <OptimizedContext.Provider value={contextValue}>
      {children}
    </OptimizedContext.Provider>
  );
}
```

### Context Splitting

```jsx
// Split contexts to minimize re-renders
const ConnectionContext = createContext();
const QueryContext = createContext();
const UIContext = createContext();

function SplitProvider({ children }) {
  const [connection, setConnection] = useState(null);
  const [queries, setQueries] = useState({});
  const [ui, setUI] = useState({ theme: 'light', sidebar: true });

  return (
    <ConnectionContext.Provider value={{ connection, setConnection }}>
      <QueryContext.Provider value={{ queries, setQueries }}>
        <UIContext.Provider value={{ ui, setUI }}>
          {children}
        </UIContext.Provider>
      </QueryContext.Provider>
    </ConnectionContext.Provider>
  );
}

// Use specific contexts
function ConnectionStatus() {
  const { connection } = useContext(ConnectionContext);
  // Only re-renders when connection changes
  return <div>Connected: {!!connection}</div>;
}
```

## Best Practices

1. **Keep contexts focused** - Each context should have a single responsibility
2. **Use context composition** - Combine multiple contexts for complex state
3. **Memoize context values** - Prevent unnecessary re-renders
4. **Split large contexts** - Separate frequently and rarely changing data
5. **Provide default values** - Always include sensible defaults
6. **Add error boundaries** - Wrap context providers with error boundaries
7. **Document context APIs** - Clearly document what each context provides

## TypeScript Support

```typescript
import { createContext, useContext, ReactNode } from 'react';

interface DuckDBContextType {
  connection: Connection | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

export function useDuckDBContext(): DuckDBContextType {
  const context = useContext(DuckDBContext);
  if (!context) {
    throw new Error('useDuckDBContext must be used within DuckDBProvider');
  }
  return context;
}

interface DuckDBProviderProps {
  children: ReactNode;
  config?: DuckDBConfig;
  onConnect?: (connection: Connection) => void;
  onError?: (error: Error) => void;
}

export function DuckDBProvider({ 
  children, 
  config, 
  onConnect, 
  onError 
}: DuckDBProviderProps) {
  // Implementation...
}
```

## Next Steps

- [React Hooks](/api/react/hooks) - Available React hooks
- [React Components](/api/react/components) - Pre-built components
- [Query API](/api/query) - Query execution API
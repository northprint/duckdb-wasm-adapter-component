# React Provider

The DuckDBProvider component manages the DuckDB connection and provides context to child components.

## Installation

```bash
npm install @duckdb-wasm-adapter/react
```

## Basic Usage

```jsx
import { DuckDBProvider } from '@duckdb-wasm-adapter/react';

function App() {
  return (
    <DuckDBProvider autoConnect>
      <YourComponents />
    </DuckDBProvider>
  );
}
```

## DuckDBProvider

### Props

```typescript
interface DuckDBProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;           // Auto-connect on mount (default: false)
  config?: ConnectionConfig;       // Connection configuration
  debug?: DebugConfig;            // Debug configuration
  onConnect?: () => void;         // Connect event handler
  onDisconnect?: () => void;      // Disconnect event handler
  onError?: (error: Error) => void; // Error event handler
}
```

### Example with Configuration

```jsx
function App() {
  const debugConfig = {
    enabled: true,
    logQueries: true,
    logTiming: true,
    slowQueryThreshold: 50
  };

  const cacheConfig = {
    enabled: true,
    maxEntries: 100,
    ttl: 60000, // 1 minute
    strategy: 'lru'
  };

  const handleConnect = () => {
    console.log('Connected to DuckDB');
  };

  const handleError = (error) => {
    console.error('DuckDB Error:', error);
  };

  return (
    <DuckDBProvider
      autoConnect
      debug={debugConfig}
      config={{ cache: cacheConfig }}
      onConnect={handleConnect}
      onError={handleError}
    >
      <Dashboard />
    </DuckDBProvider>
  );
}
```

## Context Access

The provider creates a React Context that can be accessed using the `useDuckDB` hook:

```jsx
import { useDuckDB } from '@duckdb-wasm-adapter/react';

function DatabaseStatus() {
  const { connection, status, error, connect, disconnect } = useDuckDB();
  
  return (
    <div>
      <p>Status: {status}</p>
      {error && <p>Error: {error.message}</p>}
      {status !== 'connected' ? (
        <button onClick={connect}>Connect</button>
      ) : (
        <button onClick={disconnect}>Disconnect</button>
      )}
    </div>
  );
}
```

## DuckDBContextValue

The context provides the following values:

```typescript
interface DuckDBContextValue {
  connection: Connection | null;
  status: ConnectionStatus;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
}
```

### ConnectionStatus

```typescript
type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected';
```

## Advanced Configuration

### Worker Configuration

```jsx
<DuckDBProvider
  config={{
    worker: true,           // Use Web Worker (recommended)
    logLevel: 'warning'     // Set log level
  }}
>
  <App />
</DuckDBProvider>
```

### Query Configuration

```jsx
<DuckDBProvider
  config={{
    query: {
      castBigIntToDouble: true  // Convert BigInt to Double
    }
  }}
>
  <App />
</DuckDBProvider>
```

### Full Configuration Example

```jsx
function App() {
  const config = {
    worker: true,
    logLevel: 'warning',
    query: {
      castBigIntToDouble: true
    },
    debug: {
      enabled: process.env.NODE_ENV === 'development',
      logQueries: true,
      logTiming: true,
      slowQueryThreshold: 100
    },
    cache: {
      enabled: true,
      maxEntries: 200,
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 300000, // 5 minutes
      evictionStrategy: 'lru'
    }
  };

  return (
    <DuckDBProvider
      autoConnect
      config={config}
      onConnect={() => console.log('DuckDB connected')}
      onDisconnect={() => console.log('DuckDB disconnected')}
      onError={(error) => console.error('DuckDB error:', error)}
    >
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Router>
    </DuckDBProvider>
  );
}
```

## Error Boundary Integration

For better error handling, wrap the provider with an error boundary:

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div role="alert">
      <h2>Database Error</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DuckDBProvider autoConnect>
        <Dashboard />
      </DuckDBProvider>
    </ErrorBoundary>
  );
}
```

## Server-Side Rendering (SSR)

The provider handles SSR gracefully by deferring connection until client-side hydration:

```jsx
// Works with Next.js, Gatsby, etc.
function App() {
  return (
    <DuckDBProvider autoConnect>
      <Dashboard />
    </DuckDBProvider>
  );
}
```

## Testing

For testing components that use the DuckDB context:

```jsx
import { render } from '@testing-library/react';
import { DuckDBProvider } from '@duckdb-wasm-adapter/react';

function renderWithProvider(component, options = {}) {
  return render(
    <DuckDBProvider config={{ worker: false }} {...options}>
      {component}
    </DuckDBProvider>
  );
}

test('renders dashboard', () => {
  renderWithProvider(<Dashboard />);
  // Your test assertions
});
```

## Best Practices

1. **Place the provider high in your component tree** to ensure all components have access
2. **Use autoConnect for simple applications** where you always need a database connection
3. **Configure debug mode during development** for better debugging experience
4. **Enable caching for better performance** in production applications
5. **Handle connection errors gracefully** with error boundaries or error handlers
6. **Disable worker in tests** to avoid complications with test environments
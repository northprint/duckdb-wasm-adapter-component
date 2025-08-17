# Error Handling

Comprehensive error handling ensures your application gracefully handles failures and provides meaningful feedback to users.

## Error Types

### DuckDBError

The main error class for all DuckDB-related errors:

```javascript
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

try {
  await connection.execute('SELECT * FROM non_existent_table');
} catch (error) {
  if (error instanceof DuckDBError) {
    console.error('DuckDB Error:', {
      code: error.code,
      message: error.message,
      query: error.query,
      position: error.position
    });
  }
}
```

### Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| `CONNECTION_FAILED` | Failed to establish connection | WASM loading failed, browser incompatibility |
| `QUERY_FAILED` | Query execution failed | Syntax error, invalid table/column |
| `TABLE_NOT_FOUND` | Table doesn't exist | Typo, table not created |
| `COLUMN_NOT_FOUND` | Column doesn't exist | Typo, schema mismatch |
| `TYPE_MISMATCH` | Data type mismatch | Invalid type conversion |
| `CONSTRAINT_VIOLATION` | Constraint violated | Unique, foreign key, check constraints |
| `IMPORT_FAILED` | Data import failed | Invalid file format, corrupt data |
| `EXPORT_FAILED` | Data export failed | Insufficient permissions, disk space |
| `MEMORY_LIMIT` | Memory limit exceeded | Dataset too large |
| `NOT_CONNECTED` | Not connected to database | Connection lost or not established |
| `INVALID_PARAMS` | Invalid parameters | Null/undefined where not allowed |
| `TIMEOUT` | Operation timed out | Long-running query |

## Basic Error Handling

### Try-Catch Pattern

```javascript
async function safeQuery(sql, params) {
  try {
    const result = await connection.execute(sql, params);
    return { success: true, data: result.toArray() };
  } catch (error) {
    console.error('Query failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Error Code Handling

```javascript
async function executeWithErrorHandling(sql, params) {
  try {
    return await connection.execute(sql, params);
  } catch (error) {
    if (error instanceof DuckDBError) {
      switch (error.code) {
        case ErrorCode.TABLE_NOT_FOUND:
          console.error('Table not found. Creating table...');
          await createTable();
          return await connection.execute(sql, params);
          
        case ErrorCode.CONNECTION_FAILED:
          console.error('Connection lost. Reconnecting...');
          await connection.reconnect();
          return await connection.execute(sql, params);
          
        case ErrorCode.MEMORY_LIMIT:
          console.error('Memory limit exceeded. Try smaller batch.');
          throw new Error('Dataset too large. Please reduce the query scope.');
          
        default:
          throw error;
      }
    }
    throw error;
  }
}
```

## Framework-specific Error Handling

### React Error Boundaries

```jsx
import React from 'react';

class DuckDBErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('DuckDB Error:', error, errorInfo);
    
    // Log to error reporting service
    if (error instanceof DuckDBError) {
      logErrorToService({
        code: error.code,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Database Error</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <DuckDBErrorBoundary>
      <DuckDBProvider>
        <YourApp />
      </DuckDBProvider>
    </DuckDBErrorBoundary>
  );
}
```

### Vue Error Handling

```vue
<template>
  <div>
    <div v-if="error" class="error-message">
      {{ errorMessage }}
      <button @click="retry">Retry</button>
    </div>
    <div v-else>
      <!-- Your content -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useQuery } from '@northprint/duckdb-wasm-adapter-vue';
import { DuckDBError, ErrorCode } from '@northprint/duckdb-wasm-adapter-core';

const { data, loading, error, refetch } = useQuery('SELECT * FROM users');

const errorMessage = computed(() => {
  if (!error.value) return '';
  
  if (error.value instanceof DuckDBError) {
    switch (error.value.code) {
      case ErrorCode.TABLE_NOT_FOUND:
        return 'Table not found. Please check your database setup.';
      case ErrorCode.CONNECTION_FAILED:
        return 'Connection failed. Please refresh the page.';
      case ErrorCode.QUERY_FAILED:
        return 'Query failed. Please check your SQL syntax.';
      default:
        return error.value.message;
    }
  }
  
  return 'An unexpected error occurred';
});

const retry = () => {
  error.value = null;
  refetch();
};

// Global error handler
const errorHandler = (err) => {
  if (err instanceof DuckDBError) {
    console.error('DuckDB Error:', err.code, err.message);
  }
};

app.config.errorHandler = errorHandler;
</script>
```

### Svelte Error Handling

```svelte
<script>
  import { onMount } from 'svelte';
  import { createDuckDB } from '@northprint/duckdb-wasm-adapter-svelte';
  
  const db = createDuckDB({
    autoConnect: true,
    onError: handleError
  });
  
  let error = null;
  let errorMessage = '';
  
  function handleError(err) {
    error = err;
    
    if (err.code === 'TABLE_NOT_FOUND') {
      errorMessage = 'Table not found';
    } else if (err.code === 'CONNECTION_FAILED') {
      errorMessage = 'Connection failed';
    } else {
      errorMessage = err.message;
    }
  }
  
  async function retryConnection() {
    error = null;
    errorMessage = '';
    await db.connect();
  }
  
  // Query with error handling
  $: users = db.query('SELECT * FROM users').catch(handleError);
</script>

{#if error}
  <div class="error">
    <p>{errorMessage}</p>
    <button on:click={retryConnection}>Retry</button>
  </div>
{/if}
```

## Retry Strategies

### Exponential Backoff

```javascript
class RetryHandler {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }
  
  async execute(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        
        console.log(`Retry attempt ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  shouldNotRetry(error) {
    // Don't retry syntax errors or invalid parameters
    return error.code === ErrorCode.QUERY_FAILED ||
           error.code === ErrorCode.INVALID_PARAMS ||
           error.code === ErrorCode.TABLE_NOT_FOUND;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retry = new RetryHandler();

const result = await retry.execute(async () => {
  return await connection.execute('SELECT * FROM users');
});
```

## Connection Recovery

### Auto-reconnect

```javascript
class ResilientConnection {
  constructor(config) {
    this.config = config;
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  async connect() {
    try {
      this.connection = await createConnection(this.config);
      this.reconnectAttempts = 0;
      console.log('Connected successfully');
    } catch (error) {
      console.error('Connection failed:', error);
      await this.handleConnectionError(error);
    }
  }
  
  async handleConnectionError(error) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.connect();
  }
  
  async execute(sql, params) {
    try {
      if (!this.connection) {
        await this.connect();
      }
      return await this.connection.execute(sql, params);
    } catch (error) {
      if (error.code === ErrorCode.NOT_CONNECTED) {
        await this.connect();
        return await this.connection.execute(sql, params);
      }
      throw error;
    }
  }
}
```

## User-friendly Error Messages

### Error Message Mapping

```javascript
const errorMessages = {
  [ErrorCode.CONNECTION_FAILED]: 'Unable to connect to the database. Please refresh the page.',
  [ErrorCode.QUERY_FAILED]: 'The query could not be executed. Please check your input.',
  [ErrorCode.TABLE_NOT_FOUND]: 'The requested data is not available.',
  [ErrorCode.MEMORY_LIMIT]: 'The operation requires too much memory. Please try with less data.',
  [ErrorCode.TIMEOUT]: 'The operation took too long. Please try again.',
  [ErrorCode.IMPORT_FAILED]: 'The file could not be imported. Please check the file format.',
  [ErrorCode.EXPORT_FAILED]: 'The data could not be exported. Please try again.'
};

function getUserFriendlyMessage(error) {
  if (error instanceof DuckDBError) {
    return errorMessages[error.code] || error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
```

## Validation

### Input Validation

```javascript
class QueryValidator {
  static validateSQL(sql) {
    if (!sql || typeof sql !== 'string') {
      throw new Error('SQL query must be a non-empty string');
    }
    
    // Check for dangerous operations
    const dangerous = ['DROP DATABASE', 'DROP SCHEMA'];
    for (const keyword of dangerous) {
      if (sql.toUpperCase().includes(keyword)) {
        throw new Error(`Dangerous operation detected: ${keyword}`);
      }
    }
    
    return true;
  }
  
  static validateParams(params) {
    if (!Array.isArray(params)) {
      throw new Error('Parameters must be an array');
    }
    
    // Check for SQL injection in parameters
    for (const param of params) {
      if (typeof param === 'string' && param.includes(';')) {
        console.warn('Semicolon detected in parameter - possible SQL injection');
      }
    }
    
    return true;
  }
  
  static validateFile(file) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (!file) {
      throw new Error('File is required');
    }
    
    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
    }
    
    const allowedTypes = ['.csv', '.json', '.parquet'];
    const extension = file.name.substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(extension)) {
      throw new Error(`File type ${extension} is not supported`);
    }
    
    return true;
  }
}
```

## Logging and Monitoring

### Error Logger

```javascript
class ErrorLogger {
  constructor(service) {
    this.service = service;
    this.errors = [];
  }
  
  log(error, context = {}) {
    const errorEntry = {
      timestamp: new Date(),
      message: error.message,
      code: error.code,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.push(errorEntry);
    
    // Send to logging service
    if (this.service) {
      this.service.logError(errorEntry);
    }
    
    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorEntry);
    }
  }
  
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }
  
  clearErrors() {
    this.errors = [];
  }
}
```

## Best Practices

1. **Always handle errors** - Never let errors go uncaught
2. **Provide context** - Include relevant information in error messages
3. **User-friendly messages** - Show helpful messages to users
4. **Log for debugging** - Keep detailed logs for developers
5. **Fail gracefully** - Provide fallbacks when possible
6. **Validate inputs** - Prevent errors before they occur
7. **Monitor in production** - Track errors in real deployments
8. **Test error scenarios** - Include error cases in tests
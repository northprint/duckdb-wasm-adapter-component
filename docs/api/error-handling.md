# Error Handling API

## Overview

The DuckDB WASM Adapter provides a comprehensive error handling system with hierarchical error classes, retry logic, and helpful error messages.

## Error Classes

### BaseError

The base class for all custom errors in the adapter.

```typescript
class BaseError extends Error {
  code: string;
  originalError?: Error;
  context?: Record<string, unknown>;
  
  isRetryable(): boolean;
  getSuggestedAction(): string;
}
```

### ConnectionError

Errors related to database connections.

```typescript
class ConnectionError extends BaseError {
  static connectionFailed(reason: string, originalError?: Error): ConnectionError;
  static notConnected(): ConnectionError;
  static alreadyConnected(): ConnectionError;
  static initializationFailed(reason: string, originalError?: Error): ConnectionError;
  static connectionLost(reason: string): ConnectionError;
}
```

**Example:**

```typescript
try {
  await adapter.connect();
} catch (error) {
  if (error instanceof ConnectionError) {
    if (error.isRetryable()) {
      // Retry connection
      await withRetry(() => adapter.connect());
    } else {
      console.error(error.getSuggestedAction());
    }
  }
}
```

### QueryError

Errors that occur during query execution.

```typescript
class QueryError extends BaseError {
  static syntaxError(query: string, details?: string): QueryError;
  static executionFailed(query: string, reason: string, originalError?: Error): QueryError;
  static invalidParams(expected: number, received: number): QueryError;
  static timeout(query: string, timeoutMs: number): QueryError;
  static accessDenied(table: string, operation: string): QueryError;
}
```

**Example:**

```typescript
try {
  const result = await connection.query('SELECT * FORM users'); // Typo: FORM
} catch (error) {
  if (error instanceof QueryError && error.code === 'QUERY_SYNTAX_ERROR') {
    console.error('SQL Syntax Error:', error.message);
    // Output: "SQL syntax error in query: SELECT * FORM users"
  }
}
```

### DataError

Errors related to data import/export operations.

```typescript
class DataError extends BaseError {
  static importFailed(format: string, reason: string, originalError?: Error): DataError;
  static exportFailed(format: string, reason: string, originalError?: Error): DataError;
  static invalidFormat(format: string, supportedFormats: string[]): DataError;
  static corruptedData(format: string, details?: string): DataError;
  static schemaMismatch(expected: string[], actual: string[]): DataError;
  static sizeLimitExceeded(size: number, limit: number): DataError;
  static emptyData(operation: string): DataError;
}
```

**Example:**

```typescript
try {
  await connection.importCSV(file, 'users');
} catch (error) {
  if (error instanceof DataError) {
    switch (error.code) {
      case 'DATA_INVALID_FORMAT':
        console.error('Invalid file format');
        break;
      case 'DATA_SIZE_LIMIT_EXCEEDED':
        console.error('File too large');
        break;
      default:
        console.error(error.getSuggestedAction());
    }
  }
}
```

### ValidationError

Input validation errors.

```typescript
class ValidationError extends BaseError {
  static invalidTableName(message: string): ValidationError;
  static invalidColumnName(name: string, reason?: string): ValidationError;
  static invalidQuery(message: string): ValidationError;
  static missingRequired(field: string): ValidationError;
  static invalidType(field: string, expected: string, received: string): ValidationError;
}
```

**Example:**

```typescript
try {
  await connection.createTable('123-invalid-name', columns); // Invalid table name
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  }
}
```

## Utility Functions

### Type Guards

```typescript
function isConnectionError(error: unknown): error is ConnectionError;
function isQueryError(error: unknown): error is QueryError;
function isDataError(error: unknown): error is DataError;
function isValidationError(error: unknown): error is ValidationError;
function isRetryableError(error: unknown): boolean;
```

**Example:**

```typescript
catch (error) {
  if (isRetryableError(error)) {
    // Can safely retry
    await retry();
  } else if (isQueryError(error)) {
    // Handle query-specific error
    logQueryError(error);
  }
}
```

### Retry Logic

```typescript
interface RetryOptions {
  maxAttempts?: number;      // Default: 3
  delayMs?: number;          // Default: 1000
  backoffMultiplier?: number; // Default: 2
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T>;
```

**Example:**

```typescript
// Simple retry with defaults
const result = await withRetry(() => 
  connection.query('SELECT * FROM users')
);

// Custom retry configuration
const data = await withRetry(
  () => fetchData(),
  {
    maxAttempts: 5,
    delayMs: 500,
    backoffMultiplier: 1.5,
    shouldRetry: (error, attempt) => {
      return isRetryableError(error) && attempt < 3;
    }
  }
);
```

### Error Factory

```typescript
class ErrorFactory {
  static fromUnknown(error: unknown, defaultCode?: string): BaseError;
}
```

**Example:**

```typescript
try {
  // Some operation
} catch (error) {
  const standardError = ErrorFactory.fromUnknown(error);
  console.error(`Error [${standardError.code}]: ${standardError.message}`);
  
  if (standardError.isRetryable()) {
    // Retry logic
  }
}
```

## Best Practices

### 1. Use Specific Error Classes

```typescript
// Good
if (error instanceof ConnectionError) {
  handleConnectionError(error);
} else if (error instanceof QueryError) {
  handleQueryError(error);
}

// Less specific
if (error instanceof Error) {
  handleGenericError(error);
}
```

### 2. Check Retryability

```typescript
catch (error) {
  if (isRetryableError(error)) {
    return withRetry(() => operation(), {
      maxAttempts: 3,
      delayMs: 1000
    });
  }
  throw error;
}
```

### 3. Use Suggested Actions

```typescript
catch (error) {
  if (error instanceof BaseError) {
    const action = error.getSuggestedAction();
    console.log(`Suggestion: ${action}`);
    // Display helpful message to user
  }
}
```

### 4. Preserve Error Context

```typescript
catch (originalError) {
  throw DataError.importFailed(
    'CSV',
    'Failed to parse file',
    originalError as Error,
    { 
      fileName: file.name,
      fileSize: file.size,
      lineNumber: 42
    }
  );
}
```

## Migration Guide

If you're upgrading from an older version:

```typescript
// Old approach
try {
  await connection.query(sql);
} catch (error) {
  if (error.message.includes('connection')) {
    // Handle connection error
  }
}

// New approach
try {
  await connection.query(sql);
} catch (error) {
  if (error instanceof ConnectionError) {
    if (error.isRetryable()) {
      await withRetry(() => connection.reconnect());
    }
  } else if (error instanceof QueryError) {
    console.error(error.getSuggestedAction());
  }
}
```
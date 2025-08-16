import { ErrorCode } from './types.js';

export class DuckDBError extends Error {
  public readonly code: ErrorCode;
  public readonly sqlState?: string;
  public readonly originalError?: Error;

  constructor(message: string, code: ErrorCode, originalError?: Error, sqlState?: string) {
    super(message);
    this.name = 'DuckDBError';
    this.code = code;
    this.originalError = originalError;
    this.sqlState = sqlState;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DuckDBError);
    }
  }

  static fromError(error: unknown, code: ErrorCode = ErrorCode.QUERY_FAILED): DuckDBError {
    if (error instanceof DuckDBError) {
      return error;
    }

    if (error instanceof Error) {
      return new DuckDBError(error.message, code, error);
    }

    const message = typeof error === 'string' ? error : 'Unknown error occurred';
    return new DuckDBError(message, code);
  }

  static connectionFailed(message: string, originalError?: Error): DuckDBError {
    return new DuckDBError(
      `Connection failed: ${message}`,
      ErrorCode.CONNECTION_FAILED,
      originalError
    );
  }

  static queryFailed(message: string, originalError?: Error, sqlState?: string): DuckDBError {
    return new DuckDBError(
      `Query execution failed: ${message}`,
      ErrorCode.QUERY_FAILED,
      originalError,
      sqlState
    );
  }

  static importFailed(message: string, originalError?: Error): DuckDBError {
    return new DuckDBError(
      `Data import failed: ${message}`,
      ErrorCode.IMPORT_FAILED,
      originalError
    );
  }

  static exportFailed(message: string, originalError?: Error): DuckDBError {
    return new DuckDBError(
      `Data export failed: ${message}`,
      ErrorCode.EXPORT_FAILED,
      originalError
    );
  }

  static invalidParams(message: string): DuckDBError {
    return new DuckDBError(`Invalid parameters: ${message}`, ErrorCode.INVALID_PARAMS);
  }

  static notConnected(): DuckDBError {
    return new DuckDBError(
      'Database connection not established. Call connect() first.',
      ErrorCode.NOT_CONNECTED
    );
  }

  static memoryLimit(message: string): DuckDBError {
    return new DuckDBError(`Memory limit exceeded: ${message}`, ErrorCode.MEMORY_LIMIT);
  }

  static initializationFailed(message: string, originalError?: Error): DuckDBError {
    return new DuckDBError(
      `DuckDB initialization failed: ${message}`,
      ErrorCode.INITIALIZATION_FAILED,
      originalError
    );
  }

  static workerError(message: string, originalError?: Error): DuckDBError {
    return new DuckDBError(`Worker error: ${message}`, ErrorCode.WORKER_ERROR, originalError);
  }

  static unsupportedOperation(operation: string): DuckDBError {
    return new DuckDBError(
      `Unsupported operation: ${operation}`,
      ErrorCode.UNSUPPORTED_OPERATION
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      sqlState: this.sqlState,
      stack: this.stack,
    };
  }
}
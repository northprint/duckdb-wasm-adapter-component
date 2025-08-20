import { BaseError } from './base-error.js';

/**
 * Query execution errors
 */
export class QueryError extends BaseError {
  public readonly sqlState?: string;
  public readonly query?: string;
  public readonly params?: unknown[];

  constructor(
    message: string,
    code: string = 'QUERY_ERROR',
    originalError?: Error,
    context?: Record<string, unknown> & {
      sqlState?: string;
      query?: string;
      params?: unknown[];
    }
  ) {
    super(message, code, originalError, context);
    this.name = 'QueryError';
    this.sqlState = context?.sqlState;
    this.query = context?.query;
    this.params = context?.params;
  }

  static syntaxError(query: string, originalError?: Error): QueryError {
    return new QueryError(
      'SQL syntax error',
      'QUERY_SYNTAX_ERROR',
      originalError,
      { query }
    );
  }

  static executionFailed(query: string, reason: string, originalError?: Error): QueryError {
    return new QueryError(
      `Query execution failed: ${reason}`,
      'QUERY_EXECUTION_FAILED',
      originalError,
      { query, reason }
    );
  }

  static parameterMismatch(expected: number, received: number, query: string): QueryError {
    return new QueryError(
      `Parameter count mismatch: expected ${expected}, received ${received}`,
      'QUERY_PARAMETER_MISMATCH',
      undefined,
      { expected, received, query }
    );
  }

  static invalidQuery(reason: string, query?: string): QueryError {
    return new QueryError(
      `Invalid query: ${reason}`,
      'QUERY_INVALID',
      undefined,
      { reason, query }
    );
  }

  static timeout(query: string, timeoutMs: number): QueryError {
    return new QueryError(
      `Query timeout after ${timeoutMs}ms`,
      'QUERY_TIMEOUT',
      undefined,
      { query, timeoutMs }
    );
  }

  static unsupportedOperation(operation: string): QueryError {
    return new QueryError(
      `Unsupported operation: ${operation}`,
      'QUERY_UNSUPPORTED_OPERATION',
      undefined,
      { operation }
    );
  }

  isRetryable(): boolean {
    return ['QUERY_TIMEOUT'].includes(this.code);
  }

  getSuggestedAction(): string {
    switch (this.code) {
      case 'QUERY_SYNTAX_ERROR':
        return 'Check SQL syntax and table/column names';
      case 'QUERY_PARAMETER_MISMATCH':
        return 'Ensure parameter count matches placeholders in query';
      case 'QUERY_TIMEOUT':
        return 'Optimize query or increase timeout limit';
      case 'QUERY_UNSUPPORTED_OPERATION':
        return 'Use supported DuckDB operations only';
      default:
        return 'Review query and try again';
    }
  }

  getDetailedMessage(): string {
    let details = super.getDetailedMessage();
    
    if (this.query) {
      details += `\nQuery: ${this.query}`;
    }
    
    if (this.params) {
      details += `\nParameters: ${JSON.stringify(this.params)}`;
    }
    
    if (this.sqlState) {
      details += `\nSQL State: ${this.sqlState}`;
    }
    
    return details;
  }
}
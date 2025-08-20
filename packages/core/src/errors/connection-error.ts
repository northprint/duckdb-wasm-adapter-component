import { BaseError } from './base-error.js';

/**
 * Connection-related errors
 */
export class ConnectionError extends BaseError {
  constructor(
    message: string,
    code: string = 'CONNECTION_ERROR',
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, code, originalError, context);
    this.name = 'ConnectionError';
  }

  static notInitialized(): ConnectionError {
    return new ConnectionError(
      'Connection not initialized. Call initialize() first.',
      'CONNECTION_NOT_INITIALIZED',
      undefined,
      { suggestion: 'Ensure connection.initialize() is called before using the connection' }
    );
  }

  static alreadyConnected(): ConnectionError {
    return new ConnectionError(
      'Connection already established',
      'CONNECTION_ALREADY_ESTABLISHED'
    );
  }

  static connectionFailed(reason: string, originalError?: Error): ConnectionError {
    return new ConnectionError(
      `Failed to establish connection: ${reason}`,
      'CONNECTION_FAILED',
      originalError,
      { reason }
    );
  }

  static disconnectionFailed(reason: string, originalError?: Error): ConnectionError {
    return new ConnectionError(
      `Failed to close connection: ${reason}`,
      'DISCONNECTION_FAILED',
      originalError,
      { reason }
    );
  }

  static timeout(timeoutMs: number): ConnectionError {
    return new ConnectionError(
      `Connection timeout after ${timeoutMs}ms`,
      'CONNECTION_TIMEOUT',
      undefined,
      { timeoutMs }
    );
  }

  isRetryable(): boolean {
    return ['CONNECTION_TIMEOUT', 'CONNECTION_FAILED'].includes(this.code);
  }

  getSuggestedAction(): string {
    switch (this.code) {
      case 'CONNECTION_NOT_INITIALIZED':
        return 'Call connection.initialize() before executing queries';
      case 'CONNECTION_TIMEOUT':
        return 'Check network connectivity and increase timeout if needed';
      case 'CONNECTION_FAILED':
        return 'Verify DuckDB WASM files are accessible and retry connection';
      default:
        return 'Check connection configuration and retry';
    }
  }
}
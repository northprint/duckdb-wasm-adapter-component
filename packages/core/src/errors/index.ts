/**
 * Centralized error handling module
 * Exports all error classes and utilities
 */

export { BaseError } from './base-error.js';
export { ConnectionError } from './connection-error.js';
export { QueryError } from './query-error.js';
export { DataError } from './data-error.js';
export { ValidationError } from './validation-error.js';

// Import for type guards
import { ConnectionError } from './connection-error.js';
import { QueryError } from './query-error.js';
import { DataError } from './data-error.js';
import { ValidationError } from './validation-error.js';
import { BaseError } from './base-error.js';

// Re-export legacy DuckDBError for backward compatibility
export { DuckDBError } from '../errors.js';

// Error type guards
export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}

export function isQueryError(error: unknown): error is QueryError {
  return error instanceof QueryError;
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof BaseError) {
    return error.isRetryable();
  }
  return false;
}

// Error factory for creating appropriate error types
export class ErrorFactory {
  static fromUnknown(error: unknown, defaultCode: string = 'UNKNOWN_ERROR'): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to categorize based on error message
      const message = error.message.toLowerCase();
      
      if (message.includes('connection') || message.includes('connect')) {
        return new ConnectionError(error.message, 'CONNECTION_ERROR', error);
      }
      
      if (message.includes('query') || message.includes('sql')) {
        return new QueryError(error.message, 'QUERY_ERROR', error);
      }
      
      if (message.includes('import') || message.includes('export')) {
        return new DataError(error.message, 'DATA_ERROR', error);
      }
      
      if (message.includes('invalid') || message.includes('missing')) {
        return new ValidationError(error.message, 'VALIDATION_ERROR');
      }
      
      // Default to QueryError for unknown errors
      return new QueryError(error.message, defaultCode, error);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return new QueryError(error, defaultCode);
    }

    // Handle unknown error types
    return new QueryError('An unknown error occurred', defaultCode);
  }
}

// Retry logic utility
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
import { BaseError } from './base-error.js';

/**
 * Data import/export errors
 */
export class DataError extends BaseError {
  constructor(
    message: string,
    code: string = 'DATA_ERROR',
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, code, originalError, context);
    this.name = 'DataError';
  }

  static importFailed(
    format: string,
    reason: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ): DataError {
    return new DataError(
      `Failed to import ${format} data: ${reason}`,
      'DATA_IMPORT_FAILED',
      originalError,
      { format, reason, ...context }
    );
  }

  static exportFailed(
    format: string,
    reason: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ): DataError {
    return new DataError(
      `Failed to export data to ${format}: ${reason}`,
      'DATA_EXPORT_FAILED',
      originalError,
      { format, reason, ...context }
    );
  }

  static invalidFormat(format: string, supportedFormats: string[]): DataError {
    return new DataError(
      `Invalid data format: ${format}`,
      'DATA_INVALID_FORMAT',
      undefined,
      { format, supportedFormats }
    );
  }

  static corruptedData(format: string, details?: string): DataError {
    return new DataError(
      `Corrupted ${format} data${details ? `: ${details}` : ''}`,
      'DATA_CORRUPTED',
      undefined,
      { format, details }
    );
  }

  static schemaMismatch(expected: string[], actual: string[]): DataError {
    return new DataError(
      'Data schema mismatch',
      'DATA_SCHEMA_MISMATCH',
      undefined,
      { expected, actual }
    );
  }

  static sizeLimitExceeded(size: number, limit: number): DataError {
    return new DataError(
      `Data size ${size} exceeds limit ${limit}`,
      'DATA_SIZE_LIMIT_EXCEEDED',
      undefined,
      { size, limit }
    );
  }

  static emptyData(operation: string): DataError {
    return new DataError(
      `Cannot ${operation} with empty data`,
      'DATA_EMPTY',
      undefined,
      { operation }
    );
  }

  isRetryable(): boolean {
    return false; // Data errors typically require fixing the data
  }

  getSuggestedAction(): string {
    switch (this.code) {
      case 'DATA_INVALID_FORMAT':
        const formats = (this.context?.supportedFormats as string[])?.join(', ');
        return `Use one of the supported formats: ${formats}`;
      case 'DATA_CORRUPTED':
        return 'Verify data integrity and format';
      case 'DATA_SCHEMA_MISMATCH':
        return 'Ensure data schema matches table schema';
      case 'DATA_SIZE_LIMIT_EXCEEDED':
        return 'Reduce data size or increase memory limits';
      case 'DATA_EMPTY':
        return 'Provide non-empty data';
      default:
        return 'Check data format and try again';
    }
  }
}
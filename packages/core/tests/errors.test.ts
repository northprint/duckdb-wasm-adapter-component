import { describe, it, expect } from 'vitest';
import { DuckDBError } from '../src/errors';
import { ErrorCode } from '../src/types';

describe('DuckDBError', () => {
  describe('constructor', () => {
    it('should create error with message and code', () => {
      const error = new DuckDBError('Test error', ErrorCode.QUERY_FAILED);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DuckDBError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.QUERY_FAILED);
      expect(error.name).toBe('DuckDBError');
    });

    it('should include original error', () => {
      const originalError = new Error('Original');
      const error = new DuckDBError(
        'Wrapped error',
        ErrorCode.CONNECTION_FAILED,
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should include SQL state', () => {
      const error = new DuckDBError(
        'SQL error',
        ErrorCode.QUERY_FAILED,
        undefined,
        '42P01'
      );

      expect(error.sqlState).toBe('42P01');
    });
  });

  describe('fromError', () => {
    it('should return existing DuckDBError unchanged', () => {
      const original = new DuckDBError('Test', ErrorCode.IMPORT_FAILED);
      const result = DuckDBError.fromError(original);

      expect(result).toBe(original);
    });

    it('should wrap Error instance', () => {
      const error = new Error('Test error');
      const result = DuckDBError.fromError(error);

      expect(result).toBeInstanceOf(DuckDBError);
      expect(result.message).toBe('Test error');
      expect(result.code).toBe(ErrorCode.QUERY_FAILED);
      expect(result.originalError).toBe(error);
    });

    it('should handle string errors', () => {
      const result = DuckDBError.fromError('String error');

      expect(result).toBeInstanceOf(DuckDBError);
      expect(result.message).toBe('String error');
    });

    it('should handle unknown error types', () => {
      const result = DuckDBError.fromError({ weird: 'object' });

      expect(result).toBeInstanceOf(DuckDBError);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should use custom error code', () => {
      const error = new Error('Test');
      const result = DuckDBError.fromError(error, ErrorCode.MEMORY_LIMIT);

      expect(result.code).toBe(ErrorCode.MEMORY_LIMIT);
    });
  });

  describe('static factory methods', () => {
    it('connectionFailed', () => {
      const error = DuckDBError.connectionFailed('Cannot connect');

      expect(error.message).toBe('Connection failed: Cannot connect');
      expect(error.code).toBe(ErrorCode.CONNECTION_FAILED);
    });

    it('queryFailed', () => {
      const error = DuckDBError.queryFailed('Invalid syntax', undefined, '42601');

      expect(error.message).toBe('Query execution failed: Invalid syntax');
      expect(error.code).toBe(ErrorCode.QUERY_FAILED);
      expect(error.sqlState).toBe('42601');
    });

    it('importFailed', () => {
      const error = DuckDBError.importFailed('Invalid CSV format');

      expect(error.message).toBe('Data import failed: Invalid CSV format');
      expect(error.code).toBe(ErrorCode.IMPORT_FAILED);
    });

    it('exportFailed', () => {
      const error = DuckDBError.exportFailed('Cannot write file');

      expect(error.message).toBe('Data export failed: Cannot write file');
      expect(error.code).toBe(ErrorCode.EXPORT_FAILED);
    });

    it('invalidParams', () => {
      const error = DuckDBError.invalidParams('Missing required field');

      expect(error.message).toBe('Invalid parameters: Missing required field');
      expect(error.code).toBe(ErrorCode.INVALID_PARAMS);
    });

    it('notConnected', () => {
      const error = DuckDBError.notConnected();

      expect(error.message).toBe('Database connection not established. Call connect() first.');
      expect(error.code).toBe(ErrorCode.NOT_CONNECTED);
    });

    it('memoryLimit', () => {
      const error = DuckDBError.memoryLimit('Dataset too large');

      expect(error.message).toBe('Memory limit exceeded: Dataset too large');
      expect(error.code).toBe(ErrorCode.MEMORY_LIMIT);
    });

    it('initializationFailed', () => {
      const error = DuckDBError.initializationFailed('WASM load failed');

      expect(error.message).toBe('DuckDB initialization failed: WASM load failed');
      expect(error.code).toBe(ErrorCode.INITIALIZATION_FAILED);
    });

    it('workerError', () => {
      const error = DuckDBError.workerError('Worker terminated');

      expect(error.message).toBe('Worker error: Worker terminated');
      expect(error.code).toBe(ErrorCode.WORKER_ERROR);
    });

    it('unsupportedOperation', () => {
      const error = DuckDBError.unsupportedOperation('Sync execution');

      expect(error.message).toBe('Unsupported operation: Sync execution');
      expect(error.code).toBe(ErrorCode.UNSUPPORTED_OPERATION);
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const originalError = new Error('Original');
      const error = new DuckDBError(
        'Test error',
        ErrorCode.QUERY_FAILED,
        originalError,
        '42P01'
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'DuckDBError',
        message: 'Test error',
        code: ErrorCode.QUERY_FAILED,
        sqlState: '42P01',
        stack: expect.any(String),
      });
    });

    it('should handle missing optional fields', () => {
      const error = new DuckDBError('Simple error', ErrorCode.IMPORT_FAILED);
      const json = error.toJSON();

      expect(json.sqlState).toBeUndefined();
    });
  });

  describe('error inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new DuckDBError('Test', ErrorCode.QUERY_FAILED);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof DuckDBError).toBe(true);
    });

    it('should have proper stack trace', () => {
      const error = new DuckDBError('Test', ErrorCode.QUERY_FAILED);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('DuckDBError');
      expect(error.stack).toContain('Test');
    });
  });

  describe('error chaining', () => {
    it('should preserve error chain', () => {
      const rootCause = new Error('Root cause');
      const intermediate = DuckDBError.queryFailed('Query error', rootCause);
      const final = DuckDBError.fromError(intermediate);

      expect(final).toBe(intermediate);
      expect(final.originalError).toBe(rootCause);
    });
  });
});
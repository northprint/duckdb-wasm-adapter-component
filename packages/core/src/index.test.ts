import { describe, it, expect } from 'vitest';
import { ErrorCode } from './types.js';

describe('Core Package', () => {
  it('should export ErrorCode enum', () => {
    expect(ErrorCode).toBeDefined();
    expect(ErrorCode.CONNECTION_FAILED).toBe('CONNECTION_FAILED');
  });

  it('should have all error codes', () => {
    const codes = Object.values(ErrorCode);
    expect(codes).toContain('CONNECTION_FAILED');
    expect(codes).toContain('QUERY_FAILED');
    expect(codes).toContain('IMPORT_FAILED');
    expect(codes).toContain('EXPORT_FAILED');
  });
});
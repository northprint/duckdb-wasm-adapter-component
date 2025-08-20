import { BaseError } from './base-error.js';

/**
 * Validation errors for input parameters
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, undefined, context);
    this.name = 'ValidationError';
  }

  static invalidParameter(
    paramName: string,
    value: unknown,
    expectedType?: string
  ): ValidationError {
    return new ValidationError(
      `Invalid parameter '${paramName}'${expectedType ? `: expected ${expectedType}` : ''}`,
      'VALIDATION_INVALID_PARAMETER',
      { paramName, value, expectedType }
    );
  }

  static missingParameter(paramName: string): ValidationError {
    return new ValidationError(
      `Missing required parameter: ${paramName}`,
      'VALIDATION_MISSING_PARAMETER',
      { paramName }
    );
  }

  static invalidTableName(tableName: string, reason?: string): ValidationError {
    return new ValidationError(
      `Invalid table name '${tableName}'${reason ? `: ${reason}` : ''}`,
      'VALIDATION_INVALID_TABLE_NAME',
      { tableName, reason }
    );
  }

  static invalidColumnName(columnName: string, reason?: string): ValidationError {
    return new ValidationError(
      `Invalid column name '${columnName}'${reason ? `: ${reason}` : ''}`,
      'VALIDATION_INVALID_COLUMN_NAME',
      { columnName, reason }
    );
  }

  static outOfRange(
    paramName: string,
    value: number,
    min?: number,
    max?: number
  ): ValidationError {
    let message = `Value ${value} for '${paramName}' is out of range`;
    if (min !== undefined && max !== undefined) {
      message += ` (${min} - ${max})`;
    } else if (min !== undefined) {
      message += ` (minimum: ${min})`;
    } else if (max !== undefined) {
      message += ` (maximum: ${max})`;
    }

    return new ValidationError(
      message,
      'VALIDATION_OUT_OF_RANGE',
      { paramName, value, min, max }
    );
  }

  static invalidFormat(
    paramName: string,
    value: string,
    expectedFormat: string
  ): ValidationError {
    return new ValidationError(
      `Invalid format for '${paramName}': expected ${expectedFormat}`,
      'VALIDATION_INVALID_FORMAT',
      { paramName, value, expectedFormat }
    );
  }

  getSuggestedAction(): string {
    switch (this.code) {
      case 'VALIDATION_INVALID_PARAMETER':
        return `Provide a valid value for '${String(this.context?.paramName)}'`;
      case 'VALIDATION_MISSING_PARAMETER':
        return `Supply the required parameter '${String(this.context?.paramName)}'`;
      case 'VALIDATION_INVALID_TABLE_NAME':
        return 'Use alphanumeric characters and underscores for table names';
      case 'VALIDATION_INVALID_COLUMN_NAME':
        return 'Use valid SQL column naming conventions';
      case 'VALIDATION_OUT_OF_RANGE':
        return `Provide a value within the valid range`;
      case 'VALIDATION_INVALID_FORMAT':
        return `Format the value according to: ${String(this.context?.expectedFormat)}`;
      default:
        return 'Check input parameters and try again';
    }
  }
}
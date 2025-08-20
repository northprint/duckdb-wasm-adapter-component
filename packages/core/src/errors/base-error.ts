/**
 * Base error class for all DuckDB adapter errors
 * Provides common functionality and structure
 */
export abstract class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a formatted error message with context
   */
  getDetailedMessage(): string {
    let details = `[${this.code}] ${this.message}`;
    
    if (this.context) {
      details += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    
    if (this.originalError) {
      details += `\nCaused by: ${this.originalError.message}`;
    }
    
    return details;
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return false; // Override in subclasses
  }

  /**
   * Get suggested action for the error
   */
  getSuggestedAction(): string | undefined {
    return undefined; // Override in subclasses
  }
}
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ResultSet, QueryProfile } from './types.js';
import { DuckDBError } from './errors.js';
import { ResultSetImpl } from './result-set.js';
import { DebugLogger } from './debug.js';

export class QueryExecutor {
  private debugLogger?: DebugLogger;
  
  constructor(
    private connection: AsyncDuckDBConnection,
    debugLogger?: DebugLogger
  ) {
    this.debugLogger = debugLogger;
  }

  async execute<T = Record<string, unknown>>(
    query: string,
    params?: unknown[]
  ): Promise<ResultSet<T>> {
    // Start debugging
    this.debugLogger?.startQuery(query, params);
    const startTime = performance.now();
    
    try {
      let profile: QueryProfile | undefined;
      
      // Get query profile if debugging is enabled
      if (this.debugLogger?.isEnabled() && this.debugLogger) {
        profile = await this.debugLogger.profileQuery(this.connection, query);
      }
      
      // For simple queries without parameters
      if (!params || params.length === 0) {
        const arrowResult = await this.connection.query(query);
        const resultSet = new ResultSetImpl<T>(arrowResult);
        
        // Add profile information
        if (profile) {
          const executionTime = performance.now() - startTime;
          profile.executionTime = executionTime;
          profile.totalTime = executionTime;
          profile.rowsProcessed = resultSet.rowCount;
          resultSet.profile = profile;
        }
        
        // End debugging
        this.debugLogger?.endQuery(resultSet.rowCount, profile);
        
        return resultSet;
      }

      // For parameterized queries
      const preparedStatement = await this.connection.prepare(query);
      
      try {
        this.bindParameters(preparedStatement as any, params);
        const arrowResult = await preparedStatement.query();
        const resultSet = new ResultSetImpl<T>(arrowResult);
        
        // Add profile information
        if (profile) {
          const executionTime = performance.now() - startTime;
          profile.executionTime = executionTime;
          profile.totalTime = executionTime;
          profile.rowsProcessed = resultSet.rowCount;
          resultSet.profile = profile;
        }
        
        // End debugging
        this.debugLogger?.endQuery(resultSet.rowCount, profile);
        
        return resultSet;
      } finally {
        // Always close prepared statement
        await preparedStatement.close();
      }
    } catch (error) {
      this.debugLogger?.logError(error as Error, query);
      throw this.wrapError(error, query);
    }
  }

  private bindParameters(stmt: any, params: unknown[]): void {
    params.forEach((param, index) => {
      const paramIndex = index + 1; // DuckDB parameters are 1-indexed

      if (param === null || param === undefined) {
        stmt.bindNull(paramIndex);
      } else if (typeof param === 'boolean') {
        stmt.bindBoolean(paramIndex, param);
      } else if (typeof param === 'number') {
        if (Number.isInteger(param)) {
          // Check range for integer types
          if (param >= -128 && param <= 127) {
            stmt.bindInt8(paramIndex, param);
          } else if (param >= -32768 && param <= 32767) {
            stmt.bindInt16(paramIndex, param);
          } else if (param >= -2147483648 && param <= 2147483647) {
            stmt.bindInt32(paramIndex, param);
          } else {
            stmt.bindInt64(paramIndex, BigInt(param));
          }
        } else {
          // Floating point number
          stmt.bindDouble(paramIndex, param);
        }
      } else if (typeof param === 'bigint') {
        stmt.bindInt64(paramIndex, param);
      } else if (typeof param === 'string') {
        stmt.bindVarchar(paramIndex, param);
      } else if (param instanceof Date) {
        // Convert Date to timestamp
        stmt.bindTimestamp(paramIndex, param);
      } else if (param instanceof Uint8Array) {
        stmt.bindBlob(paramIndex, param);
      } else if (param instanceof ArrayBuffer) {
        stmt.bindBlob(paramIndex, new Uint8Array(param));
      } else if (Array.isArray(param) || typeof param === 'object') {
        // Convert arrays and objects to JSON string
        stmt.bindVarchar(paramIndex, JSON.stringify(param));
      } else {
        // Fallback to string representation
        stmt.bindVarchar(paramIndex, String(param));
      }
    });
  }

  private wrapError(error: unknown, query: string): DuckDBError {
    if (error instanceof DuckDBError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Extract SQL state if available
    let sqlState: string | undefined;
    if (errorMessage.includes('SQL State:')) {
      const match = errorMessage.match(/SQL State:\s*(\w+)/);
      sqlState = match?.[1];
    }

    // Add query context to error message
    const enhancedMessage = `${errorMessage}\nQuery: ${query.substring(0, 200)}${
      query.length > 200 ? '...' : ''
    }`;

    return DuckDBError.queryFailed(enhancedMessage, error as Error, sqlState);
  }

  async executeMultiple(queries: string[]): Promise<ResultSet[]> {
    const results: ResultSet[] = [];
    
    for (const query of queries) {
      const result = await this.execute(query);
      results.push(result);
    }
    
    return results;
  }

  async transaction<T>(
    callback: (executor: QueryExecutor) => Promise<T>
  ): Promise<T> {
    await this.execute('BEGIN TRANSACTION');
    
    try {
      const result = await callback(this);
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      throw error;
    }
  }
}
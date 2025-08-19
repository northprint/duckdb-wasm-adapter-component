/* eslint-disable no-console */
import type { DebugConfig, QueryProfile } from './types.js';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

export class DebugLogger {
  private config: DebugConfig;
  private startTime: number = 0;

  constructor(config: DebugConfig = {}) {
    this.config = {
      enabled: false,
      logQueries: true,
      logTiming: true,
      slowQueryThreshold: 100,
      logMemory: false,
      profileQueries: false,
      ...config,
    };
  }

  isEnabled(): boolean {
    return this.config.enabled === true;
  }

  startQuery(query: string, params?: unknown[]): void {
    if (!this.isEnabled()) return;
    
    this.startTime = performance.now();
    
    if (this.config.logQueries) {
      console.group('🦆 DuckDB Query');
      console.log('%cSQL:', 'color: #667eea; font-weight: bold;', query);
      if (params && params.length > 0) {
        console.log('%cParams:', 'color: #764ba2; font-weight: bold;', params);
      }
    }
  }

  endQuery(rowCount: number, profile?: QueryProfile): void {
    if (!this.isEnabled()) return;
    
    const executionTime = performance.now() - this.startTime;
    
    if (this.config.logTiming) {
      const timeColor = executionTime > (this.config.slowQueryThreshold || 100) ? 'color: red;' : 'color: green;';
      console.log(`%cExecution Time: ${executionTime.toFixed(2)}ms`, timeColor);
      console.log(`%cRows: ${rowCount}`, 'color: #666;');
    }
    
    if (this.config.logMemory && profile?.memoryUsed) {
      console.log(`%cMemory Used: ${this.formatMemory(profile.memoryUsed)}`, 'color: #666;');
    }
    
    if (this.config.profileQueries && profile) {
      console.log('%cQuery Profile:', 'color: #667eea; font-weight: bold;');
      console.table({
        'Planning Time': `${profile.planningTime?.toFixed(2)}ms`,
        'Execution Time': `${profile.executionTime?.toFixed(2)}ms`,
        'Total Time': `${profile.totalTime?.toFixed(2)}ms`,
        'Rows Processed': profile.rowsProcessed,
        'Memory Used': this.formatMemory(profile.memoryUsed),
      });
      
      if (profile.plan) {
        console.log('%cExecution Plan:', 'color: #764ba2; font-weight: bold;');
        console.log(profile.plan);
      }
    }
    
    if (this.config.slowQueryThreshold && executionTime > this.config.slowQueryThreshold) {
      console.warn(
        `⚠️ Slow query detected: ${executionTime.toFixed(2)}ms (threshold: ${this.config.slowQueryThreshold}ms)`
      );
    }
    
    if (this.config.logQueries) {
      console.groupEnd();
    }
  }

  logError(error: Error, query?: string): void {
    if (!this.isEnabled()) return;
    
    console.group('❌ DuckDB Error');
    console.error('%cError:', 'color: red; font-weight: bold;', error.message);
    if (query) {
      console.log('%cQuery:', 'color: #667eea;', query);
    }
    console.error(error.stack);
    console.groupEnd();
  }

  logConnection(status: string): void {
    if (!this.isEnabled()) return;
    
    const icon = status === 'connected' ? '✅' : status === 'disconnected' ? '🔌' : '🔄';
    console.log(`${icon} DuckDB Connection: ${status}`);
  }

  logImport(type: string, tableName: string, rowCount?: number): void {
    if (!this.isEnabled()) return;
    
    console.log(
      `📥 Imported ${type} data into table "${tableName}"${rowCount ? ` (${rowCount} rows)` : ''}`
    );
  }

  logExport(type: string, rowCount: number): void {
    if (!this.isEnabled()) return;
    
    console.log(`📤 Exported ${rowCount} rows as ${type}`);
  }

  log(message: string, ...args: unknown[]): void {
    if (!this.isEnabled()) return;
    console.log(`[DuckDB]`, message, ...args);
  }

  private formatMemory(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  async profileQuery(connection: AsyncDuckDBConnection, query: string): Promise<QueryProfile | undefined> {
    if (!this.isEnabled() || !this.config.profileQueries) {
      return undefined;
    }

    try {
      // Get query plan
      const explainResult = await connection.query(`EXPLAIN ${query}`);
      const plan = explainResult.toString();

      // Get memory usage (this is approximate)
      const memoryResult = await connection.query(`SELECT * FROM duckdb_memory()`);
      const memoryRow = memoryResult.get(0) as { memory_usage_bytes?: number } | undefined;
      const memoryUsed = memoryRow?.memory_usage_bytes || 0;

      return {
        executionTime: 0, // Will be filled by actual execution
        planningTime: 0,  // Will be filled by actual execution
        totalTime: 0,     // Will be filled by actual execution
        rowsProcessed: 0, // Will be filled by actual execution
        memoryUsed,
        plan,
      };
    } catch (error) {
      // Profiling failed, but don't break the query
      console.warn('Failed to profile query:', error);
      return undefined;
    }
  }

  createTimingWrapper<T>(
    operation: string,
    fn: () => T | Promise<T>
  ): T | Promise<T> {
    if (!this.isEnabled() || !this.config.logTiming) {
      return fn();
    }

    const start = performance.now();
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
      });
    } else {
      const duration = performance.now() - start;
      console.log(`⏱️ ${operation}: ${duration.toFixed(2)}ms`);
      return result;
    }
  }
}

// Singleton instance for global debugging
let globalDebugger: DebugLogger | null = null;

export function setGlobalDebugger(config: DebugConfig): void {
  globalDebugger = new DebugLogger(config);
}

export function getGlobalDebugger(): DebugLogger | null {
  return globalDebugger;
}
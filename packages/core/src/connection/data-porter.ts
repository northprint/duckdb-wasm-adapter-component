import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ImportOptions, ExportOptions } from '../types.js';
import { DataImporter } from '../data-import.js';
import { DataExporter } from '../data-export.js';
import type { DebugLogger } from '../debug.js';

export interface DataPorterOptions {
  connection: AsyncDuckDBConnection;
  debugLogger: DebugLogger;
}

/**
 * Handles data import/export operations
 */
export class DataPorter {
  private dataImporter: DataImporter;
  private dataExporter: DataExporter;
  private debugLogger: DebugLogger;

  constructor(options: DataPorterOptions) {
    this.dataImporter = new DataImporter(options.connection);
    this.dataExporter = new DataExporter(options.connection);
    this.debugLogger = options.debugLogger;
  }

  async importCSV(
    file: File | string,
    tableName: string,
    options?: ImportOptions
  ): Promise<void> {
    this.debugLogger.log('Importing CSV to table:', tableName);
    return this.dataImporter.importCSV(file, tableName, options);
  }

  async importJSON(
    data: unknown[] | string,
    tableName: string
  ): Promise<void> {
    this.debugLogger.log('Importing JSON to table:', tableName);
    const jsonData = typeof data === 'string' ? JSON.parse(data) as unknown[] : data;
    return this.dataImporter.importJSON(jsonData, tableName);
  }

  async importParquet(
    file: File | ArrayBuffer,
    tableName: string
  ): Promise<void> {
    this.debugLogger.log('Importing Parquet to table:', tableName);
    return this.dataImporter.importParquet(file, tableName);
  }

  async exportCSV(
    query: string,
    options?: ExportOptions
  ): Promise<string> {
    this.debugLogger.log('Exporting query to CSV:', query);
    return this.dataExporter.exportCSV(query, options);
  }

  async exportJSON<T = Record<string, unknown>>(
    query: string
  ): Promise<T[]> {
    this.debugLogger.log('Exporting query to JSON:', query);
    return this.dataExporter.exportJSON<T>(query);
  }

  async exportToFile(
    query: string,
    format: 'csv' | 'json' | 'parquet',
    options?: ExportOptions
  ): Promise<Blob> {
    this.debugLogger.log(`Exporting query to ${format}:`, query);
    return this.dataExporter.exportToFile(query, format, options);
  }

  updateConnection(connection: AsyncDuckDBConnection): void {
    this.dataImporter = new DataImporter(connection);
    this.dataExporter = new DataExporter(connection);
  }
}
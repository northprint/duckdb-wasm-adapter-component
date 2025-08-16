import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ExportOptions } from './types.js';
import { DuckDBError } from './errors.js';

export class DataExporter {
  private connection: any;
  
  constructor(connection: AsyncDuckDBConnection) {
    this.connection = connection;
  }

  async exportCSV(query: string, options?: ExportOptions): Promise<string> {
    try {
      const result = await this.connection.query(query);
      return this.convertToCSV(result, options);
    } catch (error) {
      throw DuckDBError.exportFailed(
        `Failed to export query results to CSV`,
        error as Error
      );
    }
  }

  async exportJSON<T = Record<string, unknown>>(query: string): Promise<T[]> {
    try {
      const result = await this.connection.query(query);
      return this.convertToJSON<T>(result);
    } catch (error) {
      throw DuckDBError.exportFailed(
        `Failed to export query results to JSON`,
        error as Error
      );
    }
  }

  async exportToFile(
    query: string,
    format: 'csv' | 'json' | 'parquet',
    options?: ExportOptions
  ): Promise<Blob> {
    try {
      let content: string | ArrayBuffer;
      let mimeType: string;

      switch (format) {
        case 'csv':
          content = await this.exportCSV(query, options);
          mimeType = 'text/csv';
          break;
        case 'json':
          content = JSON.stringify(await this.exportJSON(query), null, 2);
          mimeType = 'application/json';
          break;
        case 'parquet':
          content = await this.exportParquet(query);
          mimeType = 'application/octet-stream';
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return new Blob([content], { type: mimeType });
    } catch (error) {
      throw DuckDBError.exportFailed(
        `Failed to export to ${format} file`,
        error as Error
      );
    }
  }

  private async exportParquet(query: string): Promise<ArrayBuffer> {
    try {
      // Create a temporary table from the query
      const tempTableName = `temp_export_${Date.now()}`;
      await this.connection.query(
        `CREATE TEMPORARY TABLE ${tempTableName} AS ${query}`
      );

      try {
        // Export to parquet buffer
        const fileName = `${tempTableName}.parquet`;
        await this.connection.query(
          `COPY ${tempTableName} TO '${fileName}' (FORMAT PARQUET)`
        );

        // Read the file buffer
        const buffer = await this.connection.copyFileToBuffer(fileName);
        
        // Clean up the file
        await this.connection.dropFile(fileName);
        
        return buffer;
      } finally {
        // Clean up temporary table
        await this.connection.query(`DROP TABLE IF EXISTS ${tempTableName}`);
      }
    } catch (error) {
      throw DuckDBError.exportFailed(
        `Failed to export to Parquet`,
        error as Error
      );
    }
  }

  private convertToCSV(result: any, options?: ExportOptions): string {
    const delimiter = options?.delimiter || ',';
    const includeHeader = options?.header !== false;
    
    // Get the table data
    const table = result.toArray();
    if (!table || table.length === 0) {
      return includeHeader && result.schema ? 
        result.schema.fields.map((f: any) => f.name).join(delimiter) : '';
    }

    const rows: string[] = [];
    
    // Add header if requested
    if (includeHeader) {
      const headers = Object.keys(table[0]);
      rows.push(headers.map(h => this.escapeCSVField(h, delimiter)).join(delimiter));
    }

    // Add data rows
    for (const row of table) {
      const values = Object.values(row).map(value => 
        this.escapeCSVField(this.formatValue(value, options), delimiter)
      );
      rows.push(values.join(delimiter));
    }

    return rows.join('\n');
  }

  private convertToJSON<T>(result: any): T[] {
    const table = result.toArray();
    
    // Process dates and other special types
    return table.map((row: any) => {
      const processedRow: any = {};
      
      for (const [key, value] of Object.entries(row)) {
        processedRow[key] = this.processJSONValue(value);
      }
      
      return processedRow as T;
    });
  }

  private processJSONValue(value: unknown): unknown {
    // Handle special types
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'bigint') {
      // Convert BigInt to string to avoid JSON serialization issues
      return value.toString();
    }
    
    if (value instanceof Uint8Array) {
      // Convert binary data to base64
      return btoa(String.fromCharCode(...value));
    }
    
    if (ArrayBuffer.isView(value)) {
      // Handle other typed arrays
      return Array.from(value as any);
    }
    
    return value;
  }

  private formatValue(value: unknown, options?: ExportOptions): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      if (options?.timestampFormat) {
        return this.formatDate(value, options.timestampFormat);
      }
      return value.toISOString();
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Uint8Array) {
      // Convert binary to hex string
      return Array.from(value)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private escapeCSVField(value: string, delimiter: string): string {
    // Check if the field needs to be quoted
    const needsQuoting = 
      value.includes(delimiter) || 
      value.includes('"') || 
      value.includes('\n') || 
      value.includes('\r');

    if (!needsQuoting) {
      return value;
    }

    // Escape quotes by doubling them and wrap in quotes
    return `"${value.replace(/"/g, '""')}"`;
  }

  private formatDate(date: Date, format: string): string {
    // Simple date formatting (can be extended)
    const replacements: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
      'DD': date.getDate().toString().padStart(2, '0'),
      'HH': date.getHours().toString().padStart(2, '0'),
      'mm': date.getMinutes().toString().padStart(2, '0'),
      'ss': date.getSeconds().toString().padStart(2, '0'),
      'SSS': date.getMilliseconds().toString().padStart(3, '0'),
    };

    let formatted = format;
    for (const [key, value] of Object.entries(replacements)) {
      formatted = formatted.replace(key, value);
    }

    return formatted;
  }

  async exportToDownload(
    query: string,
    filename: string,
    format: 'csv' | 'json' | 'parquet',
    options?: ExportOptions
  ): Promise<void> {
    const blob = await this.exportToFile(query, format, options);
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
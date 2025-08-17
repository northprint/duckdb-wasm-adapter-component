import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ImportOptions } from './types.js';
import { DuckDBError } from './errors.js';

export class DataImporter {
  private connection: AsyncDuckDBConnection;
  
  constructor(connection: AsyncDuckDBConnection) {
    this.connection = connection;
  }

  async importCSV(
    file: File | string,
    tableName: string,
    options?: ImportOptions
  ): Promise<void> {
    try {
      const csvContent = typeof file === 'string' ? file : await file.text();
      
      // Validate table name to prevent SQL injection
      this.validateTableName(tableName);
      
      // Build options string
      const optionsStr = this.buildCSVOptions(options);
      
      // Create a temporary file registration if content is large
      if (csvContent.length > 1024 * 1024) {
        // For large files, register as a file buffer
        const fileName = `${tableName}_import.csv`;
        await (this.connection as any).registerFileText(fileName, csvContent);
        
        const query = `
          CREATE OR REPLACE TABLE ${tableName} AS 
          SELECT * FROM read_csv('${fileName}'${optionsStr})
        `;
        
        try {
          await this.connection.query(query);
        } finally {
          // Clean up registered file
          await (this.connection as any).dropFile(fileName);
        }
      } else {
        // For small files, use inline data
        const query = `
          CREATE OR REPLACE TABLE ${tableName} AS 
          SELECT * FROM read_csv_auto('${this.escapeString(csvContent)}'${optionsStr})
        `;
        
        await this.connection.query(query);
      }
    } catch (error) {
      throw DuckDBError.importFailed(
        `Failed to import CSV to table ${tableName}`,
        error as Error
      );
    }
  }

  async importJSON(data: unknown[], tableName: string): Promise<void> {
    try {
      // Validate table name
      this.validateTableName(tableName);
      
      const jsonString = JSON.stringify(data);
      
      // For large JSON, use file registration
      if (jsonString.length > 1024 * 1024) {
        const fileName = `${tableName}_import.json`;
        await (this.connection as any).registerFileText(fileName, jsonString);
        
        const query = `
          CREATE OR REPLACE TABLE ${tableName} AS 
          SELECT * FROM read_json('${fileName}', auto_detect=true)
        `;
        
        try {
          await this.connection.query(query);
        } finally {
          await (this.connection as any).dropFile(fileName);
        }
      } else {
        // For small JSON, use inline
        const query = `
          CREATE OR REPLACE TABLE ${tableName} AS 
          SELECT * FROM read_json_auto('${this.escapeString(jsonString)}')
        `;
        
        await this.connection.query(query);
      }
    } catch (error) {
      throw DuckDBError.importFailed(
        `Failed to import JSON to table ${tableName}`,
        error as Error
      );
    }
  }

  async importParquet(
    file: File | ArrayBuffer,
    tableName: string
  ): Promise<void> {
    try {
      // Validate table name
      this.validateTableName(tableName);
      
      const buffer = file instanceof File 
        ? await file.arrayBuffer()
        : file;
      
      const fileName = `${tableName}_import.parquet`;
      
      // Register the parquet file
      await (this.connection as any).registerFileBuffer(
        fileName,
        new Uint8Array(buffer)
      );
      
      const query = `
        CREATE OR REPLACE TABLE ${tableName} AS 
        SELECT * FROM parquet_scan('${fileName}')
      `;
      
      try {
        await this.connection.query(query);
      } finally {
        // Clean up registered file
        await (this.connection as any).dropFile(fileName);
      }
    } catch (error) {
      throw DuckDBError.importFailed(
        `Failed to import Parquet to table ${tableName}`,
        error as Error
      );
    }
  }

  async importFromURL(
    url: string,
    tableName: string,
    format: 'csv' | 'json' | 'parquet',
    options?: ImportOptions
  ): Promise<void> {
    try {
      // Validate table name
      this.validateTableName(tableName);
      
      let query: string;
      
      switch (format) {
        case 'csv': {
          const optionsStr = this.buildCSVOptions(options);
          query = `
            CREATE OR REPLACE TABLE ${tableName} AS 
            SELECT * FROM read_csv('${url}'${optionsStr})
          `;
          break;
        }
        case 'json':
          query = `
            CREATE OR REPLACE TABLE ${tableName} AS 
            SELECT * FROM read_json('${url}', auto_detect=true)
          `;
          break;
        case 'parquet':
          query = `
            CREATE OR REPLACE TABLE ${tableName} AS 
            SELECT * FROM parquet_scan('${url}')
          `;
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      await this.connection.query(query);
    } catch (error) {
      throw DuckDBError.importFailed(
        `Failed to import from URL ${url} to table ${tableName}`,
        error as Error
      );
    }
  }

  async createTableFromValues(
    tableName: string,
    columns: string[],
    values: unknown[][]
  ): Promise<void> {
    try {
      // Validate table name
      this.validateTableName(tableName);
      
      // Validate columns
      columns.forEach(col => this.validateColumnName(col));
      
      if (values.length === 0) {
        throw new Error('Cannot create table from empty values');
      }
      
      // Build VALUES clause
      const valueStrings = values.map(row => {
        const rowValues = row.map(val => this.formatValue(val)).join(', ');
        return `(${rowValues})`;
      });
      
      const columnsStr = columns.join(', ');
      const valuesStr = valueStrings.join(',\n    ');
      
      const query = `
        CREATE OR REPLACE TABLE ${tableName} (${columnsStr}) AS
        VALUES ${valuesStr}
      `;
      
      await this.connection.query(query);
    } catch (error) {
      throw DuckDBError.importFailed(
        `Failed to create table ${tableName} from values`,
        error as Error
      );
    }
  }

  private buildCSVOptions(options?: ImportOptions): string {
    if (!options) return '';
    
    const parts: string[] = [];
    
    if (options.delimiter !== undefined) {
      parts.push(`delim='${options.delimiter}'`);
    }
    
    if (options.header !== undefined) {
      parts.push(`header=${options.header}`);
    }
    
    if (options.columns && options.columns.length > 0) {
      const columnList = options.columns.map(c => `'${c}'`).join(', ');
      parts.push(`columns=[${columnList}]`);
    }
    
    if (options.dateFormat) {
      parts.push(`dateformat='${options.dateFormat}'`);
    }
    
    if (options.timestampFormat) {
      parts.push(`timestampformat='${options.timestampFormat}'`);
    }
    
    if (options.skipRows !== undefined) {
      parts.push(`skip=${options.skipRows}`);
    }
    
    if (options.maxRows !== undefined) {
      parts.push(`max_rows=${options.maxRows}`);
    }
    
    if (options.nullValues && options.nullValues.length > 0) {
      const nullList = options.nullValues.map(n => `'${n}'`).join(', ');
      parts.push(`null_padding=[${nullList}]`);
    }
    
    return parts.length > 0 ? `, ${parts.join(', ')}` : '';
  }

  private validateTableName(name: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw DuckDBError.invalidParams(
        `Invalid table name: ${name}. Table names must start with a letter or underscore and contain only letters, numbers, and underscores.`
      );
    }
  }

  private validateColumnName(name: string): void {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw DuckDBError.invalidParams(
        `Invalid column name: ${name}. Column names must start with a letter or underscore and contain only letters, numbers, and underscores.`
      );
    }
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "''");
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      return `'${this.escapeString(value)}'`;
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    
    if (value instanceof Date) {
      return `TIMESTAMP '${value.toISOString()}'`;
    }
    
    if (typeof value === 'object') {
      return `'${this.escapeString(JSON.stringify(value))}'`;
    }
    
    return `'${this.escapeString(String(value))}'`;
  }
}
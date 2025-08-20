import type { Table } from 'apache-arrow';
import type { ColumnMetadata, DuckDBType, QueryProfile } from './types.js';

export type { ResultSet } from './types.js';

import type { ResultSet } from './types.js';

export class ResultSetImpl<T = Record<string, unknown>> implements ResultSet<T> {
  private _rows: T[];
  private _columns: ColumnMetadata[];
  public profile?: QueryProfile;

  constructor(private arrowTable: Table) {
    this._rows = this.convertToRows();
    this._columns = this.extractMetadata();
  }

  get rows(): T[] {
    return this._rows;
  }

  get columns(): ColumnMetadata[] {
    return this._columns;
  }

  get rowCount(): number {
    return this.arrowTable.numRows;
  }

  toArray(): T[] {
    return this._rows;
  }

  toObject(): Record<string, unknown>[] {
    return this._rows as Record<string, unknown>[];
  }

  getMetadata(): ColumnMetadata[] {
    return this._columns;
  }

  [Symbol.iterator](): Iterator<T> {
    let index = 0;
    const rows = this._rows;

    return {
      next(): IteratorResult<T> {
        if (index < rows.length) {
          const value = rows[index++];
          if (value !== undefined) {
            return { value, done: false };
          }
        }
        return { done: true, value: undefined };
      },
    };
  }

  private convertToRows(): T[] {
    // If the table has a toArray method, use it directly
    if (typeof this.arrowTable.toArray === 'function') {
      return this.arrowTable.toArray() as T[];
    }
    
    // Otherwise, try to extract rows manually
    const rows: T[] = [];
    const numRows = this.arrowTable.numRows || 0;
    const schema = this.arrowTable.schema;

    if (!schema || !schema.fields) {
      return rows;
    }

    for (let i = 0; i < numRows; i++) {
      const row: Record<string, unknown> = {};
      
      for (const field of schema.fields) {
        // Try to get column data if getChild is available
        if (typeof this.arrowTable.getChild === 'function') {
          const column = this.arrowTable.getChild(field.name);
          if (column && typeof column.get === 'function') {
            row[field.name] = column.get(i);
          }
        } else {
          // Fallback: assume data is already in array format
          row[field.name] = null;
        }
      }
      
      rows.push(row as T);
    }

    return rows;
  }

  private extractMetadata(): ColumnMetadata[] {
    const schema = this.arrowTable.schema;
    const columns: ColumnMetadata[] = [];

    if (!schema || !schema.fields) {
      return columns;
    }

    for (const field of schema.fields) {
      columns.push({
        name: field.name,
        type: this.mapArrowTypeToDuckDBType(field.type),
        nullable: field.nullable ?? true,
      });
    }

    return columns;
  }

  private mapArrowTypeToDuckDBType(arrowType: unknown): DuckDBType {
    if (!arrowType) {
      return 'VARCHAR';
    }
    
    const typeString = typeof arrowType === 'string' 
      ? arrowType.toUpperCase() 
      : (arrowType as { toString?: () => string })?.toString?.()?.toUpperCase() || 'VARCHAR';

    // Map Arrow types to DuckDB types
    const typeMap: Record<string, DuckDBType> = {
      'BOOL': 'BOOLEAN',
      'INT8': 'TINYINT',
      'INT16': 'SMALLINT',
      'INT32': 'INTEGER',
      'INT64': 'BIGINT',
      'UINT8': 'UTINYINT',
      'UINT16': 'USMALLINT',
      'UINT32': 'UINTEGER',
      'UINT64': 'UBIGINT',
      'FLOAT32': 'FLOAT',
      'FLOAT64': 'DOUBLE',
      'UTF8': 'VARCHAR',
      'LARGEUTF8': 'VARCHAR',
      'DATE32': 'DATE',
      'DATE64': 'DATE',
      'TIME32': 'TIME',
      'TIME64': 'TIME',
      'TIMESTAMP': 'TIMESTAMP',
      'BINARY': 'BLOB',
      'LARGEBINARY': 'BLOB',
      'DECIMAL': 'DECIMAL',
      'INTERVAL': 'INTERVAL',
    };

    // Check for exact match
    for (const [arrowKey, duckdbType] of Object.entries(typeMap)) {
      if (typeString.includes(arrowKey)) {
        return duckdbType;
      }
    }

    // Handle special cases
    if (typeString.includes('TIMESTAMP')) {
      if (typeString.includes('_S')) return 'TIMESTAMP_S';
      if (typeString.includes('_MS')) return 'TIMESTAMP_MS';
      if (typeString.includes('_NS')) return 'TIMESTAMP_NS';
      return 'TIMESTAMP';
    }

    if (typeString.includes('STRING') || typeString.includes('UTF')) {
      return 'VARCHAR';
    }

    if (typeString.includes('JSON')) {
      return 'JSON';
    }

    // Default to VARCHAR for unknown types
    return 'VARCHAR';
  }
}
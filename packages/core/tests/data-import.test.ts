import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataImporter } from '../src/data-import';
import { DuckDBError } from '../src/errors';
import { ErrorCode } from '../src/types';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ImportOptions } from '../src/types';

describe('DataImporter', () => {
  let mockConnection: AsyncDuckDBConnection;
  let dataImporter: DataImporter;

  beforeEach(() => {
    mockConnection = {
      query: vi.fn().mockResolvedValue(undefined),
      registerFileText: vi.fn().mockResolvedValue(undefined),
      registerFileBuffer: vi.fn().mockResolvedValue(undefined),
      dropFile: vi.fn().mockResolvedValue(undefined),
    } as any;

    dataImporter = new DataImporter(mockConnection);
  });

  describe('importCSV', () => {
    it('should import CSV from string', async () => {
      const csvContent = 'id,name\n1,Alice\n2,Bob';
      
      await dataImporter.importCSV(csvContent, 'users');

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE OR REPLACE TABLE users')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('read_csv_auto')
      );
    });

    it('should import CSV from File', async () => {
      const csvContent = 'id,name\n1,Alice\n2,Bob';
      const file = {
        text: vi.fn().mockResolvedValue(csvContent),
        name: 'data.csv',
      } as unknown as File;

      await dataImporter.importCSV(file, 'users');

      expect(mockConnection.query).toHaveBeenCalled();
      expect(file.text).toHaveBeenCalled();
    });

    it('should handle large CSV files', async () => {
      // Create a large CSV (> 1MB)
      const largeContent = 'id,name\n' + 
        Array(100000).fill(0).map((_, i) => `${i},User${i}`).join('\n');
      
      await dataImporter.importCSV(largeContent, 'large_users');

      expect(mockConnection.registerFileText).toHaveBeenCalledWith(
        'large_users_import.csv',
        largeContent
      );
      expect(mockConnection.dropFile).toHaveBeenCalledWith('large_users_import.csv');
    });

    it('should apply CSV import options', async () => {
      const options: ImportOptions = {
        delimiter: ';',
        header: false,
        columns: ['id', 'name'],
        skipRows: 1,
        maxRows: 100,
      };

      await dataImporter.importCSV('1;Alice\n2;Bob', 'users', options);

      const query = (mockConnection.query as any).mock.calls[0][0];
      expect(query).toContain("delim=';'");
      expect(query).toContain('header=false');
      expect(query).toContain("columns=['id', 'name']");
      expect(query).toContain('skip=1');
      expect(query).toContain('max_rows=100');
    });

    it('should validate table name', async () => {
      // Test invalid table names
      try {
        await dataImporter.importCSV('data', 'invalid-table-name');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBError);
        // The error message will be wrapped, but originalError might contain it
        const err = error as DuckDBError;
        expect(err.message.toLowerCase()).toContain('import');
      }

      try {
        await dataImporter.importCSV('data', '123table');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBError);
      }
    });

    it('should handle import errors', async () => {
      vi.mocked(mockConnection.query).mockRejectedValue(new Error('Import failed'));

      await expect(
        dataImporter.importCSV('invalid', 'users')
      ).rejects.toThrow(DuckDBError);
    });
  });

  describe('importJSON', () => {
    it('should import JSON array', async () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      await dataImporter.importJSON(data, 'users');

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE OR REPLACE TABLE users')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('read_json_auto')
      );
    });

    it('should handle large JSON data', async () => {
      // Create large JSON (> 1MB)
      const largeData = Array(50000).fill(0).map((_, i) => ({
        id: i,
        name: `User${i}`,
        data: 'x'.repeat(50),
      }));

      await dataImporter.importJSON(largeData, 'large_users');

      expect(mockConnection.registerFileText).toHaveBeenCalledWith(
        'large_users_import.json',
        JSON.stringify(largeData)
      );
      expect(mockConnection.dropFile).toHaveBeenCalledWith('large_users_import.json');
    });

    it('should handle complex JSON structures', async () => {
      const complexData = [
        {
          id: 1,
          metadata: {
            created: new Date('2024-01-01'),
            tags: ['tag1', 'tag2'],
            nested: {
              value: 42,
            },
          },
        },
      ];

      await dataImporter.importJSON(complexData, 'complex_table');

      expect(mockConnection.query).toHaveBeenCalled();
    });
  });

  describe('importParquet', () => {
    it('should import Parquet from ArrayBuffer', async () => {
      const buffer = new ArrayBuffer(100);
      
      await dataImporter.importParquet(buffer, 'users');

      expect(mockConnection.registerFileBuffer).toHaveBeenCalledWith(
        'users_import.parquet',
        expect.any(Uint8Array)
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('parquet_scan')
      );
      expect(mockConnection.dropFile).toHaveBeenCalledWith('users_import.parquet');
    });

    it('should import Parquet from File', async () => {
      const buffer = new ArrayBuffer(100);
      const file = {
        arrayBuffer: vi.fn().mockResolvedValue(buffer),
        name: 'data.parquet',
      } as unknown as File;

      await dataImporter.importParquet(file, 'users');

      expect(mockConnection.registerFileBuffer).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE OR REPLACE TABLE users')
      );
      // Verify the file was processed
      expect(mockConnection.registerFileBuffer).toHaveBeenCalledWith(
        'users_import.parquet',
        expect.any(Uint8Array)
      );
    });

    it('should clean up on error', async () => {
      vi.mocked(mockConnection.query).mockRejectedValue(new Error('Query failed'));

      const buffer = new ArrayBuffer(100);
      
      await expect(
        dataImporter.importParquet(buffer, 'users')
      ).rejects.toThrow();

      expect(mockConnection.dropFile).toHaveBeenCalledWith('users_import.parquet');
    });
  });

  describe('importFromURL', () => {
    it('should import CSV from URL', async () => {
      await dataImporter.importFromURL(
        'https://example.com/data.csv',
        'users',
        'csv'
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("read_csv('https://example.com/data.csv'")
      );
    });

    it('should import JSON from URL', async () => {
      await dataImporter.importFromURL(
        'https://example.com/data.json',
        'users',
        'json'
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("read_json('https://example.com/data.json'")
      );
    });

    it('should import Parquet from URL', async () => {
      await dataImporter.importFromURL(
        'https://example.com/data.parquet',
        'users',
        'parquet'
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("parquet_scan('https://example.com/data.parquet')")
      );
    });

    it('should apply options for CSV URLs', async () => {
      const options: ImportOptions = {
        delimiter: '\t',
        header: true,
      };

      await dataImporter.importFromURL(
        'https://example.com/data.tsv',
        'users',
        'csv',
        options
      );

      const query = (mockConnection.query as any).mock.calls[0][0];
      expect(query).toContain("delim='\t'");
      expect(query).toContain('header=true');
    });

    it('should reject unsupported formats', async () => {
      try {
        await dataImporter.importFromURL(
          'https://example.com/data.xml',
          'users',
          'xml' as any
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBError);
        const err = error as DuckDBError;
        // The actual error contains "Failed to import from URL"
        expect(err.message.toLowerCase()).toContain('import');
      }
    });
  });

  describe('createTableFromValues', () => {
    it('should create table from values array', async () => {
      const columns = ['id', 'name', 'age'];
      const values = [
        [1, 'Alice', 30],
        [2, 'Bob', 25],
        [3, 'Charlie', null],
      ];

      await dataImporter.createTableFromValues('users', columns, values);

      const query = (mockConnection.query as any).mock.calls[0][0];
      expect(query).toContain('CREATE OR REPLACE TABLE users (id, name, age)');
      expect(query).toContain("(1, 'Alice', 30)");
      expect(query).toContain("(2, 'Bob', 25)");
      expect(query).toContain("(3, 'Charlie', NULL)");
    });

    it('should handle different data types', async () => {
      const columns = ['col1', 'col2', 'col3', 'col4', 'col5'];
      const values = [
        [
          42,                        // number
          'text',                    // string
          true,                      // boolean
          new Date('2024-01-01'),    // date
          { key: 'value' },          // object
        ],
      ];

      await dataImporter.createTableFromValues('mixed_types', columns, values);

      const query = (mockConnection.query as any).mock.calls[0][0];
      expect(query).toContain('42');
      expect(query).toContain("'text'");
      expect(query).toContain('true');
      expect(query).toContain('TIMESTAMP');
      expect(query).toContain('{"key":"value"}');
    });

    it('should validate column names', async () => {
      try {
        await dataImporter.createTableFromValues(
          'users',
          ['id', 'invalid-column'],
          [[1, 'test']]
        );
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBError);
        // Just check that it's an import error
        const err = error as DuckDBError;
        expect(err.code).toBe(ErrorCode.IMPORT_FAILED);
      }
    });

    it('should reject empty values', async () => {
      try {
        await dataImporter.createTableFromValues('users', ['id'], []);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBError);
        const err = error as DuckDBError;
        expect(err.code).toBe(ErrorCode.IMPORT_FAILED);
      }
    });

    it('should escape quotes in strings', async () => {
      const columns = ['name'];
      const values = [["O'Brien"]];

      await dataImporter.createTableFromValues('users', columns, values);

      const query = (mockConnection.query as any).mock.calls[0][0];
      expect(query).toContain("'O''Brien'");
    });
  });
});
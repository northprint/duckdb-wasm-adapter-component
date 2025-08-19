import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataExporter } from '../src/data-export';
import { DuckDBError } from '../src/errors';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ExportOptions } from '../src/types';

describe('DataExporter', () => {
  let mockConnection: AsyncDuckDBConnection;
  let dataExporter: DataExporter;

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
      copyFileToBuffer: vi.fn(),
      dropFile: vi.fn(),
    } as any;

    dataExporter = new DataExporter(mockConnection);

    // Mock document for download tests
    global.document = {
      createElement: vi.fn(() => ({
        href: '',
        download: '',
        click: vi.fn(),
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    } as any;

    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('exportCSV', () => {
    it('should export query results to CSV', async () => {
      const mockResult = {
        toArray: () => [
          { id: 1, name: 'Alice', age: 30 },
          { id: 2, name: 'Bob', age: 25 },
        ],
        schema: {
          fields: [
            { name: 'id' },
            { name: 'name' },
            { name: 'age' },
          ],
        },
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const csv = await dataExporter.exportCSV('SELECT * FROM users');

      expect(csv).toBe('id,name,age\n1,Alice,30\n2,Bob,25');
    });

    it('should handle custom delimiter', async () => {
      const mockResult = {
        toArray: () => [
          { id: 1, name: 'Alice' },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const options: ExportOptions = {
        delimiter: ';',
      };

      const csv = await dataExporter.exportCSV('SELECT * FROM users', options);

      expect(csv).toBe('id;name\n1;Alice');
    });

    it('should escape CSV fields with special characters', async () => {
      const mockResult = {
        toArray: () => [
          { name: 'Alice, Bob', description: 'Says "Hello"' },
          { name: 'Charlie\nDelta', description: 'Normal text' },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const csv = await dataExporter.exportCSV('SELECT * FROM users');

      expect(csv).toContain('"Alice, Bob"');
      expect(csv).toContain('"Says ""Hello"""');
      expect(csv).toContain('"Charlie\nDelta"');
      expect(csv).toContain('Normal text');
    });

    it('should exclude header when specified', async () => {
      const mockResult = {
        toArray: () => [
          { id: 1, name: 'Alice' },
        ],
        schema: {
          fields: [{ name: 'id' }, { name: 'name' }],
        },
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const options: ExportOptions = {
        header: false,
      };

      const csv = await dataExporter.exportCSV('SELECT * FROM users', options);

      expect(csv).toBe('1,Alice');
      expect(csv).not.toContain('id,name');
    });

    it('should handle empty results', async () => {
      const mockResult = {
        toArray: () => [],
        schema: {
          fields: [{ name: 'id' }, { name: 'name' }],
        },
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const csv = await dataExporter.exportCSV('SELECT * FROM users WHERE 1=0');

      expect(csv).toBe('id,name');
    });

    it('should handle null values', async () => {
      const mockResult = {
        toArray: () => [
          { id: 1, name: null, age: 30 },
          { id: 2, name: 'Bob', age: null },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const csv = await dataExporter.exportCSV('SELECT * FROM users');

      expect(csv).toBe('id,name,age\n1,,30\n2,Bob,');
    });
  });

  describe('exportJSON', () => {
    it('should export query results to JSON', async () => {
      const mockResult = {
        toArray: () => [
          { id: 1, name: 'Alice', active: true },
          { id: 2, name: 'Bob', active: false },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const json = await dataExporter.exportJSON('SELECT * FROM users');

      expect(json).toEqual([
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
      ]);
    });

    it('should handle Date objects', async () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const mockResult = {
        toArray: () => [
          { id: 1, created_at: date },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const json = await dataExporter.exportJSON('SELECT * FROM users');

      expect(json).toEqual([
        { id: 1, created_at: '2024-01-01T00:00:00.000Z' },
      ]);
    });

    it('should handle BigInt values', async () => {
      const mockResult = {
        toArray: () => [
          { id: BigInt('9223372036854775807') },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const json = await dataExporter.exportJSON('SELECT * FROM users');

      expect(json).toEqual([
        { id: '9223372036854775807' },
      ]);
    });

    it('should handle binary data', async () => {
      const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const mockResult = {
        toArray: () => [
          { data: binaryData },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const json = await dataExporter.exportJSON('SELECT * FROM blobs');

      expect(json[0].data).toBe('SGVsbG8='); // Base64 encoded "Hello"
    });

    it('should handle export errors', async () => {
      vi.mocked(mockConnection.query).mockRejectedValue(new Error('Query failed'));

      await expect(
        dataExporter.exportJSON('INVALID SQL')
      ).rejects.toThrow(DuckDBError);
    });
  });

  describe('exportToFile', () => {
    it('should export to CSV file', async () => {
      const mockResult = {
        toArray: () => [{ id: 1, name: 'Alice' }],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const blob = await dataExporter.exportToFile('SELECT * FROM users', 'csv');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');
    });

    it('should export to JSON file', async () => {
      const mockResult = {
        toArray: () => [{ id: 1, name: 'Alice' }],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const blob = await dataExporter.exportToFile('SELECT * FROM users', 'json');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should export to Parquet file', async () => {
      const mockBuffer = new Uint8Array(100);
      
      vi.mocked(mockConnection.query).mockResolvedValue(undefined as any);
      vi.mocked(mockConnection.copyFileToBuffer).mockResolvedValue(mockBuffer as any);
      vi.mocked(mockConnection.dropFile).mockResolvedValue(undefined as any);

      const blob = await dataExporter.exportToFile('SELECT * FROM users', 'parquet');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/octet-stream');
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TEMPORARY TABLE')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('COPY')
      );
      expect(mockConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE IF EXISTS')
      );
    });

    it('should reject unsupported formats', async () => {
      try {
        await dataExporter.exportToFile('SELECT * FROM users', 'xml' as any);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DuckDBError);
        const err = error as DuckDBError;
        // Just verify it's an export error
        expect(err.message.toLowerCase()).toContain('export');
      }
    });
  });

  describe('exportToDownload', () => {
    it('should trigger file download', async () => {
      const mockResult = {
        toArray: () => [{ id: 1, name: 'Alice' }],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      vi.mocked(document.createElement).mockReturnValue(mockLink as any);

      await dataExporter.exportToDownload(
        'SELECT * FROM users',
        'users.csv',
        'csv'
      );

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('users.csv');
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('date formatting', () => {
    it('should format dates with custom format', async () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const mockResult = {
        toArray: () => [
          { created_at: date },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const options: ExportOptions = {
        timestampFormat: 'YYYY-MM-DD HH:mm:ss',
      };

      const csv = await dataExporter.exportCSV('SELECT * FROM users', options);

      // Note: The actual time will depend on the timezone
      expect(csv).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    it('should handle various date format patterns', async () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const mockResult = {
        toArray: () => [{ date }],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const options: ExportOptions = {
        timestampFormat: 'YYYY/MM/DD',
      };

      const csv = await dataExporter.exportCSV('SELECT * FROM dates', options);

      expect(csv).toContain('2024/01/15');
    });
  });

  describe('special value handling', () => {
    it('should handle boolean values', async () => {
      const mockResult = {
        toArray: () => [
          { active: true },
          { active: false },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const csv = await dataExporter.exportCSV('SELECT * FROM users');

      expect(csv).toContain('true');
      expect(csv).toContain('false');
    });

    it('should handle object values as JSON', async () => {
      const mockResult = {
        toArray: () => [
          { metadata: { key: 'value', nested: { prop: 123 } } },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const csv = await dataExporter.exportCSV('SELECT * FROM users');

      // Check that the CSV contains the JSON string (with quotes escaped)
      expect(csv).toContain('"');
      expect(csv).toContain('key');
      expect(csv).toContain('value');
      expect(csv).toContain('nested');
      expect(csv).toContain('prop');
      expect(csv).toContain('123');
    });

    it('should handle typed arrays', async () => {
      const typedArray = new Float32Array([1.5, 2.5, 3.5]);
      const mockResult = {
        toArray: () => [
          { data: typedArray },
        ],
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const json = await dataExporter.exportJSON('SELECT * FROM data');

      expect(json[0].data).toEqual([1.5, 2.5, 3.5]);
    });
  });
});
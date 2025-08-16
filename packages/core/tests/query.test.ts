import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryExecutor } from '../src/query';
import { DuckDBError } from '../src/errors';
import { ErrorCode } from '../src/types';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

describe('QueryExecutor', () => {
  let mockConnection: AsyncDuckDBConnection;
  let queryExecutor: QueryExecutor;

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
      prepare: vi.fn(),
      close: vi.fn(),
      registerFileText: vi.fn(),
      registerFileBuffer: vi.fn(),
      dropFile: vi.fn(),
      copyFileToBuffer: vi.fn(),
    } as any;

    queryExecutor = new QueryExecutor(mockConnection);
  });

  describe('execute', () => {
    it('should execute simple query without parameters', async () => {
      const mockResult = {
        toArray: () => [{ id: 1, name: 'Test' }],
        schema: {
          fields: [
            { name: 'id', type: 'INTEGER', nullable: false },
            { name: 'name', type: 'VARCHAR', nullable: true },
          ],
        },
        numRows: 1,
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const result = await queryExecutor.execute('SELECT * FROM users');

      expect(mockConnection.query).toHaveBeenCalledWith('SELECT * FROM users');
      expect(result.rows).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.rowCount).toBe(1);
    });

    it('should execute parameterized query', async () => {
      const mockPreparedStatement = {
        bindNull: vi.fn(),
        bindBoolean: vi.fn(),
        bindInt8: vi.fn(),
        bindInt16: vi.fn(),
        bindInt32: vi.fn(),
        bindInt64: vi.fn(),
        bindDouble: vi.fn(),
        bindVarchar: vi.fn(),
        bindTimestamp: vi.fn(),
        bindBlob: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [{ result: true }],
          schema: { fields: [{ name: 'result', type: 'BOOLEAN', nullable: false }] },
          numRows: 1,
        }),
        close: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(mockConnection.prepare).mockResolvedValue(mockPreparedStatement as any);

      const params = [
        null,                          // null
        true,                          // boolean
        42,                            // small integer
        30000,                         // medium integer
        2000000000,                    // large integer
        BigInt(9223372036854775807),  // bigint
        3.14,                          // float
        'test',                        // string
        new Date('2024-01-01'),        // date
        new Uint8Array([1, 2, 3]),    // binary
        { key: 'value' },              // object (JSON)
      ];

      await queryExecutor.execute('INSERT INTO test VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', params);

      expect(mockPreparedStatement.bindNull).toHaveBeenCalledWith(1);
      expect(mockPreparedStatement.bindBoolean).toHaveBeenCalledWith(2, true);
      expect(mockPreparedStatement.bindInt8).toHaveBeenCalledWith(3, 42);
      expect(mockPreparedStatement.bindInt16).toHaveBeenCalledWith(4, 30000);
      expect(mockPreparedStatement.bindInt32).toHaveBeenCalledWith(5, 2000000000);
      expect(mockPreparedStatement.bindInt64).toHaveBeenCalledWith(6, BigInt(9223372036854775807));
      expect(mockPreparedStatement.bindDouble).toHaveBeenCalledWith(7, 3.14);
      expect(mockPreparedStatement.bindVarchar).toHaveBeenCalledWith(8, 'test');
      expect(mockPreparedStatement.bindTimestamp).toHaveBeenCalledWith(9, params[8]);
      expect(mockPreparedStatement.bindBlob).toHaveBeenCalledWith(10, params[9]);
      expect(mockPreparedStatement.bindVarchar).toHaveBeenCalledWith(11, JSON.stringify(params[10]));
      expect(mockPreparedStatement.close).toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      const error = new Error('SQL syntax error');
      vi.mocked(mockConnection.query).mockRejectedValue(error);

      await expect(
        queryExecutor.execute('INVALID SQL')
      ).rejects.toThrow(DuckDBError);

      try {
        await queryExecutor.execute('INVALID SQL');
      } catch (err) {
        expect(err).toBeInstanceOf(DuckDBError);
        expect((err as DuckDBError).code).toBe(ErrorCode.QUERY_FAILED);
        expect((err as DuckDBError).message).toContain('SQL syntax error');
        expect((err as DuckDBError).message).toContain('Query: INVALID SQL');
      }
    });

    it('should handle ArrayBuffer parameters', async () => {
      const mockPreparedStatement = {
        bindBlob: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [],
          schema: { fields: [] },
          numRows: 0,
        }),
        close: vi.fn(),
      };

      vi.mocked(mockConnection.prepare).mockResolvedValue(mockPreparedStatement as any);

      const buffer = new ArrayBuffer(8);
      await queryExecutor.execute('INSERT INTO blobs VALUES (?)', [buffer]);

      expect(mockPreparedStatement.bindBlob).toHaveBeenCalledWith(1, expect.any(Uint8Array));
    });

    it('should handle array parameters as JSON', async () => {
      const mockPreparedStatement = {
        bindVarchar: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [],
          schema: { fields: [] },
          numRows: 0,
        }),
        close: vi.fn(),
      };

      vi.mocked(mockConnection.prepare).mockResolvedValue(mockPreparedStatement as any);

      const array = [1, 2, 3];
      await queryExecutor.execute('INSERT INTO data VALUES (?)', [array]);

      expect(mockPreparedStatement.bindVarchar).toHaveBeenCalledWith(1, '[1,2,3]');
    });
  });

  describe('executeMultiple', () => {
    it('should execute multiple queries sequentially', async () => {
      const mockResults = [
        { toArray: () => [{ id: 1 }], schema: { fields: [] }, numRows: 1 },
        { toArray: () => [{ id: 2 }], schema: { fields: [] }, numRows: 1 },
        { toArray: () => [{ id: 3 }], schema: { fields: [] }, numRows: 1 },
      ];

      let callIndex = 0;
      vi.mocked(mockConnection.query).mockImplementation(() => 
        Promise.resolve(mockResults[callIndex++] as any)
      );

      const queries = [
        'SELECT 1 as id',
        'SELECT 2 as id',
        'SELECT 3 as id',
      ];

      const results = await queryExecutor.executeMultiple(queries);

      expect(results).toHaveLength(3);
      expect(results[0].rows).toEqual([{ id: 1 }]);
      expect(results[1].rows).toEqual([{ id: 2 }]);
      expect(results[2].rows).toEqual([{ id: 3 }]);
      expect(mockConnection.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('transaction', () => {
    it('should execute transaction successfully', async () => {
      const mockResult = {
        toArray: () => [],
        schema: { fields: [] },
        numRows: 0,
      };

      vi.mocked(mockConnection.query).mockResolvedValue(mockResult as any);

      const result = await queryExecutor.transaction(async (executor) => {
        await executor.execute('INSERT INTO users VALUES (1, "test")');
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockConnection.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockConnection.query).toHaveBeenCalledWith('INSERT INTO users VALUES (1, "test")');
      expect(mockConnection.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback transaction on error', async () => {
      const mockResult = {
        toArray: () => [],
        schema: { fields: [] },
        numRows: 0,
      };

      vi.mocked(mockConnection.query)
        .mockResolvedValueOnce(mockResult as any) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')) // INSERT
        .mockResolvedValueOnce(mockResult as any); // ROLLBACK

      await expect(
        queryExecutor.transaction(async (executor) => {
          await executor.execute('INSERT INTO users VALUES (1, "test")');
          return 'success';
        })
      ).rejects.toThrow('Insert failed');

      expect(mockConnection.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockConnection.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockConnection.query).not.toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('parameter binding edge cases', () => {
    it('should handle undefined as null', async () => {
      const mockPreparedStatement = {
        bindNull: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [],
          schema: { fields: [] },
          numRows: 0,
        }),
        close: vi.fn(),
      };

      vi.mocked(mockConnection.prepare).mockResolvedValue(mockPreparedStatement as any);

      await queryExecutor.execute('INSERT INTO test VALUES (?)', [undefined]);

      expect(mockPreparedStatement.bindNull).toHaveBeenCalledWith(1);
    });

    it('should handle bigint parameters', async () => {
      const mockPreparedStatement = {
        bindInt64: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [],
          schema: { fields: [] },
          numRows: 0,
        }),
        close: vi.fn(),
      };

      vi.mocked(mockConnection.prepare).mockResolvedValue(mockPreparedStatement as any);

      const bigIntValue = BigInt('9223372036854775807');
      await queryExecutor.execute('INSERT INTO test VALUES (?)', [bigIntValue]);

      expect(mockPreparedStatement.bindInt64).toHaveBeenCalledWith(1, bigIntValue);
    });

    it('should handle integer ranges correctly', async () => {
      const mockPreparedStatement = {
        bindInt8: vi.fn(),
        bindInt16: vi.fn(),
        bindInt32: vi.fn(),
        bindInt64: vi.fn(),
        query: vi.fn().mockResolvedValue({
          toArray: () => [],
          schema: { fields: [] },
          numRows: 0,
        }),
        close: vi.fn(),
      };

      vi.mocked(mockConnection.prepare).mockResolvedValue(mockPreparedStatement as any);

      // Test different integer ranges
      await queryExecutor.execute('INSERT INTO test VALUES (?, ?, ?, ?)', [
        127,        // int8 max
        32767,      // int16 max
        2147483647, // int32 max
        2147483648, // needs int64
      ]);

      expect(mockPreparedStatement.bindInt8).toHaveBeenCalledWith(1, 127);
      expect(mockPreparedStatement.bindInt16).toHaveBeenCalledWith(2, 32767);
      expect(mockPreparedStatement.bindInt32).toHaveBeenCalledWith(3, 2147483647);
      expect(mockPreparedStatement.bindInt64).toHaveBeenCalledWith(4, BigInt(2147483648));
    });
  });
});
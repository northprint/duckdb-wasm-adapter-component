import { vi } from 'vitest';

// Mock @northprint/duckdb-wasm-adapter-core
vi.mock('@northprint/duckdb-wasm-adapter-core', () => ({
  createConnection: vi.fn().mockResolvedValue({
    id: 'test-connection',
    status: 'connected',
    execute: vi.fn().mockResolvedValue({
      toArray: () => [{ id: 1, name: 'Test' }],
      getMetadata: () => [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'name', type: 'VARCHAR', nullable: true },
      ],
      rows: [{ id: 1, name: 'Test' }],
      columns: [],
      rowCount: 1,
      toObject: () => [{ id: 1, name: 'Test' }],
      [Symbol.iterator]: function* () {
        yield { id: 1, name: 'Test' };
      },
    }),
    executeSync: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    importCSV: vi.fn().mockResolvedValue(undefined),
    importJSON: vi.fn().mockResolvedValue(undefined),
    importParquet: vi.fn().mockResolvedValue(undefined),
    exportCSV: vi.fn().mockResolvedValue('id,name\n1,Test'),
    exportJSON: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
  }),
  createQueryBuilder: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue('SELECT * FROM test'),
    execute: vi.fn().mockResolvedValue({
      toArray: () => [{ id: 1, name: 'Test' }],
      getMetadata: () => [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'name', type: 'VARCHAR', nullable: true },
      ],
      rows: [{ id: 1, name: 'Test' }],
      columns: [],
      rowCount: 1,
    }),
  })),
  DuckDBError: class DuckDBError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'DuckDBError';
    }
  },
  ErrorCode: {
    CONNECTION_FAILED: 'CONNECTION_FAILED',
    QUERY_FAILED: 'QUERY_FAILED',
    IMPORT_FAILED: 'IMPORT_FAILED',
    EXPORT_FAILED: 'EXPORT_FAILED',
    INVALID_PARAMS: 'INVALID_PARAMS',
    NOT_CONNECTED: 'NOT_CONNECTED',
    MEMORY_LIMIT: 'MEMORY_LIMIT',
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
if (!URL.createObjectURL) {
  (URL as any).createObjectURL = vi.fn().mockReturnValue('blob:test');
}
if (!URL.revokeObjectURL) {
  (URL as any).revokeObjectURL = vi.fn();
}
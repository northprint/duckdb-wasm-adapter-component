import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { createConnection } from '@northprint/duckdb-wasm-adapter-core';
import { 
  useDuckDB, 
  useQuery, 
  useMutation, 
  useBatch,
  useTransaction,
  useImportCSV,
  useImportJSON,
  useExportCSV,
  useExportJSON
} from '../src/composables';

// Mock the core module
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
    }),
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
    build: vi.fn().mockReturnValue('SELECT * FROM test'),
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

describe('useDuckDB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { connection, status, error, isConnected } = useDuckDB();
    
    expect(connection.value).toBeNull();
    expect(status.value).toBe('idle');
    expect(error.value).toBeNull();
    expect(isConnected.value).toBe(false);
  });

  it('should connect to database', async () => {
    const { connection, status, isConnected, connect } = useDuckDB();
    
    await connect();
    await nextTick();
    
    expect(connection.value).toBeTruthy();
    expect(status.value).toBe('connected');
    expect(isConnected.value).toBe(true);
  });

  it('should disconnect from database', async () => {
    const { connection, status, isConnected, connect, disconnect } = useDuckDB();
    
    await connect();
    await nextTick();
    
    expect(isConnected.value).toBe(true);
    
    await disconnect();
    await nextTick();
    
    expect(connection.value).toBeNull();
    expect(status.value).toBe('disconnected');
    expect(isConnected.value).toBe(false);
  });

  it('should handle connection errors', async () => {
    // Reset the mock to simulate a connection error
    vi.mocked(createConnection).mockRejectedValueOnce(new Error('Connection failed'));
    
    const { status, error, connect } = useDuckDB();
    
    try {
      await connect();
    } catch (err) {
      // Expected error
    }
    
    await nextTick();
    
    expect(status.value).toBe('error');
    expect(error.value).toBeTruthy();
    expect(error.value?.message).toBe('Connection failed');
  });
});

describe('useQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute query and return data', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { data, loading, error, execute } = useQuery('SELECT * FROM users');
    
    // Execute the query explicitly
    await execute();
    
    expect(data.value).toEqual([{ id: 1, name: 'Test' }]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('should handle query with parameters', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const params = ref([1]);
    const { data, execute } = useQuery('SELECT * FROM users WHERE id = ?', params);
    
    // Execute the query explicitly
    await execute();
    
    expect(data.value).toEqual([{ id: 1, name: 'Test' }]);
  });

  it('should not execute when disabled', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { data, loading } = useQuery('SELECT * FROM users', [], { 
      enabled: ref(false) 
    });
    
    await nextTick();
    
    expect(loading.value).toBe(false);
    expect(data.value).toBeUndefined();
  });

  it('should refetch data', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { data, refetch, execute } = useQuery('SELECT * FROM users');
    
    // Execute the query first
    await execute();
    
    expect(data.value).toEqual([{ id: 1, name: 'Test' }]);
    
    await refetch();
    
    expect(data.value).toEqual([{ id: 1, name: 'Test' }]);
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute mutation', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { data, loading, error, mutate } = useMutation();
    
    await mutate('INSERT INTO users VALUES (2, "New User")');
    await nextTick();
    
    expect(data.value).toEqual([{ id: 1, name: 'Test' }]);
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('should handle mutation callbacks', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    
    const { mutate } = useMutation({
      onSuccess,
      onError,
      onSettled,
    });
    
    await mutate('INSERT INTO users VALUES (2, "New")');
    await nextTick();
    
    expect(onSuccess).toHaveBeenCalledWith([{ id: 1, name: 'Test' }]);
    expect(onSettled).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should reset mutation state', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { data, mutate, reset } = useMutation();
    
    await mutate('INSERT INTO users VALUES (2, "New")');
    await nextTick();
    
    expect(data.value).toBeTruthy();
    
    reset();
    
    expect(data.value).toBeUndefined();
  });
});

describe('useBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute batch operations', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { execute } = useBatch();
    
    const operations = [
      { sql: 'INSERT INTO users VALUES (2, "User 2")' },
      { sql: 'INSERT INTO users VALUES (3, "User 3")' },
    ];
    
    await execute(operations);
    await nextTick();
    
    const { createConnection } = await import('@northprint/duckdb-wasm-adapter-core');
    const mockConnection = await createConnection();
    
    expect(mockConnection.execute).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(mockConnection.execute).toHaveBeenCalledWith('COMMIT');
  });
});

describe('useTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute callback in transaction', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { execute } = useTransaction();
    
    const callback = vi.fn(async (exec) => {
      await exec('INSERT INTO users VALUES (2, "User 2")');
      return 'Success';
    });
    
    const result = await execute(callback);
    
    expect(result).toBe('Success');
    expect(callback).toHaveBeenCalled();
  });
});

describe('useImportCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import CSV file', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { importCSV, loading, error } = useImportCSV();
    
    const file = new File(['id,name\n1,Test'], 'test.csv');
    
    await importCSV(file, 'users');
    await nextTick();
    
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });
});

describe('useImportJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import JSON data', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { importJSON, loading, error } = useImportJSON();
    
    const data = [{ id: 2, name: 'New User' }];
    
    await importJSON(data, 'users');
    await nextTick();
    
    expect(loading.value).toBe(false);
    expect(error.value).toBeNull();
  });
});

describe('useExportCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export data as CSV', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { exportCSV } = useExportCSV();
    
    const csv = await exportCSV('SELECT * FROM users');
    
    expect(csv).toBe('id,name\n1,Test');
  });
});

describe('useExportJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export data as JSON', async () => {
    const { connect } = useDuckDB();
    await connect();
    
    const { exportJSON } = useExportJSON();
    
    const json = await exportJSON('SELECT * FROM users');
    
    expect(json).toEqual([{ id: 1, name: 'Test' }]);
  });
});
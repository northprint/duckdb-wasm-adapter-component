import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get, writable } from 'svelte/store';
import { useQuery, useMutation, useBatch, useTransaction } from '../src/hooks.js';
import type { DuckDBStore } from '../src/types.js';

// Mock DuckDB store
function createMockDuckDBStore(): DuckDBStore {
  const mockConnection = {
    id: 'test-connection',
    status: 'connected',
    execute: vi.fn().mockResolvedValue({
      toArray: () => [{ id: 1, name: 'Test' }],
      getMetadata: () => [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'name', type: 'VARCHAR', nullable: true },
      ],
    }),
    close: vi.fn(),
    importCSV: vi.fn(),
    importJSON: vi.fn(),
    importParquet: vi.fn(),
    exportCSV: vi.fn().mockResolvedValue('id,name\n1,Test'),
    exportJSON: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
  };

  return {
    connection: writable(mockConnection as any),
    status: writable('connected' as const),
    error: writable(null),
    connect: vi.fn(),
    disconnect: vi.fn(),
    query: vi.fn((sql: string) => {
      const result = writable({
        data: [{ id: 1, name: 'Test' }],
        loading: false,
        error: null,
        metadata: [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: true },
        ],
      });
      return {
        subscribe: result.subscribe,
        refetch: vi.fn(),
        cancel: vi.fn(),
      };
    }),
    importCSV: vi.fn(),
    importJSON: vi.fn(),
    importParquet: vi.fn(),
    exportCSV: vi.fn().mockResolvedValue('id,name\n1,Test'),
    exportJSON: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
  };
}

describe('useQuery', () => {
  let db: DuckDBStore;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDuckDBStore();
  });

  it('should execute query and return result', () => {
    const queryStore = useQuery(db, 'SELECT * FROM users');
    
    const result = get(queryStore);
    expect(result.data).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.loading).toBe(false);
    expect(result.error).toBeNull();
  });

  it('should handle disabled queries', () => {
    const queryStore = useQuery(db, 'SELECT * FROM users', undefined, {
      enabled: false,
    });
    
    const result = get(queryStore);
    expect(result.data).toBeNull();
    expect(result.loading).toBe(false);
    expect(result.error).toBeNull();
  });

  it('should handle refetch interval', async () => {
    vi.useFakeTimers();
    
    const queryStore = useQuery(db, 'SELECT * FROM users', undefined, {
      refetchInterval: 1000,
    });
    
    const unsubscribe = queryStore.subscribe(() => {});
    
    // Advance timer
    vi.advanceTimersByTime(1000);
    
    expect(queryStore.refetch).toBeDefined();
    
    unsubscribe();
    vi.useRealTimers();
  });
});

describe('useMutation', () => {
  let db: DuckDBStore;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDuckDBStore();
  });

  it('should execute mutation and return result', async () => {
    const mutation = useMutation(db);
    
    expect(get(mutation.loading)).toBe(false);
    
    const result = await mutation.execute('INSERT INTO users VALUES (2, "New")');
    
    expect(result).toEqual([{ id: 1, name: 'Test' }]);
    expect(get(mutation.loading)).toBe(false);
    expect(get(mutation.error)).toBeNull();
    expect(get(mutation.data)).toEqual([{ id: 1, name: 'Test' }]);
  });

  it('should handle mutation errors', async () => {
    const mutation = useMutation(db);
    
    const conn = get(db.connection);
    vi.mocked(conn!.execute).mockRejectedValueOnce(new Error('Mutation failed'));
    
    await expect(mutation.execute('INVALID SQL')).rejects.toThrow('Mutation failed');
    
    expect(get(mutation.loading)).toBe(false);
    expect(get(mutation.error)?.message).toBe('Mutation failed');
  });

  it('should handle mutations without connection', async () => {
    db.connection = writable(null);
    const mutation = useMutation(db);
    
    await expect(mutation.execute('INSERT INTO users VALUES (2, "New")')).rejects.toThrow('Not connected to database');
    
    expect(get(mutation.error)?.message).toBe('Not connected to database');
  });
});

describe('useBatch', () => {
  let db: DuckDBStore;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDuckDBStore();
  });

  it('should execute batch operations in transaction', async () => {
    const operations = [
      { sql: 'INSERT INTO users VALUES (2, "User 2")' },
      { sql: 'INSERT INTO users VALUES (3, "User 3")' },
      { sql: 'UPDATE users SET name = ? WHERE id = ?', params: ['Updated', 1] },
    ];
    
    await useBatch(db, operations);
    
    const conn = get(db.connection);
    expect(conn!.execute).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(conn!.execute).toHaveBeenCalledWith('INSERT INTO users VALUES (2, "User 2")', undefined);
    expect(conn!.execute).toHaveBeenCalledWith('INSERT INTO users VALUES (3, "User 3")', undefined);
    expect(conn!.execute).toHaveBeenCalledWith('UPDATE users SET name = ? WHERE id = ?', ['Updated', 1]);
    expect(conn!.execute).toHaveBeenCalledWith('COMMIT');
  });

  it('should rollback on error', async () => {
    const conn = get(db.connection);
    
    // Mock successful BEGIN TRANSACTION
    vi.mocked(conn!.execute)
      .mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
      .mockRejectedValueOnce(new Error('Transaction failed')) // First operation fails
      .mockResolvedValueOnce(undefined); // ROLLBACK
    
    const operations = [
      { sql: 'INSERT INTO users VALUES (2, "User 2")' },
    ];
    
    await expect(useBatch(db, operations)).rejects.toThrow('Transaction failed');
    
    // Should call ROLLBACK after error
    expect(conn!.execute).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should throw error when not connected', async () => {
    db.connection = writable(null);
    
    const operations = [
      { sql: 'INSERT INTO users VALUES (2, "User 2")' },
    ];
    
    await expect(useBatch(db, operations)).rejects.toThrow('Not connected to database');
  });
});

describe('useTransaction', () => {
  let db: DuckDBStore;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDuckDBStore();
  });

  it('should execute callback in transaction', async () => {
    const result = await useTransaction(db, async (execute) => {
      await execute('INSERT INTO users VALUES (2, "User 2")');
      await execute('UPDATE users SET name = ? WHERE id = ?', ['Updated', 1]);
      return 'Success';
    });
    
    expect(result).toBe('Success');
    
    const conn = get(db.connection);
    expect(conn!.execute).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(conn!.execute).toHaveBeenCalledWith('INSERT INTO users VALUES (2, "User 2")', undefined);
    expect(conn!.execute).toHaveBeenCalledWith('UPDATE users SET name = ? WHERE id = ?', ['Updated', 1]);
    expect(conn!.execute).toHaveBeenCalledWith('COMMIT');
  });

  it('should rollback on error', async () => {
    const conn = get(db.connection);
    
    await expect(
      useTransaction(db, async () => {
        throw new Error('Transaction failed');
      })
    ).rejects.toThrow('Transaction failed');
    
    expect(conn!.execute).toHaveBeenCalledWith('ROLLBACK');
  });

  it('should throw error when not connected', async () => {
    db.connection = writable(null);
    
    await expect(
      useTransaction(db, async () => 'Success')
    ).rejects.toThrow('Not connected to database');
  });
});
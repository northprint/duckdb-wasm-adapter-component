import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { createDuckDB } from '../src/store.js';
import type { Connection } from '@duckdb-wasm-adapter/core';

// Mock connection module
vi.mock('@duckdb-wasm-adapter/core', () => ({
  createConnection: vi.fn(),
  DuckDBError: class DuckDBError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'DuckDBError';
    }
  },
}));

describe('createDuckDB', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mock implementation
    const { createConnection } = await import('@duckdb-wasm-adapter/core');
    const mockCreateConnection = vi.mocked(createConnection);
    
    mockCreateConnection.mockResolvedValue({
      id: 'test-connection',
      status: 'connected',
      execute: vi.fn().mockResolvedValue({
        toArray: () => [{ id: 1, name: 'Test' }],
        getMetadata: () => [
          { name: 'id', type: 'INTEGER', nullable: false },
          { name: 'name', type: 'VARCHAR', nullable: true },
        ],
      }),
      close: vi.fn().mockResolvedValue(undefined),
      importCSV: vi.fn().mockResolvedValue(undefined),
      importJSON: vi.fn().mockResolvedValue(undefined),
      importParquet: vi.fn().mockResolvedValue(undefined),
      exportCSV: vi.fn().mockResolvedValue('id,name\n1,Test'),
      exportJSON: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
    } as any);
  });

  it('should create a DuckDB store with initial state', () => {
    const db = createDuckDB();
    
    expect(get(db.connection)).toBeNull();
    expect(get(db.status)).toBe('idle');
    expect(get(db.error)).toBeNull();
  });

  it('should connect to database', async () => {
    const db = createDuckDB();
    
    await db.connect();
    
    expect(get(db.status)).toBe('connected');
    expect(get(db.connection)).toBeTruthy();
    expect(get(db.error)).toBeNull();
    
    const { createConnection } = await import('@duckdb-wasm-adapter/core');
    expect(createConnection).toHaveBeenCalled();
  });

  it('should handle connection errors', async () => {
    const { createConnection } = await import('@duckdb-wasm-adapter/core');
    const mockCreateConnection = vi.mocked(createConnection);
    mockCreateConnection.mockRejectedValueOnce(new Error('Connection failed'));
    
    const db = createDuckDB();
    
    await expect(db.connect()).rejects.toThrow('Connection failed');
    expect(get(db.status)).toBe('error');
    expect(get(db.error)).toBeTruthy();
  });

  it('should disconnect from database', async () => {
    const db = createDuckDB();
    
    await db.connect();
    const conn = get(db.connection);
    
    await db.disconnect();
    
    expect(get(db.status)).toBe('disconnected');
    expect(get(db.connection)).toBeNull();
    expect(conn?.close).toHaveBeenCalled();
  });

  it('should execute query and return reactive store', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const queryStore = db.query<{ id: number; name: string }>('SELECT * FROM users');
    
    // Wait for query to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result = get(queryStore);
    expect(result.loading).toBe(false);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.metadata).toBeTruthy();
  });

  it('should handle query errors', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const conn = get(db.connection);
    if (conn && 'execute' in conn) {
      vi.mocked(conn.execute).mockRejectedValueOnce(new Error('Query failed'));
    }
    
    const queryStore = db.query('INVALID SQL');
    
    // Wait for query to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result = get(queryStore);
    expect(result.loading).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error?.message).toBe('Query failed');
    expect(result.data).toBeNull();
  });

  it('should handle query when not connected', () => {
    const db = createDuckDB();
    
    const queryStore = db.query('SELECT * FROM users');
    
    // Synchronously check the result
    const result = get(queryStore);
    expect(result.error?.message).toBe('Not connected to database');
  });

  it('should refetch query', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const queryStore = db.query('SELECT * FROM users');
    
    // Wait for initial query
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Refetch
    await queryStore.refetch();
    
    const result = get(queryStore);
    expect(result.loading).toBe(false);
    expect(result.data).toBeTruthy();
  });

  it('should cancel query', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const queryStore = db.query('SELECT * FROM users');
    
    // Cancel immediately
    queryStore.cancel();
    
    const result = get(queryStore);
    expect(result.loading).toBe(false);
  });

  it('should import CSV', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const csvContent = 'id,name\n1,Test';
    const file = new File([csvContent], 'test.csv');
    
    await expect(db.importCSV(file, 'users')).resolves.toBeUndefined();
  });

  it('should throw error when importing CSV without connection', async () => {
    const db = createDuckDB();
    
    const file = new File(['test'], 'test.csv');
    
    await expect(db.importCSV(file, 'users')).rejects.toThrow('Not connected to database');
  });

  it('should import JSON', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const data = [{ id: 1, name: 'Test' }];
    
    await expect(db.importJSON(data, 'users')).resolves.toBeUndefined();
  });

  it('should import Parquet', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const buffer = new ArrayBuffer(100);
    
    await expect(db.importParquet(buffer, 'users')).resolves.toBeUndefined();
  });

  it('should export CSV', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const csv = await db.exportCSV('SELECT * FROM users');
    
    expect(csv).toBe('id,name\n1,Test');
  });

  it('should export JSON', async () => {
    const db = createDuckDB();
    await db.connect();
    
    const json = await db.exportJSON('SELECT * FROM users');
    
    expect(json).toEqual([{ id: 1, name: 'Test' }]);
  });

  it('should auto-connect when configured', async () => {
    const db = createDuckDB({ autoConnect: true });
    
    // Wait for auto-connect
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(get(db.status)).toBe('connected');
  });

  it('should call custom event handlers', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const onError = vi.fn();
    const onQuery = vi.fn();
    
    // Mock createConnection to call the onConnect event
    const { createConnection } = await import('@duckdb-wasm-adapter/core');
    const mockCreateConnection = vi.mocked(createConnection);
    
    mockCreateConnection.mockImplementation(async (config, events) => {
      // Call onConnect event after "connection"
      setTimeout(() => events?.onConnect?.(), 0);
      
      return {
        id: 'test-connection',
        status: 'connected',
        execute: vi.fn().mockResolvedValue({
          toArray: () => [{ id: 1, name: 'Test' }],
          getMetadata: () => [],
        }),
        close: vi.fn().mockImplementation(async () => {
          // Call onDisconnect event on close
          events?.onDisconnect?.();
        }),
        importCSV: vi.fn(),
        importJSON: vi.fn(),
        importParquet: vi.fn(),
        exportCSV: vi.fn().mockResolvedValue(''),
        exportJSON: vi.fn().mockResolvedValue([]),
      } as any;
    });
    
    const db = createDuckDB({
      events: {
        onConnect,
        onDisconnect,
        onError,
        onQuery,
      },
    });
    
    await db.connect();
    
    // Wait for async event to be called
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(onConnect).toHaveBeenCalled();
    
    await db.disconnect();
    expect(onDisconnect).toHaveBeenCalled();
  });
});
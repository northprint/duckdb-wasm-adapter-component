import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { DuckDBProvider, useDuckDB } from '../src/context';
import { 
  useQuery, 
  useMutation, 
  useBatch, 
  useTransaction,
  useImportCSV,
  useImportJSON,
  useExportCSV,
  useExportJSON
} from '../src/hooks';

// Create a wrapper that ensures connection is established
const ConnectedWrapper = ({ children }: { children: React.ReactNode }) => {
  const [connected, setConnected] = React.useState(false);
  
  React.useEffect(() => {
    // Simulate connection delay
    setTimeout(() => setConnected(true), 10);
  }, []);
  
  if (!connected) return null;
  
  return <>{children}</>;
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DuckDBProvider autoConnect>
    <ConnectedWrapper>{children}</ConnectedWrapper>
  </DuckDBProvider>
);

describe('useQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute query and return data', async () => {
    const { result } = renderHook(
      () => useQuery('SELECT * FROM users'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    }, { timeout: 3000 });

    expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.current.error).toBeNull();
    expect(result.current.metadata).toBeTruthy();
  });

  it('should handle query with parameters', async () => {
    const { result } = renderHook(
      () => useQuery('SELECT * FROM users WHERE id = ?', [1]),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
  });

  it('should not execute when disabled', () => {
    const { result } = renderHook(
      () => useQuery('SELECT * FROM users', undefined, { enabled: false }),
      { wrapper }
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should refetch data', async () => {
    const { result } = renderHook(
      () => useQuery('SELECT * FROM users'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute mutation', async () => {
    const { result } = renderHook(() => useMutation(), { wrapper });

    // Wait for connection to be established
    await waitFor(() => {
      expect(result.current.mutateAsync).toBeDefined();
    });

    await act(async () => {
      await result.current.mutateAsync('INSERT INTO users VALUES (2, "New")');
    });

    expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle mutation with callbacks', async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();

    const { result } = renderHook(
      () => useMutation({ onSuccess, onError, onSettled }),
      { wrapper }
    );

    // Wait for connection
    await waitFor(() => {
      expect(result.current.mutateAsync).toBeDefined();
    });

    await act(async () => {
      await result.current.mutateAsync('INSERT INTO users VALUES (2, "New")');
    });

    expect(onSuccess).toHaveBeenCalledWith([{ id: 1, name: 'Test' }]);
    expect(onSettled).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should reset mutation state', async () => {
    const { result } = renderHook(() => useMutation(), { wrapper });

    // Wait for connection
    await waitFor(() => {
      expect(result.current.mutateAsync).toBeDefined();
    });

    await act(async () => {
      await result.current.mutateAsync('INSERT INTO users VALUES (2, "New")');
    });

    expect(result.current.data).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe('useBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute batch operations', async () => {
    const { result } = renderHook(() => useBatch(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const operations = [
      { sql: 'INSERT INTO users VALUES (2, "User 2")' },
      { sql: 'INSERT INTO users VALUES (3, "User 3")' },
    ];

    await act(async () => {
      await result.current(operations);
    });

    // Verify transaction was used
    const { createConnection } = await import('@northprint/duckdb-wasm-adapter-core');
    const mockConnection = (await createConnection()) as any;
    
    expect(mockConnection.execute).toHaveBeenCalledWith('BEGIN TRANSACTION');
    expect(mockConnection.execute).toHaveBeenCalledWith('COMMIT');
  });
});

describe('useTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute callback in transaction', async () => {
    const { result } = renderHook(() => useTransaction(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const callback = vi.fn(async (execute) => {
      await execute('INSERT INTO users VALUES (2, "User 2")');
      return 'Success';
    });

    let transactionResult;
    await act(async () => {
      transactionResult = await result.current(callback);
    });

    expect(transactionResult).toBe('Success');
    expect(callback).toHaveBeenCalled();
  });
});

describe('useImportCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import CSV file', async () => {
    const { result } = renderHook(() => useImportCSV(), { wrapper });

    await waitFor(() => {
      expect(result.current.importCSV).toBeDefined();
    });

    const file = new File(['id,name\n1,Test'], 'test.csv');

    await act(async () => {
      await result.current.importCSV(file, 'users');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useImportJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should import JSON data', async () => {
    const { result } = renderHook(() => useImportJSON(), { wrapper });

    await waitFor(() => {
      expect(result.current.importJSON).toBeDefined();
    });

    const data = [{ id: 2, name: 'New User' }];

    await act(async () => {
      await result.current.importJSON(data, 'users');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useExportCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export data as CSV', async () => {
    const { result } = renderHook(() => useExportCSV(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    let csv;
    await act(async () => {
      csv = await result.current('SELECT * FROM users');
    });

    expect(csv).toBe('id,name\n1,Test');
  });
});

describe('useExportJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export data as JSON', async () => {
    const { result } = renderHook(() => useExportJSON(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    let json;
    await act(async () => {
      json = await result.current('SELECT * FROM users');
    });

    expect(json).toEqual([{ id: 1, name: 'Test' }]);
  });
});
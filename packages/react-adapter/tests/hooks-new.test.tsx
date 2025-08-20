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

// Wrapper without autoConnect to avoid timing issues
const createWrapper = (autoConnect = false) => 
  ({ children }: { children: React.ReactNode }) => (
    <DuckDBProvider autoConnect={autoConnect}>
      {children}
    </DuckDBProvider>
  );

describe('React Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useQuery', () => {
    it('should handle query when not connected', () => {
      const { result } = renderHook(
        () => useQuery('SELECT * FROM users'),
        { wrapper: createWrapper(false) }
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Not connected to database');
    });

    it('should execute query with mocked connection', async () => {
      const { result } = renderHook(
        () => useQuery('SELECT * FROM users'),
        { wrapper: createWrapper(true) }
      );

      // Initially should be loading or have error
      expect(result.current.data).toBeUndefined();

      // Wait for data to appear
      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      }, { timeout: 2000 });

      expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
      expect(result.current.error).toBeNull();
    });

    it('should handle disabled query', () => {
      const { result } = renderHook(
        () => useQuery('SELECT * FROM users', undefined, { enabled: false }),
        { wrapper: createWrapper(true) }
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeNull();
    });

    it('should handle query with parameters', async () => {
      const { result } = renderHook(
        () => useQuery('SELECT * FROM users WHERE id = ?', [1]),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      }, { timeout: 2000 });

      expect(result.current.data).toEqual([{ id: 1, name: 'Test' }]);
    });
  });

  describe('useMutation', () => {
    it('should handle mutation when not connected', async () => {
      const { result } = renderHook(
        () => useMutation(),
        { wrapper: createWrapper(false) }
      );

      await expect(
        result.current.mutateAsync('INSERT INTO users VALUES (2, "New")')
      ).rejects.toThrow('Not connected to database');
    });

    it('should execute mutation with connection', async () => {
      // First establish connection
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      // Wait for connection
      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      // Now test mutation
      const { result } = renderHook(
        () => useMutation(),
        { wrapper: createWrapper(true) }
      );

      const data = await result.current.mutateAsync('INSERT INTO users VALUES (2, "New")');
      expect(data).toEqual([{ id: 1, name: 'Test' }]);
    });

    it('should handle mutation callbacks', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onSettled = vi.fn();

      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useMutation({ onSuccess, onError, onSettled }),
        { wrapper: createWrapper(true) }
      );

      await result.current.mutateAsync('INSERT INTO users VALUES (2, "New")');

      expect(onSuccess).toHaveBeenCalledWith([{ id: 1, name: 'Test' }]);
      expect(onError).not.toHaveBeenCalled();
      expect(onSettled).toHaveBeenCalled();
    });
  });

  describe('useBatch', () => {
    it('should execute batch operations', async () => {
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useBatch(),
        { wrapper: createWrapper(true) }
      );

      const operations = [
        { sql: 'INSERT INTO users VALUES (2, "User2")' },
        { sql: 'INSERT INTO users VALUES (3, "User3")' },
      ];

      await expect(result.current(operations)).resolves.not.toThrow();
    });
  });

  describe('useTransaction', () => {
    it('should execute transaction', async () => {
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useTransaction(),
        { wrapper: createWrapper(true) }
      );

      const transactionResult = await result.current(async (execute) => {
        await execute('INSERT INTO users VALUES (2, "User2")');
        await execute('INSERT INTO users VALUES (3, "User3")');
        return 'success';
      });

      expect(transactionResult).toBe('success');
    });
  });

  describe('Import/Export hooks', () => {
    it('useImportCSV should handle CSV import', async () => {
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useImportCSV(),
        { wrapper: createWrapper(true) }
      );

      const csvFile = new File(['id,name\n1,Test'], 'test.csv', { type: 'text/csv' });
      await expect(result.current.importCSV(csvFile, 'users')).resolves.not.toThrow();
    });

    it('useImportJSON should handle JSON import', async () => {
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useImportJSON(),
        { wrapper: createWrapper(true) }
      );

      const data = [{ id: 1, name: 'Test' }];
      await expect(result.current.importJSON(data, 'users')).resolves.not.toThrow();
    });

    it('useExportCSV should handle CSV export', async () => {
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useExportCSV(),
        { wrapper: createWrapper(true) }
      );

      const csv = await result.current('SELECT * FROM users');
      expect(csv).toBe('id,name\n1,Test');
    });

    it('useExportJSON should handle JSON export', async () => {
      const { result: contextResult } = renderHook(
        () => useDuckDB(),
        { wrapper: createWrapper(true) }
      );

      await waitFor(() => {
        expect(contextResult.current.isConnected).toBe(true);
      }, { timeout: 2000 });

      const { result } = renderHook(
        () => useExportJSON(),
        { wrapper: createWrapper(true) }
      );

      const json = await result.current('SELECT * FROM users');
      expect(json).toEqual([{ id: 1, name: 'Test' }]);
    });
  });
});
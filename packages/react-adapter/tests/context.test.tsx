import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { DuckDBProvider, useDuckDB } from '../src/context';

describe('DuckDBProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide initial context values', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider>{children}</DuckDBProvider>
    );

    const { result } = renderHook(() => useDuckDB(), { wrapper });

    expect(result.current.connection).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should connect to database', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider>{children}</DuckDBProvider>
    );

    const { result } = renderHook(() => useDuckDB(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.connection).toBeTruthy();
    expect(result.current.status).toBe('connected');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle connection errors', async () => {
    const { createConnection } = await import('@duckdb-wasm-adapter/core');
    const mockCreateConnection = vi.mocked(createConnection);
    mockCreateConnection.mockRejectedValueOnce(new Error('Connection failed'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider>{children}</DuckDBProvider>
    );

    const { result } = renderHook(() => useDuckDB(), { wrapper });

    await act(async () => {
      try {
        await result.current.connect();
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Connection failed');
  });

  it('should disconnect from database', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider>{children}</DuckDBProvider>
    );

    const { result } = renderHook(() => useDuckDB(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.connection).toBeNull();
    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
  });

  it('should auto-connect when configured', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider autoConnect>{children}</DuckDBProvider>
    );

    const { result } = renderHook(() => useDuckDB(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should call custom event handlers', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const onError = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider events={{ onConnect, onDisconnect, onError }}>
        {children}
      </DuckDBProvider>
    );

    const { result } = renderHook(() => useDuckDB(), { wrapper });

    await act(async () => {
      await result.current.connect();
    });

    // onConnect should be called via the connection events
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    await act(async () => {
      await result.current.disconnect();
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useDuckDB());
    }).toThrow('useDuckDB must be used within a DuckDBProvider');

    console.error = originalError;
  });
});
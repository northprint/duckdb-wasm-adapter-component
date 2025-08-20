import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DuckDBProvider } from '../src/context';
import { useQuery } from '../src/hooks';

describe('Minimal Working Test', () => {
  it('should work without autoConnect', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider>
        {children}
      </DuckDBProvider>
    );

    const { result } = renderHook(
      () => useQuery('SELECT * FROM users'),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('Not connected to database');
  });

  it('should work with disabled query', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DuckDBProvider autoConnect>
        {children}
      </DuckDBProvider>
    );

    const { result } = renderHook(
      () => useQuery('SELECT * FROM users', undefined, { enabled: false }),
      { wrapper }
    );

    expect(result.current).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});
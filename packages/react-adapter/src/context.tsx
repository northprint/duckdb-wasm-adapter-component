/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createConnection, createQueryBuilder, type Connection, type QueryBuilderFactory } from '@northprint/duckdb-wasm-adapter-core';
import type { DuckDBContextValue, DuckDBProviderProps, ConnectionStatus } from './types.js';

const DuckDBContext = createContext<DuckDBContextValue | null>(null);

export function DuckDBProvider({ 
  children, 
  config, 
  autoConnect = false,
  events,
  debug 
}: DuckDBProviderProps) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [queryBuilder, setQueryBuilder] = useState<QueryBuilderFactory | null>(null);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      const conn: Connection = await createConnection({ ...config, debug }, {
        onConnect: () => {
          setStatus('connected');
          events?.onConnect?.();
        },
        onDisconnect: () => {
          setStatus('disconnected');
          events?.onDisconnect?.();
        },
        onError: (err) => {
          setError(err);
          setStatus('error');
          events?.onError?.(err);
        },
        onQuery: events?.onQuery,
      });
      
      setConnection(conn);
      const qb = createQueryBuilder(conn);
      setQueryBuilder(qb);
      setStatus('connected');
    } catch (err) {
      const errorObj: Error = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setStatus('error');
      throw errorObj;
    }
  }, [config, events, debug]);

  const disconnect = useCallback(async () => {
    if (connection) {
      try {
        await connection.close();
        setConnection(null);
        setQueryBuilder(null);
        setStatus('disconnected');
        setError(null);
      } catch (err) {
        const errorObj: Error = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        throw errorObj;
      }
    }
  }, [connection]);

  useEffect(() => {
    if (autoConnect) {
      connect().catch(() => {
        // Auto-connect failed
      });
    }
    
    return () => {
      if (connection) {
        connection.close().catch(() => {
          // Disconnect on unmount failed
        });
      }
    };
  }, [autoConnect]); // Only run on mount

  const value = useMemo(() => ({
    connection,
    status,
    error,
    connect,
    disconnect,
    isConnected: status === 'connected',
    queryBuilder,
  }), [connection, status, error, connect, disconnect, queryBuilder]);

  return (
    <DuckDBContext.Provider value={value}>
      {children}
    </DuckDBContext.Provider>
  );
}

export function useDuckDB(): DuckDBContextValue {
  const context = useContext(DuckDBContext);
  if (!context) {
    throw new Error('useDuckDB must be used within a DuckDBProvider');
  }
  return context;
}
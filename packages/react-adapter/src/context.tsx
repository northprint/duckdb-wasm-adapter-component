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
  // Use indexed access to avoid destructuring issues in CI
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents
  const connectionState = useState<Connection | null>(null) as [Connection | null, React.Dispatch<React.SetStateAction<Connection | null>>];
  const connection: Connection | null = connectionState[0];
  const setConnection = connectionState[1];
  
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents
  const statusState = useState<ConnectionStatus>('idle') as [ConnectionStatus, React.Dispatch<React.SetStateAction<ConnectionStatus>>];
  const status: ConnectionStatus = statusState[0];
  const setStatus = statusState[1];
  
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents
  const errorState = useState<Error | null>(null) as [Error | null, React.Dispatch<React.SetStateAction<Error | null>>];
  const error: Error | null = errorState[0];
  const setError = errorState[1];
  
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents
  const queryBuilderState = useState<QueryBuilderFactory | null>(null) as [QueryBuilderFactory | null, React.Dispatch<React.SetStateAction<QueryBuilderFactory | null>>];
  const queryBuilder: QueryBuilderFactory | null = queryBuilderState[0];
  const setQueryBuilder = queryBuilderState[1];

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
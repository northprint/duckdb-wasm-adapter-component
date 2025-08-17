/// <reference path="../types/react-19.d.ts" />
import { useOptimistic, useCallback } from 'react';
import { useQuery } from '../hooks.js';
import type { QueryResult } from '../types.js';

/**
 * Hook for optimistic query updates (React 19.1+)
 * Allows immediate UI updates while query is pending
 */
export function useOptimisticQuery<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
  options?: {
    enabled?: boolean;
    initialData?: T[];
    onSuccess?: (data: T[]) => void;
    onError?: (error: Error) => void;
  }
): {
  data: T[];
  optimisticData: T[];
  addOptimistic: (item: T) => void;
  updateOptimistic: (id: string | number, updates: Partial<T>) => void;
  removeOptimistic: (id: string | number) => void;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const queryResult = useQuery<T>(sql, params, options);
  
  const [optimisticData, setOptimisticData] = useOptimistic(
    queryResult.data || [],
    (state: T[], action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'ADD':
          return [action.payload, ...state];
        case 'UPDATE':
          return state.map((item: any) => 
            item.id === action.payload.id 
              ? { ...item, ...action.payload.updates }
              : item
          );
        case 'REMOVE':
          return state.filter((item: any) => item.id !== action.payload);
        case 'SET':
          return action.payload;
        default:
          return state;
      }
    }
  );

  const addOptimistic = useCallback((item: T) => {
    setOptimisticData({ type: 'ADD', payload: item });
  }, [setOptimisticData]);

  const updateOptimistic = useCallback((id: string | number, updates: Partial<T>) => {
    setOptimisticData({ type: 'UPDATE', payload: { id, updates } });
  }, [setOptimisticData]);

  const removeOptimistic = useCallback((id: string | number) => {
    setOptimisticData({ type: 'REMOVE', payload: id });
  }, [setOptimisticData]);

  // Sync optimistic data when real data arrives
  useCallback(() => {
    if (queryResult.data) {
      setOptimisticData({ type: 'SET', payload: queryResult.data });
    }
  }, [queryResult.data, setOptimisticData]);

  return {
    data: queryResult.data || [],
    optimisticData,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    loading: queryResult.loading,
    error: queryResult.error,
    refetch: queryResult.refetch,
  };
}
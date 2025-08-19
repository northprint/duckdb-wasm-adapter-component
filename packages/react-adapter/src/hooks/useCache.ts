import { useCallback } from 'react';
import { useDuckDB } from '../context.js';
import type { CacheStats, Connection } from '@northprint/duckdb-wasm-adapter-core';

export function useCache() {
  const context = useDuckDB();
  const connection: Connection | null = context.connection;

  const clearCache = useCallback(() => {
    if (connection?.clearCache) {
      connection.clearCache();
    }
  }, [connection]);

  const getCacheStats = useCallback((): CacheStats => {
    if (connection?.getCacheStats) {
      return connection.getCacheStats();
    }
    return {
      hits: 0,
      misses: 0,
      evictions: 0,
      entries: 0,
      totalSize: 0,
      hitRate: 0,
    };
  }, [connection]);

  const invalidateCache = useCallback((pattern: string | RegExp): number => {
    if (connection?.invalidateCache) {
      return connection.invalidateCache(pattern);
    }
    return 0;
  }, [connection]);

  return {
    clearCache,
    getCacheStats,
    invalidateCache,
  };
}
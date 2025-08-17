import { effectScope, watch, watchEffect, watchPostEffect, watchSyncEffect, onUnmounted } from 'vue';
import { useQuery, useMutation } from '../composables.js';
import type { QueryResult } from '../types.js';

/**
 * Creates a managed scope for DuckDB queries using Vue 3.4's effectScope
 * Allows grouping and cleanup of multiple reactive queries
 */
export function useDuckDBScope() {
  const scope = effectScope();
  const queries = new Map<string, any>();
  
  const runInScope = <T>(fn: () => T): T => {
    return scope.run(fn) as T;
  };

  const createQuery = <T = Record<string, unknown>>(
    key: string,
    sql: string | (() => string),
    params?: unknown[] | (() => unknown[]),
    options?: any
  ): QueryResult<T> => {
    return runInScope(() => {
      const result = useQuery<T>(sql as any, params as any, options);
      queries.set(key, result);
      return result;
    });
  };

  const createMutation = <T = Record<string, unknown>>(
    key: string,
    options?: any
  ) => {
    return runInScope(() => {
      const result = useMutation<T>(options);
      queries.set(key, result);
      return result;
    });
  };

  const stopAll = () => {
    scope.stop();
    queries.clear();
  };

  const pauseAll = () => {
    scope.pause();
  };

  const resumeAll = () => {
    scope.resume();
  };

  return {
    scope,
    runInScope,
    createQuery,
    createMutation,
    stopAll,
    pauseAll,
    resumeAll,
    queries,
  };
}

/**
 * Enhanced query with post-effect watchers
 * Uses watchPostEffect for DOM updates after query changes
 */
export function useQueryWithEffects<T = Record<string, unknown>>(
  sql: string | (() => string),
  params?: unknown[] | (() => unknown[]),
  options?: {
    onPostUpdate?: (data: T[]) => void;
    onSyncUpdate?: (data: T[]) => void;
    onUpdate?: (data: T[]) => void;
  }
) {
  const queryResult = useQuery<T>(sql as any, params as any);

  // Watch for updates after DOM flush
  if (options?.onPostUpdate) {
    watchPostEffect(() => {
      if (queryResult.data.value) {
        options.onPostUpdate!(queryResult.data.value);
      }
    });
  }

  // Watch for synchronous updates
  if (options?.onSyncUpdate) {
    watchSyncEffect(() => {
      if (queryResult.data.value) {
        options.onSyncUpdate!(queryResult.data.value);
      }
    });
  }

  // Standard watch
  if (options?.onUpdate) {
    watchEffect(() => {
      if (queryResult.data.value) {
        options.onUpdate!(queryResult.data.value);
      }
    });
  }

  return queryResult;
}

/**
 * Create a dashboard scope with multiple related queries
 */
export function useDashboardScope(config: {
  queries: Record<string, {
    sql: string | (() => string);
    params?: unknown[] | (() => unknown[]);
    options?: any;
  }>;
  onAllLoaded?: () => void;
  autoStop?: boolean;
}) {
  const scope = effectScope();
  const results = new Map<string, any>();
  const allLoaded = new Map<string, boolean>();

  scope.run(() => {
    Object.entries(config.queries).forEach(([key, queryConfig]) => {
      const result = useQuery(queryConfig.sql as any, queryConfig.params as any, queryConfig.options);
      results.set(key, result);
      
      // Track loading states
      watch(
        () => result.loading.value,
        (loading) => {
          allLoaded.set(key, !loading);
          
          // Check if all queries are loaded
          if (config.onAllLoaded && 
              Array.from(allLoaded.values()).every(loaded => loaded)) {
            config.onAllLoaded();
          }
        },
        { immediate: true }
      );
    });
  });

  const getQuery = (key: string) => results.get(key);
  
  const refreshAll = async () => {
    const promises = Array.from(results.values()).map(result => 
      result.refetch ? result.refetch() : Promise.resolve()
    );
    await Promise.all(promises);
  };

  const stop = () => {
    scope.stop();
  };

  // Auto-stop if configured
  if (config.autoStop) {
    onUnmounted(() => {
      stop();
    });
  }

  return {
    scope,
    getQuery,
    refreshAll,
    stop,
    results,
  };
}
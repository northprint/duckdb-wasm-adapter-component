import { useActionState } from 'react';
import { useMutation } from '../hooks.js';

/**
 * Hook for form state management with DuckDB mutations (React 19.1+)
 * Integrates with React's useActionState for better form handling
 */
export function useDuckDBAction<T = Record<string, unknown>>(
  mutationFn: (formData: FormData) => { sql: string; params?: unknown[] },
  options?: {
    onSuccess?: (data: T[]) => void;
    onError?: (error: Error) => void;
  }
) {
  const { mutateAsync } = useMutation<T>(options);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        const { sql, params } = mutationFn(formData);
        const result = await mutateAsync(sql, params);
        
        return {
          success: true,
          data: result,
          error: null,
          timestamp: Date.now(),
        };
      } catch (error) {
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now(),
        };
      }
    },
    {
      success: false,
      data: null,
      error: null,
      timestamp: 0,
    }
  );

  return {
    state,
    formAction,
    isPending,
    isSuccess: state.success,
    isError: !state.success && state.error !== null,
    data: state.data,
    error: state.error,
  };
}

/**
 * Hook for complex form workflows with multiple database operations
 */
export function useFormWorkflow<T = Record<string, unknown>>(
  options?: {
    onSuccess?: (data: T[]) => void;
    onError?: (error: Error) => void;
  }
) {
  const { mutateAsync } = useMutation<T>(options);

  const createAction = (
    prepareFn: (formData: FormData) => Promise<{ sql: string; params?: unknown[] }>
  ) => {
    return useActionState(
      async (prevState: any, formData: FormData) => {
        try {
          const { sql, params } = await prepareFn(formData);
          const result = await mutateAsync(sql, params);
          
          return {
            success: true,
            data: result,
            error: null,
            values: Object.fromEntries(formData.entries()),
          };
        } catch (error) {
          return {
            success: false,
            data: prevState?.data || null,
            error: error instanceof Error ? error.message : 'Unknown error',
            values: Object.fromEntries(formData.entries()),
          };
        }
      },
      {
        success: false,
        data: null,
        error: null,
        values: {},
      }
    );
  };

  return { createAction };
}
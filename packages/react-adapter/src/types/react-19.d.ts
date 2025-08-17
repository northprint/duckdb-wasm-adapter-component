/**
 * Type definitions for React 19.1+ features
 * These will be included in @types/react in the future
 */

import 'react';

declare module 'react' {
  /**
   * useOptimistic hook for optimistic UI updates
   */
  export function useOptimistic<T, O>(
    passthrough: T,
    reducer: (state: T, optimisticValue: O) => T
  ): [T, (action: O) => void];

  /**
   * useActionState hook for form state management
   */
  export function useActionState<State, Payload>(
    action: (state: State, payload: Payload) => Promise<State> | State,
    initialState: State,
    permalink?: string
  ): [
    state: State,
    dispatch: (payload: Payload) => void,
    isPending: boolean
  ];

  /**
   * use() hook for reading resources
   */
  export function use<T>(promise: Promise<T>): T;
  export function use<T>(context: Context<T>): T;
}
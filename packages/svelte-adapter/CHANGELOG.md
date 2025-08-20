# @northprint/duckdb-wasm-adapter-svelte

## 0.1.4

### Patch Changes

- Fix infinite loop issues in React hooks and improve stability
  - Fixed useState type inference issues in React adapter that caused warnings in CI
  - Resolved infinite re-render loop in useQuery hook by properly managing dependencies
  - Fixed Parquet export test by correcting mock return types
  - Improved hook implementation to prevent unnecessary re-renders
  - Added proper type assertions where needed for CI compatibility
  - Simplified test suite to avoid async timing issues

- Updated dependencies
  - @northprint/duckdb-wasm-adapter-core@0.1.4

## 0.1.3

### Patch Changes

- Fix React adapter test failures and improve stability
  - Fixed React adapter tests by ensuring shared context in renderHook calls
  - Improved Svelte 5 Runes example with better state management
  - Fixed Vue adapter composables to return objects consistently
  - Enhanced overall test coverage and stability
  - Added MIT license file

- Updated dependencies
  - @northprint/duckdb-wasm-adapter-core@0.1.3

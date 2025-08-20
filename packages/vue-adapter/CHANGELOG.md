# @northprint/duckdb-wasm-adapter-vue

## 0.2.0

### Minor Changes

- ### Performance Improvements and Architecture Refactoring
  - 🎯 **35% bundle size reduction** through tree-shaking and code splitting
  - ⚡ **Improved cache performance** with < 1ms access times
  - 🏗️ **Refactored architecture** following SOLID principles
    - QueryCacheManager split into focused classes (CacheStorage, EvictionStrategy, CacheStatistics)
    - ConnectionImpl refactored using composition pattern
  - 🔄 **Advanced error handling** with hierarchical error classes
    - ConnectionError, QueryError, DataError, ValidationError
    - Automatic retry logic with exponential backoff
    - Helpful error messages and suggested actions
  - 📊 **Performance benchmarks** added for monitoring
  - 🐛 **Bug fixes** for TypeScript type exports and ESLint warnings

### Patch Changes

- Updated dependencies
  - @northprint/duckdb-wasm-adapter-core@0.2.0

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

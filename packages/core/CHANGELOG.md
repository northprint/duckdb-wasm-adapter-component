# @northprint/duckdb-wasm-adapter-core

## 0.3.1

### Patch Changes

- ### Bug Fix: Connection Events

  Fixed ConnectionManager's createConnection method to properly handle both ConnectionConfig and ConnectionEvents parameters. This ensures that connection event callbacks (onConnect, onDisconnect, etc.) are triggered correctly.
  - Fixed parameter handling in ConnectionManager.createConnection
  - Ensures backward compatibility with both configuration signatures
  - All tests now pass successfully (178/178)

## 0.3.0

### Minor Changes

- ### Major Performance Improvements and Architecture Refactoring

  #### 🎯 Performance Improvements
  - **35% bundle size reduction** through tree-shaking and code splitting
  - **Cache performance**: < 1ms access times
  - **10K row processing**: < 2ms
  - **Memory usage**: < 50MB for typical operations

  #### 🏗️ Architecture Refactoring
  - **QueryCacheManager** split into focused classes:
    - CacheStorage for storage operations
    - EvictionStrategy for LRU/TTL eviction
    - CacheStatistics for metrics tracking
  - **ConnectionImpl** refactored using composition pattern:
    - QueryExecutor for query execution
    - DataPorter for import/export operations
    - ConnectionLifecycle for connection management

  #### 🔄 Advanced Error Handling
  - Hierarchical error classes (ConnectionError, QueryError, DataError, ValidationError)
  - Automatic retry logic with exponential backoff
  - Helpful error messages and suggested actions
  - Better error context preservation

  #### 🐛 Bug Fixes
  - Fixed TypeScript type export errors
  - Resolved all ESLint warnings
  - Fixed React hooks dependency issues
  - Corrected error class signatures

  #### 📊 Added Features
  - Performance benchmarking suite
  - Comprehensive performance metrics
  - Better debugging capabilities

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

## 0.1.4

### Patch Changes

- Fix infinite loop issues in React hooks and improve stability
  - Fixed useState type inference issues in React adapter that caused warnings in CI
  - Resolved infinite re-render loop in useQuery hook by properly managing dependencies
  - Fixed Parquet export test by correcting mock return types
  - Improved hook implementation to prevent unnecessary re-renders
  - Added proper type assertions where needed for CI compatibility
  - Simplified test suite to avoid async timing issues

## 0.1.3

### Patch Changes

- Fix React adapter test failures and improve stability
  - Fixed React adapter tests by ensuring shared context in renderHook calls
  - Improved Svelte 5 Runes example with better state management
  - Fixed Vue adapter composables to return objects consistently
  - Enhanced overall test coverage and stability
  - Added MIT license file

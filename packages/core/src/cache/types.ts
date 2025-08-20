export interface CacheKey {
  query: string;
  params?: unknown[];
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  hits: number;
  size: number;
  key?: CacheKey;
  metadata?: Record<string, unknown>;
  accessCount?: number;
}

export interface CacheOptions {
  /**
   * Maximum number of entries in cache
   */
  maxEntries?: number;
  
  /**
   * Maximum size in bytes
   */
  maxSize?: number;
  
  /**
   * Time to live in milliseconds
   */
  ttl?: number;
  
  /**
   * Cache eviction strategy
   */
  strategy?: 'lru' | 'lfu' | 'fifo';
  evictionStrategy?: 'lru' | 'lfu' | 'fifo' | 'ttl';
  
  /**
   * Enable cache statistics
   */
  enableStats?: boolean;
  
  /**
   * Custom key generator
   */
  keyGenerator?: (query: string, params?: unknown[]) => string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  size?: number;
  totalSize?: number;
  hitRate: number;
  totalQueries?: number;
}

export interface WarmUpQuery<T = unknown> {
  sql: string;
  params?: unknown[];
  fetch: () => Promise<T>;
}

export interface CacheManager<T = unknown> {
  get(sql: string, params?: unknown[], fetchFn?: () => Promise<T>): T | undefined | Promise<T>;
  set(keyOrSql: string, dataOrParams?: T | unknown[], maybeData?: T): void;
  has(sql: string, params?: unknown[]): boolean;
  delete(sql: string, params?: unknown[]): boolean;
  clear(): void;
  getStats(): CacheStats;
  size(): number;
  invalidate(pattern: string | RegExp): number;
  warmUp(queries: WarmUpQuery<T>[]): Promise<void>;
  export(): string;
  import(jsonData: string): void;
}
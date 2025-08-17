export interface CacheKey {
  query: string;
  params?: unknown[];
}

export interface CacheEntry<T = unknown> {
  key: CacheKey;
  data: T[];
  metadata?: Record<string, unknown>;
  timestamp: number;
  accessCount: number;
  size: number;
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
  totalSize: number;
  hitRate: number;
}

export interface CacheManager<T = unknown> {
  get(key: CacheKey): T[] | null;
  set(key: CacheKey, data: T[], metadata?: Record<string, unknown>): void;
  has(key: CacheKey): boolean;
  delete(key: CacheKey): boolean;
  clear(): void;
  getStats(): CacheStats;
  size(): number;
}
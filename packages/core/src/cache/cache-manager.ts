import type { CacheEntry, CacheOptions, CacheStats, CacheManager, WarmUpQuery } from './types.js';
import { CacheStorage } from './cache-storage.js';
import { EvictionStrategy } from './eviction-strategy.js';
import { CacheStatistics } from './cache-statistics.js';
import { DataError } from '../errors/data-error.js';

/**
 * QueryCacheManager using composition pattern
 * Delegates responsibilities to specialized classes for better maintainability
 */
export class QueryCacheManager<T = unknown> implements CacheManager<T> {
  private storage: CacheStorage<T>;
  private eviction: EvictionStrategy<T>;
  private statistics: CacheStatistics;

  constructor(options: CacheOptions = {}) {
    this.storage = new CacheStorage<T>(options);
    this.eviction = new EvictionStrategy<T>(this.storage);
    this.statistics = new CacheStatistics();
  }

  get(
    sql: string,
    params?: unknown[],
    fetchFn?: () => Promise<T>
  ): T | undefined | Promise<T> {
    const key = this.storage.generateKey(sql, params);
    const entry = this.storage.get(key);
    
    if (entry) {
      if (this.eviction.isExpired(entry)) {
        this.storage.delete(key);
        this.eviction.updateSize(-entry.size);
        this.statistics.recordMiss();
        
        if (fetchFn) {
          return this.fetchAndCache(key, fetchFn);
        }
        return undefined;
      }
      
      // Update access tracking
      entry.hits++;
      entry.lastAccessed = Date.now();
      this.storage.updateAccessOrder(key);
      this.statistics.recordHit();
      
      return entry.data;
    }
    
    this.statistics.recordMiss();
    
    if (fetchFn) {
      return this.fetchAndCache(key, fetchFn);
    }
    
    return undefined;
  }

  private async fetchAndCache(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const data = await fetchFn();
    this.set(key, data);
    return data;
  }

  set(keyOrSql: string, dataOrParams?: T | unknown[], maybeData?: T): void {
    let key: string;
    let data: T;
    
    // Handle overloaded signatures
    if (maybeData !== undefined) {
      // Called with (sql, params, data)
      key = this.storage.generateKey(keyOrSql, dataOrParams as unknown[]);
      data = maybeData;
    } else {
      // Called with (key, data)
      key = keyOrSql;
      data = dataOrParams as T;
    }
    
    const size = this.storage.estimateSize(data);
    
    // Check if we need to evict
    this.eviction.evictIfNeeded(size);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      hits: 0,
      size,
    };
    
    // Update size tracking
    const existingEntry = this.storage.get(key);
    if (existingEntry) {
      this.eviction.updateSize(-existingEntry.size);
    }
    
    this.storage.set(key, entry);
    this.eviction.updateSize(size);
    
    // Update statistics
    this.statistics.updateSize(
      this.eviction.getCurrentSize(),
      this.storage.size()
    );
  }

  has(sql: string, params?: unknown[]): boolean {
    const key = this.storage.generateKey(sql, params);
    const entry = this.storage.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this.eviction.isExpired(entry)) {
      this.storage.delete(key);
      this.eviction.updateSize(-entry.size);
      return false;
    }
    
    return true;
  }

  delete(sql: string, params?: unknown[]): boolean {
    const key = this.storage.generateKey(sql, params);
    const entry = this.storage.get(key);
    
    if (entry) {
      this.eviction.updateSize(-entry.size);
      this.statistics.recordEviction();
    }
    
    return this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
    this.eviction.reset();
    this.statistics.reset();
  }

  getStats(): CacheStats {
    const stats = this.statistics.getStats();
    stats.size = this.eviction.getCurrentSize();
    stats.entries = this.storage.size();
    return stats;
  }

  size(): number {
    return this.storage.size();
  }

  invalidate(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;
    
    for (const key of this.storage.keys()) {
      if (regex.test(key)) {
        const entry = this.storage.get(key);
        if (entry) {
          this.eviction.updateSize(-entry.size);
          this.storage.delete(key);
          invalidated++;
        }
      }
    }
    
    if (invalidated > 0) {
      this.statistics.updateSize(
        this.eviction.getCurrentSize(),
        this.storage.size()
      );
    }
    
    return invalidated;
  }

  async warmUp(queries: WarmUpQuery<T>[]): Promise<void> {
    for (const query of queries) {
      const key = this.storage.generateKey(query.sql, query.params);
      
      if (!this.storage.has(key)) {
        try {
          const data = await query.fetch();
          this.set(key, data);
        } catch (error) {
          console.error(`Failed to warm up cache for query: ${query.sql}`, error);
        }
      }
    }
  }

  export(): string {
    const data = {
      entries: Array.from(this.storage.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
      stats: this.statistics.getStats(),
      options: this.storage.getOptions(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData) as {
        entries: Array<{ key: string } & CacheEntry<T>>;
        stats: Partial<CacheStats>;
        options?: CacheOptions;
      };
      
      // Clear existing cache
      this.clear();
      
      // Import entries
      if (data.entries) {
        for (const { key, ...entry } of data.entries) {
          this.storage.set(key, entry);
          this.eviction.updateSize(entry.size);
        }
      }
      
      // Import stats
      if (data.stats) {
        this.statistics.import(data.stats);
      }
      
      // Update current stats
      this.statistics.updateSize(
        this.eviction.getCurrentSize(),
        this.storage.size()
      );
    } catch (error) {
      throw DataError.corruptedData('cache', `Failed to import: ${error}`);
    }
  }
}
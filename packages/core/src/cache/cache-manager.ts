import type { CacheKey, CacheEntry, CacheOptions, CacheStats, CacheManager } from './types.js';

export class QueryCacheManager<T = unknown> implements CacheManager<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = []; // For LRU
  private options: Required<CacheOptions>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    entries: 0,
    totalSize: 0,
    hitRate: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries || 100,
      maxSize: options.maxSize || 10 * 1024 * 1024, // 10MB default
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      evictionStrategy: options.evictionStrategy || 'lru',
      enableStats: options.enableStats !== false,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator.bind(this),
    };
  }

  private defaultKeyGenerator(query: string, params?: unknown[]): string {
    return JSON.stringify({ query, params });
  }

  private generateKey(key: CacheKey): string {
    return this.options.keyGenerator(key.query, key.params);
  }

  private estimateSize(data: unknown): number {
    // Simple size estimation based on JSON stringify
    try {
      return JSON.stringify(data).length * 2; // UTF-16 chars
    } catch {
      return 1024; // Default 1KB if can't stringify
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (this.options.ttl === 0) return false;
    return Date.now() - entry.timestamp > this.options.ttl;
  }

  private evictIfNeeded(): void {
    // Check TTL first
    if (this.options.evictionStrategy === 'ttl' || this.options.ttl > 0) {
      const expiredKeys: string[] = [];
      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          expiredKeys.push(key);
        }
      }
      expiredKeys.forEach(key => this.evictEntry(key));
    }

    // Check max entries
    while (this.cache.size >= this.options.maxEntries) {
      this.evictOne();
    }

    // Check max size
    while (this.stats.totalSize >= this.options.maxSize) {
      this.evictOne();
    }
  }

  private evictOne(): void {
    let keyToEvict: string | undefined = undefined;

    switch (this.options.evictionStrategy) {
      case 'lru': {
        // Least Recently Used
        if (this.accessOrder.length > 0) {
          keyToEvict = this.accessOrder[0];
        }
        break;
      }
      
      case 'lfu': {
        // Least Frequently Used
        let minAccess = Infinity;
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;
      }
      
      case 'fifo': {
        // First In First Out
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          keyToEvict = firstKey;
        }
        break;
      }
      
      case 'ttl': {
        // Time To Live - find oldest
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            keyToEvict = key;
          }
        }
        break;
      }
    }

    if (keyToEvict) {
      this.evictEntry(keyToEvict);
    }
  }

  private evictEntry(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entries--;
      this.stats.evictions++;
      
      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }

  private updateAccessOrder(key: string): void {
    if (this.options.evictionStrategy === 'lru') {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }
  }

  get(key: CacheKey): T[] | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      if (this.options.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.evictEntry(cacheKey);
      if (this.options.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Update access info
    entry.accessCount++;
    this.updateAccessOrder(cacheKey);
    
    if (this.options.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }
    
    return entry.data;
  }

  set(key: CacheKey, data: T[], metadata?: Record<string, unknown>): void {
    const cacheKey = this.generateKey(key);
    const size = this.estimateSize(data);
    
    // Don't cache if single item is too large
    if (size > this.options.maxSize) {
      return;
    }
    
    // Evict if needed before adding
    this.evictIfNeeded();
    
    const entry: CacheEntry<T> = {
      key,
      data,
      metadata,
      timestamp: Date.now(),
      accessCount: 0,
      size,
    };
    
    // Update existing entry
    const existingEntry = this.cache.get(cacheKey);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
      this.stats.entries--;
    }
    
    this.cache.set(cacheKey, entry);
    this.stats.totalSize += size;
    this.stats.entries++;
    this.updateAccessOrder(cacheKey);
  }

  has(key: CacheKey): boolean {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.evictEntry(cacheKey);
      return false;
    }
    
    return true;
  }

  delete(key: CacheKey): boolean {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (entry) {
      this.evictEntry(cacheKey);
      return true;
    }
    
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      entries: 0,
      totalSize: 0,
      hitRate: 0,
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  size(): number {
    return this.cache.size;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string | RegExp): number {
    let invalidated = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const match = typeof pattern === 'string' 
        ? entry.key.query.includes(pattern)
        : pattern.test(entry.key.query);
      
      if (match) {
        keysToDelete.push(key);
        invalidated++;
      }
    }
    
    keysToDelete.forEach(key => this.evictEntry(key));
    return invalidated;
  }

  /**
   * Warm up cache with predefined queries
   */
  async warmUp(
    queries: Array<{ key: CacheKey; loader: () => Promise<T[]> }>
  ): Promise<void> {
    const promises = queries.map(async ({ key, loader }) => {
      try {
        const data = await loader();
        this.set(key, data);
      } catch (error) {
        // Failed to warm up cache for query
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Export cache state for persistence
   */
  export(): string {
    const entries: Array<[string, CacheEntry<T>]> = [];
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        entries.push([key, entry]);
      }
    }
    return JSON.stringify({
      entries,
      stats: this.stats,
      timestamp: Date.now(),
    });
  }

  /**
   * Import cache state from persistence
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data) as {
        entries: [string, CacheEntry<T>][];
        stats?: { hits: number; misses: number };
      };
      const now = Date.now();
      
      this.clear();
      
      for (const [key, entry] of parsed.entries) {
        // Skip if would be expired
        if (this.options.ttl > 0 && now - entry.timestamp > this.options.ttl) {
          continue;
        }
        
        this.cache.set(key, entry);
        this.stats.totalSize += entry.size;
        this.stats.entries++;
        this.updateAccessOrder(key);
      }
      
      // Restore stats if needed
      if (this.options.enableStats && parsed.stats) {
        this.stats.hits = parsed.stats.hits || 0;
        this.stats.misses = parsed.stats.misses || 0;
        this.updateHitRate();
      }
    } catch (error) {
      // Failed to import cache state
    }
  }
}
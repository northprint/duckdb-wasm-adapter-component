import type { CacheEntry, CacheOptions } from './types.js';

/**
 * Core cache storage implementation
 * Handles basic get/set/delete operations
 */
export class CacheStorage<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 100 * 1024 * 1024, // 100MB default
      maxEntries: options.maxEntries || 1000,
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      strategy: options.strategy || 'lru',
      evictionStrategy: options.evictionStrategy || 'lru',
      enableStats: options.enableStats !== false,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator.bind(this),
    };
  }

  private defaultKeyGenerator(sql: string, params?: unknown[]): string {
    return params ? `${sql}::${JSON.stringify(params)}` : sql;
  }

  generateKey(sql: string, params?: unknown[]): string {
    return this.options.keyGenerator(sql, params);
  }

  get(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key);
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Remove if exists to update access order
    if (this.cache.has(key)) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    
    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  delete(key: string): boolean {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }

  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  getAccessOrder(): string[] {
    return [...this.accessOrder];
  }

  updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  getOptions(): Required<CacheOptions> {
    return this.options;
  }

  estimateSize(data: unknown): number {
    // Rough estimation of object size in memory
    const str = JSON.stringify(data);
    // Account for string overhead and object structure
    return str.length * 2 + 100; // UTF-16 + object overhead
  }
}
import type { CacheEntry, CacheOptions } from './types.js';
import type { CacheStorage } from './cache-storage.js';

/**
 * Manages cache eviction strategies (LRU, TTL, FIFO)
 */
export class EvictionStrategy<T = unknown> {
  private storage: CacheStorage<T>;
  private currentSize = 0;

  constructor(storage: CacheStorage<T>) {
    this.storage = storage;
  }

  isExpired(entry: CacheEntry<T>): boolean {
    const options = this.storage.getOptions();
    return Date.now() - entry.timestamp > options.ttl;
  }

  shouldEvict(newSize: number): boolean {
    const options = this.storage.getOptions();
    return (
      this.currentSize + newSize > options.maxSize ||
      this.storage.size() >= options.maxEntries
    );
  }

  evictIfNeeded(newSize: number): void {
    const options = this.storage.getOptions();
    
    // First, remove expired entries
    for (const [key, entry] of this.storage.entries()) {
      if (this.isExpired(entry)) {
        this.evictEntry(key);
      }
    }
    
    // Then evict based on strategy until we have space
    while (this.shouldEvict(newSize)) {
      const evicted = this.evictOne();
      if (!evicted) {
        // Can't evict more, might exceed limits
        break;
      }
    }
  }

  evictOne(): boolean {
    const options = this.storage.getOptions();
    const accessOrder = this.storage.getAccessOrder();
    
    if (accessOrder.length === 0) {
      return false;
    }
    
    let keyToEvict: string | undefined;
    
    switch (options.strategy) {
      case 'lru': {
        // Find least recently used non-expired entry
        for (const key of accessOrder) {
          const entry = this.storage.get(key);
          if (entry && !this.isExpired(entry)) {
            keyToEvict = key;
            break;
          }
        }
        break;
      }
      
      case 'lfu': {
        // Find least frequently used
        let minHits = Infinity;
        for (const key of accessOrder) {
          const entry = this.storage.get(key);
          if (entry && entry.hits < minHits) {
            minHits = entry.hits;
            keyToEvict = key;
          }
        }
        break;
      }
      
      case 'fifo': {
        // First in, first out
        keyToEvict = accessOrder[0];
        break;
      }
      
      default:
        // Default to LRU
        keyToEvict = accessOrder[0];
    }
    
    if (keyToEvict) {
      this.evictEntry(keyToEvict);
      return true;
    }
    
    return false;
  }

  evictEntry(key: string): void {
    const entry = this.storage.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.storage.delete(key);
    }
  }

  updateSize(delta: number): void {
    this.currentSize += delta;
  }

  getCurrentSize(): number {
    return this.currentSize;
  }

  reset(): void {
    this.currentSize = 0;
  }
}
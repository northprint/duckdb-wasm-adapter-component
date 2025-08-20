import type { CacheStats } from './types.js';

/**
 * Manages cache statistics and metrics
 */
export class CacheStatistics {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    entries: 0,
    hitRate: 0,
    totalQueries: 0,
  };

  recordHit(): void {
    this.stats.hits++;
    this.stats.totalQueries = (this.stats.totalQueries || 0) + 1;
    this.updateHitRate();
  }

  recordMiss(): void {
    this.stats.misses++;
    this.stats.totalQueries = (this.stats.totalQueries || 0) + 1;
    this.updateHitRate();
  }

  recordEviction(): void {
    this.stats.evictions++;
  }

  updateSize(size: number, entries: number): void {
    this.stats.size = size;
    this.stats.entries = entries;
  }

  private updateHitRate(): void {
    const totalQueries = this.stats.totalQueries || 0;
    if (totalQueries > 0) {
      this.stats.hitRate = this.stats.hits / totalQueries;
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      totalQueries: 0,
    };
  }

  export(): string {
    return JSON.stringify(this.stats, null, 2);
  }

  import(data: Partial<CacheStats>): void {
    this.stats = {
      ...this.stats,
      ...data,
    };
    this.updateHitRate();
  }
}
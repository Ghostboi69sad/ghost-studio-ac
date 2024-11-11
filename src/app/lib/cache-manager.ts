type CacheItem = {
  data: any;
  timestamp: number;
  ttl: number;
};

/**
 * Manages in-memory caching for the application
 * Implements singleton pattern for global cache access
 */
export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem>;
  private readonly DEFAULT_TTL = 1000 * 60 * 15; // 15 minutes

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Sets a value in cache with optional TTL
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Gets a value from cache, returns null if expired
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Removes expired entries from cache
   */
  clearExpired(): void {
    // Convert entries to array for ES5 compatibility
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Clears media cache entries
   */
  clearMediaCache(pattern: string = '*'): void {
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (key.startsWith('video_url_') && key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Updates a value in cache
   */
  update(key: string, updateFn: (data: any) => any): void {
    const item = this.cache.get(key);
    if (item) {
      item.data = updateFn(item.data);
      this.cache.set(key, item);
    }
  }
}

export const cacheManager = CacheManager.getInstance(); 
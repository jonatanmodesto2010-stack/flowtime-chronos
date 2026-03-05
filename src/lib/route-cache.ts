/**
 * Simple in-memory cache for route data.
 * Stores data with timestamps and provides stale-while-revalidate behavior.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL = 60_000; // 60 seconds

export function getCachedData<T>(key: string, ttl = DEFAULT_TTL): { data: T; isStale: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  return { data: entry.data as T, isStale: age > ttl };
}

export function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateAllCaches(): void {
  cache.clear();
}

// Cache keys
export const CACHE_KEYS = {
  CLIENTS: 'clients-data',
  CLIENTS_OVERDUE: 'clients-overdue-map',
  CALENDAR_EVENTS: 'calendar-events',
} as const;

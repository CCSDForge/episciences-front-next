/**
 * Simple pass-through wrapper for fetch functions
 * Next.js 14 ISR handles caching via `next: { revalidate }` options in fetch()
 * This file is kept for backward compatibility but no longer caches
 * TODO: Remove this file and replace all usages with direct fetch calls
 */

const cache = new Map<string, { data: any; timestamp: number }>();

// Cache TTL: 10 minutes (enough for a build)
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Pass-through wrapper - no longer caches
 * Caching is handled by Next.js ISR natively
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Next.js 14 ISR handles caching automatically via fetch() options
  // No need for manual in-memory cache
  return fetchFn();
}

/**
 * Clear the cache (useful for testing)
 */
export function clearFetchCache() {
  cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys())
  };
}

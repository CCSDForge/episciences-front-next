/**
 * Simple in-memory cache for fetch requests during build time
 * Prevents redundant API calls when generateStaticParams is called multiple times
 */

const cache = new Map<string, { data: any; timestamp: number }>();

// Cache TTL: 10 minutes (enough for a build)
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Cache wrapper for fetch functions during build time
 * Only caches during static builds, not in dev or at runtime
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Only cache during static builds
  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  if (!isStaticBuild) {
    return fetchFn();
  }

  // Check cache
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`[fetchCache] HIT: ${cacheKey}`);
    return cached.data as T;
  }

  // Fetch and cache
  console.log(`[fetchCache] MISS: ${cacheKey}`);
  const data = await fetchFn();
  cache.set(cacheKey, { data, timestamp: now });

  return data;
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

/**
 * API Error Handler
 *
 * Provides utilities for safe API fetching with automatic fallback
 * and consistent error handling across the application.
 */

/**
 * Result of a safe fetch operation
 */
export interface FetchResult<T> {
  /** The fetched data or fallback value */
  data: T;
  /** Error if fetch failed */
  error?: Error;
  /** Source of the data */
  source: 'api' | 'cache' | 'fallback';
}

/**
 * Safely fetch data with automatic fallback on error
 *
 * This function ensures pages always render even when the API is down
 * by returning a valid fallback value instead of throwing exceptions.
 *
 * @param fetchFn - Async function that performs the fetch
 * @param fallback - Fallback value to return if fetch fails
 * @param context - Context string for logging (e.g., "fetchArticles(epijinfo)")
 * @returns FetchResult with data, error, and source
 *
 * @example
 * ```typescript
 * const result = await safeFetch(
 *   async () => {
 *     const res = await fetch('/api/articles');
 *     if (!res.ok) throw new Error(`HTTP ${res.status}`);
 *     return await res.json();
 *   },
 *   { 'hydra:member': [], 'hydra:totalItems': 0 },
 *   'fetchArticles(epijinfo)'
 * );
 *
 * // result.data is always valid (either from API or fallback)
 * // result.error indicates if there was a problem
 * // result.source tells you where data came from
 * ```
 */
export async function safeFetch<T>(
  fetchFn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<FetchResult<T>> {
  try {
    const data = await fetchFn();
    return { data, source: 'api' };
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');

    // Log warning (not error) to indicate graceful degradation
    console.warn(`[SafeFetch] ${context} failed, using fallback:`, err.message);

    return {
      data: fallback,
      error: err,
      source: 'fallback'
    };
  }
}

/**
 * Safe fetch variant that returns data directly (unwrapped)
 *
 * Use this when you don't need access to error or source information,
 * and just want the data with automatic fallback.
 *
 * @param fetchFn - Async function that performs the fetch
 * @param fallback - Fallback value to return if fetch fails
 * @param context - Context string for logging
 * @returns The data (either from API or fallback)
 *
 * @example
 * ```typescript
 * const articles = await safeFetchData(
 *   async () => {
 *     const res = await fetch('/api/articles');
 *     return await res.json();
 *   },
 *   [],
 *   'fetchArticles'
 * );
 * // articles is always an array
 * ```
 */
export async function safeFetchData<T>(
  fetchFn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  const result = await safeFetch(fetchFn, fallback, context);
  return result.data;
}

/**
 * Check if a fetch result came from fallback (indicating an error)
 *
 * @param result - FetchResult to check
 * @returns true if data came from fallback
 */
export function isFromFallback<T>(result: FetchResult<T>): boolean {
  return result.source === 'fallback';
}

/**
 * Check if a fetch result came from API (success)
 *
 * @param result - FetchResult to check
 * @returns true if data came from API
 */
export function isFromApi<T>(result: FetchResult<T>): boolean {
  return result.source === 'api';
}

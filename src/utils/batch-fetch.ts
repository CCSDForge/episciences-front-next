/**
 * Batch Fetch Utilities
 *
 * Utilities for fetching multiple items in parallel with error handling.
 * Ensures partial failures don't block the entire operation.
 */

/**
 * Fetch multiple items in parallel with automatic fallback handling
 *
 * This function executes fetch operations in parallel using Promise.allSettled,
 * which means individual failures won't cause the entire batch to fail.
 *
 * @template T - The type of items to fetch
 * @template R - The type of result returned by the fetch function
 *
 * @param items - Array of items to fetch (e.g., article IDs, volume IDs)
 * @param fetchFn - Async function that fetches a single item
 * @param fallback - Optional fallback value for failed fetches (null by default)
 * @param context - Optional context string for logging (defaults to "BatchFetch")
 *
 * @returns Array of successfully fetched results (failed fetches return fallback or are filtered out)
 *
 * @example
 * // Fetch multiple articles by ID
 * const articleIds = ['123', '456', '789'];
 * const articles = await batchFetchWithFallback(
 *   articleIds,
 *   (id) => fetchArticle(id),
 *   null,
 *   'Articles'
 * );
 *
 * @example
 * // Fetch with custom fallback
 * const volumes = await batchFetchWithFallback(
 *   volumeIds,
 *   (id) => fetchVolume(id),
 *   { id: 0, title: 'Unknown' }, // Custom fallback
 *   'Volumes'
 * );
 */
export async function batchFetchWithFallback<T, R>(
  items: T[],
  fetchFn: (item: T) => Promise<R>,
  fallback: R | null = null,
  context: string = 'BatchFetch'
): Promise<R[]> {
  // Execute all fetches in parallel
  const results = await Promise.allSettled(
    items.map(item => fetchFn(item))
  );

  // Process results: extract successful values, log failures
  return results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn(
          `[${context}] Item ${index} failed:`,
          result.reason?.message || result.reason
        );
        return fallback;
      }
    })
    .filter((item): item is R => item !== null);
}

/**
 * Batch fetch with progress tracking and detailed error reporting
 *
 * Similar to batchFetchWithFallback but provides more detailed feedback
 * about the batch operation's success/failure rate.
 *
 * @template T - The type of items to fetch
 * @template R - The type of result returned by the fetch function
 *
 * @param items - Array of items to fetch
 * @param fetchFn - Async function that fetches a single item
 * @param options - Configuration options
 * @returns Object containing results, success count, and failure count
 *
 * @example
 * const { results, successCount, failureCount } = await batchFetchWithTracking(
 *   paperIds,
 *   (id) => fetchArticle(id),
 *   { context: 'VolumeArticles', fallback: null }
 * );
 * console.log(`Fetched ${successCount}/${paperIds.length} articles`);
 */
export async function batchFetchWithTracking<T, R>(
  items: T[],
  fetchFn: (item: T) => Promise<R>,
  options: {
    fallback?: R | null;
    context?: string;
    logProgress?: boolean;
  } = {}
): Promise<{
  results: R[];
  successCount: number;
  failureCount: number;
  total: number;
}> {
  const {
    fallback = null,
    context = 'BatchFetch',
    logProgress = false
  } = options;

  const total = items.length;
  let successCount = 0;
  let failureCount = 0;

  if (logProgress) {
    console.log(`[${context}] Starting batch fetch of ${total} items`);
  }

  const results = await Promise.allSettled(
    items.map(item => fetchFn(item))
  );

  const processedResults = results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        if (logProgress && successCount % 10 === 0) {
          console.log(`[${context}] Progress: ${successCount}/${total} items fetched`);
        }
        return result.value;
      } else {
        failureCount++;
        console.warn(
          `[${context}] Item ${index} failed:`,
          result.reason?.message || result.reason
        );
        return fallback;
      }
    })
    .filter((item): item is R => item !== null);

  if (logProgress) {
    console.log(
      `[${context}] Batch fetch complete: ${successCount} succeeded, ${failureCount} failed`
    );
  }

  return {
    results: processedResults,
    successCount,
    failureCount,
    total
  };
}

/**
 * Batch fetch with automatic retry for failed items
 *
 * Fetches items in parallel, then retries any that failed once more.
 * Useful for transient network errors.
 *
 * @template T - The type of items to fetch
 * @template R - The type of result returned by the fetch function
 *
 * @param items - Array of items to fetch
 * @param fetchFn - Async function that fetches a single item
 * @param context - Context string for logging
 * @returns Array of successfully fetched results
 *
 * @example
 * const articles = await batchFetchWithRetry(
 *   articleIds,
 *   (id) => fetchArticle(id),
 *   'HomePageArticles'
 * );
 */
export async function batchFetchWithRetry<T, R>(
  items: T[],
  fetchFn: (item: T) => Promise<R>,
  context: string = 'BatchFetch'
): Promise<R[]> {
  // First attempt: fetch all items
  const firstAttempt = await Promise.allSettled(
    items.map(item => fetchFn(item))
  );

  // Identify failed items for retry
  const failedIndices: number[] = [];
  const results: (R | null)[] = firstAttempt.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      failedIndices.push(index);
      return null;
    }
  });

  // Retry failed items
  if (failedIndices.length > 0) {
    console.warn(
      `[${context}] Retrying ${failedIndices.length} failed items...`
    );

    const retryResults = await Promise.allSettled(
      failedIndices.map(index => fetchFn(items[index]))
    );

    retryResults.forEach((result, retryIndex) => {
      const originalIndex = failedIndices[retryIndex];
      if (result.status === 'fulfilled') {
        results[originalIndex] = result.value;
      } else {
        console.error(
          `[${context}] Item ${originalIndex} failed after retry:`,
          result.reason?.message || result.reason
        );
      }
    });
  }

  return results.filter((item): item is R => item !== null);
}

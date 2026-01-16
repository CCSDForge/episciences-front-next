/**
 * Fetch with Retry and Exponential Backoff
 *
 * Provides a robust fetch utility that automatically retries failed requests
 * with exponential backoff and jitter to handle transient network errors.
 */

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 8000) */
  maxDelay?: number;
  /** Request timeout in milliseconds (default: 15000) */
  timeout?: number;
}

/**
 * Fetch with automatic retry and exponential backoff
 *
 * This function implements a robust retry mechanism with:
 * - Exponential backoff: Delays grow exponentially (1s, 2s, 4s, 8s...)
 * - Jitter: Random delay variation to prevent thundering herd
 * - Timeout: Abort requests that take too long
 * - AbortController: Proper cancellation of timed-out requests
 *
 * @param url - URL to fetch
 * @param options - Standard fetch options
 * @param retryOptions - Retry behavior configuration
 * @returns Promise resolving to Response
 * @throws Error if all retries fail
 *
 * @example
 * ```typescript
 * try {
 *   const response = await fetchWithRetry(
 *     'https://api.example.com/data',
 *     { method: 'GET' },
 *     { maxRetries: 3, baseDelay: 1000 }
 *   );
 *   const data = await response.json();
 * } catch (error) {
 *   // All retries failed
 *   console.error('Fetch failed after retries:', error);
 * }
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 8000, timeout = 15000 } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is successful
      if (!response.ok) {
        // Don't retry 4xx errors (client errors) - they won't change
        // Only retry 5xx errors (server errors) and network issues
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // 5xx errors - will be retried
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success! Return response
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry 4xx errors (client errors) - they won't change
      if (lastError.message.startsWith('HTTP 4')) {
        throw lastError;
      }

      // Don't retry if network is completely down (fetch failed)
      if (lastError.message === 'fetch failed' || lastError.message === 'Failed to fetch') {
        console.warn(`[FetchRetry] Network unavailable for ${url}, skipping retries`);
        throw lastError;
      }

      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      // Formula: baseDelay * (2 ^ attempt) + random(0, 1000)
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      console.warn(
        `[FetchRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}. ` +
          `Retrying in ${Math.round(delay)}ms... Error: ${lastError.message}`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed, throw the last error
  throw lastError;
}

/**
 * Simplified fetch with retry that returns data directly
 *
 * This is a convenience wrapper around fetchWithRetry that handles
 * the full flow: fetch, check status, parse JSON, and return data.
 *
 * @param url - URL to fetch
 * @param options - Standard fetch options
 * @param retryOptions - Retry behavior configuration
 * @returns Promise resolving to parsed JSON data
 * @throws Error if fetch or parsing fails
 *
 * @example
 * ```typescript
 * const articles = await fetchJsonWithRetry<Article[]>(
 *   'https://api.example.com/articles'
 * );
 * ```
 */
export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, retryOptions);
  return (await response.json()) as T;
}

/**
 * Check if an error is a timeout error
 *
 * @param error - Error to check
 * @returns true if error is a timeout
 */
export function isTimeoutError(error: Error): boolean {
  return error.name === 'AbortError' || error.message.includes('timeout');
}

/**
 * Check if an error is a network error (not HTTP error)
 *
 * @param error - Error to check
 * @returns true if error is a network issue
 */
export function isNetworkError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('network')
  );
}

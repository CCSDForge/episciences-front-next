/**
 * Fetch with Retry and Exponential Backoff
 *
 * Provides a robust fetch utility that automatically retries failed requests
 * with exponential backoff and jitter to handle transient network errors.
 */
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'fetch-retry' });

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
function isNetworkUnavailable(error: Error): boolean {
  return error.message === 'fetch failed' || error.message === 'Failed to fetch';
}

function isNonRetryable(error: Error): boolean {
  return error.message.startsWith('HTTP 4') || isNetworkUnavailable(error);
}

function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 8000, timeout = 15000 } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (isNetworkUnavailable(lastError))
        log.warn(`Network unavailable for ${url}, skipping retries`);
      if (isNonRetryable(lastError)) throw lastError;
      if (attempt >= maxRetries) break;

      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      log.warn(
        `Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}. ` +
          `Retrying in ${Math.round(delay)}ms... Error: ${lastError.message}`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

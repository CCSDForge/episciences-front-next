import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../fetch-with-retry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
    // Suppress retry warnings in test output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the response immediately on success', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('https://example.com/api', {}, { maxRetries: 0 });

    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors and returns on subsequent success', async () => {
    const errorResponse = new Response('Server Error', { status: 503, statusText: 'Service Unavailable' });
    const successResponse = new Response('{}', { status: 200 });

    vi.mocked(global.fetch)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry(
      'https://example.com/api',
      {},
      { maxRetries: 2, baseDelay: 0, maxDelay: 0 }
    );

    expect(result).toBe(successResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws after all retries are exhausted on 5xx errors', async () => {
    const errorResponse = new Response('Server Error', { status: 500, statusText: 'Internal Server Error' });

    vi.mocked(global.fetch).mockResolvedValue(errorResponse);

    await expect(
      fetchWithRetry('https://example.com/api', {}, { maxRetries: 2, baseDelay: 0, maxDelay: 0 })
    ).rejects.toThrow('HTTP 500');

    expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry on 4xx client errors', async () => {
    const notFoundResponse = new Response('Not Found', { status: 404, statusText: 'Not Found' });
    vi.mocked(global.fetch).mockResolvedValueOnce(notFoundResponse);

    await expect(
      fetchWithRetry('https://example.com/api', {}, { maxRetries: 3, baseDelay: 0, maxDelay: 0 })
    ).rejects.toThrow('HTTP 404');

    expect(global.fetch).toHaveBeenCalledTimes(1); // no retries
  });

  it('does not retry on network failure (fetch failed)', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fetch failed'));

    await expect(
      fetchWithRetry('https://example.com/api', {}, { maxRetries: 3, baseDelay: 0, maxDelay: 0 })
    ).rejects.toThrow('fetch failed');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('aborts the request when timeout is exceeded', async () => {
    let abortCalled = false;
    vi.mocked(global.fetch).mockImplementation((_url, options) => {
      const signal = options?.signal as AbortSignal;
      signal?.addEventListener('abort', () => {
        abortCalled = true;
      });
      // Return a promise that resolves only when the signal is aborted
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    await expect(
      fetchWithRetry('https://example.com/slow', {}, { maxRetries: 0, timeout: 50 })
    ).rejects.toThrow();

    expect(abortCalled).toBe(true);
  }, 10000);

  it('passes custom RequestInit options to fetch', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

    await fetchWithRetry(
      'https://example.com/api',
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { maxRetries: 0 }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
});

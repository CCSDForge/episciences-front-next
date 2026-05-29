import { describe, it, expect, vi, afterEach } from 'vitest';
import { safeFetch, safeFetchData } from '../api-error-handler';

describe('safeFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data from API with source "api" on success', async () => {
    const mockData = { items: [1, 2, 3] };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const result = await safeFetch(fetchFn, { items: [] }, 'test-context');

    expect(result.data).toEqual(mockData);
    expect(result.source).toBe('api');
    expect(result.error).toBeUndefined();
  });

  it('returns fallback with source "fallback" when fetch throws', async () => {
    const fallback = { items: [] };
    const fetchFn = vi.fn().mockRejectedValue(new Error('API is down'));

    const result = await safeFetch(fetchFn, fallback, 'test-context');

    expect(result.data).toBe(fallback);
    expect(result.source).toBe('fallback');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('API is down');
  });

  it('wraps non-Error rejections in an Error object', async () => {
    const fetchFn = vi.fn().mockRejectedValue('string error');

    const result = await safeFetch(fetchFn, null, 'test-context');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Unknown error');
  });

  it('calls logger.warn with context when fetch fails', async () => {
    const { safeFetchLogger } = await import('@/lib/logger');
    const warnSpy = vi.spyOn(safeFetchLogger, 'warn');
    const fetchFn = vi.fn().mockRejectedValue(new Error('timeout'));

    await safeFetch(fetchFn, null, 'fetchArticles(epijinfo)');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ context: 'fetchArticles(epijinfo)' }),
      expect.any(String)
    );
  });

  it('accepts null as fallback value', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await safeFetch(fetchFn, null, 'context');

    expect(result.data).toBeNull();
    expect(result.source).toBe('fallback');
  });
});

describe('safeFetchData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns data directly on success (unwrapped)', async () => {
    const mockData = [1, 2, 3];
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const result = await safeFetchData(fetchFn, [], 'test-context');

    expect(result).toEqual(mockData);
  });

  it('returns fallback directly on failure (unwrapped)', async () => {
    const fallback = [] as number[];
    const fetchFn = vi.fn().mockRejectedValue(new Error('API down'));

    const result = await safeFetchData(fetchFn, fallback, 'test-context');

    expect(result).toBe(fallback);
  });

  it('never throws even when fetch function throws', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('critical failure'));

    await expect(safeFetchData(fetchFn, 'default', 'context')).resolves.toBe('default');
  });
});

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
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await safeFetch(fetchFn, fallback, 'test-context');

    expect(result.data).toBe(fallback);
    expect(result.source).toBe('fallback');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('API is down');
  });

  it('wraps non-Error rejections in an Error object', async () => {
    const fetchFn = vi.fn().mockRejectedValue('string error');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await safeFetch(fetchFn, null, 'test-context');

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Unknown error');
  });

  it('logs a warning with the context when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = vi.fn().mockRejectedValue(new Error('timeout'));

    await safeFetch(fetchFn, null, 'fetchArticles(epijinfo)');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('fetchArticles(epijinfo)'),
      expect.anything()
    );
  });

  it('accepts null as fallback value', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('fail'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

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
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await safeFetchData(fetchFn, fallback, 'test-context');

    expect(result).toBe(fallback);
  });

  it('never throws even when fetch function throws', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('critical failure'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(safeFetchData(fetchFn, 'default', 'context')).resolves.toBe('default');
  });
});

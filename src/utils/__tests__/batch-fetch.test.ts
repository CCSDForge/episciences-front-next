import { describe, it, expect, vi, afterEach } from 'vitest';
import { batchFetchWithFallback, batchFetchWithRetry, batchFetchWithTracking } from '../batch-fetch';

describe('batchFetchWithFallback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all results when all fetches succeed', async () => {
    const fetchFn = vi.fn().mockImplementation((id: number) => Promise.resolve({ id, name: `Item ${id}` }));

    const results = await batchFetchWithFallback([1, 2, 3], fetchFn);

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ id: 1, name: 'Item 1' });
    expect(results[2]).toEqual({ id: 3, name: 'Item 3' });
  });

  it('uses fallback for failed items and filters out null fallbacks', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ id: 3 });

    const results = await batchFetchWithFallback([1, 2, 3], fetchFn, null);

    // Null fallback is filtered out
    expect(results).toHaveLength(2);
    expect(results).toContainEqual({ id: 1 });
    expect(results).toContainEqual({ id: 3 });
  });

  it('uses custom fallback (non-null) for failed items', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fallback = { id: 0, name: 'Unknown' };
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ id: 1, name: 'Item 1' })
      .mockRejectedValueOnce(new Error('fail'));

    const results = await batchFetchWithFallback([1, 2], fetchFn, fallback);

    expect(results).toHaveLength(2);
    expect(results[1]).toBe(fallback);
  });

  it('returns empty array for empty input', async () => {
    const fetchFn = vi.fn();

    const results = await batchFetchWithFallback([], fetchFn);

    expect(results).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('executes fetches in parallel (calls all fetchFn before any awaits)', async () => {
    const callOrder: number[] = [];
    const fetchFn = vi.fn().mockImplementation((id: number) => {
      callOrder.push(id);
      return Promise.resolve(id);
    });

    await batchFetchWithFallback([1, 2, 3], fetchFn);

    // All items should be fetched
    expect(callOrder).toHaveLength(3);
  });
});

describe('batchFetchWithRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns all results when all fetches succeed on first attempt', async () => {
    const fetchFn = vi.fn().mockImplementation((id: number) => Promise.resolve(id * 10));

    const results = await batchFetchWithRetry([1, 2, 3], fetchFn);

    expect(results).toEqual([10, 20, 30]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('retries failed items and returns results after retry success', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation((id: number) => {
      callCount++;
      // Item 2 fails on first attempt, succeeds on retry
      if (id === 2 && callCount === 2) {
        return Promise.reject(new Error('temporary failure'));
      }
      return Promise.resolve(id);
    });

    const results = await batchFetchWithRetry([1, 2, 3], fetchFn);

    // Item 2 was retried and succeeded
    expect(results).toContain(1);
    expect(results).toContain(3);
  });

  it('filters out items that fail even after retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn()
      .mockResolvedValueOnce('first')    // item[0] first attempt: success
      .mockRejectedValueOnce(new Error('fail')) // item[1] first attempt: fail
      .mockRejectedValueOnce(new Error('fail again')); // item[1] retry: fail

    const results = await batchFetchWithRetry(['a', 'b'], fetchFn);

    expect(results).toEqual(['first']);
  });

  it('returns empty array when all items fail both attempts', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchFn = vi.fn().mockRejectedValue(new Error('always fails'));

    const results = await batchFetchWithRetry([1, 2, 3], fetchFn);

    expect(results).toEqual([]);
  });

  it('returns empty array for empty input', async () => {
    const fetchFn = vi.fn();

    const results = await batchFetchWithRetry([], fetchFn);

    expect(results).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('batchFetchWithTracking', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks success and failure counts accurately', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchFn = vi.fn()
      .mockResolvedValueOnce('a')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('c');

    const { results, successCount, failureCount, total } = await batchFetchWithTracking(
      [1, 2, 3],
      fetchFn,
      { fallback: null }
    );

    expect(total).toBe(3);
    expect(successCount).toBe(2);
    expect(failureCount).toBe(1);
    expect(results).toEqual(['a', 'c']); // null filtered out
  });

  it('returns correct total for empty input', async () => {
    const fetchFn = vi.fn();

    const { results, successCount, failureCount, total } = await batchFetchWithTracking([], fetchFn);

    expect(total).toBe(0);
    expect(successCount).toBe(0);
    expect(failureCount).toBe(0);
    expect(results).toEqual([]);
  });
});

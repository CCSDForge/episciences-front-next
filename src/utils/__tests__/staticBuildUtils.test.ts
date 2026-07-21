import { describe, it, expect, vi, afterEach } from 'vitest';
import { isStaticBuild, fetchWithFallback } from '../staticBuildUtils';

describe('isStaticBuild', () => {
  it('returns false in the jsdom/happy-dom test environment (window is defined)', () => {
    expect(isStaticBuild()).toBe(false);
  });
});

describe('fetchWithFallback', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('delegates directly to fetch when not in a static build (window defined)', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithFallback('https://example.com/api', {}, { fallback: true });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', {});
    expect(result).toBe(mockResponse);
  });

  it('propagates a fetch rejection when not in a static build', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(fetchWithFallback('https://example.com/api')).rejects.toThrow('network down');
  });
});

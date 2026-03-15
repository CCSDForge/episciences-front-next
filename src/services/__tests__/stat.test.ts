import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStats } from '../stat';

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.test`),
}));

vi.mock('@/utils/api-error-handler', () => ({
  safeFetchData: vi.fn(async (fn: () => Promise<unknown>, fallback: unknown) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe('stat service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStats', () => {
    it('should return stats data on success', async () => {
      const mockData = { total: 42, published: 30 };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchStats({ rvcode: 'myjournal', page: 1, itemsPerPage: 10 });

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/journals/myjournal/stats'),
        expect.any(Object)
      );
    });

    it('should return null on API error (safeFetch fallback)', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchStats({ rvcode: 'myjournal', page: 1, itemsPerPage: 10 });

      expect(result).toBeNull();
    });

    it('should return null on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchStats({ rvcode: 'myjournal', page: 1, itemsPerPage: 10 });

      expect(result).toBeNull();
    });

    it('should include pagination params in the URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}));

      await fetchStats({ rvcode: 'myjournal', page: 2, itemsPerPage: 20 });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('itemsPerPage=20');
    });
  });
});

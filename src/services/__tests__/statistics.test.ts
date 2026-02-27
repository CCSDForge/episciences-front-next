import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStatistics } from '../statistics';

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

describe('statistics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStatistics', () => {
    it('should return statistics data on success', async () => {
      const mockStats = [
        { year: 2024, submissions: 100, publications: 50 },
        { year: 2023, submissions: 80, publications: 40 },
      ];
      mockFetch.mockResolvedValue(createMockResponse(mockStats));

      const result = await fetchStatistics({ rvcode: 'myjournal' });

      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/statistics/'),
        expect.any(Object)
      );
    });

    it('should return empty array when API returns 500 (safeFetch fallback)', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchStatistics({ rvcode: 'myjournal' });

      expect(result).toEqual([]);
    });

    it('should return empty array when network fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchStatistics({ rvcode: 'myjournal' });

      expect(result).toEqual([]);
    });

    it('should include year[] query params when years are provided', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      await fetchStatistics({ rvcode: 'myjournal', years: [2022, 2023, 2024] });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('year%5B%5D=2022');
      expect(calledUrl).toContain('year%5B%5D=2023');
      expect(calledUrl).toContain('year%5B%5D=2024');
    });

    it('should not include year[] params when years is undefined', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      await fetchStatistics({ rvcode: 'myjournal' });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).not.toContain('year');
    });

    it('should include rvcode in the URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      await fetchStatistics({ rvcode: 'epijinfo' });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('epijinfo');
    });

    it('should use default pagination params', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      await fetchStatistics({ rvcode: 'myjournal' });

      const calledUrl: string = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('itemsPerPage=7');
    });
  });
});

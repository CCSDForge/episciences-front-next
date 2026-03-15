import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchForReviewersPage } from '../forReviewers';

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

describe('forReviewers service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchForReviewersPage', () => {
    it('should return for-reviewers page data on success', async () => {
      const mockData = {
        'hydra:member': [{ page_code: 'for-reviewers', content: { en: 'Reviewer info' } }],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchForReviewersPage('myjournal');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_code=for-reviewers'),
        expect.any(Object)
      );
    });

    it('should return null when API is down (safeFetch fallback)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchForReviewersPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchForReviewersPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return hydra response with empty member array', async () => {
      const mockData = { 'hydra:member': [] };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchForReviewersPage('myjournal');

      expect(result).toEqual(mockData);
    });
  });
});

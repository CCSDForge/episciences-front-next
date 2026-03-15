import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAcknowledgementsPage } from '../acknowledgements';

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

describe('acknowledgements service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAcknowledgementsPage', () => {
    it('should return acknowledgements page data on success', async () => {
      const mockData = {
        'hydra:member': [{ page_code: 'journal-acknowledgements', content: { en: 'Thanks' } }],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchAcknowledgementsPage('myjournal');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_code=journal-acknowledgements'),
        expect.any(Object)
      );
    });

    it('should return null when API is down (safeFetch fallback)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchAcknowledgementsPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchAcknowledgementsPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return hydra response with empty member array', async () => {
      const mockData = { 'hydra:member': [] };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchAcknowledgementsPage('myjournal');

      expect(result).toEqual(mockData);
    });
  });
});

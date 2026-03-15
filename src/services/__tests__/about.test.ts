import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAboutPage } from '../about';

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

describe('about service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAboutPage', () => {
    it('should return the about page data on success', async () => {
      const mockData = {
        'hydra:member': [{ page_code: 'about', content: { en: 'About content' } }],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchAboutPage('myjournal');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_code=about'),
        expect.any(Object)
      );
    });

    it('should return null when API is down (safeFetch fallback)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchAboutPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchAboutPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return hydra response with empty member array', async () => {
      const mockData = { 'hydra:member': [] };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchAboutPage('myjournal');

      expect(result).toEqual(mockData);
    });

    it('should include rvcode in the API URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [] }));

      await fetchAboutPage('epijinfo');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('epijinfo'),
        expect.any(Object)
      );
    });
  });
});

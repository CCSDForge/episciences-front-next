import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCreditsPage } from '../credits';

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

// Mock config/api to avoid import issues
vi.mock('@/config/api', () => ({
  API_URL: 'https://api.test',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe('credits service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCreditsPage', () => {
    it('should return credits page data on success', async () => {
      const mockPage = {
        page_code: 'credits',
        content: { en: '<p>Credits content</p>', fr: '<p>Contenu crédits</p>' },
      };
      mockFetch.mockResolvedValue(createMockResponse([mockPage]));

      const result = await fetchCreditsPage('myjournal');

      expect(result).toEqual(mockPage);
    });

    it('should include rvcode in the request URL', async () => {
      mockFetch.mockResolvedValue(createMockResponse([{}]));

      await fetchCreditsPage('myjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('rvcode=myjournal'),
        expect.any(Object)
      );
    });

    it('should request page with page_code=credits', async () => {
      mockFetch.mockResolvedValue(createMockResponse([{}]));

      await fetchCreditsPage('myjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_code=credits'),
        expect.any(Object)
      );
    });

    it('should return null when response array is empty', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      const result = await fetchCreditsPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API is down (safeFetch fallback)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchCreditsPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchCreditsPage('myjournal');

      expect(result).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchForConferenceOrganisersPage } from '../forConferenceOrganisers';

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

describe('forConferenceOrganisers service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchForConferenceOrganisersPage', () => {
    it('should return page data on success', async () => {
      const mockData = {
        'hydra:member': [
          {
            page_code: 'for-conference-organisers',
            content: { en: '<p>For organisers</p>' },
          },
        ],
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchForConferenceOrganisersPage('myjournal');

      expect(result).toEqual(mockData);
    });

    it('should request page_code=for-conference-organisers', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [] })
      );

      await fetchForConferenceOrganisersPage('myjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_code=for-conference-organisers'),
        expect.any(Object)
      );
    });

    it('should include rvcode in request URL', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [] })
      );

      await fetchForConferenceOrganisersPage('myjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('rvcode=myjournal'),
        expect.any(Object)
      );
    });

    it('should return null when API is down (safeFetch fallback)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchForConferenceOrganisersPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchForConferenceOrganisersPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return hydra response with empty member array', async () => {
      const mockData = { 'hydra:member': [] };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchForConferenceOrganisersPage('myjournal');

      expect(result).toEqual(mockData);
    });

    it('should use different journal codes', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [] })
      );

      await fetchForConferenceOrganisersPage('dmtcs');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.dmtcs.test'),
        expect.any(Object)
      );
    });
  });
});

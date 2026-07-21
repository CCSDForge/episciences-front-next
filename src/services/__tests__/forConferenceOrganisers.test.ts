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

    it.each([
      {
        description: 'should request page_code=for-conference-organisers',
        journalCode: 'myjournal',
        expectedUrlPart: 'page_code=for-conference-organisers',
      },
      {
        description: 'should include rvcode in request URL',
        journalCode: 'myjournal',
        expectedUrlPart: 'rvcode=myjournal',
      },
      {
        description: 'should use different journal codes',
        journalCode: 'dmtcs',
        expectedUrlPart: 'api.dmtcs.test',
      },
    ])('$description', async ({ journalCode, expectedUrlPart }) => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [] }));

      await fetchForConferenceOrganisersPage(journalCode);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(expectedUrlPart),
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

  });
});

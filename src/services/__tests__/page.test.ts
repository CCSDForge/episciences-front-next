import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPage, IPage } from '../page';

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

const mockPage: IPage = {
  id: 1,
  title: { en: 'About', fr: 'À propos' },
  content: { en: 'About content', fr: 'Contenu À propos' },
  rvcode: 'testjournal',
  page_code: 'about',
};

describe('page service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchPage', () => {
    it('returns the first page when API responds with a list', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPage]));

      const result = await fetchPage('about', 'testjournal');

      expect(result).toEqual(mockPage);
    });

    it('returns undefined when the API returns an empty array', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      const result = await fetchPage('about', 'testjournal');

      expect(result).toBeUndefined();
    });

    it('returns undefined when API is down (safeFetch fallback)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchPage('about', 'testjournal');

      expect(result).toBeUndefined();
    });

    it('returns undefined when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchPage('about', 'testjournal');

      expect(result).toBeUndefined();
    });

    it('calls the API with the correct page_code and rvcode', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPage]));

      await fetchPage('journal-indexing', 'myjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page_code=journal-indexing'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('rvcode=myjournal'),
        expect.any(Object)
      );
    });

    it('calls the journal API URL (not a hardcoded host)', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPage]));

      await fetchPage('about', 'epijmath');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.epijmath.test'),
        expect.any(Object)
      );
    });

    it('sets ISR cache tags in the fetch options', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPage]));

      await fetchPage('about', 'testjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: expect.objectContaining({
            tags: expect.arrayContaining(['pages']),
          }),
        })
      );
    });

    it('encodes page_code with URLSearchParams (prevents query injection)', async () => {
      mockFetch.mockResolvedValue(createMockResponse([]));

      await fetchPage('foo&admin=true', 'testjournal');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      // The injected parameter must NOT appear as a separate key
      expect(calledUrl).not.toContain('admin=true');
      // The ampersand must be percent-encoded, not left raw
      expect(calledUrl).not.toMatch(/page_code=foo&/);
    });

    it('includes a page-specific tag for on-demand revalidation', async () => {
      mockFetch.mockResolvedValue(createMockResponse([mockPage]));

      await fetchPage('about', 'testjournal');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          next: expect.objectContaining({
            tags: expect.arrayContaining(['page-about', 'page-about-testjournal']),
          }),
        })
      );
    });
  });
});

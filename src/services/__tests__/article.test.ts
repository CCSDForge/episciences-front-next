import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transformArticleForDisplay, fetchArticle } from '../article';

// Mock utils/article
vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn(raw => {
    if (raw.forceError) throw new Error('Format failed');
    return { ...raw, formatted: true };
  }),
}));

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((code: string) => `https://api.${code}.test`),
}));

const mockFetchWithRetry = vi.fn();
vi.mock('@/utils/fetch-with-retry', () => ({
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
}));

describe('article service', () => {
  describe('transformArticleForDisplay', () => {
    it('should return already formatted article as is', () => {
      const alreadyFormatted = {
        id: 123,
        title: 'Already Formatted',
        authors: [],
      };

      const result = transformArticleForDisplay(alreadyFormatted);
      expect(result).toBe(alreadyFormatted);
    });

    it('should format raw API article using formatArticle util', () => {
      const rawArticle = {
        '@id': '/api/papers/1',
        paperid: 1,
        title: 'Raw',
      };

      const result = transformArticleForDisplay(rawArticle);

      expect(result).toEqual(
        expect.objectContaining({
          paperid: 1,
          formatted: true,
        })
      );
    });

    it('should fallback to minimal article if formatArticle fails', () => {
      const rawArticle = {
        '@id': '/api/papers/1',
        paperid: 999,
        forceError: true, // Triggers mock error
        document: {
          journal: {
            journal_article: {
              titles: {
                title: 'Fallback Title',
              },
            },
          },
        },
      };

      // Restore console.error for this test or spy it
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = transformArticleForDisplay(rawArticle);

      expect(result).toEqual(
        expect.objectContaining({
          id: 999,
          title: 'Fallback Title',
          metrics: { views: 0, downloads: 0 },
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle undefined input', () => {
      const result = transformArticleForDisplay(undefined);
      expect(result).toBeUndefined();
    });

    it('should handle null input', () => {
      const result = transformArticleForDisplay(null);
      expect(result).toBeUndefined();
    });
  });

  describe('fetchArticle', () => {
    beforeEach(() => {
      mockFetchWithRetry.mockReset();
      mockFetchWithRetry.mockResolvedValue({
        json: async () => ({ paperid: 42, title: 'Test' }),
      });
    });

    it('percent-encodes the paper id so it cannot inject path segments', async () => {
      await fetchArticle('../secret', 'epijinfo');

      const [url] = mockFetchWithRetry.mock.calls[0];
      expect(url).toContain(encodeURIComponent('../secret'));
      expect(url).not.toContain('/../');
    });

    it('percent-encodes a query-string injection attempt', async () => {
      await fetchArticle('42?admin=true', 'epijinfo');

      const [url] = mockFetchWithRetry.mock.calls[0];
      expect(url).not.toContain('?admin=true');
      expect(url).toContain('42%3Fadmin%3Dtrue');
    });

    it('builds clean cache tags without empty entries when rvcode is absent', async () => {
      await fetchArticle('42');

      const [, options] = mockFetchWithRetry.mock.calls[0];
      expect(options.next.tags).toEqual(['articles', 'article-42']);
    });

    it('includes the journal tag when rvcode is provided', async () => {
      await fetchArticle('42', 'epijinfo');

      const [, options] = mockFetchWithRetry.mock.calls[0];
      expect(options.next.tags).toEqual(['articles', 'article-42', 'articles-epijinfo']);
    });
  });
});

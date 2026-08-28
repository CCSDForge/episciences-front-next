import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  transformArticleForDisplay,
  fetchArticle,
  fetchArticles,
  fetchAcceptedArticles,
  fetchExportLink,
  getArticleById,
  fetchArticleMetadata,
} from '../article';

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

    it('builds clean cache tags and uses CACHE_TTL.articles without empty entries when rvcode is absent', async () => {
      await fetchArticle('42');

      const [, options] = mockFetchWithRetry.mock.calls[0];
      expect(options.next.tags).toEqual(['articles', 'article-42']);
      expect(options.next.revalidate).toBe(3600);
    });

    it('includes the journal tag and revalidate TTL when rvcode is provided', async () => {
      await fetchArticle('42', 'epijinfo');

      const [, options] = mockFetchWithRetry.mock.calls[0];
      expect(options.next.tags).toEqual(['articles', 'article-42', 'articles-epijinfo']);
      expect(options.next.revalidate).toBe(3600);
    });

    it('returns null and logs debug when the article is a 404', async () => {
      mockFetchWithRetry.mockRejectedValueOnce(new Error('HTTP 404: Not Found'));

      const result = await fetchArticle('999', 'epijinfo');

      expect(result).toBeNull();
    });

    it('returns null and logs error for a non-404 failure', async () => {
      mockFetchWithRetry.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchArticle('999', 'epijinfo');

      expect(result).toBeNull();
    });
  });

  describe('fetchArticles', () => {
    beforeEach(() => {
      mockFetchWithRetry.mockReset();
    });

    it('fetches the list then resolves each raw article to a display article', async () => {
      mockFetchWithRetry
        .mockResolvedValueOnce({
          json: async () => ({
            'hydra:member': [{ paperid: 1 }],
            'hydra:totalItems': 1,
            'hydra:range': { publicationYears: [2024], types: ['research-article'] },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ '@id': '/api/papers/1', paperid: 1 }),
        });

      const result = await fetchArticles({ rvcode: 'epijinfo', page: 1, itemsPerPage: 10 });

      expect(result.totalItems).toBe(1);
      expect(result.range).toEqual({ years: [2024], types: ['research-article'] });
      expect(result.data).toHaveLength(1);
    });

    it('appends onlyAccepted, types, years and articleIds filters to the query', async () => {
      mockFetchWithRetry.mockResolvedValue({
        json: async () => ({ 'hydra:member': [], 'hydra:totalItems': 0 }),
      });

      await fetchArticles({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        onlyAccepted: true,
        types: ['research-article'],
        years: [2023],
        articleIds: ['7'],
      });

      const [url] = mockFetchWithRetry.mock.calls[0];
      expect(url).toContain('only_accepted=true');
      expect(url).toContain('type%5B%5D=research-article');
      expect(url).toContain('year%5B%5D=2023');
      expect(url).toContain('id%5B%5D=7');
    });

    it('returns an empty result and logs on failure', async () => {
      mockFetchWithRetry.mockRejectedValue(new Error('boom'));

      const result = await fetchArticles({ rvcode: 'epijinfo', page: 1, itemsPerPage: 10 });

      expect(result).toEqual({ data: [], totalItems: 0, range: undefined });
    });
  });

  describe('fetchAcceptedArticles', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns transformed articles, total and types', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          articles: [{ id: 1, title: 'A' }],
          total: 1,
          types: ['research-article'],
        }),
      }) as unknown as typeof fetch;

      const result = await fetchAcceptedArticles('epijinfo', 1, {
        type: 'research-article',
        tagged: ['tag1'],
      });

      expect(result.total).toBe(1);
      expect(result.types).toEqual(['research-article']);
      expect(result.articles).toEqual([{ id: 1, title: 'A' }]);
    });

    it('defaults types to an empty array when absent', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ articles: [], total: 0 }),
      }) as unknown as typeof fetch;

      const result = await fetchAcceptedArticles('epijinfo');

      expect(result.types).toEqual([]);
    });

    it('throws when the response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

      await expect(fetchAcceptedArticles('epijinfo')).rejects.toThrow(
        'Failed to fetch accepted articles'
      );
    });
  });

  describe('fetchExportLink', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns the exported text on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '@article{...}',
      }) as unknown as typeof fetch;

      const result = await fetchExportLink(42, 'bibtex', 'epijinfo');

      expect(result).toBe('@article{...}');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.epijinfo.test/papers/export/42/bibtex?code=epijinfo',
        {
          next: {
            revalidate: 3600,
            tags: ['articles', 'article-42', 'articles-epijinfo'],
          },
        }
      );
    });

    it('returns null when the response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

      const result = await fetchExportLink(42, 'endnote', 'epijinfo');

      expect(result).toBeNull();
    });

    it('returns null and logs on fetch error', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

      const result = await fetchExportLink(42, 'bibtex', 'epijinfo');

      expect(result).toBeNull();
    });
  });

  describe('getArticleById', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns a transformed article on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, title: 'Already Formatted', authors: [] }),
      }) as unknown as typeof fetch;

      const result = await getArticleById(1);

      expect(result).toEqual({ id: 1, title: 'Already Formatted', authors: [] });
    });

    it('returns undefined and logs when the response is not ok', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

      const result = await getArticleById('missing');

      expect(result).toBeUndefined();
    });

    it('returns undefined and logs on fetch error', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

      const result = await getArticleById(1);

      expect(result).toBeUndefined();
    });
  });

  describe('fetchArticleMetadata', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns the metadata text on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<xml/>',
      }) as unknown as typeof fetch;

      const result = await fetchArticleMetadata({
        rvcode: 'epijinfo',
        paperid: '1',
        type: 'bibtex' as never,
      });

      expect(result).toBe('<xml/>');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.epijinfo.test/papers/export/1/bibtex?code=epijinfo',
        {
          next: {
            revalidate: 3600,
            tags: ['articles', 'article-1', 'articles-epijinfo'],
          },
        }
      );
    });

    it('percent-encodes the paper id so it cannot inject path segments or query strings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<xml/>',
      }) as unknown as typeof fetch;

      await fetchArticleMetadata({
        rvcode: 'epijinfo',
        paperid: '42?admin=true#fragment',
        type: 'bibtex' as never,
      });

      const [url] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe(
        `https://api.epijinfo.test/papers/export/${encodeURIComponent('42?admin=true#fragment')}/bibtex?code=epijinfo`
      );
      expect(url).not.toContain('/42?admin=true#fragment/');
    });

    it('returns null without warning on 404', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

      const result = await fetchArticleMetadata({
        rvcode: 'epijinfo',
        paperid: '1',
        type: 'bibtex' as never,
      });

      expect(result).toBeNull();
    });

    it('returns null and warns on other non-ok statuses', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

      const result = await fetchArticleMetadata({
        rvcode: 'epijinfo',
        paperid: '1',
        type: 'bibtex' as never,
      });

      expect(result).toBeNull();
    });

    it('returns null and logs on fetch error', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

      const result = await fetchArticleMetadata({
        rvcode: 'epijinfo',
        paperid: '1',
        type: 'bibtex' as never,
      });

      expect(result).toBeNull();
    });
  });
});

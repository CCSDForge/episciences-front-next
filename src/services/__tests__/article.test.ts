import { describe, it, expect, vi } from 'vitest';
import { transformArticleForDisplay } from '../article';

// Mock utils/article
vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn(raw => {
    if (raw.forceError) throw new Error('Format failed');
    return { ...raw, formatted: true };
  }),
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
});

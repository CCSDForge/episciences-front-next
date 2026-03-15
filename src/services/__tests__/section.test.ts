import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSection, fetchSections, fetchSectionArticles } from '../section';

vi.mock('@/config/api', () => ({
  API_URL: 'https://api.default.test',
  API_PATHS: {
    sections: '/sections',
    papers: '/papers/',
  },
}));

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

vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn((raw: Record<string, unknown>) => ({
    id: raw.paperid,
    title: raw.title || '',
  })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe('section service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSection', () => {
    it('should return mapped section on success', async () => {
      const rawSection = {
        sid: '42',
        titles: { en: 'My Section' },
        descriptions: { en: 'Description' },
        papers: ['1', '2'],
        committee: [],
      };
      mockFetch.mockResolvedValue(createMockResponse(rawSection));

      const result = await fetchSection({ sid: '42', rvcode: 'myjournal' });

      expect(result).toMatchObject({
        id: '42',
        title: { en: 'My Section' },
        description: { en: 'Description' },
        articles: ['1', '2'],
      });
    });

    it('should return null when section not found (404)', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchSection({ sid: '999', rvcode: 'myjournal' });

      expect(result).toBeNull();
    });

    it('should return null on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchSection({ sid: '42', rvcode: 'myjournal' });

      expect(result).toBeNull();
    });
  });

  describe('fetchSections', () => {
    it('should return formatted sections list on success', async () => {
      const mockData = {
        'hydra:member': [
          { sid: '1', titles: { en: 'Section 1' }, descriptions: {}, papers: [] },
          { sid: '2', titles: { en: 'Section 2' }, descriptions: {}, papers: [] },
        ],
        'hydra:totalItems': 2,
        'hydra:totalPublishedArticles': 10,
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchSections({ rvcode: 'myjournal' });

      expect(result.data).toHaveLength(2);
      expect(result.totalItems).toBe(2);
      expect(result.articlesCount).toBe(10);
    });

    it('should return empty fallback on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchSections({ rvcode: 'myjournal' });

      expect(result).toEqual({ data: [], totalItems: 0, articlesCount: 0 });
    });
  });

  describe('fetchSectionArticles', () => {
    it('should fetch and format articles for given paper IDs', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ paperid: '1', title: 'Article 1' }))
        .mockResolvedValueOnce(createMockResponse({ paperid: '2', title: 'Article 2' }));

      const result = await fetchSectionArticles(['1', '2'], 'myjournal');

      expect(result).toHaveLength(2);
    });

    it('should filter out null results (failed fetches)', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ paperid: '1', title: 'Article 1' }))
        .mockResolvedValueOnce(createMockResponse(null, false)); // 404 → null

      const result = await fetchSectionArticles(['1', '2'], 'myjournal');

      expect(result).toHaveLength(1);
    });
  });
});

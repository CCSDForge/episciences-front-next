import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNews } from '../news';

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

const createMockRawNews = (id: number, year = 2024) => ({
  id,
  title: { en: `News ${id}`, fr: `Actualité ${id}` },
  content: { en: `Content ${id}`, fr: `Contenu ${id}` },
  date_creation: `${year}-01-0${id}T10:00:00Z`,
  creator: { screenName: `Author ${id}` },
  link: undefined,
});

const createMockResponse = (data: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe('news service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNews', () => {
    it('should return formatted news on success', async () => {
      const rawNews = [createMockRawNews(1), createMockRawNews(2)];
      const mockData = {
        'hydra:member': rawNews,
        'hydra:totalItems': 2,
        'hydra:range': { years: [2024] },
      };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await fetchNews({ rvcode: 'myjournal' });

      expect(result.data).toHaveLength(2);
      expect(result.totalItems).toBe(2);
      expect(result.range).toEqual({ years: [2024] });
    });

    it('should format raw news to INews shape', async () => {
      const rawNews = [
        {
          id: 42,
          title: { en: 'Test News', fr: 'Test Actualité' },
          content: { en: 'Body' },
          date_creation: '2024-03-15T12:00:00Z',
          creator: { screenName: 'john.doe' },
          link: { und: 'https://example.com' },
        },
      ];
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': rawNews, 'hydra:totalItems': 1 })
      );

      const result = await fetchNews({ rvcode: 'myjournal' });

      expect(result.data[0]).toEqual({
        id: 42,
        title: { en: 'Test News', fr: 'Test Actualité' },
        content: { en: 'Body' },
        publicationDate: '2024-03-15T12:00:00Z',
        author: 'john.doe',
        link: 'https://example.com',
      });
    });

    it('should map undefined link to undefined', async () => {
      const rawNews = [{ ...createMockRawNews(1), link: undefined }];
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': rawNews, 'hydra:totalItems': 1 })
      );

      const result = await fetchNews({ rvcode: 'myjournal' });

      expect(result.data[0].link).toBeUndefined();
    });

    it('should include page and itemsPerPage in request URL', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 })
      );

      await fetchNews({ rvcode: 'myjournal', page: 2, itemsPerPage: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemsPerPage=5'),
        expect.any(Object)
      );
    });

    it('should include year filter params when years are provided', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 })
      );

      await fetchNews({ rvcode: 'myjournal', years: [2023, 2024] });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('year[]=2023');
      expect(calledUrl).toContain('year[]=2024');
    });

    it('should not include year filter when years array is empty', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 })
      );

      await fetchNews({ rvcode: 'myjournal', years: [] });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('year[]');
    });

    it('should use defaults when no params provided', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 })
      );

      await fetchNews({ rvcode: 'myjournal' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('itemsPerPage=10');
    });

    it('should return fallback on API error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchNews({ rvcode: 'myjournal' });

      expect(result).toEqual({ data: [], totalItems: 0, range: undefined });
    });

    it('should return fallback when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchNews({ rvcode: 'myjournal' });

      expect(result).toEqual({ data: [], totalItems: 0, range: undefined });
    });

    it('should return empty data with totalItems when API returns empty member', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 })
      );

      const result = await fetchNews({ rvcode: 'myjournal' });

      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);
    });
  });
});

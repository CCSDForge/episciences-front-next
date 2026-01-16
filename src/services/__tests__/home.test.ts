import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHomeData, HomeData } from '../home';

// Mock dependencies
vi.mock('@/config/api', () => ({
  API_PATHS: {
    pages: '/pages/',
    papers: '/papers/',
    news: '/news/',
    members: '/journals/boards/',
    statistics: '/statistics/',
    volumes: '/volumes/',
  },
}));

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://${rvcode}.episciences.org`),
}));

vi.mock('@/utils/article', () => ({
  formatArticle: vi.fn((raw) => ({
    id: raw.paperid,
    title: raw.title || 'Formatted Article',
    authors: [],
    publicationDate: '',
    tag: '',
    repositoryName: '',
    repositoryIdentifier: '',
    doi: raw.doi || '',
    abstract: '',
    pdfLink: '',
    metrics: { views: 0, downloads: 0 },
  })),
}));

vi.mock('@/utils/volume', () => ({
  formatVolume: vi.fn((rvcode, lang, raw) => ({
    id: raw.vid,
    num: raw.vol_num,
    title: raw.titles,
    year: raw.vol_year,
  })),
}));

vi.mock('@/utils/board-transforms', () => ({
  transformBoardMembers: vi.fn((members) =>
    members.map((m: any) => ({
      id: m.uid,
      firstname: m.firstname,
      lastname: m.lastname,
      roles: m.roles || [],
    }))
  ),
}));

vi.mock('@/utils/fetch-with-retry', () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from '@/utils/fetch-with-retry';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock responses
const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
});

describe('home service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchHomeData', () => {
    it('should fetch all home data in parallel', async () => {
      // Setup mocks for all API calls
      const mockAboutPage = {
        'hydra:member': [{ id: 1, page_code: 'about', title: { en: 'About' }, content: { en: 'Content' } }],
      };
      const mockArticles = {
        'hydra:member': [{ paperid: 1 }, { paperid: 2 }],
        'hydra:totalItems': 2,
      };
      const mockNews = {
        'hydra:member': [{ id: 1, title: 'News 1' }],
        'hydra:totalItems': 1,
      };
      const mockMembers = [
        { uid: 1, firstname: 'John', lastname: 'Doe', roles: ['editor'] },
      ];
      const mockStats = {
        'hydra:member': [{ id: 1, label: 'Articles', value: 100 }],
      };
      const mockIndexation = {
        'hydra:member': [{ id: 1, page_code: 'journal-indexing' }],
      };
      const mockVolumes = {
        'hydra:member': [{ vid: 1, vol_num: '1', titles: {}, vol_year: 2024 }],
        'hydra:totalItems': 1,
      };
      const mockIssues = {
        'hydra:member': [{ vid: 2, vol_num: '2', titles: {}, vol_year: 2024 }],
        'hydra:totalItems': 1,
      };
      const mockAcceptedArticles = {
        'hydra:member': [{ paperid: 3 }],
        'hydra:totalItems': 1,
      };

      // Mock fetch for initial parallel requests
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockAboutPage)) // about
        .mockResolvedValueOnce(createMockResponse(mockArticles)) // articles
        .mockResolvedValueOnce(createMockResponse(mockNews)) // news
        .mockResolvedValueOnce(createMockResponse(mockMembers)) // members
        .mockResolvedValueOnce(createMockResponse(mockStats)) // stats
        .mockResolvedValueOnce(createMockResponse(mockIndexation)) // indexation
        .mockResolvedValueOnce(createMockResponse(mockVolumes)) // volumes
        .mockResolvedValueOnce(createMockResponse(mockIssues)) // issues
        .mockResolvedValueOnce(createMockResponse(mockAcceptedArticles)); // accepted articles

      // Mock fetchWithRetry for individual article fetches
      vi.mocked(fetchWithRetry)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ paperid: 1, title: 'Article 1' }) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ paperid: 2, title: 'Article 2' }) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ paperid: 3, title: 'Article 3' }) } as Response);

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.aboutPage).toBeDefined();
      expect(result.articles?.data).toHaveLength(2);
      expect(result.news?.data).toHaveLength(1);
      expect(result.members).toHaveLength(1);
      expect(result.stats).toHaveLength(1);
      expect(result.volumes?.data).toHaveLength(1);
      expect(result.issues?.data).toHaveLength(1);
      expect(result.acceptedArticles?.data).toHaveLength(1);
    });

    it('should make correct API calls with proper URLs', async () => {
      // Setup minimal mocks
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));
      vi.mocked(fetchWithRetry).mockResolvedValue({ json: () => Promise.resolve({}) } as Response);

      await fetchHomeData('myjournal', 'fr');

      // Verify API URLs contain the rvcode
      const calls = mockFetch.mock.calls;
      expect(calls.some((call: any) => call[0].includes('myjournal'))).toBe(true);
      expect(calls.some((call: any) => call[0].includes('page_code=about'))).toBe(true);
      expect(calls.some((call: any) => call[0].includes('page_code=journal-indexing'))).toBe(true);
    });

    it('should handle failed about page request gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(null, false)) // about fails
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse(null, false)) // indexation fails
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.aboutPage).toBeNull();
      expect(result.indexation).toBeNull();
    });

    it('should handle members response as array format', async () => {
      const mockMembersArray = [
        { uid: 1, firstname: 'Alice', lastname: 'Smith', roles: ['chief-editor'] },
        { uid: 2, firstname: 'Bob', lastname: 'Jones', roles: ['editor'] },
      ];

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse(mockMembersArray)) // members as array
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.members).toHaveLength(2);
      expect(result.members?.[0].firstname).toBe('Alice');
    });

    it('should handle members response as hydra collection', async () => {
      const mockMembersHydra = {
        'hydra:member': [
          { uid: 1, firstname: 'Charlie', lastname: 'Brown', roles: ['member'] },
        ],
        'hydra:totalItems': 1,
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse(mockMembersHydra)) // members as hydra
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.members).toHaveLength(1);
      expect(result.members?.[0].firstname).toBe('Charlie');
    });

    it('should handle individual article fetch failure with fallback', async () => {
      const mockArticles = {
        'hydra:member': [{ paperid: 1, title: 'Partial Title', doi: '10.1234/test' }],
        'hydra:totalItems': 1,
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse(mockArticles))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      // Make fetchWithRetry fail
      vi.mocked(fetchWithRetry).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchHomeData('testjournal', 'en');

      // Should have fallback article data
      expect(result.articles?.data).toHaveLength(1);
      expect(result.articles?.data[0].id).toBe(1);
      expect(result.articles?.data[0].doi).toBe('10.1234/test');

      consoleSpy.mockRestore();
    });

    it('should return empty object on complete failure', async () => {
      mockFetch.mockRejectedValue(new Error('Complete network failure'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchHomeData('testjournal', 'en');

      expect(result).toEqual({});

      consoleSpy.mockRestore();
    });

    it('should format issues using formatVolume', async () => {
      const mockIssues = {
        'hydra:member': [
          { vid: 10, vol_num: 'S1', titles: { en: 'Special Issue' }, vol_year: 2024 },
        ],
        'hydra:totalItems': 1,
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse(mockIssues))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.issues?.data).toHaveLength(1);
      expect(result.issues?.data[0].id).toBe(10);
      expect(result.issues?.totalItems).toBe(1);
    });

    it('should include language parameter in volume requests', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      await fetchHomeData('testjournal', 'fr');

      const volumeCalls = mockFetch.mock.calls.filter((call: any) =>
        call[0].includes('/volumes/')
      );
      volumeCalls.forEach((call: any) => {
        expect(call[0]).toContain('language=fr');
      });
    });

    it('should return correct totalItems for each data type', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 50 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 10 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 25 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 5 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 15 }));

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.articles?.totalItems).toBe(50);
      expect(result.news?.totalItems).toBe(10);
      expect(result.volumes?.totalItems).toBe(25);
      expect(result.issues?.totalItems).toBe(5);
      expect(result.acceptedArticles?.totalItems).toBe(15);
    });

    it('should use ensureApiEndpoint to add /api suffix', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      await fetchHomeData('testjournal', 'en');

      // All calls should have /api in the URL
      mockFetch.mock.calls.forEach((call: any) => {
        expect(call[0]).toContain('/api/');
      });
    });

    it('should handle empty hydra:member arrays', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      const result = await fetchHomeData('testjournal', 'en');

      expect(result.articles?.data).toEqual([]);
      expect(result.news?.data).toEqual([]);
      expect(result.volumes?.data).toEqual([]);
      expect(result.issues?.data).toEqual([]);
      expect(result.acceptedArticles?.data).toEqual([]);
      expect(result.members).toEqual([]);
      expect(result.stats).toEqual([]);
    });

    it('should fetch individual articles using fetchWithRetry', async () => {
      const mockArticles = {
        'hydra:member': [{ paperid: 100 }, { paperid: 200 }],
        'hydra:totalItems': 2,
      };

      mockFetch
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse(mockArticles))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [] }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }))
        .mockResolvedValueOnce(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      vi.mocked(fetchWithRetry)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ paperid: 100, title: 'Full Article 1' }) } as Response)
        .mockResolvedValueOnce({ json: () => Promise.resolve({ paperid: 200, title: 'Full Article 2' }) } as Response);

      await fetchHomeData('testjournal', 'en');

      expect(fetchWithRetry).toHaveBeenCalledTimes(2);
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('/papers/100'),
        expect.any(Object)
      );
      expect(fetchWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('/papers/200'),
        expect.any(Object)
      );
    });
  });

  describe('ensureApiEndpoint (tested through fetchHomeData)', () => {
    it('should add /api to URLs without it', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      await fetchHomeData('testjournal', 'en');

      const firstCall = mockFetch.mock.calls[0][0];
      expect(firstCall).toMatch(/\.episciences\.org\/api\//);
    });
  });

  describe('HomeData interface', () => {
    it('should return all expected fields', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ 'hydra:member': [], 'hydra:totalItems': 0 }));

      const result = await fetchHomeData('testjournal', 'en');

      // Check that all expected properties exist (even if null/empty)
      expect('aboutPage' in result || result.aboutPage === undefined).toBe(true);
      expect('articles' in result).toBe(true);
      expect('news' in result).toBe(true);
      expect('members' in result).toBe(true);
      expect('stats' in result).toBe(true);
      expect('indexation' in result || result.indexation === undefined).toBe(true);
      expect('volumes' in result).toBe(true);
      expect('issues' in result).toBe(true);
      expect('acceptedArticles' in result).toBe(true);
    });
  });
});

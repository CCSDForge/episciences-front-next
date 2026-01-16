import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAuthors, fetchAuthorArticles } from '../author';

// Mock dependencies
vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.episciences.org`),
}));

vi.mock('../api.helper', () => ({
  apiCall: vi.fn(),
  fetchPaginatedResults: vi.fn(),
}));

import { apiCall } from '../api.helper';

describe('author service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAuthors', () => {
    it('should fetch authors with default parameters', async () => {
      const mockResponse = {
        'hydra:member': [
          { '@id': '/api/authors/1', values: { id: '1', name: 'John Doe', count: 5 } },
          { '@id': '/api/authors/2', values: { id: '2', name: 'Jane Smith', count: 3 } },
        ],
        'hydra:totalItems': 2,
        'hydra:range': { A: 10, B: 5 },
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      const result = await fetchAuthors({ rvcode: 'testjournal' });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('John Doe');
      expect(result.data[0].count).toBe(5);
      expect(result.totalItems).toBe(2);
      expect(result.range).toEqual({ A: 10, B: 5 });
      expect(result.rvcode).toBe('testjournal');
    });

    it('should include search parameter in request', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthors({
        rvcode: 'testjournal',
        search: 'Doe',
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.stringContaining('search=Doe'),
        expect.any(Object)
      );
    });

    it('should include letter parameter in request', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthors({
        rvcode: 'testjournal',
        letter: 'A',
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.stringContaining('letter=A'),
        expect.any(Object)
      );
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 100,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthors({
        rvcode: 'testjournal',
        page: 2,
        itemsPerPage: 20,
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.stringMatching(/page=2.*itemsPerPage=20/),
        expect.any(Object)
      );
    });

    it('should return empty data on error', async () => {
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('API Error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchAuthors({ rvcode: 'testjournal' });

      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.rvcode).toBe('testjournal');

      consoleSpy.mockRestore();
    });

    it('should use correct API headers', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthors({ rvcode: 'testjournal' });

      expect(apiCall).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Accept: 'application/ld+json' },
        })
      );
    });

    it('should transform author data correctly', async () => {
      const mockResponse = {
        'hydra:member': [
          {
            '@id': '/api/authors/john-doe',
            values: { id: 'john-doe', name: 'John Doe', count: 10 },
          },
        ],
        'hydra:totalItems': 1,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      const result = await fetchAuthors({ rvcode: 'testjournal' });

      expect(result.data[0]).toEqual({
        id: '/api/authors/john-doe',
        name: 'John Doe',
        count: 10,
      });
    });
  });

  describe('fetchAuthorArticles', () => {
    it('should fetch articles by author fullname', async () => {
      const mockResponse = {
        'hydra:member': [
          {
            paperid: 123,
            paper_title_t: ['Article Title 1'],
            publication_date_tdate: '2024-01-15',
            doi_s: '10.1234/test.1',
          },
          {
            paperid: 456,
            paper_title_t: ['Article Title 2'],
            publication_date_tdate: '2024-02-20',
          },
        ],
        'hydra:totalItems': 2,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      const result = await fetchAuthorArticles({
        rvcode: 'testjournal',
        fullname: 'John Doe',
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe(123);
      expect(result.data[0].title).toBe('Article Title 1');
      expect(result.data[0].publicationDate).toBe('2024-01-15');
      expect(result.data[0].doi).toBe('10.1234/test.1');
      expect(result.data[1].doi).toBeUndefined();
      expect(result.totalItems).toBe(2);
    });

    it('should construct correct API endpoint', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthorArticles({
        rvcode: 'testjournal',
        fullname: 'Jane Smith',
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.stringContaining('browse/authors-search/Jane Smith'),
        expect.any(Object)
      );
    });

    it('should include pagination=false parameter', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthorArticles({
        rvcode: 'testjournal',
        fullname: 'Test Author',
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.stringContaining('pagination=false'),
        expect.any(Object)
      );
    });

    it('should return empty data on error', async () => {
      vi.mocked(apiCall).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchAuthorArticles({
        rvcode: 'testjournal',
        fullname: 'Unknown Author',
      });

      expect(result.data).toEqual([]);
      expect(result.totalItems).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should use correct API headers', async () => {
      const mockResponse = {
        'hydra:member': [],
        'hydra:totalItems': 0,
      };

      vi.mocked(apiCall).mockResolvedValueOnce(mockResponse);

      await fetchAuthorArticles({
        rvcode: 'testjournal',
        fullname: 'Author Name',
      });

      expect(apiCall).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Accept: 'application/ld+json' },
        })
      );
    });
  });
});

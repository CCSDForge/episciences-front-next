import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllArticlesForSitemap, fetchAllVolumesForSitemap } from '../sitemap';

// Mock dependencies
vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn().mockReturnValue('https://api.mock.com'),
}));

vi.mock('@/utils/fetch-with-retry', () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from '@/utils/fetch-with-retry';

describe('Sitemap Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAllArticlesForSitemap', () => {
    it('should transform API response to sitemap format', async () => {
      const mockResponse = {
        'hydra:member': [
          { paperid: 101, modification_date: '2024-01-01', publication_date: '2023-12-31' },
          { paperid: 102, modification_date: null, publication_date: '2023-11-20' },
        ],
      };

      (fetchWithRetry as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllArticlesForSitemap('epijinfo');

      expect(result).toHaveLength(2);
      // Check priority of modification_date over publication_date
      expect(result[0]).toEqual({
        id: 101,
        updated_at: '2024-01-01',
        created_at: '2023-12-31',
      });
      // Check fallback to publication_date
      expect(result[1]).toEqual({
        id: 102,
        updated_at: '2023-11-20',
        created_at: '2023-11-20',
      });
    });

    it('should return empty array on API failure', async () => {
      (fetchWithRetry as any).mockResolvedValue({
        ok: false,
      });

      const result = await fetchAllArticlesForSitemap('epijinfo');
      expect(result).toEqual([]);
    });
  });

  describe('fetchAllVolumesForSitemap', () => {
    it('should transform API response to sitemap format', async () => {
      const mockResponse = {
        'hydra:member': [
          { vid: 1, date_updated: '2024-02-01', date_creation: '2024-01-01' },
        ],
      };

      (fetchWithRetry as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllVolumesForSitemap('epijinfo');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        updated_at: '2024-02-01',
        created_at: '2024-01-01',
      });
    });
  });
});

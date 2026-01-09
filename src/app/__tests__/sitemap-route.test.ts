import { describe, it, expect, vi } from 'vitest';
import sitemap from '../sites/[journalId]/sitemap';

// Mock services
vi.mock('@/services/sitemap', () => ({
  fetchAllArticlesForSitemap: vi.fn().mockResolvedValue([
    { id: 123, updated_at: '2024-01-01' }
  ]),
  fetchAllVolumesForSitemap: vi.fn().mockResolvedValue([
    { id: 456, updated_at: '2024-02-01' }
  ]),
}));

// Mock utils
vi.mock('@/utils/static-build', () => ({
  getJournalCode: vi.fn().mockReturnValue('epijinfo'),
}));

describe('Sitemap Generator Route', () => {
  it('should generate a comprehensive sitemap', async () => {
    const params = Promise.resolve({ journalId: 'epijinfo' });
    const result = await sitemap({ params });

    // 1. Check static pages
    const home = result.find(r => r.url === 'https://epijinfo.episciences.org');
    expect(home).toBeDefined();
    expect(home?.changeFrequency).toBe('daily');

    // 2. Check dynamic articles
    const article = result.find(r => r.url === 'https://epijinfo.episciences.org/articles/123');
    expect(article).toBeDefined();
    expect(article?.changeFrequency).toBe('monthly'); // As defined in implementation

    // 3. Check dynamic volumes
    const volume = result.find(r => r.url === 'https://epijinfo.episciences.org/volumes/456');
    expect(volume).toBeDefined();
    expect(volume?.changeFrequency).toBe('monthly');
  });
});

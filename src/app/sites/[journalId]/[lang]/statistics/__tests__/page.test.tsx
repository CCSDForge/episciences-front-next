import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/statistics', () => ({ fetchStatistics: vi.fn() }));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('@/utils/journal-filter', () => ({
  getFilteredJournals: vi.fn(() => ['epijinfo', 'jsat']),
}));

vi.mock('@/utils/language-utils', () => ({
  acceptedLanguages: ['en', 'fr'],
}));

vi.mock('./StatisticsClient', () => ({
  default: (props: any) => <div data-testid="statistics-client">{JSON.stringify(props)}</div>,
}));

import { fetchStatistics } from '@/services/statistics';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('StatisticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateStaticParams', () => {
    it('builds params for every journal x language combination', async () => {
      const { generateStaticParams } = await import('../page');
      const params = await generateStaticParams();

      expect(params).toEqual([
        { journalId: 'epijinfo', lang: 'en' },
        { journalId: 'epijinfo', lang: 'fr' },
        { journalId: 'jsat', lang: 'en' },
        { journalId: 'jsat', lang: 'fr' },
      ]);
    });
  });

  describe('generateMetadata', () => {
    it('returns translated title/description and seo alternates', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'fr'));

      expect(metadata.title).toBe('pages.statistics.title');
      expect(metadata.description).toBe('pages.statistics.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('builds initialStats from the raw stats array when the API returns data', async () => {
      const stats = [{ label: 'submissions', value: 10 }];
      vi.mocked(fetchStatistics).mockResolvedValue(stats as never);

      const { default: StatisticsPage } = await import('../page');
      const jsx = await StatisticsPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('submissions');
      expect(serialized).toContain('"hydra:totalItems":1');
      expect(serialized).toContain('"totalItems":1');
      expect(fetchStatistics).toHaveBeenCalledWith({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 7,
      });
    });

    it('leaves initialStats undefined when journalId is missing', async () => {
      const { default: StatisticsPage } = await import('../page');
      const jsx = await StatisticsPage(makeProps(''));

      expect(fetchStatistics).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).not.toContain('"initialStats"');
    });

    it('leaves initialStats undefined when the API call throws', async () => {
      vi.mocked(fetchStatistics).mockRejectedValue(new Error('network down'));

      const { default: StatisticsPage } = await import('../page');
      const jsx = await StatisticsPage(makeProps());

      expect(JSON.stringify(jsx)).not.toContain('"initialStats"');
    });
  });
});

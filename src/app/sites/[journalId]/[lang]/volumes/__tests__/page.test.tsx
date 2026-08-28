import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FetchVolumesResult } from '@/services/volume';

vi.mock('@/services/volume', () => ({ fetchVolumes: vi.fn() }));

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

vi.mock('./VolumesClient', () => ({
  default: (props: any) => <div data-testid="volumes-client">{JSON.stringify(props)}</div>,
}));

import { fetchVolumes } from '@/services/volume';

function emptyResult(): FetchVolumesResult {
  return { data: [], totalItems: 0, articlesCount: 0, range: { types: [], years: [] } };
}

/** Sets up fetchVolumes to return `main` for the requested page and `fullRange` for the itemsPerPage=250 facet call. */
function mockFetchVolumes(main: FetchVolumesResult, fullRange: FetchVolumesResult) {
  vi.mocked(fetchVolumes).mockImplementation(async params => {
    if (params.itemsPerPage === 250) return fullRange;
    return main;
  });
}

function makeProps(
  journalId = 'epijinfo',
  lang = 'en',
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  return {
    params: Promise.resolve({ journalId, lang }),
    searchParams: Promise.resolve(searchParams),
  };
}

describe('VolumesPage', () => {
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

      expect(metadata.title).toBe('pages.volumes.title');
      expect(metadata.description).toBe('pages.volumes.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('throws when journalId is missing', async () => {
      const { default: VolumesPage } = await import('../page');

      await expect(VolumesPage(makeProps(''))).rejects.toThrow('journalId is not defined');
      expect(fetchVolumes).not.toHaveBeenCalled();
    });

    it('rethrows when fetchVolumes rejects', async () => {
      vi.mocked(fetchVolumes).mockRejectedValue(new Error('network down'));

      const { default: VolumesPage } = await import('../page');

      await expect(VolumesPage(makeProps())).rejects.toThrow('network down');
    });

    it('parses page/type/years from searchParams and forwards them to fetchVolumes', async () => {
      mockFetchVolumes(emptyResult(), emptyResult());

      const { default: VolumesPage } = await import('../page');
      await VolumesPage(
        makeProps('epijinfo', 'en', { page: '3', type: 'proceedings', years: '2020' })
      );

      expect(fetchVolumes).toHaveBeenCalledWith(
        expect.objectContaining({
          rvcode: 'epijinfo',
          page: 3,
          itemsPerPage: 20,
          types: ['proceedings'],
          years: [2020],
        })
      );
      // Facet call always uses page 1 / 250 items / no filters
      expect(fetchVolumes).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, itemsPerPage: 250, types: [], years: [] })
      );
    });

    it('accepts type and years as arrays', async () => {
      mockFetchVolumes(emptyResult(), emptyResult());

      const { default: VolumesPage } = await import('../page');
      await VolumesPage(
        makeProps('epijinfo', 'en', {
          type: ['proceedings', 'special_issue'],
          years: ['2019', '2021'],
        })
      );

      expect(fetchVolumes).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['proceedings', 'special_issue'],
          years: [2019, 2021],
        })
      );
    });

    it('filters out non-numeric years and falls back to page 1 for invalid/absent page params', async () => {
      mockFetchVolumes(emptyResult(), emptyResult());

      const { default: VolumesPage } = await import('../page');
      await VolumesPage(makeProps('epijinfo', 'en', { page: 'not-a-number', years: 'abc' }));

      expect(fetchVolumes).toHaveBeenCalledWith(expect.objectContaining({ page: 1, years: [] }));
    });

    it('falls back to page 1 when the page param is 0 or negative', async () => {
      mockFetchVolumes(emptyResult(), emptyResult());

      const { default: VolumesPage } = await import('../page');
      await VolumesPage(makeProps('epijinfo', 'en', { page: '0' }));

      expect(fetchVolumes).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });

    it('prefers fullRangeData totals over volumesData totals when not filtering', async () => {
      const main: FetchVolumesResult = {
        data: [],
        totalItems: 10,
        articlesCount: 5,
        range: { types: [], years: [] },
      };
      const fullRange: FetchVolumesResult = {
        data: [],
        totalItems: 50,
        articlesCount: 30,
        range: { types: ['proceedings'], years: [2020, 2021] },
      };
      mockFetchVolumes(main, fullRange);

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(makeProps());

      const str = JSON.stringify(jsx);
      expect(str).toContain('"totalItems":50');
      expect(str).toContain('"articlesCount":30');
      expect(str).toContain('"types":["proceedings"]');
      expect(str).toContain('"years":[2020,2021]');
    });

    it('trusts volumesData totals over fullRangeData when filtering is active', async () => {
      const main: FetchVolumesResult = {
        data: [],
        totalItems: 3,
        articlesCount: 2,
        range: { types: ['proceedings'], years: [2022] },
      };
      const fullRange: FetchVolumesResult = {
        data: [],
        totalItems: 999,
        articlesCount: 999,
        range: { types: [], years: [] },
      };
      mockFetchVolumes(main, fullRange);

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(makeProps('epijinfo', 'en', { type: 'proceedings' }));

      const str = JSON.stringify(jsx);
      expect(str).toContain('"totalItems":3');
      expect(str).toContain('"articlesCount":2');
      // range types fall back to volumesData.range.types since fullRangeData.range.types is empty
      expect(str).toContain('"types":["proceedings"]');
    });

    it('falls back to countUniqueArticles using fullRangeData.data when articlesCount is 0 and not filtering', async () => {
      const main: FetchVolumesResult = {
        data: [{ id: 1, articles: [{ paperid: 100 }, { paperid: 101 }] } as never],
        totalItems: 1,
        articlesCount: 0,
        range: { types: [], years: [] },
      };
      const fullRange: FetchVolumesResult = {
        data: [
          { id: 1, articles: [{ paperid: 100 }, { paperid: 101 }] } as never,
          { id: 2, articles: [{ paperid: 102 }] } as never,
        ],
        totalItems: 2,
        articlesCount: 0,
        range: { types: [], years: [] },
      };
      mockFetchVolumes(main, fullRange);

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(makeProps());

      // 3 unique paper ids across the larger fullRangeData.data set
      expect(JSON.stringify(jsx)).toContain('"articlesCount":3');
    });

    it('falls back to countUniqueArticles using volumesData.data directly when filtering', async () => {
      const main: FetchVolumesResult = {
        data: [{ id: 1, articles: [{ paperid: 200 }, { paperid: 201 }] } as never],
        totalItems: 1,
        articlesCount: 0,
        range: { types: ['special_issue'], years: [] },
      };
      const fullRange: FetchVolumesResult = {
        data: [
          { id: 1, articles: [{ paperid: 1 }] } as never,
          { id: 2, articles: [{ paperid: 2 }] } as never,
          { id: 3, articles: [{ paperid: 3 }] } as never,
        ],
        totalItems: 3,
        articlesCount: 0,
        range: { types: [], years: [] },
      };
      mockFetchVolumes(main, fullRange);

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(makeProps('epijinfo', 'en', { type: 'special_issue' }));

      // While filtering, only volumesData.data (2 unique ids) should be counted, not fullRangeData.data
      expect(JSON.stringify(jsx)).toContain('"articlesCount":2');
    });

    it('derives years from fullRangeData.data when hydra:range years are absent', async () => {
      const main = emptyResult();
      const fullRange: FetchVolumesResult = {
        data: [
          { id: 1, year: 2021, articles: [] } as never,
          { id: 2, year: 2019, articles: [] } as never,
          { id: 3, year: 2021, articles: [] } as never,
        ],
        totalItems: 3,
        articlesCount: 0,
        range: { types: [], years: [] },
      };
      mockFetchVolumes(main, fullRange);

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(makeProps());

      // Deduplicated + sorted descending
      expect(JSON.stringify(jsx)).toContain('"years":[2021,2019]');
    });

    it('returns empty years when both hydra:range and fullRangeData.data are empty', async () => {
      mockFetchVolumes(emptyResult(), emptyResult());

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"years":[]');
    });

    it('passes lang, journalId, validPage, types and years through to VolumesClient', async () => {
      mockFetchVolumes(emptyResult(), emptyResult());

      const { default: VolumesPage } = await import('../page');
      const jsx = await VolumesPage(
        makeProps('epijinfo', 'fr', { page: '2', type: 'proceedings', years: '2020' })
      );

      const str = JSON.stringify(jsx);
      expect(str).toContain('"initialPage":2');
      expect(str).toContain('"initialTypes":["proceedings"]');
      expect(str).toContain('"initialYears":[2020]');
      expect(str).toContain('"lang":"fr"');
      expect(str).toContain('"journalId":"epijinfo"');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/section', () => ({ fetchSections: vi.fn() }));

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

vi.mock('./SectionsClient', () => ({
  default: (props: any) => <div data-testid="sections-client">{JSON.stringify(props)}</div>,
}));

import { fetchSections } from '@/services/section';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('SectionsPage', () => {
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

      expect(metadata.title).toBe('pages.sections.title');
      expect(metadata.description).toBe('pages.sections.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders SectionsClient with the fetched sections', async () => {
      vi.mocked(fetchSections).mockResolvedValue({
        data: [{ id: 1, title: { en: 'Section 1' } }],
        totalItems: 1,
        articlesCount: 5,
      } as never);

      const { default: SectionsPage } = await import('../page');
      const jsx = await SectionsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Section 1');
    });

    it('renders SectionsClient with an empty list when the API returns none', async () => {
      vi.mocked(fetchSections).mockResolvedValue({
        data: [],
        totalItems: 0,
        articlesCount: 0,
      } as never);

      const { default: SectionsPage } = await import('../page');
      const jsx = await SectionsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialSections":{"data":[]');
    });

    it('throws when journalId is missing', async () => {
      const { default: SectionsPage } = await import('../page');
      await expect(SectionsPage(makeProps(''))).rejects.toThrow('journalId is not defined');
      expect(fetchSections).not.toHaveBeenCalled();
    });

    it('rethrows when fetchSections rejects', async () => {
      vi.mocked(fetchSections).mockRejectedValue(new Error('network down'));

      const { default: SectionsPage } = await import('../page');
      await expect(SectionsPage(makeProps())).rejects.toThrow('network down');
    });

    it('calls fetchSections with the journal rvcode from route params', async () => {
      vi.mocked(fetchSections).mockResolvedValue({
        data: [],
        totalItems: 0,
        articlesCount: 0,
      } as never);

      const { default: SectionsPage } = await import('../page');
      await SectionsPage(makeProps('jsat', 'en'));

      expect(fetchSections).toHaveBeenCalledWith({ rvcode: 'jsat' });
    });
  });
});

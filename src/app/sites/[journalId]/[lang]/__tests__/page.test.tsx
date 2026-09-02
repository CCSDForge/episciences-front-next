import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/home', () => ({ fetchHomeData: vi.fn() }));
vi.mock('@/services/journal', () => ({ getJournalByCode: vi.fn() }));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('@/utils/language-utils', () => ({
  acceptedLanguages: ['en', 'fr'],
}));

vi.mock('@/utils/journal-filter', () => ({
  getFilteredJournals: vi.fn(() => ['epijinfo', 'jsat']),
}));

vi.mock('@/utils/env-loader', () => ({
  getPublicJournalConfig: vi.fn(() => ({ NEXT_PUBLIC_FOO: 'bar' })),
}));

vi.mock('@/components/HomeClient/HomeClient', () => ({
  default: (props: any) => <div data-testid="home-client">{JSON.stringify(props)}</div>,
}));

import { fetchHomeData } from '@/services/home';
import { getJournalByCode } from '@/services/journal';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('HomePage', () => {
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
    it('uses the journal title in the current language when available', async () => {
      vi.mocked(getJournalByCode).mockResolvedValue({
        name: 'Fallback Name',
        title: { en: 'Journal Title EN', fr: 'Titre du journal FR' },
      } as never);

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'fr'));

      expect(metadata.title).toBe('pages.home.title | Titre du journal FR');
      expect(metadata.description).toBe('pages.home.metaDescription');
      expect(metadata.alternates).toBeDefined();
    });

    it('falls back to journal.name when no title exists for the language', async () => {
      vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Fallback Name' } as never);

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps());

      expect(metadata.title).toBe('pages.home.title | Fallback Name');
    });

    it('falls back to "Episciences" when getJournalByCode rejects', async () => {
      vi.mocked(getJournalByCode).mockRejectedValue(new Error('journal api down'));

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps());

      expect(metadata.title).toBe('pages.home.title | Episciences');
    });
  });

  describe('default export', () => {
    it('renders HomeClient with homeData, language, journalId and journalConfig', async () => {
      vi.mocked(fetchHomeData).mockResolvedValue({
        articles: { data: [{ id: 1, title: 'Home article' }], totalItems: 1 },
      } as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ name: 'My Journal' } as never);

      const { default: HomePage } = await import('../page');
      const jsx = await HomePage(makeProps('epijinfo', 'fr'));

      const str = JSON.stringify(jsx);
      expect(str).toContain('Home article');
      expect(str).toContain('"language":"fr"');
      expect(str).toContain('"journalId":"epijinfo"');
      expect(str).toContain('"NEXT_PUBLIC_FOO":"bar"');
    });

    it('defaults language to "fr" when lang param is missing', async () => {
      vi.mocked(fetchHomeData).mockResolvedValue({} as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ name: 'My Journal' } as never);

      const { default: HomePage } = await import('../page');
      const jsx = await HomePage({ params: Promise.resolve({ journalId: 'epijinfo', lang: '' }) });

      expect(JSON.stringify(jsx)).toContain('"language":"fr"');
    });

    it('falls back to an empty homeData object (without throwing) when fetchHomeData rejects', async () => {
      vi.mocked(fetchHomeData).mockRejectedValue(new Error('home backend down'));
      vi.mocked(getJournalByCode).mockResolvedValue({ name: 'My Journal' } as never);

      const { default: HomePage } = await import('../page');
      const jsx = await HomePage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"homeData":{}');
    });

    it('omits JsonLd and still renders HomeClient when getJournalByCode rejects', async () => {
      vi.mocked(fetchHomeData).mockResolvedValue({} as never);
      vi.mocked(getJournalByCode).mockRejectedValue(new Error('journal api down'));

      const { default: HomePage } = await import('../page');
      const jsx = await HomePage(makeProps());

      const str = JSON.stringify(jsx);
      expect(str).not.toContain('"@type":"WebSite"');
      expect(str).toContain('"journalId":"epijinfo"');
    });

    it('includes JsonLd homepage schema when the journal is found', async () => {
      vi.mocked(fetchHomeData).mockResolvedValue({} as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ name: 'My Journal' } as never);

      const { default: HomePage } = await import('../page');
      const jsx = await HomePage(makeProps());

      const str = JSON.stringify(jsx);
      expect(str).toContain('"@type":"WebSite"');
      expect(str).toContain('"name":"My Journal"');
    });
  });
});

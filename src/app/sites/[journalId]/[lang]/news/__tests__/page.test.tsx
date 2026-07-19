import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/news', () => ({ fetchNews: vi.fn() }));

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

vi.mock('./NewsClient', () => ({
  default: (props: any) => <div data-testid="news-client">{JSON.stringify(props)}</div>,
}));

import { fetchNews } from '@/services/news';
import { getServerTranslations } from '@/utils/server-i18n';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('NewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // vi.clearAllMocks() does not undo a mockRejectedValue/mockImplementation swap
    // from a previous test, so restore the default resolved behavior explicitly.
    vi.mocked(getServerTranslations).mockResolvedValue({});
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

      expect(metadata.title).toBe('pages.news.title');
      expect(metadata.description).toBe('pages.news.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders NewsClient with the fetched news on success', async () => {
      vi.mocked(fetchNews).mockResolvedValue({
        data: [{ id: 1, title: { en: 'Breaking news' } }],
        totalItems: 1,
      } as never);

      const { default: NewsPage } = await import('../page');
      const jsx = await NewsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Breaking news');
    });

    it('falls back to null news data (without throwing) when fetchNews rejects', async () => {
      vi.mocked(fetchNews).mockRejectedValue(new Error('news backend down'));

      const { default: NewsPage } = await import('../page');
      const jsx = await NewsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialNews":null');
    });

    it('still renders the already-fetched news when getServerTranslations rejects', async () => {
      vi.mocked(fetchNews).mockResolvedValue({
        data: [{ id: 1, title: { en: 'Breaking news' } }],
        totalItems: 1,
      } as never);
      vi.mocked(getServerTranslations).mockRejectedValue(new Error('i18n backend down'));

      const { default: NewsPage } = await import('../page');
      const jsx = await NewsPage(makeProps());

      // A translations failure must not discard news data that already fetched successfully.
      expect(JSON.stringify(jsx)).toContain('Breaking news');
    });

    it('calls fetchNews with the journal rvcode from route params', async () => {
      vi.mocked(fetchNews).mockResolvedValue({ data: [], totalItems: 0 } as never);

      const { default: NewsPage } = await import('../page');
      await NewsPage(makeProps('jsat', 'en'));

      expect(fetchNews).toHaveBeenCalledWith({ rvcode: 'jsat' });
    });
  });
});

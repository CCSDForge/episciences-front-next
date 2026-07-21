import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/article', () => ({ fetchArticles: vi.fn() }));

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

vi.mock('./ArticlesClient', () => ({
  default: (props: any) => <div data-testid="articles-client">{JSON.stringify(props)}</div>,
}));

import { fetchArticles } from '@/services/article';

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

describe('ArticlesPage', () => {
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

      expect(metadata.title).toBe('pages.articles.title');
      expect(metadata.description).toBe('pages.articles.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders ArticlesClient with formatted articles on success', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: [{ id: 1, title: 'Article 1' }],
        totalItems: 42,
        range: { years: [2020, 2021], types: ['research-article'] },
      } as never);

      const { default: ArticlesPage } = await import('../page');
      const jsx = await ArticlesPage(makeProps());

      const str = JSON.stringify(jsx);
      expect(str).toContain('Article 1');
      expect(str).toContain('"totalItems":42');
      expect(str).toContain('"years":[2020,2021]');
      expect(str).toContain('"types":["research-article"]');
    });

    it('defaults non-array data/range fields defensively', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: undefined,
        totalItems: undefined,
        range: undefined,
      } as never);

      const { default: ArticlesPage } = await import('../page');
      const jsx = await ArticlesPage(makeProps());

      const str = JSON.stringify(jsx);
      expect(str).toContain('"data":[]');
      expect(str).toContain('"totalItems":0');
      expect(str).toContain('"years":[]');
      expect(str).toContain('"types":[]');
    });

    it('falls back to an empty state and does not throw when journalId is missing', async () => {
      const { default: ArticlesPage } = await import('../page');
      const jsx = await ArticlesPage(makeProps(''));

      expect(fetchArticles).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"totalItems":0');
    });

    it('falls back to an empty state and does not throw when fetchArticles rejects', async () => {
      vi.mocked(fetchArticles).mockRejectedValue(new Error('network down'));

      const { default: ArticlesPage } = await import('../page');
      const jsx = await ArticlesPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"totalItems":0');
    });

    it('forwards the requested page number to fetchArticles', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: [],
        totalItems: 0,
        range: undefined,
      } as never);

      const { default: ArticlesPage } = await import('../page');
      await ArticlesPage(makeProps('epijinfo', 'en', { page: '3' }));

      expect(fetchArticles).toHaveBeenCalledWith(
        expect.objectContaining({ rvcode: 'epijinfo', page: 3, itemsPerPage: 20 })
      );
    });

    it('defaults to page 1 when no page param is provided', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: [],
        totalItems: 0,
        range: undefined,
      } as never);

      const { default: ArticlesPage } = await import('../page');
      await ArticlesPage(makeProps());

      expect(fetchArticles).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });

    it('falls back to page 1 (not NaN) when the page param is not numeric', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: [],
        totalItems: 0,
        range: undefined,
      } as never);

      const { default: ArticlesPage } = await import('../page');
      await ArticlesPage(makeProps('epijinfo', 'en', { page: 'abc' }));

      expect(fetchArticles).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });
  });
});

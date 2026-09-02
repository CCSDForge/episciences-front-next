import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/article', () => ({ fetchArticles: vi.fn() }));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./ArticlesAcceptedClient', () => ({
  default: (props: any) => (
    <div data-testid="articles-accepted-client">{JSON.stringify(props)}</div>
  ),
}));

import { fetchArticles } from '@/services/article';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('ArticlesAcceptedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns translated title/description and seo alternates', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'fr'));

      expect(metadata.title).toBe('pages.articlesAccepted.title');
      expect(metadata.description).toBe('pages.articlesAccepted.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders ArticlesAcceptedClient with formatted articles/range when the API returns data', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: [{ id: 1, title: 'Accepted paper' }],
        totalItems: 1,
        range: { types: ['research-article'], years: [2026] },
      } as never);

      const { default: ArticlesAcceptedPage } = await import('../page');
      const jsx = await ArticlesAcceptedPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('Accepted paper');
      expect(serialized).toContain('"totalItems":1');
      expect(serialized).toContain('research-article');
      expect(fetchArticles).toHaveBeenCalledWith({
        rvcode: 'epijinfo',
        page: 1,
        itemsPerPage: 10,
        onlyAccepted: true,
        types: [],
      });
    });

    it('defaults range types/years to empty arrays when the service omits them', async () => {
      vi.mocked(fetchArticles).mockResolvedValue({
        data: null,
        totalItems: undefined,
        range: undefined,
      } as never);

      const { default: ArticlesAcceptedPage } = await import('../page');
      const jsx = await ArticlesAcceptedPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('"data":[]');
      expect(serialized).toContain('"totalItems":0');
      expect(serialized).toContain('"types":[]');
      expect(serialized).toContain('"years":[]');
    });

    it('renders ArticlesAcceptedClient with an empty fallback when journalId is missing', async () => {
      const { default: ArticlesAcceptedPage } = await import('../page');
      const jsx = await ArticlesAcceptedPage(makeProps(''));

      expect(fetchArticles).not.toHaveBeenCalled();
      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('"initialArticles":{"data":[],"totalItems":0}');
      expect(serialized).toContain('"initialRange":{"types":[],"years":[]}');
    });

    it('renders ArticlesAcceptedClient with an empty fallback when the API call throws', async () => {
      vi.mocked(fetchArticles).mockRejectedValue(new Error('network down'));

      const { default: ArticlesAcceptedPage } = await import('../page');
      const jsx = await ArticlesAcceptedPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('"initialArticles":{"data":[],"totalItems":0}');
      expect(serialized).toContain('"initialRange":{"types":[],"years":[]}');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/indexing', () => ({ fetchIndexingPage: vi.fn() }));

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

vi.mock('./IndexingClient', () => ({
  default: (props: any) => <div data-testid="indexing-client">{JSON.stringify(props)}</div>,
}));

import { fetchIndexingPage } from '@/services/indexing';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('IndexingPage', () => {
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

      expect(metadata.title).toBe('pages.indexing.title');
      expect(metadata.description).toBe('pages.indexing.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders IndexingClient with the page returned directly by the service (no hydra:member wrapping)', async () => {
      vi.mocked(fetchIndexingPage).mockResolvedValue({
        content: { en: 'Indexing databases list' },
      } as never);

      const { default: IndexingPage } = await import('../page');
      const jsx = await IndexingPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Indexing databases list');
    });

    it('renders IndexingClient with null page data when the service resolves null', async () => {
      vi.mocked(fetchIndexingPage).mockResolvedValue(null);

      const { default: IndexingPage } = await import('../page');
      const jsx = await IndexingPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders IndexingClient with null page data when the service call throws', async () => {
      vi.mocked(fetchIndexingPage).mockRejectedValue(new Error('network down'));

      const { default: IndexingPage } = await import('../page');
      const jsx = await IndexingPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('skips fetching when journalId is missing', async () => {
      const { default: IndexingPage } = await import('../page');
      const jsx = await IndexingPage(makeProps(''));

      expect(fetchIndexingPage).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/forAuthors', () => ({ fetchEthicalCharterPage: vi.fn() }));

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

vi.mock('./EthicalCharterClient', () => ({
  default: (props: any) => <div data-testid="ethical-charter-client">{JSON.stringify(props)}</div>,
}));

import { fetchEthicalCharterPage } from '@/services/forAuthors';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('EthicalCharterPage', () => {
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

      expect(metadata.title).toBe('pages.ethicalCharter.title');
      expect(metadata.description).toBe('pages.ethicalCharter.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders EthicalCharterClient with the page returned directly by the service (no hydra:member wrapping)', async () => {
      vi.mocked(fetchEthicalCharterPage).mockResolvedValue({
        content: { en: 'Ethical charter body' },
      } as never);

      const { default: EthicalCharterPage } = await import('../page');
      const jsx = await EthicalCharterPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Ethical charter body');
    });

    it('renders EthicalCharterClient with null page data when the service resolves null', async () => {
      vi.mocked(fetchEthicalCharterPage).mockResolvedValue(null);

      const { default: EthicalCharterPage } = await import('../page');
      const jsx = await EthicalCharterPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders EthicalCharterClient with null page data when the service call throws', async () => {
      vi.mocked(fetchEthicalCharterPage).mockRejectedValue(new Error('network down'));

      const { default: EthicalCharterPage } = await import('../page');
      const jsx = await EthicalCharterPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('skips fetching when journalId is missing', async () => {
      const { default: EthicalCharterPage } = await import('../page');
      const jsx = await EthicalCharterPage(makeProps(''));

      expect(fetchEthicalCharterPage).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

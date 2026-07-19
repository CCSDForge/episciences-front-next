import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/credits', () => ({ fetchCreditsPage: vi.fn() }));

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

vi.mock('./CreditsClient', () => ({
  default: (props: any) => <div data-testid="credits-client">{JSON.stringify(props)}</div>,
}));

import { fetchCreditsPage } from '@/services/credits';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('CreditsPage', () => {
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

      expect(metadata.title).toBe('pages.credits.title');
      expect(metadata.description).toBe('pages.credits.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders CreditsClient with the "creditsPage" prop populated directly from the service (no hydra:member wrapping)', async () => {
      vi.mocked(fetchCreditsPage).mockResolvedValue({
        content: { en: 'Site built with Next.js' },
      } as never);

      const { default: CreditsPage } = await import('../page');
      const jsx = await CreditsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Site built with Next.js');
      expect(JSON.stringify(jsx)).toContain('"creditsPage"');
    });

    it('renders CreditsClient with null creditsPage when the service resolves null', async () => {
      vi.mocked(fetchCreditsPage).mockResolvedValue(null);

      const { default: CreditsPage } = await import('../page');
      const jsx = await CreditsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"creditsPage":null');
    });

    it('renders CreditsClient with null creditsPage when the service call throws', async () => {
      vi.mocked(fetchCreditsPage).mockRejectedValue(new Error('network down'));

      const { default: CreditsPage } = await import('../page');
      const jsx = await CreditsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"creditsPage":null');
    });

    it('skips fetching when journalId is missing', async () => {
      const { default: CreditsPage } = await import('../page');
      const jsx = await CreditsPage(makeProps(''));

      expect(fetchCreditsPage).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"creditsPage":null');
    });
  });
});

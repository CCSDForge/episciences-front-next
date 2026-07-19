import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/about', () => ({ fetchAboutPage: vi.fn() }));

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

vi.mock('./AboutClient', () => ({
  default: (props: any) => <div data-testid="about-client">{JSON.stringify(props)}</div>,
}));

import { fetchAboutPage } from '@/services/about';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('AboutPage', () => {
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

      expect(metadata.title).toBe('pages.about.title');
      expect(metadata.description).toBe('pages.about.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders AboutClient with page data when the API returns content', async () => {
      vi.mocked(fetchAboutPage).mockResolvedValue({
        'hydra:member': [{ content: { en: 'About us' }, date_updated: '2026-01-01' }],
      } as never);

      const { default: AboutPage } = await import('../page');
      const jsx = await AboutPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('About us');
    });

    it('renders AboutClient with null page data when the API returns no content', async () => {
      vi.mocked(fetchAboutPage).mockResolvedValue({ 'hydra:member': [] } as never);

      const { default: AboutPage } = await import('../page');
      const jsx = await AboutPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders AboutClient with null page data when the API call throws', async () => {
      vi.mocked(fetchAboutPage).mockRejectedValue(new Error('network down'));

      const { default: AboutPage } = await import('../page');
      const jsx = await AboutPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('skips fetching when journalId is missing', async () => {
      const { default: AboutPage } = await import('../page');
      const jsx = await AboutPage(makeProps(''));

      expect(fetchAboutPage).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/acknowledgements', () => ({ fetchAcknowledgementsPage: vi.fn() }));

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

vi.mock('./AcknowledgementsClient', () => ({
  default: (props: any) => (
    <div data-testid="acknowledgements-client">{JSON.stringify(props)}</div>
  ),
}));

import { fetchAcknowledgementsPage } from '@/services/acknowledgements';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('AcknowledgementsPage', () => {
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

      expect(metadata.title).toBe('pages.acknowledgements.title');
      expect(metadata.description).toBe('pages.acknowledgements.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders AcknowledgementsClient with page data when the API returns content', async () => {
      vi.mocked(fetchAcknowledgementsPage).mockResolvedValue({
        'hydra:member': [{ content: { en: 'Thanks to our reviewers' } }],
      } as never);

      const { default: AcknowledgementsPage } = await import('../page');
      const jsx = await AcknowledgementsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Thanks to our reviewers');
    });

    it('renders AcknowledgementsClient with null page data when the API returns no content', async () => {
      vi.mocked(fetchAcknowledgementsPage).mockResolvedValue({ 'hydra:member': [] } as never);

      const { default: AcknowledgementsPage } = await import('../page');
      const jsx = await AcknowledgementsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders AcknowledgementsClient with null page data when the API call throws', async () => {
      vi.mocked(fetchAcknowledgementsPage).mockRejectedValue(new Error('network down'));

      const { default: AcknowledgementsPage } = await import('../page');
      const jsx = await AcknowledgementsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('skips fetching when journalId is missing', async () => {
      const { default: AcknowledgementsPage } = await import('../page');
      const jsx = await AcknowledgementsPage(makeProps(''));

      expect(fetchAcknowledgementsPage).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

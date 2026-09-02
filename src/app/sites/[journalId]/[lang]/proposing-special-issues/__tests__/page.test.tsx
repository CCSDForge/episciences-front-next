import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/proposingSpecialIssues', () => ({
  fetchProposingSpecialIssuesPage: vi.fn(),
}));

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

vi.mock('./ProposingSpecialIssuesClient', () => ({
  default: (props: any) => (
    <div data-testid="proposing-special-issues-client">{JSON.stringify(props)}</div>
  ),
}));

import { fetchProposingSpecialIssuesPage } from '@/services/proposingSpecialIssues';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('ProposingSpecialIssuesPage', () => {
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

      expect(metadata.title).toBe('pages.proposingSpecialIssues.title');
      expect(metadata.description).toBe('pages.proposingSpecialIssues.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders ProposingSpecialIssuesClient with the page returned directly by the service (no hydra:member wrapping)', async () => {
      vi.mocked(fetchProposingSpecialIssuesPage).mockResolvedValue({
        content: { en: 'How to propose a special issue' },
      } as never);

      const { default: ProposingSpecialIssuesPage } = await import('../page');
      const jsx = await ProposingSpecialIssuesPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('How to propose a special issue');
    });

    it('renders ProposingSpecialIssuesClient with null page data when the service resolves null', async () => {
      vi.mocked(fetchProposingSpecialIssuesPage).mockResolvedValue(null);

      const { default: ProposingSpecialIssuesPage } = await import('../page');
      const jsx = await ProposingSpecialIssuesPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders ProposingSpecialIssuesClient with null page data when the service call throws', async () => {
      vi.mocked(fetchProposingSpecialIssuesPage).mockRejectedValue(new Error('network down'));

      const { default: ProposingSpecialIssuesPage } = await import('../page');
      const jsx = await ProposingSpecialIssuesPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('skips fetching when journalId is missing', async () => {
      const { default: ProposingSpecialIssuesPage } = await import('../page');
      const jsx = await ProposingSpecialIssuesPage(makeProps(''));

      expect(fetchProposingSpecialIssuesPage).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

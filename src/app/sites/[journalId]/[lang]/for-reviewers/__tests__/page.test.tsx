import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/forReviewers', () => ({ fetchForReviewersPage: vi.fn() }));

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

vi.mock('@/utils/env-loader', () => ({
  getPublicJournalConfig: vi.fn(() => ({})),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    const error = new Error('NEXT_NOT_FOUND') as Error & { digest: string };
    error.digest = 'NEXT_NOT_FOUND';
    throw error;
  }),
}));

vi.mock('./ForReviewersClient', () => ({
  default: (props: any) => <div data-testid="for-reviewers-client">{JSON.stringify(props)}</div>,
}));

import { fetchForReviewersPage } from '@/services/forReviewers';
import { getPublicJournalConfig } from '@/utils/env-loader';
import { notFound } from 'next/navigation';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('ForReviewersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicJournalConfig).mockReturnValue({});
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

      expect(metadata.title).toBe('pages.forReviewers.title');
      expect(metadata.description).toBe('pages.forReviewers.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('calls notFound when the menu entry is explicitly disabled', async () => {
      vi.mocked(getPublicJournalConfig).mockReturnValue({
        NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_REVIEWERS_RENDER: 'false',
      });

      const { default: ForReviewersPage } = await import('../page');

      await expect(ForReviewersPage(makeProps())).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(fetchForReviewersPage).not.toHaveBeenCalled();
    });

    it('renders ForReviewersClient by default (menu entry enabled unless explicitly false)', async () => {
      vi.mocked(fetchForReviewersPage).mockResolvedValue({
        'hydra:member': [{ content: { en: 'For reviewers' } }],
      } as never);

      const { default: ForReviewersPage } = await import('../page');
      const jsx = await ForReviewersPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('For reviewers');
    });

    it('renders ForReviewersClient with null page data when the API returns no content', async () => {
      vi.mocked(fetchForReviewersPage).mockResolvedValue({ 'hydra:member': [] } as never);

      const { default: ForReviewersPage } = await import('../page');
      const jsx = await ForReviewersPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders ForReviewersClient with null page data when the API call throws', async () => {
      vi.mocked(fetchForReviewersPage).mockRejectedValue(new Error('network down'));

      const { default: ForReviewersPage } = await import('../page');
      const jsx = await ForReviewersPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

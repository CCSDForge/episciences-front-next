import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/forConferenceOrganisers', () => ({
  fetchForConferenceOrganisersPage: vi.fn(),
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

vi.mock('./ForConferenceOrganisersClient', () => ({
  default: (props: any) => (
    <div data-testid="for-conference-organisers-client">{JSON.stringify(props)}</div>
  ),
}));

import { fetchForConferenceOrganisersPage } from '@/services/forConferenceOrganisers';
import { getPublicJournalConfig } from '@/utils/env-loader';
import { notFound } from 'next/navigation';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('ForConferenceOrganisersPage', () => {
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

      expect(metadata.title).toBe('pages.forConferenceOrganisers.title');
      expect(metadata.description).toBe('pages.forConferenceOrganisers.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('calls notFound when the menu entry is explicitly disabled', async () => {
      vi.mocked(getPublicJournalConfig).mockReturnValue({
        NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_CONFERENCE_ORGANISERS_RENDER: 'false',
      });

      const { default: ForConferenceOrganisersPage } = await import('../page');

      await expect(ForConferenceOrganisersPage(makeProps())).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(fetchForConferenceOrganisersPage).not.toHaveBeenCalled();
    });

    it('renders ForConferenceOrganisersClient by default (menu entry enabled unless explicitly false)', async () => {
      vi.mocked(fetchForConferenceOrganisersPage).mockResolvedValue({
        'hydra:member': [{ content: { en: 'For conference organisers' } }],
      } as never);

      const { default: ForConferenceOrganisersPage } = await import('../page');
      const jsx = await ForConferenceOrganisersPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('For conference organisers');
    });

    it('renders ForConferenceOrganisersClient with null page data when the API returns no content', async () => {
      vi.mocked(fetchForConferenceOrganisersPage).mockResolvedValue({
        'hydra:member': [],
      } as never);

      const { default: ForConferenceOrganisersPage } = await import('../page');
      const jsx = await ForConferenceOrganisersPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders ForConferenceOrganisersClient with null page data when the API call throws', async () => {
      vi.mocked(fetchForConferenceOrganisersPage).mockRejectedValue(new Error('network down'));

      const { default: ForConferenceOrganisersPage } = await import('../page');
      const jsx = await ForConferenceOrganisersPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

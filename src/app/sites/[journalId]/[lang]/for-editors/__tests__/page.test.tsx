import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/forEditors', () => ({ fetchForEditorsPage: vi.fn() }));

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

vi.mock('./ForEditorsClient', () => ({
  default: (props: any) => <div data-testid="for-editors-client">{JSON.stringify(props)}</div>,
}));

import { fetchForEditorsPage } from '@/services/forEditors';
import { getPublicJournalConfig } from '@/utils/env-loader';
import { notFound } from 'next/navigation';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('ForEditorsPage', () => {
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

      expect(metadata.title).toBe('pages.forEditors.title');
      expect(metadata.description).toBe('pages.forEditors.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('calls notFound when the journal has not enabled the for-editors menu entry', async () => {
      vi.mocked(getPublicJournalConfig).mockReturnValue({});

      const { default: ForEditorsPage } = await import('../page');

      await expect(ForEditorsPage(makeProps())).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(fetchForEditorsPage).not.toHaveBeenCalled();
    });

    it('renders ForEditorsClient with page data when the menu entry is enabled and the API returns content', async () => {
      vi.mocked(getPublicJournalConfig).mockReturnValue({
        NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_EDITORS_RENDER: 'true',
      });
      vi.mocked(fetchForEditorsPage).mockResolvedValue({
        'hydra:member': [{ content: { en: 'For editors' } }],
      } as never);

      const { default: ForEditorsPage } = await import('../page');
      const jsx = await ForEditorsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('For editors');
    });

    it('renders ForEditorsClient with null page data when the API returns no content', async () => {
      vi.mocked(getPublicJournalConfig).mockReturnValue({
        NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_EDITORS_RENDER: 'true',
      });
      vi.mocked(fetchForEditorsPage).mockResolvedValue({ 'hydra:member': [] } as never);

      const { default: ForEditorsPage } = await import('../page');
      const jsx = await ForEditorsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });

    it('renders ForEditorsClient with null page data when the API call throws', async () => {
      vi.mocked(getPublicJournalConfig).mockReturnValue({
        NEXT_PUBLIC_JOURNAL_MENU_JOURNAL_FOR_EDITORS_RENDER: 'true',
      });
      vi.mocked(fetchForEditorsPage).mockRejectedValue(new Error('network down'));

      const { default: ForEditorsPage } = await import('../page');
      const jsx = await ForEditorsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('"initialPage":null');
    });
  });
});

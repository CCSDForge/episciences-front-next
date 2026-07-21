import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/forAuthors', () => ({
  fetchEditorialWorkflowPage: vi.fn(),
  fetchPrepareSubmissionPage: vi.fn(),
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

vi.mock('./ForAuthorsClient', () => ({
  default: (props: any) => <div data-testid="for-authors-client">{JSON.stringify(props)}</div>,
}));

import { fetchEditorialWorkflowPage, fetchPrepareSubmissionPage } from '@/services/forAuthors';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('ForAuthorsPage', () => {
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

      expect(metadata.title).toBe('pages.forAuthors.title');
      expect(metadata.description).toBe('pages.forAuthors.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders ForAuthorsClient with both pages fetched in parallel', async () => {
      vi.mocked(fetchEditorialWorkflowPage).mockResolvedValue({
        content: { en: 'Editorial workflow body' },
      } as never);
      vi.mocked(fetchPrepareSubmissionPage).mockResolvedValue({
        content: { en: 'Prepare submission body' },
      } as never);

      const { default: ForAuthorsPage } = await import('../page');
      const jsx = await ForAuthorsPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('Editorial workflow body');
      expect(serialized).toContain('Prepare submission body');
    });

    it('renders ForAuthorsClient with null pages when the fetches reject', async () => {
      vi.mocked(fetchEditorialWorkflowPage).mockRejectedValue(new Error('network down'));
      vi.mocked(fetchPrepareSubmissionPage).mockResolvedValue(null);

      const { default: ForAuthorsPage } = await import('../page');
      const jsx = await ForAuthorsPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('"editorialWorkflowPage":null');
      expect(serialized).toContain('"prepareSubmissionPage":null');
    });

    it('renders a graceful fallback instead of throwing when journalId is missing', async () => {
      const { default: ForAuthorsPage } = await import('../page');

      const jsx = await ForAuthorsPage(makeProps(''));

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('"editorialWorkflowPage":null');
      expect(serialized).toContain('"prepareSubmissionPage":null');
      expect(fetchEditorialWorkflowPage).not.toHaveBeenCalled();
      expect(fetchPrepareSubmissionPage).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/board', () => ({
  fetchBoardPages: vi.fn(),
  fetchBoardMembers: vi.fn(),
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

vi.mock('./BoardsClient', () => ({
  default: (props: any) => <div data-testid="boards-client">{JSON.stringify(props)}</div>,
}));

import { fetchBoardPages, fetchBoardMembers } from '@/services/board';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('BoardsPage', () => {
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

      expect(metadata.title).toBe('pages.boards.title');
      expect(metadata.description).toBe('pages.boards.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders BoardsClient with pages and members fetched in parallel', async () => {
      const pages = [{ page_code: 'editorial-board', title: {}, content: {} }];
      const members = [{ id: 1, firstname: 'Ada', lastname: 'Lovelace' }];
      vi.mocked(fetchBoardPages).mockResolvedValue(pages as never);
      vi.mocked(fetchBoardMembers).mockResolvedValue(members as never);

      const { default: BoardsPage } = await import('../page');
      const jsx = await BoardsPage(makeProps());

      const serialized = JSON.stringify(jsx);
      expect(serialized).toContain('editorial-board');
      expect(serialized).toContain('Ada');
      expect(serialized).toContain('"tableOfContentsLabel":"pages.boards.tableOfContents"');
    });

    it('returns a fallback message and does not render BoardsClient when journalId is missing', async () => {
      const { default: BoardsPage } = await import('../page');
      const jsx = await BoardsPage(makeProps(''));

      expect(fetchBoardPages).not.toHaveBeenCalled();
      expect(fetchBoardMembers).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('Content currently unavailable for this journal.');
    });

    it('returns a fallback message when one of the fetches rejects', async () => {
      vi.mocked(fetchBoardPages).mockRejectedValue(new Error('network down'));
      vi.mocked(fetchBoardMembers).mockResolvedValue([] as never);

      const { default: BoardsPage } = await import('../page');
      const jsx = await BoardsPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Content currently unavailable for this journal.');
    });
  });
});

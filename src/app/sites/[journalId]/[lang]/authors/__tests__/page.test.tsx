import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./AuthorsClient', () => ({
  default: (props: any) => <div data-testid="authors-client">{JSON.stringify(props)}</div>,
}));

import { connection } from 'next/server';

function makeProps(
  journalId = 'epijinfo',
  lang = 'en',
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  return {
    params: Promise.resolve({ journalId, lang }),
    searchParams: Promise.resolve(searchParams),
  };
}

describe('AuthorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns translated title/description and seo alternates', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'fr'));

      expect(metadata.title).toBe('pages.authors.title');
      expect(metadata.description).toBe('pages.authors.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('opts into dynamic rendering via connection()', async () => {
      const { default: AuthorsPage } = await import('../page');
      await AuthorsPage(makeProps());

      expect(connection).toHaveBeenCalledTimes(1);
    });

    it('defaults page/search/letter when no searchParams are provided', async () => {
      const { default: AuthorsPage } = await import('../page');
      const jsx = await AuthorsPage(makeProps());

      const str = JSON.stringify(jsx);
      expect(str).toContain('"initialPage":1');
      expect(str).toContain('"initialSearch":""');
      expect(str).toContain('"initialLetter":""');
    });

    it('forwards page/search/letter from searchParams', async () => {
      const { default: AuthorsPage } = await import('../page');
      const jsx = await AuthorsPage(
        makeProps('epijinfo', 'en', { page: '2', search: 'Doe', letter: 'D' })
      );

      const str = JSON.stringify(jsx);
      expect(str).toContain('"initialPage":2');
      expect(str).toContain('"initialSearch":"Doe"');
      expect(str).toContain('"initialLetter":"D"');
    });

    it('passes lang and translated breadcrumb/count labels through', async () => {
      const { default: AuthorsPage } = await import('../page');
      const jsx = await AuthorsPage(makeProps('epijinfo', 'fr'));

      const str = JSON.stringify(jsx);
      expect(str).toContain('"lang":"fr"');
      expect(str).toContain('"authors":"pages.authors.title"');
    });

    it('falls back to page 1 (not NaN) when the page param is not numeric', async () => {
      const { default: AuthorsPage } = await import('../page');
      const jsx = await AuthorsPage(makeProps('epijinfo', 'en', { page: 'abc' }));

      expect(JSON.stringify(jsx)).toContain('"initialPage":1');
    });
  });
});

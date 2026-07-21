import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/search', () => ({ fetchSearchResults: vi.fn() }));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./SearchClient', () => ({
  default: (props: any) => <div data-testid="search-client">{JSON.stringify(props)}</div>,
}));

import { fetchSearchResults } from '@/services/search';
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

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMetadata', () => {
    it('returns translated title/description and seo alternates', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'fr'));

      expect(metadata.title).toBe('pages.search.title');
      expect(metadata.description).toBe('pages.search.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('opts into dynamic rendering via connection()', async () => {
      const { default: SearchPage } = await import('../page');
      await SearchPage(makeProps());

      expect(connection).toHaveBeenCalledTimes(1);
    });

    it('does not call fetchSearchResults and renders empty results when there is no search term', async () => {
      const { default: SearchPage } = await import('../page');
      const jsx = await SearchPage(makeProps());

      expect(fetchSearchResults).not.toHaveBeenCalled();
      const str = JSON.stringify(jsx);
      expect(str).toContain('"initialSearchResults":{"data":[],"totalItems":0}');
      expect(str).toContain('"initialSearch":""');
    });

    it('fetches results when a "terms" search param is provided', async () => {
      vi.mocked(fetchSearchResults).mockResolvedValue({
        data: [{ id: 1, title: 'Result 1' }],
        totalItems: 1,
      } as never);

      const { default: SearchPage } = await import('../page');
      const jsx = await SearchPage(makeProps('epijinfo', 'en', { terms: 'quantum' }));

      expect(fetchSearchResults).toHaveBeenCalledWith(
        expect.objectContaining({ terms: 'quantum', rvcode: 'epijinfo', page: 1 })
      );
      expect(JSON.stringify(jsx)).toContain('Result 1');
    });

    it('falls back to the "q" param when "terms" is absent', async () => {
      vi.mocked(fetchSearchResults).mockResolvedValue({ data: [], totalItems: 0 } as never);

      const { default: SearchPage } = await import('../page');
      await SearchPage(makeProps('epijinfo', 'en', { q: 'gravity' }));

      expect(fetchSearchResults).toHaveBeenCalledWith(
        expect.objectContaining({ terms: 'gravity' })
      );
    });

    it('falls back to empty results without throwing when fetchSearchResults rejects', async () => {
      vi.mocked(fetchSearchResults).mockRejectedValue(new Error('search backend down'));

      const { default: SearchPage } = await import('../page');
      const jsx = await SearchPage(makeProps('epijinfo', 'en', { terms: 'quantum' }));

      expect(JSON.stringify(jsx)).toContain('"initialSearchResults":{"data":[],"totalItems":0}');
    });

    it('parses and forwards the page number', async () => {
      vi.mocked(fetchSearchResults).mockResolvedValue({ data: [], totalItems: 0 } as never);

      const { default: SearchPage } = await import('../page');
      await SearchPage(makeProps('epijinfo', 'en', { terms: 'quantum', page: '4' }));

      expect(fetchSearchResults).toHaveBeenCalledWith(expect.objectContaining({ page: 4 }));
    });

    it('falls back to page 1 (not NaN) when the page param is not numeric', async () => {
      vi.mocked(fetchSearchResults).mockResolvedValue({ data: [], totalItems: 0 } as never);

      const { default: SearchPage } = await import('../page');
      await SearchPage(makeProps('epijinfo', 'en', { terms: 'quantum', page: 'abc' }));

      expect(fetchSearchResults).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
    });
  });
});

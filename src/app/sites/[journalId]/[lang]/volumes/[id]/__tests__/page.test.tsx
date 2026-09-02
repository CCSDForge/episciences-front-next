import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/volume', () => ({ fetchVolume: vi.fn() }));
vi.mock('@/services/article', () => ({ fetchArticle: vi.fn() }));
vi.mock('@/services/journal', () => ({ getJournalByCode: vi.fn() }));

vi.mock('@/utils/language-utils', () => ({
  getLanguageFromParams: vi.fn(() => 'en'),
  acceptedLanguages: ['en', 'fr'],
}));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    const error = new Error('NEXT_NOT_FOUND') as Error & { digest: string };
    error.digest = 'NEXT_NOT_FOUND';
    throw error;
  }),
}));

import { fetchVolume } from '@/services/volume';
import { fetchArticle } from '@/services/article';
import { getJournalByCode } from '@/services/journal';
import { notFound } from 'next/navigation';

function makeProps(journalId = 'epijinfo', id = '42', lang = 'en') {
  return { params: Promise.resolve({ id, lang, journalId }) };
}

function makeVolume(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    num: '1',
    articles: [],
    downloadLink: 'https://example.org/vol.pdf',
    ...overrides,
  };
}

describe('VolumeDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateStaticParams', () => {
    it('returns an empty array (details pages are not statically pre-generated)', async () => {
      const { generateStaticParams } = await import('../page');
      expect(await generateStaticParams()).toEqual([]);
    });
  });

  describe('generateMetadata', () => {
    it('returns a fixed title and seo alternates', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', '42', 'fr'));

      expect(metadata.title).toBe('Volume Details');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('renders the placeholder page for the "no-volumes-found" sentinel id without fetching', async () => {
      const { default: VolumeDetailsPage } = await import('../page');
      const jsx = await VolumeDetailsPage(makeProps('epijinfo', 'no-volumes-found'));

      expect(JSON.stringify(jsx)).toContain('Aucun volume');
      expect(fetchVolume).not.toHaveBeenCalled();
    });

    it('throws when journalId is missing', async () => {
      const { default: VolumeDetailsPage } = await import('../page');
      await expect(VolumeDetailsPage(makeProps(''))).rejects.toThrow('journalId is not defined');
    });

    it('calls notFound when fetchVolume resolves to null', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(null);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: VolumeDetailsPage } = await import('../page');
      await expect(VolumeDetailsPage(makeProps())).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    it('calls notFound when the volume belongs to a different journal (rvid mismatch)', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(makeVolume({ rvid: 2 }) as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: VolumeDetailsPage } = await import('../page');
      await expect(VolumeDetailsPage(makeProps())).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    it('blocks (fail-closed) when rvid is present but the journal lookup failed', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(makeVolume({ rvid: 2 }) as never);
      vi.mocked(getJournalByCode).mockRejectedValue(new Error('journal api down'));

      const { default: VolumeDetailsPage } = await import('../page');
      await expect(VolumeDetailsPage(makeProps())).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    it('renders when rvid matches the active journal', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(makeVolume({ rvid: 1 }) as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: VolumeDetailsPage } = await import('../page');
      const jsx = await VolumeDetailsPage(makeProps());

      expect(jsx).toBeTruthy();
      expect(notFound).not.toHaveBeenCalled();
    });

    it('renders when rvid is absent from the payload (best-effort check only)', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(makeVolume() as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: VolumeDetailsPage } = await import('../page');
      const jsx = await VolumeDetailsPage(makeProps());

      expect(jsx).toBeTruthy();
      expect(notFound).not.toHaveBeenCalled();
    });

    it('fetches every article referenced by the volume and passes them to the client', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(
        makeVolume({ rvid: 1, articles: [{ paperid: 100 }, { paperid: 101 }] }) as never
      );
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);
      vi.mocked(fetchArticle).mockImplementation(
        async (docid: string) =>
          ({
            id: Number(docid),
            title: `Article ${docid}`,
          }) as never
      );

      const { default: VolumeDetailsPage } = await import('../page');
      const jsx = await VolumeDetailsPage(makeProps());

      expect(fetchArticle).toHaveBeenCalledWith('100', 'epijinfo');
      expect(fetchArticle).toHaveBeenCalledWith('101', 'epijinfo');
      const str = JSON.stringify(jsx);
      expect(str).toContain('Article 100');
      expect(str).toContain('Article 101');
    });

    it('filters out articles that fail to fetch or resolve to null', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(
        makeVolume({ rvid: 1, articles: [{ paperid: 100 }, { paperid: 101 }] }) as never
      );
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);
      vi.mocked(fetchArticle).mockImplementation(async (docid: string) => {
        if (docid === '100') throw new Error('fetch failed');
        return null as never;
      });

      const { default: VolumeDetailsPage } = await import('../page');
      const jsx = await VolumeDetailsPage(makeProps());

      // Neither article should show up: one throws, the other resolves to null
      expect(JSON.stringify(jsx)).toContain('"initialArticles":[]');
    });

    it('skips article fetching entirely when the volume has no articles', async () => {
      vi.mocked(fetchVolume).mockResolvedValue(makeVolume({ rvid: 1, articles: [] }) as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: VolumeDetailsPage } = await import('../page');
      await VolumeDetailsPage(makeProps());

      expect(fetchArticle).not.toHaveBeenCalled();
    });
  });
});

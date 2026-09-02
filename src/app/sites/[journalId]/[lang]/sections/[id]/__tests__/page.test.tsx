import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/section', () => ({
  fetchSection: vi.fn(),
  fetchSectionArticles: vi.fn(),
}));
vi.mock('@/services/journal', () => ({ getJournalByCode: vi.fn() }));

vi.mock('@/utils/language-utils', () => ({
  getLanguageFromParams: vi.fn(() => 'en'),
  acceptedLanguages: ['en', 'fr'],
  defaultLanguage: 'en',
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

import { fetchSection, fetchSectionArticles } from '@/services/section';
import { getJournalByCode } from '@/services/journal';
import { notFound } from 'next/navigation';

function makeProps(journalId = 'epijinfo', id = '42', lang = 'en') {
  return { params: Promise.resolve({ id, lang, journalId }) };
}

function makeSection(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    title: { en: 'Section title', fr: 'Titre section' },
    description: { en: 'Section description', fr: 'Description section' },
    articles: [],
    ...overrides,
  };
}

describe('SectionDetailsPage', () => {
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
    it('returns fixed metadata for the "no-sections-found" sentinel id without fetching', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'no-sections-found'));

      expect(metadata.title).toBe('No sections found');
      expect(fetchSection).not.toHaveBeenCalled();
    });

    it('returns the section title/description when the section is found', async () => {
      vi.mocked(fetchSection).mockResolvedValue(makeSection() as never);

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps());

      expect(metadata.title).toBe('Section title | Episciences');
      expect(metadata.description).toBe('Section description');
      expect(metadata.alternates).toBeDefined();
    });

    it('falls back to a generic title when the section has no title', async () => {
      vi.mocked(fetchSection).mockResolvedValue(
        makeSection({ title: undefined, description: undefined }) as never
      );

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', '42'));

      expect(metadata.title).toBe('Section 42 | Episciences');
    });

    it('returns fallback metadata when the section is not found', async () => {
      vi.mocked(fetchSection).mockResolvedValue(null);

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps());

      expect(metadata.title).toBe('Section Details');
      expect(metadata.alternates).toBeDefined();
    });

    it('returns fallback metadata when fetchSection throws', async () => {
      vi.mocked(fetchSection).mockRejectedValue(new Error('api down'));

      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps());

      expect(metadata.title).toBe('Section Details');
      expect(metadata.description).toBe('Section details page');
    });
  });

  describe('default export', () => {
    it('renders the placeholder page for the "no-sections-found" sentinel id without fetching', async () => {
      const { default: SectionDetailsPage } = await import('../page');
      const jsx = await SectionDetailsPage(makeProps('epijinfo', 'no-sections-found'));

      expect(JSON.stringify(jsx)).toContain('No sections available');
      expect(fetchSection).not.toHaveBeenCalled();
    });

    it('throws when journalId is missing', async () => {
      const { default: SectionDetailsPage } = await import('../page');
      await expect(SectionDetailsPage(makeProps(''))).rejects.toThrow('journalId is not defined');
    });

    it('calls notFound when the id is not purely numeric', async () => {
      const { default: SectionDetailsPage } = await import('../page');
      await expect(SectionDetailsPage(makeProps('epijinfo', 'abc'))).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
      expect(fetchSection).not.toHaveBeenCalled();
    });

    it('calls notFound when fetchSection resolves to null', async () => {
      vi.mocked(fetchSection).mockResolvedValue(null);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: SectionDetailsPage } = await import('../page');
      await expect(SectionDetailsPage(makeProps())).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    it('calls notFound when the section belongs to a different journal (rvid mismatch)', async () => {
      vi.mocked(fetchSection).mockResolvedValue(makeSection({ rvid: 2 }) as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: SectionDetailsPage } = await import('../page');
      await expect(SectionDetailsPage(makeProps())).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    it('blocks (fail-closed) when rvid is present but the journal lookup failed', async () => {
      vi.mocked(fetchSection).mockResolvedValue(makeSection({ rvid: 2 }) as never);
      vi.mocked(getJournalByCode).mockRejectedValue(new Error('journal api down'));

      const { default: SectionDetailsPage } = await import('../page');
      await expect(SectionDetailsPage(makeProps())).rejects.toThrow();
      expect(notFound).toHaveBeenCalledTimes(1);
    });

    it('renders when rvid matches the active journal, computing localized title/description', async () => {
      vi.mocked(fetchSection).mockResolvedValue(makeSection({ rvid: 1 }) as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: SectionDetailsPage } = await import('../page');
      const jsx = await SectionDetailsPage(makeProps());

      expect(notFound).not.toHaveBeenCalled();
      const str = JSON.stringify(jsx);
      expect(str).toContain('"sectionTitle":"Section title"');
      expect(str).toContain('"sectionDescription":"Section description"');
    });

    it('renders when rvid is absent from the payload (best-effort check only)', async () => {
      vi.mocked(fetchSection).mockResolvedValue(makeSection() as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: SectionDetailsPage } = await import('../page');
      const jsx = await SectionDetailsPage(makeProps());

      expect(jsx).toBeTruthy();
      expect(notFound).not.toHaveBeenCalled();
    });

    it('falls back to "Section {id}" when title is missing in the requested and default language', async () => {
      vi.mocked(fetchSection).mockResolvedValue(
        makeSection({ rvid: 1, title: {}, description: {} }) as never
      );
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: SectionDetailsPage } = await import('../page');
      const jsx = await SectionDetailsPage(makeProps('epijinfo', '42'));

      expect(JSON.stringify(jsx)).toContain('"sectionTitle":"Section 42"');
    });

    it('fetches the articles referenced by the section and filters out nulls', async () => {
      vi.mocked(fetchSection).mockResolvedValue(
        makeSection({ rvid: 1, articles: [{ paperid: 10 }, { paperid: 11 }] }) as never
      );
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);
      vi.mocked(fetchSectionArticles).mockResolvedValue([
        { id: 10, title: 'Article 10' },
        null,
      ] as never);

      const { default: SectionDetailsPage } = await import('../page');
      const jsx = await SectionDetailsPage(makeProps());

      expect(fetchSectionArticles).toHaveBeenCalledWith(['10', '11'], 'epijinfo', '42');
      const str = JSON.stringify(jsx);
      expect(str).toContain('Article 10');
    });

    it('skips article fetching entirely when the section has no articles', async () => {
      vi.mocked(fetchSection).mockResolvedValue(makeSection({ rvid: 1, articles: [] }) as never);
      vi.mocked(getJournalByCode).mockResolvedValue({ id: 1 } as never);

      const { default: SectionDetailsPage } = await import('../page');
      await SectionDetailsPage(makeProps());

      expect(fetchSectionArticles).not.toHaveBeenCalled();
    });
  });
});

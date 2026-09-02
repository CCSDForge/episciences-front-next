import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/article', () => ({
  fetchArticle: vi.fn(),
  fetchArticles: vi.fn(),
  fetchArticleMetadata: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/services/volume', () => ({
  fetchVolume: vi.fn(),
}));

vi.mock('@/services/journal', () => ({
  getJournalByCode: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
  defaultLanguage: 'en',
  availableLanguages: ['en', 'fr'],
}));

vi.mock('@/utils/language-utils', () => ({
  getLanguageFromParams: vi.fn(() => 'fr'),
  acceptedLanguages: ['en', 'fr'],
}));

vi.mock('@/utils/static-params-helper', () => ({
  combineWithLanguageParams: vi.fn(),
}));

vi.mock('@/utils/build-progress', () => ({
  initBuildProgress: vi.fn(),
  logArticleProgress: vi.fn(),
}));

vi.mock('@/utils/env-loader', () => ({
  loadJournalConfig: vi.fn(() => ({ env: {} })),
}));

vi.mock('@/utils/signposting', () => ({
  getJournalBaseUrl: vi.fn(() => 'https://requested-journal.episciences.org'),
}));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    const error = new Error('NEXT_NOT_FOUND') as Error & { digest: string };
    error.digest = 'NEXT_NOT_FOUND';
    throw error;
  }),
}));

import { fetchArticle } from '@/services/article';
import { fetchVolume } from '@/services/volume';
import { getJournalByCode } from '@/services/journal';
import { notFound } from 'next/navigation';
import { generateArticleMetadata } from '@/components/Meta/ArticleMeta/ArticleMeta';

vi.mock('@/components/Meta/ArticleMeta/ArticleMeta', () => ({
  generateArticleMetadata: vi.fn((args: any) => ({
    title: args.article?.title ?? 'mock-title',
    openGraph: { title: args.article?.title },
    _metaArgs: args,
  })),
}));

function makeProps(journalId: string, id = '18632', lang = 'fr') {
  return { params: Promise.resolve({ id, lang, journalId }) };
}

describe('ArticleDetailsPage — cross-journal access guard and edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks access when the article belongs to a different journal', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      title: 'Some article',
      authors: [],
    } as never);

    const { default: ArticleDetailsPage } = await import('../page');

    await expect(ArticleDetailsPage(makeProps('slovo'))).rejects.toThrow();
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('renders when the article belongs to the requested journal', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      journalCode: 'fajpc',
      title: 'Some article',
      authors: [],
    } as never);

    const { default: ArticleDetailsPage } = await import('../page');

    const result = await ArticleDetailsPage(makeProps('fajpc'));
    expect(result).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('renders when journalCode is absent from the API payload (best-effort check only)', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      title: 'Some article',
      authors: [],
    } as never);

    const { default: ArticleDetailsPage } = await import('../page');

    const result = await ArticleDetailsPage(makeProps('fajpc'));
    expect(result).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('returns 404 (notFound) when fetchArticle resolves to null', async () => {
    vi.mocked(fetchArticle).mockResolvedValue(null);

    const { default: ArticleDetailsPage } = await import('../page');

    await expect(ArticleDetailsPage(makeProps('fajpc'))).rejects.toThrow();
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('renders placeholder when id is no-articles-found', async () => {
    const { default: ArticleDetailsPage } = await import('../page');

    const result = await ArticleDetailsPage(makeProps('fajpc', 'no-articles-found'));
    expect(result).toBeTruthy();
    expect(fetchArticle).not.toHaveBeenCalled();
  });
});

describe('generateMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns placeholder title when id is no-articles-found', async () => {
    const { generateMetadata } = await import('../page');

    const meta = await generateMetadata(makeProps('fajpc', 'no-articles-found'));
    expect(meta).toEqual({ title: 'Aucun article disponible' });
    expect(fetchArticle).not.toHaveBeenCalled();
  });

  it('returns not found title when article does not exist', async () => {
    vi.mocked(fetchArticle).mockResolvedValue(null);

    const { generateMetadata } = await import('../page');

    const meta = await generateMetadata(makeProps('fajpc', '99999'));
    expect(meta).toEqual({ title: 'Article non trouvé' });
  });

  it('generates complete metadata with array keywords and pdf link', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      title: 'Test Article Title',
      authors: [{ fullname: 'John Doe' }],
      keywords: ['AI', 'Testing'],
      volumeId: 12,
      pdfLink: 'https://example.org/article.pdf',
    } as never);

    vi.mocked(getJournalByCode).mockResolvedValue({
      name: 'Journal of Testing',
      code: 'fajpc',
    } as never);

    vi.mocked(fetchVolume).mockResolvedValue({
      id: 12,
      title: 'Volume 12',
    } as never);

    const { generateMetadata } = await import('../page');

    const meta = await generateMetadata(makeProps('fajpc', '18632', 'fr'));
    expect(generateArticleMetadata).toHaveBeenCalledTimes(1);
    expect(meta).toHaveProperty('title', 'Test Article Title');

    const metaArgs = vi.mocked(generateArticleMetadata).mock.calls[0][0];
    expect(metaArgs.keywords).toEqual(['AI', 'Testing']);
    expect(metaArgs.pdfDownloadUrl).toContain('/fr/articles/18632/download');
    expect(metaArgs.relatedVolume).toEqual({ id: 12, title: 'Volume 12' });
    expect(metaArgs.canonicalUrl).toBe('https://requested-journal.episciences.org/fr/articles/18632');
  });

  it('extracts keywords for language when keywords is an object', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      title: 'Localized Keywords Article',
      keywords: {
        fr: ['IA', 'Tests'],
        en: ['AI', 'Testing'],
      },
    } as never);

    const { generateMetadata } = await import('../page');

    await generateMetadata(makeProps('fajpc', '18632', 'fr'));
    const metaArgs = vi.mocked(generateArticleMetadata).mock.calls[0][0];
    expect(metaArgs.keywords).toEqual(['IA', 'Tests']);
    expect(metaArgs.pdfDownloadUrl).toBeUndefined();
  });

  it('falls back to all keywords if current language is not in keywords object', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      title: 'Fallback Keywords Article',
      keywords: {
        en: ['Machine Learning'],
      },
    } as never);

    const { generateMetadata } = await import('../page');

    await generateMetadata(makeProps('fajpc', '18632', 'fr'));
    const metaArgs = vi.mocked(generateArticleMetadata).mock.calls[0][0];
    expect(metaArgs.keywords).toEqual(['Machine Learning']);
  });

  it('handles volume fetch rejection gracefully', async () => {
    vi.mocked(fetchArticle).mockResolvedValue({
      id: 18632,
      title: 'Article with Failed Volume',
      volumeId: 999,
    } as never);

    vi.mocked(fetchVolume).mockRejectedValue(new Error('Volume not found'));

    const { generateMetadata } = await import('../page');

    const meta = await generateMetadata(makeProps('fajpc', '18632'));
    expect(meta).toHaveProperty('title', 'Article with Failed Volume');
    const metaArgs = vi.mocked(generateArticleMetadata).mock.calls[0][0];
    expect(metaArgs.relatedVolume).toBeNull();
  });

  it('catches unexpected error and returns error title', async () => {
    vi.mocked(fetchArticle).mockRejectedValue(new Error('Fatal database error'));

    const { generateMetadata } = await import('../page');

    const meta = await generateMetadata(makeProps('fajpc', '18632'));
    expect(meta).toEqual({ title: "Erreur lors du chargement de l'article" });
  });
});

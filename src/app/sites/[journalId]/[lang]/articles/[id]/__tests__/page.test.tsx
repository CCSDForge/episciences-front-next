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
import { notFound } from 'next/navigation';

function makeProps(journalId: string, id = '18632') {
  return { params: Promise.resolve({ id, lang: 'fr', journalId }) };
}

describe('ArticleDetailsPage — cross-journal access guard', () => {
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
});

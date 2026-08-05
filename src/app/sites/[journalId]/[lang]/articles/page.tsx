import type { Metadata } from 'next';
import { fetchArticles } from '@/services/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loader from '@/components/Loader/Loader';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateCollectionPageJsonLd } from '@/utils/schema';

const ArticlesClient = dynamic(() => import('./ArticlesClient'));

// ISR: revalidate every hour, but serve stale content if API is down
export const revalidate = 3600;

// Pre-generate articles page for all journals at build time
export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.articles.title', translations),
    description: t('pages.articles.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/articles'),
  };
}

interface ArticlesData {
  data: any[];
  totalItems: number;
  range?: {
    years?: number[];
    types?: string[];
  };
}

export default async function ArticlesPage(props: {
  readonly params: Promise<{ lang: string; journalId: string }>;
  readonly searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [searchParams, params] = await Promise.all([props.searchParams, props.params]);
  const lang = params.lang || 'en';
  const { journalId } = params;

  // Extract page number from searchParams
  const parsedPage = searchParams?.page ? Number.parseInt(searchParams.page as string, 10) : 1;
  const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);

  const translationsPromise = getServerTranslations(lang);

  const ARTICLES_PER_PAGE = 20; // Default page size for SSR

  // Only the data fetching is wrapped: rendering happens outside the try/catch so that no
  // JSX tree sits inside an error handler. On failure the page degrades to an empty list.
  let articles: Awaited<ReturnType<typeof fetchArticles>> | null = null;

  try {
    if (!journalId) {
      throw new Error('Journal code not available');
    }

    articles = await fetchArticles({
      rvcode: journalId,
      page: page,
      itemsPerPage: ARTICLES_PER_PAGE,
      onlyAccepted: false,
      types: [],
    });
  } catch (error) {
    logger.error('Error fetching articles:', error);
  }

  const translations = await translationsPromise;

  const formattedArticles: ArticlesData = articles
    ? {
        data: Array.isArray(articles.data) ? articles.data : [],
        totalItems: articles.totalItems || 0,
        range: {
          years: Array.isArray(articles.range?.years) ? articles.range.years : [],
          types: Array.isArray(articles.range?.types) ? articles.range.types : [],
        },
      }
    : { data: [], totalItems: 0, range: { years: [] } };

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    content: t('common.content', translations),
    articles: t('pages.articles.title', translations),
  };

  const countLabels = {
    article: t('common.article', translations),
    articles: t('common.articles', translations),
  };

  return (
    <>
      {articles && (
        <JsonLd
          data={generateCollectionPageJsonLd(journalId, lang, '/articles', {
            name: t('pages.articles.title', translations),
            numberOfItems: formattedArticles.totalItems,
          })}
        />
      )}
      <Suspense fallback={<Loader />}>
        <ArticlesClient
          initialArticles={formattedArticles}
          lang={lang}
          breadcrumbLabels={breadcrumbLabels}
          countLabels={countLabels}
        />
      </Suspense>
    </>
  );
}

import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Loader from '@/components/Loader/Loader';

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

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Articles',
};

interface ArticlesData {
  data: any[];
  totalItems: number;
  range?: {
    years?: number[];
    types?: string[];
  };
}

export default async function ArticlesPage(props: {
  params: Promise<{ lang: string; journalId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const lang = params.lang || 'en';
  const { journalId } = params;

  // Extract page number from searchParams
  const page = searchParams?.page ? Math.max(1, parseInt(searchParams.page as string, 10)) : 1;

  const translationsPromise = getServerTranslations(lang);

  try {
    const ARTICLES_PER_PAGE = 20; // Default page size for SSR

    if (!journalId) {
      throw new Error('Journal code not available');
    }

    // Récupération dynamique des articles (en parallèle avec les traductions)
    const [translations, articles] = await Promise.all([
      translationsPromise,
      fetchArticles({
        rvcode: journalId,
        page: page,
        itemsPerPage: ARTICLES_PER_PAGE,
        onlyAccepted: false,
        types: [],
      }),
    ]);

    // S'assurer que les données sont dans le bon format
    const formattedArticles: ArticlesData = {
      data: Array.isArray(articles.data) ? articles.data : [],
      totalItems: articles.totalItems || 0,
      range: {
        years: Array.isArray(articles.range?.years) ? articles.range.years : [],
        types: Array.isArray(articles.range?.types) ? articles.range.types : [],
      },
    };

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
      <Suspense fallback={<Loader />}>
        <ArticlesClient
          initialArticles={formattedArticles}
          lang={lang}
          breadcrumbLabels={breadcrumbLabels}
          countLabels={countLabels}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error fetching articles:', error);
    const translations = await translationsPromise;
    const emptyState: ArticlesData = {
      data: [],
      totalItems: 0,
      range: {
        years: [],
      },
    };

    return (
      <Suspense fallback={<Loader />}>
        <ArticlesClient
          initialArticles={emptyState}
          lang={lang}
          breadcrumbLabels={{
            home: t('pages.home.title', translations),
            content: t('common.content', translations),
            articles: t('pages.articles.title', translations),
          }}
          countLabels={{
            article: t('common.article', translations),
            articles: t('common.articles', translations),
          }}
        />
      </Suspense>
    );
  }
}

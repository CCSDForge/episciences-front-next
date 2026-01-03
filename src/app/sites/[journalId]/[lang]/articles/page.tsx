import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';
import { getServerTranslations, t } from '@/utils/server-i18n';

import dynamic from 'next/dynamic';

const ArticlesClient = dynamic(() => import('./ArticlesClient'));


export const metadata: Metadata = {
  title: 'Articles',
  description: 'Articles',
};

interface ArticlesData {
  data: any[];
  totalItems: number;
  range?: {
    years?: number[];
  };
}

export default async function ArticlesPage({ 
  params, 
  searchParams 
}: { 
  params: { lang: string; journalId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const lang = params.lang || 'en';
  const { journalId } = params;
  
  // Extract page number from searchParams
  const page = searchParams?.page ? Math.max(1, parseInt(searchParams.page as string, 10)) : 1;

  // Fetch translations server-side
  const translations = await getServerTranslations(lang);

  try {
    const ARTICLES_PER_PAGE = 20; // Default page size for SSR

    if (!journalId) {
      throw new Error('Journal code not available');
    }

    // Récupération dynamique des articles
    const articles = await fetchArticles({
      rvcode: journalId,
      page: page,
      itemsPerPage: ARTICLES_PER_PAGE,
      onlyAccepted: false,
      types: []
    });

    // S'assurer que les données sont dans le bon format
    const formattedArticles: ArticlesData = {
      data: Array.isArray(articles.data) ? articles.data : [],
      totalItems: articles.totalItems || 0,
      range: {
        years: Array.isArray(articles.range?.years) ? articles.range.years : []
      }
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
      <ArticlesClient
        initialArticles={formattedArticles}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
        countLabels={countLabels}
      />
    );
  } catch (error) {
    console.error('Error fetching articles:', error);
    // Retourner un état vide en cas d'erreur
    const emptyState: ArticlesData = {
      data: [],
      totalItems: 0,
      range: {
        years: []
      }
    };
    
    // Fetch translations again for error case (or use cached ones if available, but here we just re-fetch to be safe or use what we have)
    // Actually translations variable is available here because it's defined outside try block? 
    // No, I put it before try block.
    
    return (
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
    );
  }
}
 
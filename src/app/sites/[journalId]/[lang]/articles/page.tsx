import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';

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

export default async function ArticlesPage({ params }: { params: { lang: string; journalId: string } }) {
  const lang = params.lang || 'en';
  const { journalId } = params;
  try {
    const ARTICLES_PER_PAGE = 20; // Default page size for SSR

    if (!journalId) {
      throw new Error('Journal code not available');
    }

    // Récupération dynamique des articles
    const articles = await fetchArticles({
      rvcode: journalId,
      page: 1,
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

    return (
      <ArticlesClient
        initialArticles={formattedArticles}
        lang={lang}
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
    
    return (
      <ArticlesClient
        initialArticles={emptyState}
        lang={lang}
      />
    );
  }
}
 
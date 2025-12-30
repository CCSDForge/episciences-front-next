import { generateLanguageParamsForPage } from '@/utils/static-params-helper';

import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';

import dynamic from 'next/dynamic';



export async function generateStaticParams() {
  return generateLanguageParamsForPage('articles');
}

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

export default async function ArticlesPage({ params }: { params: { lang: string } }) {
  const lang = params.lang || 'en';
  try {
    const ARTICLES_PER_PAGE = 10;
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (!rvcode) {
      throw new Error('Journal code not available');
    }

    // For static builds, fetch all articles for client-side pagination
    const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
    const itemsPerPage = isStaticBuild ? 9999 : ARTICLES_PER_PAGE;

    // Récupération statique des articles pendant le build
    const articles = await fetchArticles({
      rvcode,
      page: 1,
      itemsPerPage: itemsPerPage,
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
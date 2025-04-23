import type { Metadata } from 'next';
import { fetchArticles } from '@/services/article';
import ArticlesClient from './ArticlesClient';

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

export default async function ArticlesPage() {
  try {
    const ARTICLES_PER_PAGE = 10;
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('Journal code not available');
    }
    
    // Récupération statique des articles pendant le build
    const articles = await fetchArticles({
      rvcode,
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
      />
    );
  }
} 
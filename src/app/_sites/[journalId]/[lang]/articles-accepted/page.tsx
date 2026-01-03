import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';

import dynamic from 'next/dynamic';

const ArticlesAcceptedClient = dynamic(() => import('./ArticlesAcceptedClient'));


// Métadonnées pour la page
export const metadata: Metadata = {
  title: 'Articles acceptés',
  description: 'Articles acceptés',
};

export default async function ArticlesAcceptedPage({ params }: { params: { lang: string; journalId: string } }) {
  const lang = params.lang || 'en';
  const { journalId } = params;
  try {
    const ARTICLES_ACCEPTED_PER_PAGE = 10;
    
    // Récupération dynamique des articles acceptés
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const articlesAccepted = await fetchArticles({
      rvcode: journalId,
      page: 1,
      itemsPerPage: ARTICLES_ACCEPTED_PER_PAGE,
      onlyAccepted: true,
      types: []
    });

    // S'assurer que les données sont correctement formatées pour le client
    const formattedArticles = {
      data: Array.isArray(articlesAccepted.data) ? articlesAccepted.data : [],
      totalItems: articlesAccepted.totalItems || 0,
      range: {
        // Vérification explicite de l'existence des types dans range
        types: articlesAccepted.range && 'types' in articlesAccepted.range 
          ? Array.isArray(articlesAccepted.range.types) 
            ? articlesAccepted.range.types 
            : []
          : [],
        years: articlesAccepted.range && Array.isArray(articlesAccepted.range.years) 
          ? articlesAccepted.range.years 
          : []
      }
    };

    return (
      <ArticlesAcceptedClient
        initialArticles={formattedArticles}
        initialRange={formattedArticles.range}
        lang={lang}
      />
    );
  } catch (error) {
    console.error('Error fetching articles accepted:', error);
    // Retourner un état vide en cas d'erreur
    return (
      <ArticlesAcceptedClient
        initialArticles={{ data: [], totalItems: 0 }}
        initialRange={{ types: [], years: [] }}
        lang={lang}
      />
    );
  }
}
 
import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';
import { getServerTranslations, t } from '@/utils/server-i18n';

import dynamic from 'next/dynamic';

const ArticlesAcceptedClient = dynamic(() => import('./ArticlesAcceptedClient'));


// Métadonnées pour la page
export const metadata: Metadata = {
  title: 'Articles acceptés',
  description: 'Articles acceptés',
};

export default async function ArticlesAcceptedPage({ params }: { params: { lang: string; journalId: string } }) {
  const { lang, journalId } = params;
  try {
    const ARTICLES_ACCEPTED_PER_PAGE = 10;
    
    // Récupération dynamique des articles acceptés
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const [articlesAccepted, translations] = await Promise.all([
      fetchArticles({
        rvcode: journalId,
        page: 1,
        itemsPerPage: ARTICLES_ACCEPTED_PER_PAGE,
        onlyAccepted: true,
        types: []
      }),
      getServerTranslations(lang)
    ]);

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

    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      articlesAccepted: t('pages.articlesAccepted.title', translations),
    };

    return (
      <ArticlesAcceptedClient
        initialArticles={formattedArticles}
        initialRange={formattedArticles.range}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
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
 
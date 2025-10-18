import React from 'react';
import { Metadata } from 'next';
import { fetchArticle, fetchArticles } from '@/services/article';
import ArticleDetailsClient from './ArticleDetailsClient';
import { FetchedArticle } from '@/utils/article';
import { IArticle } from '@/types/article';

interface ArticleDetailsPageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-static';

export async function generateMetadata({ params }: ArticleDetailsPageProps): Promise<Metadata> {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: 'Aucun article disponible',
      };
    }
    
    const article = await fetchArticle(params.id);
    return {
      title: article?.title ? article.title : 'Article non trouvé',
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);
    return {
      title: 'Erreur lors du chargement de l\'article',
    };
  }
}

export async function generateStaticParams() {
  // Si un ID spécifique est fourni, ne générer que cet article
  if (process.env.ONLY_BUILD_ARTICLE_ID) {
    console.log(`Génération ciblée de l'article ${process.env.ONLY_BUILD_ARTICLE_ID}`);
    return [{ id: process.env.ONLY_BUILD_ARTICLE_ID }];
  }
  
  // Sinon, continuer avec la génération complète de tous les articles
  try {
    const { data: articles } = await fetchArticles({ 
      rvcode: process.env.NEXT_PUBLIC_RVCODE || '',
      page: 1,
      itemsPerPage: 1000
    });
    
    if (!articles || !articles.length) {
      console.log('Aucun article trouvé. Génération d\'une page placeholder.');
      return [{ id: "no-articles-found" }];
    }
    
    console.log(`Génération de ${articles.length} articles.`);
    return articles.map((article: FetchedArticle) => ({
      id: article?.id.toString(),
    }));
  } catch (error) {
    console.error('Error generating static params for articles:', error);
    return [{ id: 'no-articles-found' }];
  }
}

export default async function ArticleDetailsPage({ params }: ArticleDetailsPageProps) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: `Aucun article - Détails | ${process.env.NEXT_PUBLIC_JOURNAL_NAME}`,
        description: "Page placeholder pour les détails d'articles"
      };
    }
    
    const article = await fetchArticle(params.id);
    return <ArticleDetailsClient article={article as IArticle | null} id={params.id} />;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${params.id}:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement de l'article</h1>
        <p>Impossible de charger les données de l'article.</p>
      </div>
    );
  }
} 
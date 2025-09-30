import React from 'react';
import { Metadata } from 'next';
import { fetchArticle, fetchArticles, fetchArticleMetadata } from '@/services/article';
import { fetchVolume } from '@/services/volume';
import ArticleDetailsClient from './ArticleDetailsClient';
import ArticleDetailsServer from './ArticleDetailsServer';
import { FetchedArticle, METADATA_TYPE } from '@/utils/article';
import { IArticle } from '@/types/article';
import { IVolume } from '@/types/volume';
import { getServerTranslations, defaultLanguage, availableLanguages } from '@/utils/server-i18n';

interface ArticleDetailsPageProps {
  params: {
    id: string;
    locale?: string;
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
  // Check if we have multiple languages
  const hasMultipleLanguages = availableLanguages.length > 1;

  // Si un ID spécifique est fourni, ne générer que cet article
  if (process.env.ONLY_BUILD_ARTICLE_ID) {
    console.log(`Génération ciblée de l'article ${process.env.ONLY_BUILD_ARTICLE_ID}`);
    // If multiple languages, generate for all locales
    if (hasMultipleLanguages) {
      return availableLanguages.map(locale => ({
        id: process.env.ONLY_BUILD_ARTICLE_ID!,
        locale
      }));
    }
    return [{ id: process.env.ONLY_BUILD_ARTICLE_ID }];
  }

  // Sinon, continuer avec la génération complète de tous les articles
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    if (!rvcode) {
      console.error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
      return [{ id: 'no-articles-found' }];
    }

    const { data: articles } = await fetchArticles({
      rvcode,
      page: 1,
      itemsPerPage: 5000
    });

    if (!articles || !articles.length) {
      console.log('Aucun article trouvé. Génération d\'une page placeholder.');
      return [{ id: "no-articles-found" }];
    }

    console.log(`Génération de ${articles.length} articles ${hasMultipleLanguages ? `x ${availableLanguages.length} langues` : ''}.`);

    // Generate params for all articles, potentially with locale variants
    const params: Array<{ id: string; locale?: string }> = [];

    articles.forEach((article: FetchedArticle) => {
      if (hasMultipleLanguages) {
        // Generate for each locale
        availableLanguages.forEach(locale => {
          params.push({
            id: article?.id.toString(),
            locale
          });
        });
      } else {
        // Single language, no locale param
        params.push({
          id: article?.id.toString()
        });
      }
    });

    return params;
  } catch (error) {
    console.error('Error generating static params for articles:', error);
    return [{ id: 'no-articles-found' }];
  }
}

export default async function ArticleDetailsPage({ params }: ArticleDetailsPageProps) {
  try {
    // Get locale from params, default to configured default language
    const locale = params.locale || defaultLanguage;

    // Fetch translations server-side
    const translations = await getServerTranslations(locale);

    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return (
        <div className="error-message">
          <h1>Aucun article disponible</h1>
          <p>Page placeholder pour les détails d'articles</p>
        </div>
      );
    }

    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
    }
    const language = locale || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en';

    // Fetch all data server-side for complete pre-rendering
    const [article, metadataCSL, metadataBibTeX] = await Promise.all([
      fetchArticle(params.id),
      fetchArticleMetadata({ rvcode, paperid: params.id, type: METADATA_TYPE.CSL }).catch(() => null),
      fetchArticleMetadata({ rvcode, paperid: params.id, type: METADATA_TYPE.BIBTEX }).catch(() => null)
    ]);

    // Fetch related volume if article has volumeId
    let relatedVolume: IVolume | null = null;
    if (article?.volumeId && rvcode) {
      try {
        relatedVolume = await fetchVolume({
          rvcode,
          vid: article.volumeId.toString(),
          language
        });
      } catch (error) {
        console.error('Error fetching volume:', error);
      }
    }

    // Use server-side rendering for maximum pre-rendering
    if (article) {
      return (
        <ArticleDetailsServer
          article={article as IArticle}
          id={params.id}
          relatedVolume={relatedVolume}
          metadataCSL={metadataCSL}
          metadataBibTeX={metadataBibTeX}
          translations={translations}
          locale={locale}
        />
      );
    }

    // Fallback to client component if no article data
    return (
      <ArticleDetailsClient
        article={null}
        id={params.id}
        initialRelatedVolume={relatedVolume}
        initialMetadataCSL={metadataCSL}
        initialMetadataBibTeX={metadataBibTeX}
      />
    );
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
import React from 'react';
import { Metadata } from 'next';
import { fetchArticle, fetchArticles, fetchArticleMetadata } from '@/services/article';
import { fetchVolume } from '@/services/volume';
import { getJournalByCode } from '@/services/journal';
import ArticleDetailsClient from './ArticleDetailsClient';
import ArticleDetailsServer from './ArticleDetailsServer';
import { FetchedArticle, METADATA_TYPE } from '@/utils/article';
import { IArticle } from '@/types/article';
import { IVolume } from '@/types/volume';
import { getServerTranslations, t, defaultLanguage, availableLanguages } from '@/utils/server-i18n';
import { getLanguageFromParams } from '@/utils/language-utils';
import { combineWithLanguageParams } from '@/utils/static-params-helper';
import { initBuildProgress, logArticleProgress } from '@/utils/build-progress';
import { generateArticleMetadata } from '@/components/Meta/ArticleMeta/ArticleMeta';
import { AvailableLanguage } from '@/utils/i18n';
import { cacheLife } from 'next/cache';

/**
 * generateStaticParams for On-Demand ISR
 * Returns empty array - pages will be generated on-demand when visited
 * This approach is optimal for multi-tenant with 40+ journals and thousands of articles
 */
export async function generateStaticParams() {
  // On-Demand ISR: generate nothing at build time
  // Pages are generated on first request and cached with revalidate=3600
  return [];
}

interface ArticleDetailsPageProps {
  params: Promise<{
    id: string;
    lang: string;
    journalId: string;
  }>;
}

export async function generateMetadata(props: ArticleDetailsPageProps): Promise<Metadata> {
  const params = await props.params;
  try {
    const { id, journalId } = params;
    // Vérifier si nous avons un ID factice
    if (id === 'no-articles-found') {
      return {
        title: 'Aucun article disponible',
      };
    }

    const article = await fetchArticle(id, journalId);
    if (!article) {
      return {
        title: 'Article non trouvé',
      };
    }

    // Get language from params
    const language = getLanguageFromParams(params) as AvailableLanguage;

    // Fetch journal data for complete metadata
    let currentJournal = undefined;
    if (journalId) {
      try {
        currentJournal = await getJournalByCode(journalId);
      } catch (error) {
        console.error('Error fetching journal for metadata:', error);
      }
    }

    // Extract keywords - handle both array and object formats
    let keywords: string[] = [];
    if (article.keywords) {
      if (Array.isArray(article.keywords)) {
        keywords = article.keywords;
      } else {
        // If keywords is an object with language keys, get keywords for current language or all
        const keywordsObj = article.keywords as Record<string, string[]>;
        keywords = keywordsObj[language] || Object.values(keywordsObj).flat();
      }
    }

    // Extract authors
    const authors = article.authors || [];

        // Generate complete metadata using the utility function

        return generateArticleMetadata({

          language,

          article,

          currentJournal,

          keywords,

          authors

        });

      } catch (error) {

        console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);

        return {

          title: 'Erreur lors du chargement de l\'article',

        };

      }
}

    

    export default async function ArticleDetailsPage(props: ArticleDetailsPageProps) {
      'use cache';
      cacheLife('hours'); // Article details - revalidate every hour

      const params = await props.params;

      try {

        const { id, journalId } = params;

        // Get language from params

        const language = getLanguageFromParams(params);

    

        // Fetch translations server-side

        const translations = await getServerTranslations(language);

    

        // Vérifier si nous avons un ID factice

        if (id === 'no-articles-found') {

          return (

            <div className="error-message">

              <h1>Aucun article disponible</h1>

              <p>Page placeholder pour les détails d&apos;articles</p>

            </div>

          );

        }

    

        if (!journalId) {

          throw new Error('journalId parameter is required');

        }

    

            // Fetch all data server-side for complete pre-rendering

    

            const [article, metadataCSL, metadataBibTeX] = await Promise.all([

    

              fetchArticle(id, journalId),

    

              fetchArticleMetadata({ rvcode: journalId, paperid: id, type: METADATA_TYPE.CSL }).catch(() => null),

    

              fetchArticleMetadata({ rvcode: journalId, paperid: id, type: METADATA_TYPE.BIBTEX }).catch(() => null)

    

            ]);

    

        

    

        // Fetch related volume if article has volumeId

        let relatedVolume: IVolume | null = null;

                if (article?.volumeId && journalId) {

                  try {

                    relatedVolume = await fetchVolume(

                      journalId,

                      Number(article.volumeId),

                      language

                    );

                  } catch (error) {

        

            console.error('Error fetching volume:', error);

          }

        }

    

                // Use server-side rendering for maximum pre-rendering

    

                if (article) {

    

                  return (

    

                    <ArticleDetailsServer

    

                      article={article as IArticle}

    

                      id={id}

    

                      relatedVolume={relatedVolume}

    

                      metadataCSL={metadataCSL}

    

                      metadataBibTeX={metadataBibTeX}

    

                      translations={translations}

    

                      language={language}

    

                    />

    

                  );

    

                }

    

        

    

                const breadcrumbLabels = {

    

                  home: t('pages.home.title', translations),

    

                  content: t('common.content', translations),

    

                  articles: t('pages.articles.title', translations),

    

                };

    

        

    

                // Fallback to client component if no article data

    

                return (

    

                  <ArticleDetailsClient

    

                    article={null}

    

                    id={id}

    

                    initialRelatedVolume={relatedVolume}

    

                    initialMetadataCSL={metadataCSL}

    

                    initialMetadataBibTeX={metadataBibTeX}

    

                    lang={language}

    

                    breadcrumbLabels={breadcrumbLabels}

    

                  />

    

                );

    

        

        

      } catch (error) {

        console.error(`Erreur lors de la récupération de l'article ${params.id}:`, error);

        return (

          <div className="error-message">

            <h1>Erreur lors du chargement de l&apos;article</h1>

            <p>Impossible de charger les données de l&apos;article.</p>

          </div>

        );

      }
    } 

     
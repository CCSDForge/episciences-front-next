import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
import { loadJournalConfig } from '@/utils/env-loader';
import { getJournalBaseUrl } from '@/utils/signposting';
import { acceptedLanguages } from '@/utils/language-utils';
import { logger } from '@/lib/logger';

interface ArticleDetailsPageProps {
  params: Promise<{
    id: string;
    lang: string;
    journalId: string;
  }>;
}

const getCachedArticle = cache((id: string, journalId: string) => fetchArticle(id, journalId));
const getCachedVolume = cache((journalId: string, volumeId: number, lang: AvailableLanguage) =>
  fetchVolume(journalId, volumeId, lang)
);

export const revalidate = 604800; // 7 days

export async function generateStaticParams() {
  return [];
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

    const language = getLanguageFromParams(params) as AvailableLanguage;

    const [article, currentJournal] = await Promise.all([
      getCachedArticle(id, journalId),
      getJournalByCode(journalId).catch((error: unknown) => {
        logger.error('Error fetching journal for metadata:', error);
        return undefined;
      }),
    ]);

    if (!article) {
      return {
        title: 'Article non trouvé',
      };
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

    const journalConfig = loadJournalConfig(journalId);
    const coarInboxUrl = journalConfig.env.NEXT_PUBLIC_COAR_NOTIFY_INBOX_URL;

    let relatedVolume = null;
    if (article.volumeId) {
      relatedVolume = await getCachedVolume(journalId, Number(article.volumeId), language).catch(
        () => null
      );
    }

    // SEO: Calculate canonical URL and alternates
    const baseUrl = getJournalBaseUrl(journalId);
    const canonicalUrl = `${baseUrl}/${language}/articles/${id}`;
    const pdfDownloadUrl = article.pdfLink ? `${canonicalUrl}/download` : undefined;

    const alternateLanguages: Record<string, string> = {};
    acceptedLanguages.forEach(lang => {
      alternateLanguages[lang] = `${baseUrl}/${lang}/articles/${id}`;
    });

    return generateArticleMetadata({
      language,
      article,
      currentJournal,
      keywords,
      authors,
      coarInboxUrl,
      relatedVolume,
      canonicalUrl,
      alternateLanguages,
      pdfDownloadUrl,
    });
  } catch (error) {
    logger.error(
      `Erreur lors de la récupération des métadonnées de l'article ${params.id}:`,
      error
    );

    return {
      title: "Erreur lors du chargement de l'article",
    };
  }
}

export default async function ArticleDetailsPage(props: ArticleDetailsPageProps) {
  const params = await props.params;

  try {
    const { id, journalId } = params;

    // Get language from params

    const language = getLanguageFromParams(params);

    // Vérifier si nous avons un ID factice

    if (id === 'no-articles-found') {
      return (
        <div className="error-message">
          <h1>Aucun article disponible</h1>

          <p>Page placeholder pour les détails d&apos;articles</p>
        </div>
      );
    }

    // Fetch all data server-side for complete pre-rendering (translations en parallèle)

    const [translations, [article, metadataCSL, metadataBibTeX]] = await Promise.all([
      getServerTranslations(language),
      Promise.all([
        getCachedArticle(id, journalId),

        fetchArticleMetadata({ rvcode: journalId, paperid: id, type: METADATA_TYPE.CSL }).catch(
          () => null
        ),

        fetchArticleMetadata({ rvcode: journalId, paperid: id, type: METADATA_TYPE.BIBTEX }).catch(
          () => null
        ),
      ]),
    ]);

    // Tier 1: null means the journal-scoped API returned no result
    if (!article) {
      notFound();
    }

    // Tier 2: best-effort check — only triggers when the API returns `journalCode`.
    // Primary protection is Tier 1: the request already used a journal-scoped API base URL,
    // so a cross-journal article would have returned null (404) above.
    if (article.journalCode !== undefined && article.journalCode !== journalId) {
      logger.warn('Cross-journal article access blocked', {
        reason: 'article-wrong-journal',
        resourceType: 'article',
        resourceId: id,
        articleJournalCode: article.journalCode,
        requestedJournalCode: journalId,
      });
      notFound();
    }

    // Fetch related volume if article has volumeId

    let relatedVolume: IVolume | null = null;

    if (article.volumeId) {
      try {
        relatedVolume = await getCachedVolume(journalId, Number(article.volumeId), language);
      } catch (error) {
        logger.error('Error fetching volume:', error);
      }
    }

    return (
      <ArticleDetailsServer
        article={article as IArticle}
        id={id}
        journalId={journalId}
        relatedVolume={relatedVolume}
        metadataCSL={metadataCSL}
        metadataBibTeX={metadataBibTeX}
        translations={translations}
        language={language}
      />
    );
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error;
    logger.error(`Erreur lors de la récupération de l'article ${params.id}:`, error);
    throw error;
  }
}

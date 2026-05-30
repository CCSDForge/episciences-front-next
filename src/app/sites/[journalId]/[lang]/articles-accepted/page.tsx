import type { Metadata } from 'next';

import { fetchArticles } from '@/services/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { generateSeoAlternates } from '@/utils/seo';

import dynamic from 'next/dynamic';
import { connection } from 'next/server';
import { logger } from '@/lib/logger';

const ArticlesAcceptedClient = dynamic(() => import('./ArticlesAcceptedClient'));

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.articlesAccepted.title', translations),
    description: t('pages.articlesAccepted.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/articles-accepted'),
  };
}

export default async function ArticlesAcceptedPage(props: {
  params: Promise<{ lang: string; journalId: string }>;
}) {
  await connection();

  const params = await props.params;
  const { lang, journalId } = params;
  try {
    const ARTICLES_ACCEPTED_PER_PAGE = 10;

    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    const [articlesAccepted, translations] = await Promise.all([
      fetchArticles({
        rvcode: journalId,
        page: 1,
        itemsPerPage: ARTICLES_ACCEPTED_PER_PAGE,
        onlyAccepted: true,
        types: [],
      }),
      getServerTranslations(lang),
    ]);

    const formattedArticles = {
      data: Array.isArray(articlesAccepted.data) ? articlesAccepted.data : [],
      totalItems: articlesAccepted.totalItems || 0,
      range: {
        types:
          articlesAccepted.range && 'types' in articlesAccepted.range
            ? Array.isArray(articlesAccepted.range.types)
              ? articlesAccepted.range.types
              : []
            : [],
        years:
          articlesAccepted.range && Array.isArray(articlesAccepted.range.years)
            ? articlesAccepted.range.years
            : [],
      },
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
    logger.error('Error fetching articles accepted:', error);
    return (
      <ArticlesAcceptedClient
        initialArticles={{ data: [], totalItems: 0 }}
        initialRange={{ types: [], years: [] }}
        lang={lang}
      />
    );
  }
}

import { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { fetchNews } from '@/services/news';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import './News.scss';
import { logger } from '@/lib/logger';

const NewsClient = dynamic(() => import('./NewsClient'));

// News are frequently updated - revalidate every hour
export const revalidate = 3600; // 1 hour

// Pre-generate news page for all journals at build time
export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.news.title', translations),
    description: t('pages.news.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/news'),
  };
}

type Props = {
  readonly params: Promise<{ journalId: string; lang: string }>;
};

export default async function NewsPage(props: Props) {
  const params = await props.params;
  const { journalId, lang } = params;

  let newsData = null;

  // Fetch translations independently of news: a translations failure must not
  // discard news data that was already fetched successfully (Promise.all fails fast).
  const translationsPromise = getServerTranslations(lang).catch(error => {
    logger.warn('[NewsPage] Failed to fetch translations:', error);
    return {};
  });

  try {
    newsData = await fetchNews({ rvcode: journalId });
  } catch (error) {
    logger.warn('[NewsPage] Failed to fetch news:', error);
    // Data remains at fallback values
  }

  const translations = await translationsPromise;

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    news: t('pages.news.title', translations),
  };

  return (
    <Suspense>
      <NewsClient initialNews={newsData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
    </Suspense>
  );
}

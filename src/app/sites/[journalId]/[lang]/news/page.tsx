import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchNews } from '@/services/news';
import { getServerTranslations, t } from '@/utils/server-i18n';
import './News.scss';

const NewsClient = dynamic(() => import('./NewsClient'));

// News are frequently updated - revalidate every hour
export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Dernières actualités de la revue',
};

type Props = {
  params: Promise<{ journalId: string; lang: string }>;
};

export default async function NewsPage(props: Props) {
  const params = await props.params;
  const { journalId, lang } = params;

  let newsData = null;
  let translations = {};

  try {
    // Fetch news and translations in parallel
    [newsData, translations] = await Promise.all([
      fetchNews({ rvcode: journalId }),
      getServerTranslations(lang),
    ]);
  } catch (error) {
    console.warn('[NewsPage] Failed to fetch data:', error);
    // Data remains at fallback values
  }

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    news: t('pages.news.title', translations),
  };

  return <NewsClient initialNews={newsData} lang={lang} breadcrumbLabels={breadcrumbLabels} />;
}

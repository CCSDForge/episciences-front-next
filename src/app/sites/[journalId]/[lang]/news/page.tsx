import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchNews } from '@/services/news';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { cacheLife } from 'next/cache';
import './News.scss';

const NewsClient = dynamic(() => import('./NewsClient'));

export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Dernières actualités de la revue',
};

type Props = {
  params: Promise<{ journalId: string; lang: string }>;
};

export default async function NewsPage(props: Props) {
  'use cache';
  cacheLife('hours'); // News - mises à jour plusieurs fois par jour

  const params = await props.params;
  const { journalId, lang } = params;

  let newsData = null;

  try {
    newsData = await fetchNews({ rvcode: journalId });
  } catch (error) {
    console.error('Error fetching news:', error);
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    news: t('pages.news.title', translations),
  };

  return <NewsClient initialNews={newsData} lang={lang} breadcrumbLabels={breadcrumbLabels} />;
}
 
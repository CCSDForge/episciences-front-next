import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchNews } from '@/services/news';
import './News.scss';

const NewsClient = dynamic(() => import('./NewsClient'));

export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Dernières actualités de la revue',
};

type Props = {
  params: { journalId: string; lang: string };
};

export default async function NewsPage({ params }: Props) {
  const { journalId } = params;
  
  let newsData = null;
  
  try {
    newsData = await fetchNews({ rvcode: journalId });
  } catch (error) {
    console.error('Error fetching news:', error);
  }

  return <NewsClient initialNews={newsData} lang={params.lang} />;
}
 
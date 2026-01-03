import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchNews } from '@/services/news';
import './News.scss';

import { generateLanguageParamsForPage } from "@/utils/static-params-helper";

const NewsClient = dynamic(() => import('./NewsClient'));


export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Actualités de la revue',
};

export async function generateStaticParams() {
  return generateLanguageParamsForPage('news');
}

export default async function NewsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
    }

    // For static builds, fetch all news for client-side pagination
    const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';
    const itemsPerPage = isStaticBuild ? 9999 : 10;

    const newsData = await fetchNews({
      rvcode,
      page: 1,
      itemsPerPage: itemsPerPage
    });

    return <NewsClient initialNews={newsData} />;
  } catch (error) {
    console.error('Erreur lors du chargement des actualités:', error);
    return (
      <div className="main-container">
        <div className="error-container">
          Une erreur s&apos;est produite lors du chargement des actualités. Veuillez réessayer plus tard.
        </div>
      </div>
    );
  }
} 
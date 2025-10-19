import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchNews } from '@/services/news';
import './News.scss';

import { generateLanguageParams } from "@/utils/static-params-helper";

const NewsClient = dynamic(() => import('./NewsClient'), { ssr: false });


export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Actualités de la revue',
};

export async function generateStaticParams() {
  // Pour une page d'actualités, il n'y a généralement pas de paramètres dynamiques
  return generateLanguageParams();
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
          Une erreur s'est produite lors du chargement des actualités. Veuillez réessayer plus tard.
        </div>
      </div>
    );
  }
} 
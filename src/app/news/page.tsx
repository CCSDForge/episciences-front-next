import { Metadata } from 'next';
import NewsClient from './NewsClient';
import { fetchNews } from '@/services/news';
import './News.scss';

export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Actualités de la revue',
};

export async function generateStaticParams() {
  // Pour une page d'actualités, il n'y a généralement pas de paramètres dynamiques
  return [{ }];
}

export default async function NewsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_CODE || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || '';
    
    if (!rvcode) {
      throw new Error('Le code de la revue est requis');
    }

    const newsData = await fetchNews({
      rvcode,
      page: 1,
      itemsPerPage: 10
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
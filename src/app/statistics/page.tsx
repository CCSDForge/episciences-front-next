import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Statistics.scss';
import { fetchStatistics } from '@/services/statistics';
import { IStatResponse, IStat } from '@/types/stat';

const StatisticsClient = dynamic(() => import('./StatisticsClient'), { ssr: false });


export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

export default async function StatisticsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
    }
    
    const response = await fetchStatistics({
      rvcode,
      page: 1,
      itemsPerPage: 7
    }) as IStat[];

    // Obtenir les années disponibles (par exemple, les 5 dernières années)
    const currentYear = new Date().getFullYear();
    const availableYears = Array.from({length: 5}, (_, i) => currentYear - i);

    // Adapter la réponse au format attendu
    const stats: IStatResponse = {
      'hydra:member': response,
      'hydra:totalItems': response.length,
      'hydra:range': {
        years: availableYears
      },
      data: response,
      totalItems: response.length,
      range: {
        years: availableYears
      }
    };

    return <StatisticsClient initialStats={stats} />;
  } catch (error) {
    console.error('Error fetching statistics data:', error);
    return (
      <div className="main-container">
        <div className="error-container">
          Une erreur s'est produite lors du chargement des statistiques. Veuillez réessayer plus tard.
        </div>
      </div>
    );
  }
} 
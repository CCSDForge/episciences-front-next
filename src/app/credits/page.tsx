import { Metadata } from 'next';
import { fetchCreditsPage } from '@/services/credits';
import CreditsClient from './CreditsClient';
import './Credits.scss';

export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Crédits et remerciements',
};

export async function generateStaticParams() {
  // Pour une page de crédits, il n'y a généralement pas de paramètres dynamiques
  return [{ }];
}

export default async function CreditsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_CODE || '';
    
    if (!rvcode) {
      throw new Error('Le code de la revue est requis');
    }
    
    const creditsPage = await fetchCreditsPage(rvcode);

    return <CreditsClient creditsPage={creditsPage} />;
  } catch (error) {
    console.error('Erreur lors du chargement des crédits:', error);
    return (
      <div className="main-container">
        <div className="error-container">
          Une erreur s'est produite lors du chargement des crédits. Veuillez réessayer plus tard.
        </div>
      </div>
    );
  }
} 
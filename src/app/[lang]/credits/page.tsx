import { Metadata } from 'next';
import { fetchCreditsPage } from '@/services/credits';
import dynamic from 'next/dynamic';
import './Credits.scss';

import { generateLanguageParamsForPage } from "@/utils/static-params-helper";

const CreditsClient = dynamic(() => import('./CreditsClient'));


export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Crédits et remerciements',
};

export async function generateStaticParams() {
  return generateLanguageParamsForPage('credits');
}

export default async function CreditsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE environment variable is required');
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
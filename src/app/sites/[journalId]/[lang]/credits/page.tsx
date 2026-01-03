import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Credits.scss';
import { fetchCreditsPage } from '@/services/credits';

const CreditsClient = dynamic(() => import('./CreditsClient'));

export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Crédits et mentions légales',
};

export default async function CreditsPage({ params }: { params: { journalId: string; lang: string } }) {
  let pageData = null;
  const { journalId, lang } = params;
  
  try {
    if (journalId) {
      const rawData = await fetchCreditsPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      }
    }
  } catch (error) {
    console.error('Error fetching credits page:', error);
  }
  
  return <CreditsClient creditsPage={pageData} lang={lang} />;
}
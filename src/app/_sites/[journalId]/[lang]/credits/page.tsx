import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Credits.scss';
import { fetchCreditsPage } from '@/services/credits';

const CreditsClient = dynamic(() => import('./CreditsClient'));

export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Crédits et mentions légales',
};

export default async function CreditsPage() {
  let pageData = null;
  
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    if (rvcode) {
      const rawData = await fetchCreditsPage(rvcode);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      }d
    }
  } catch (error) {
    console.error('Error fetching credits page:', error);
  }
  
  return <CreditsClient initialPage={pageData} />;
}
import { Metadata } from 'next';
import AboutClient from './AboutClient';
import './About.scss';
import { fetchAboutPage } from '@/services/about';
import { IPage } from '@/types/page';

export const metadata: Metadata = {
  title: 'À propos',
  description: 'À propos de la revue',
};

export async function generateStaticParams() {
  // Pour une page à propos, il n'y a généralement pas de paramètres dynamiques
  return [{ }];
}

export default async function AboutPage() {
  let pageData = null;
  
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (rvcode) {
      // Récupérer les données
      const rawData = await fetchAboutPage(rvcode);
      
      if (!rawData?.['hydra:member']?.[0]) {
        throw new Error('No about page data found');
      }
      
      pageData = rawData['hydra:member'][0];
    }
  } catch (error) {
    console.error('Error fetching about page:', error);
  }
  
  return <AboutClient initialPage={pageData} />;
} 
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './About.scss';
import { fetchAboutPage } from '@/services/about';
import { IPage } from '@/types/page';

import { generateLanguageParamsForPage } from "@/utils/static-params-helper";
import { getLanguageFromParams } from "@/utils/language-utils";
const AboutClient = dynamic(() => import('./AboutClient'));


export const metadata: Metadata = {
  title: 'À propos',
  description: 'À propos de la revue',
};

export async function generateStaticParams() {
  return generateLanguageParamsForPage('about');
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
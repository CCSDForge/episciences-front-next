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

export default async function AboutPage({ params }: { params: { journalId: string; lang: string } }) {

  let pageData = null;

  const { journalId } = params;

  

  try {

    if (journalId) {

      // Récupérer les données

      const rawData = await fetchAboutPage(journalId);

      

      if (!rawData?.['hydra:member']?.[0]) {

        throw new Error(`No about page data found for journal ${journalId}`);

      }

      

      pageData = rawData['hydra:member'][0];

    }

  } catch (error) {

    console.error(`Error fetching about page for journal ${journalId}:`, error);

  }

  

  return <AboutClient initialPage={pageData} />;

}

 
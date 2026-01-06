import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './About.scss';
import { fetchAboutPage } from '@/services/about';
import { IPage } from '@/types/page';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { connection } from 'next/server';

import { generateLanguageParamsForPage } from "@/utils/static-params-helper";
import { getLanguageFromParams } from "@/utils/language-utils";
const AboutClient = dynamic(() => import('./AboutClient'));

export const metadata: Metadata = {
  title: 'À propos',
  description: 'À propos de la revue',
};

export default async function AboutPage(props: { params: Promise<{ journalId: string; lang: string }> }) {
  await connection();

  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

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

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    about: t('pages.about.title', translations),
  };

  return (
    <AboutClient 
      initialPage={pageData} 
      lang={lang} 
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}

  

  

 
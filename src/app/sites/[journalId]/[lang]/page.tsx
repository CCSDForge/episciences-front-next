import { Metadata } from 'next';

import { fetchHomeData } from '@/services/home';

import { getFormattedSiteTitle } from '@/utils/metadata';

import dynamicImport from 'next/dynamic';

import '@/styles/pages/Home.scss';

const HomeClient = dynamicImport(() => import('@/components/HomeClient/HomeClient'), );

export const metadata: Metadata = {
  title: getFormattedSiteTitle('Accueil'),
  description: 'Page d\'accueil de la revue',
};

// Fonction pour obtenir la langue par défaut
function getDefaultLanguage(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'fr';
}

export default async function HomePage(props: { params: Promise<{ journalId: string; lang: string }> }) {
  const params = await props.params;
  const language = params.lang || 'fr';
  const rvcode = params.journalId;

  let homeData = {};

  try {
    homeData = await fetchHomeData(rvcode, language);
  } catch (error) {
    console.error(`Error fetching home data for journal ${rvcode}:`, error);
  }

  return (
    <HomeClient homeData={homeData} language={language} journalId={rvcode} />
  );
}

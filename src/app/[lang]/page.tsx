import { generateLanguageParams } from '@/utils/static-params-helper';

import { Metadata } from 'next';

import { fetchHomeData } from '@/services/home';

import { getFormattedSiteTitle } from '@/utils/metadata';

import dynamicImport from 'next/dynamic';

import '@/styles/pages/Home.scss';



export async function generateStaticParams() {
  return generateLanguageParams();
}

const HomeClient = dynamicImport(() => import('@/components/HomeClient/HomeClient'), { ssr: false });

export const metadata: Metadata = {
  title: getFormattedSiteTitle('Accueil'),
  description: 'Page d\'accueil de la revue',
};

// Fonction pour obtenir la langue par défaut
function getDefaultLanguage(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'fr';
}

export default async function HomePage() {
  const language = getDefaultLanguage();
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
  
  let homeData = {};
  
  try {
    homeData = await fetchHomeData(rvcode, language);
  } catch (error) {
    console.error('Error fetching home data:', error);
  }

  return (
    <HomeClient homeData={homeData} language={language} />
  );
}

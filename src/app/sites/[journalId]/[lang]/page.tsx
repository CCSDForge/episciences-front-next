import { Metadata } from 'next';
import { fetchHomeData } from '@/services/home';
import { getFormattedSiteTitle } from '@/utils/metadata';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { acceptedLanguages } from '@/utils/language-utils';
import { getFilteredJournals } from '@/utils/journal-filter';
import dynamicImport from 'next/dynamic';
import { generateSeoAlternates } from '@/utils/seo';
import { getPublicJournalConfig } from '@/utils/env-loader';
import '@/styles/pages/Home.scss';
import { logger } from '@/lib/logger';

const HomeClient = dynamicImport(() => import('@/components/HomeClient/HomeClient'));

// Home page content (latest volume + journal info) updates approximately weekly
// Daily revalidation is sufficient
export const revalidate = 86400; // 24 hours

export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: getFormattedSiteTitle(t('pages.home.title', translations)),
    description: t('pages.home.metaDescription', translations),
    alternates: generateSeoAlternates(journalId, lang, '/'),
  };
}

// Fonction pour obtenir la langue par défaut
function getDefaultLanguage(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'fr';
}

export default async function HomePage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const language = params.lang || 'fr';
  const rvcode = params.journalId;

  let homeData = {};

  try {
    homeData = await fetchHomeData(rvcode, language);
  } catch (error) {
    logger.error(`Error fetching home data for journal ${rvcode}:`, error);
  }

  const journalConfig = getPublicJournalConfig(rvcode);

  return <HomeClient homeData={homeData} language={language} journalId={rvcode} journalConfig={journalConfig} />;
}

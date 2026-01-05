import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Credits.scss';
import { fetchCreditsPage } from '@/services/credits';
import { getServerTranslations, t } from '@/utils/server-i18n';

const CreditsClient = dynamic(() => import('./CreditsClient'));

// Static content - revalidate once per day (86400 seconds = 24 hours)
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Crédits et mentions légales',
};

export default async function CreditsPage(props: { params: Promise<{ journalId: string; lang: string }> }) {
  const params = await props.params;
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

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    credits: t('pages.credits.title', translations),
  };

  return (
    <CreditsClient 
      creditsPage={pageData} 
      lang={lang} 
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}
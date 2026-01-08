import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Credits.scss';
import { fetchCreditsPage } from '@/services/credits';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { connection } from 'next/server';

const CreditsClient = dynamic(() => import('./CreditsClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Crédits',
  description: 'Crédits et mentions légales',
};

export default async function CreditsPage(props: { params: Promise<{ journalId: string; lang: string }> }) {
  const params = await props.params;
  const { journalId, lang } = params;

  let pageData = null;
  let translations = {};

  try {
    // Fetch page data and translations in parallel
    [pageData, translations] = await Promise.all([
      journalId ? fetchCreditsPage(journalId) : null,
      getServerTranslations(lang)
    ]);
  } catch (error) {
    console.warn('[CreditsPage] Failed to fetch data:', error);
    // pageData and translations remain at fallback values
  }

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
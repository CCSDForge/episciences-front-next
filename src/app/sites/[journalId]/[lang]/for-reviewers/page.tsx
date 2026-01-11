import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchForReviewersPage } from '@/services/forReviewers';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';

const ForReviewersClient = dynamic(() => import('./ForReviewersClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

export const metadata: Metadata = {
  title: 'For Reviewers',
  description: 'Information for journal reviewers',
};

export default async function ForReviewersPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  try {
    if (journalId) {
      const rawData = await fetchForReviewersPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        console.warn(
          `[Build] For Reviewers page content not found for journal "${journalId}" on API.`
        );
      }
    }
  } catch (error) {
    console.warn(`[Build] Could not reach API for For Reviewers page of journal "${journalId}".`);
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-reviewers', translations),
    current: t('pages.forReviewers.title', translations),
  };

  return (
    <ForReviewersClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
  );
}

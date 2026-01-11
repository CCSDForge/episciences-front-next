import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchForConferenceOrganisersPage } from '@/services/forConferenceOrganisers';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';

const ForConferenceOrganisersClient = dynamic(() => import('./ForConferenceOrganisersClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

export const metadata: Metadata = {
  title: 'For Conference Organisers',
  description: 'Information for conference organisers',
};

export default async function ForConferenceOrganisersPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  try {
    if (journalId) {
      const rawData = await fetchForConferenceOrganisersPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        console.warn(
          `[Build] For Conference Organisers page content not found for journal "${journalId}" on API.`
        );
      }
    }
  } catch (error) {
    console.warn(
      `[Build] Could not reach API for For Conference Organisers page of journal "${journalId}".`
    );
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/for-conference-organisers', translations),
    current: t('pages.forConferenceOrganisers.title', translations),
  };

  return (
    <ForConferenceOrganisersClient
      initialPage={pageData}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}

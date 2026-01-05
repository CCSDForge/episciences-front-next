import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchEditorialWorkflowPage, fetchEthicalCharterPage, fetchPrepareSubmissionPage } from '@/services/forAuthors';
import { getServerTranslations, t } from '@/utils/server-i18n';

const ForAuthorsClient = dynamic(() => import('./ForAuthorsClient'));

// Static content - revalidate once per day (86400 seconds = 24 hours)
export const revalidate = 86400;

// Cette fonction est aussi appelée au build time
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'For Authors',
  };
}

export default async function ForAuthorsPage({ params }: { params: { journalId: string; lang: string } }) {
  const { journalId, lang } = params;

  if (!journalId) {
    throw new Error('journalId is not defined');
  }

  const [editorialWorkflowPage, ethicalCharterPage, prepareSubmissionPage, translations] = await Promise.all([
    fetchEditorialWorkflowPage(journalId),
    fetchEthicalCharterPage(journalId),
    fetchPrepareSubmissionPage(journalId),
    getServerTranslations(lang)
  ]);

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    forAuthors: t('pages.forAuthors.title', translations),
  };

  return (
    <ForAuthorsClient
      editorialWorkflowPage={editorialWorkflowPage}
      ethicalCharterPage={ethicalCharterPage}
      prepareSubmissionPage={prepareSubmissionPage}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}

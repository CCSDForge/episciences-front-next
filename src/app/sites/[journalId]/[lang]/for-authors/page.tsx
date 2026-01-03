import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchEditorialWorkflowPage, fetchEthicalCharterPage, fetchPrepareSubmissionPage } from '@/services/forAuthors';

const ForAuthorsClient = dynamic(() => import('./ForAuthorsClient'));

// Cette fonction est aussi appelée au build time
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'For Authors',
  };
}

export default async function ForAuthorsPage({ params }: { params: { journalId: string } }) {
  const { journalId } = params;

  if (!journalId) {
    throw new Error('journalId is not defined');
  }

  const [editorialWorkflowPage, ethicalCharterPage, prepareSubmissionPage] = await Promise.all([
    fetchEditorialWorkflowPage(journalId),
    fetchEthicalCharterPage(journalId),
    fetchPrepareSubmissionPage(journalId)
  ]);

  return (
    <ForAuthorsClient
      editorialWorkflowPage={editorialWorkflowPage}
      ethicalCharterPage={ethicalCharterPage}
      prepareSubmissionPage={prepareSubmissionPage}
    />
  );
}
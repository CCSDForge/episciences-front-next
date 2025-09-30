import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchEditorialWorkflowPage, fetchEthicalCharterPage, fetchPrepareSubmissionPage } from '@/services/forAuthors';

const ForAuthorsClient = dynamic(() => import('./ForAuthorsClient'), { ssr: false });


// Cette fonction est appelée au build time
export async function generateStaticParams() {
  return [];
}

// Cette fonction est aussi appelée au build time
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'For Authors',
  };
}

export default async function ForAuthorsPage() {
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

  if (!rvcode) {
    throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
  }

  const [editorialWorkflowPage, ethicalCharterPage, prepareSubmissionPage] = await Promise.all([
    fetchEditorialWorkflowPage(rvcode),
    fetchEthicalCharterPage(rvcode),
    fetchPrepareSubmissionPage(rvcode)
  ]);

  return (
    <ForAuthorsClient
      editorialWorkflowPage={editorialWorkflowPage}
      ethicalCharterPage={ethicalCharterPage}
      prepareSubmissionPage={prepareSubmissionPage}
    />
  );
} 
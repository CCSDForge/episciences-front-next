import { generateLanguageParamsForPage } from '@/utils/static-params-helper';

import { Metadata } from 'next';

import { fetchBoardMembers, fetchBoardPages } from '@/services/board';

import dynamic from 'next/dynamic';



export async function generateStaticParams() {
  return generateLanguageParamsForPage('boards');
}

const BoardsClient = dynamic(() => import('./BoardsClient'));


export const metadata: Metadata = {
  title: 'Boards',
};

export default async function BoardsPage() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }
    
    const [pages, members] = await Promise.all([
      fetchBoardPages(rvcode),
      fetchBoardMembers(rvcode)
    ]);
    
    return (
      <BoardsClient 
        initialPages={pages} 
        initialMembers={members}
      />
    );
  } catch (error) {
    console.error('Error fetching boards:', error);
    return <div>Failed to load boards</div>;
  }
} 
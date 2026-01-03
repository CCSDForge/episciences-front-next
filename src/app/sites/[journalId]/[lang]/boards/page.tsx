import { Metadata } from 'next';

import { fetchBoardMembers, fetchBoardPages } from '@/services/board';

import dynamic from 'next/dynamic';

const BoardsClient = dynamic(() => import('./BoardsClient'));


export const metadata: Metadata = {
  title: 'Boards',
};

export default async function BoardsPage({ params }: { params: { journalId: string } }) {
  try {
    const { journalId } = params;
    
    if (!journalId) {
      throw new Error('journalId is not defined');
    }
    
    const [pages, members] = await Promise.all([
      fetchBoardPages(journalId),
      fetchBoardMembers(journalId)
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
 
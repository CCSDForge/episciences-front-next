import { Metadata } from 'next';

import { fetchBoardMembers, fetchBoardPages } from '@/services/board';
import { getServerTranslations, t } from '@/utils/server-i18n';

import dynamic from 'next/dynamic';
import { connection } from 'next/server';

const BoardsClient = dynamic(() => import('./BoardsClient'));

export const metadata: Metadata = {
  title: 'Boards',
};

export default async function BoardsPage(props: { params: Promise<{ journalId: string; lang: string }> }) {
  await connection();

  const params = await props.params;
  try {
    const { journalId, lang } = params;
    
    if (!journalId) {
      throw new Error('journalId is not defined');
    }
    
    // Fetch translations server-side
    const translations = await getServerTranslations(lang);
    
    const [pages, members] = await Promise.all([
      fetchBoardPages(journalId),
      fetchBoardMembers(journalId)
    ]);
    
    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      boards: t('pages.boards.title', translations),
    };

    const membersCountLabels = {
      member: t('common.member', translations),
      members: t('common.members', translations),
    };

    const rolesLabels = {
      'technical-board': t('pages.boards.types.technicalBoard', translations),
      'editorial-board': t('pages.boards.types.editorialBoard', translations),
      'scientific-advisory-board': t('pages.boards.types.scientificAdvisoryBoard', translations),
      'former-members': t('pages.boards.types.formerMember', translations),
      'guest-editor': t('pages.boards.roles.guestEditor', translations),
      'editor': t('pages.boards.roles.editor', translations),
      'chief-editor': t('pages.boards.roles.chiefEditor', translations),
      'secretary': t('pages.boards.roles.secretary', translations),
      'former-member': t('pages.boards.roles.formerMember', translations),
      'member': t('pages.boards.roles.member', translations),
    };

    const tableOfContentsLabel = t('pages.boards.tableOfContents', translations);

    return (
      <BoardsClient 
        initialPages={pages} 
        initialMembers={members}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
        membersCountLabels={membersCountLabels}
        rolesLabels={rolesLabels}
        tableOfContentsLabel={tableOfContentsLabel}
      />
    );
  } catch (error) {
    console.error('Error fetching boards:', error);
    return <div>Failed to load boards</div>;
  }
}
 
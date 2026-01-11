import { Metadata } from 'next';

import { fetchBoardMembers, fetchBoardPages } from '@/services/board';
import { getServerTranslations, t } from '@/utils/server-i18n';

import dynamic from 'next/dynamic';

const BoardsClient = dynamic(() => import('./BoardsClient'));

// Board membership changes infrequently - daily revalidation is appropriate
export const revalidate = 86400; // 24 hours

export const metadata: Metadata = {
  title: 'Boards',
};

export default async function BoardsPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
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
      fetchBoardMembers(journalId),
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
      // Board types
      'introduction-board': t('pages.boards.types.introductionBoard', translations),
      'technical-board': t('pages.boards.types.technicalBoard', translations),
      'editorial-board': t('pages.boards.types.editorialBoard', translations),
      'scientific-advisory-board': t('pages.boards.types.scientificAdvisoryBoard', translations),
      'reviewers-board': t('pages.boards.types.reviewersBoard', translations),
      'former-members': t('pages.boards.types.formerMember', translations),
      'operating-charter-board': t('pages.boards.types.operatingCharterBoard', translations),

      // Member roles
      'chief-editor': t('pages.boards.roles.chiefEditor', translations),
      'managing-editor': t('pages.boards.roles.managingEditor', translations),
      editor: t('pages.boards.roles.editor', translations),
      'handling-editor': t('pages.boards.roles.handlingEditor', translations),
      'guest-editor': t('pages.boards.roles.guestEditor', translations),
      secretary: t('pages.boards.roles.secretary', translations),
      'advisory-board': t('pages.boards.roles.advisoryBoard', translations),
      member: t('pages.boards.roles.member', translations),
      'former-member': t('pages.boards.roles.formerMember', translations),
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
    console.warn(
      `[Build] Boards data could not be fully loaded for journal "${params.journalId}" (API mismatch or error).`
    );
    return <div>Content currently unavailable for this journal.</div>;
  }
}

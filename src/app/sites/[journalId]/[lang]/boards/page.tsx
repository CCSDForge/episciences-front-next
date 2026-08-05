import { Metadata } from 'next';

import { fetchBoardMembers, fetchBoardPages } from '@/services/board';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';

import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

const BoardsClient = dynamic(() => import('./BoardsClient'));

// Board membership changes infrequently - daily revalidation is appropriate
export const revalidate = 86400; // 24 hours

// Pre-generate boards page for all journals at build time
export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.boards.title', translations),
    description: t('pages.boards.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/boards'),
  };
}

export default async function BoardsPage(props: {
  readonly params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;

  // Only the data fetching is wrapped: the degraded UI below is rendered outside the
  // try/catch so that no JSX tree sits inside an error handler.
  let translations: Awaited<ReturnType<typeof getServerTranslations>> | null = null;
  let pages: Awaited<ReturnType<typeof fetchBoardPages>> | null = null;
  let members: Awaited<ReturnType<typeof fetchBoardMembers>> | null = null;

  try {
    if (!journalId) {
      throw new Error('journalId is not defined');
    }

    [translations, pages, members] = await Promise.all([
      getServerTranslations(lang),
      fetchBoardPages(journalId),
      fetchBoardMembers(journalId),
    ]);
  } catch {
    logger.warn(
      `[Build] Boards data could not be fully loaded for journal "${params.journalId}" (API mismatch or error).`
    );
  }

  if (!translations || !pages || !members) {
    return <div>Content currently unavailable for this journal.</div>;
  }

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
    copyeditor: t('pages.boards.roles.copyeditor', translations),
    secretary: t('pages.boards.roles.secretary', translations),
    'advisory-board': t('pages.boards.roles.advisoryBoard', translations),
    member: t('pages.boards.roles.member', translations),
    'former-member': t('pages.boards.roles.formerMember', translations),
  };

  const tableOfContentsLabel = t('pages.boards.tableOfContents', translations);

  return (
    <>
      <JsonLd
        data={generateWebPageJsonLd('WebPage', journalId, lang, '/boards', {
          name: t('pages.boards.title', translations),
        })}
      />
      <BoardsClient
        initialPages={pages}
        initialMembers={members}
        lang={lang}
        breadcrumbLabels={breadcrumbLabels}
        membersCountLabels={membersCountLabels}
        rolesLabels={rolesLabels}
        tableOfContentsLabel={tableOfContentsLabel}
      />
    </>
  );
}

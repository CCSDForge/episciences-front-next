import { API_URL } from '@/config/api';
import { AvailableLanguage } from '@/utils/i18n';
import { getJournalApiUrl } from '@/utils/env-loader';
import { transformBoardMembers, RawBoardMember } from '@/utils/board-transforms';

export interface IBoardMemberAffiliation {
  label: string;
  rorId: string;
}

export interface IBoardMemberAssignedSection {
  sid: number;
  titles: Record<AvailableLanguage, string>;
}

export interface IBoardMember {
  id: number;
  firstname: string;
  lastname: string;
  email?: string;
  biography?: string;
  roles: string[];
  affiliations: IBoardMemberAffiliation[];
  assignedSections: IBoardMemberAssignedSection[];
  twitter?: string;
  mastodon?: string;
  website?: string;
  orcid?: string;
  picture?: string;
}

export interface IBoardPage {
  id: number;
  page_code: string;
  title: Record<AvailableLanguage, string>;
  content: Record<AvailableLanguage, string>;
  rvcode: string;
}

export enum BOARD_TYPE {
  INTRODUCTION_BOARD = 'introduction-board',
  SCIENTIFIC_ADVISORY_BOARD = 'scientific-advisory-board',
  EDITORIAL_BOARD = 'editorial-board',
  TECHNICAL_BOARD = 'technical-board',
  REVIEWERS_BOARD = 'reviewers-board',
  FORMER_MEMBERS = 'former-members',
  OPERATING_CHARTER_BOARD = 'operating-charter-board',
}

export const boardTypes = [
  BOARD_TYPE.INTRODUCTION_BOARD,
  BOARD_TYPE.EDITORIAL_BOARD,
  BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
  BOARD_TYPE.TECHNICAL_BOARD,
  BOARD_TYPE.REVIEWERS_BOARD,
  BOARD_TYPE.FORMER_MEMBERS,
  BOARD_TYPE.OPERATING_CHARTER_BOARD,
];

export enum BOARD_ROLE {
  CHIEF_EDITOR = 'chief-editor',
  MANAGING_EDITOR = 'managing-editor',
  EDITOR = 'editor',
  HANDLING_EDITOR = 'handling-editor',
  GUEST_EDITOR = 'guest-editor',
  SECRETARY = 'secretary',
  ADVISORY_BOARD = 'advisory-board',
  MEMBER = 'member',
  FORMER_MEMBER = 'former-member',
}

export const ROLE_PRIORITIES: Record<string, number> = {
  [BOARD_ROLE.CHIEF_EDITOR]: 1,
  [BOARD_ROLE.MANAGING_EDITOR]: 2,
  [BOARD_ROLE.EDITOR]: 3,
  [BOARD_ROLE.HANDLING_EDITOR]: 4,
  [BOARD_ROLE.GUEST_EDITOR]: 5,
  [BOARD_ROLE.SECRETARY]: 6,
  [BOARD_ROLE.ADVISORY_BOARD]: 7,
  [BOARD_ROLE.MEMBER]: 8,
  [BOARD_ROLE.FORMER_MEMBER]: 9,
};

export const getRolePriority = (role: string): number => {
  return ROLE_PRIORITIES[role] || 999;
};

export const defaultBoardRole = (t: (key: string) => string) => {
  return {
    key: BOARD_ROLE.MEMBER,
    label: t('pages.boards.roles.member'),
  };
};

export const getBoardRoles = (t: (key: string) => string, roles: string[]): string => {
  const rolesWithLabels = [
    // Board types
    { key: BOARD_TYPE.INTRODUCTION_BOARD, label: t('pages.boards.types.introductionBoard') },
    { key: BOARD_TYPE.TECHNICAL_BOARD, label: t('pages.boards.types.technicalBoard') },
    { key: BOARD_TYPE.EDITORIAL_BOARD, label: t('pages.boards.types.editorialBoard') },
    {
      key: BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
      label: t('pages.boards.types.scientificAdvisoryBoard'),
    },
    { key: BOARD_TYPE.REVIEWERS_BOARD, label: t('pages.boards.types.reviewersBoard') },
    { key: BOARD_TYPE.FORMER_MEMBERS, label: t('pages.boards.types.formerMember') },
    {
      key: BOARD_TYPE.OPERATING_CHARTER_BOARD,
      label: t('pages.boards.types.operatingCharterBoard'),
    },

    // Member roles
    { key: BOARD_ROLE.CHIEF_EDITOR, label: t('pages.boards.roles.chiefEditor') },
    { key: BOARD_ROLE.MANAGING_EDITOR, label: t('pages.boards.roles.managingEditor') },
    { key: BOARD_ROLE.EDITOR, label: t('pages.boards.roles.editor') },
    { key: BOARD_ROLE.HANDLING_EDITOR, label: t('pages.boards.roles.handlingEditor') },
    { key: BOARD_ROLE.GUEST_EDITOR, label: t('pages.boards.roles.guestEditor') },
    { key: BOARD_ROLE.SECRETARY, label: t('pages.boards.roles.secretary') },
    { key: BOARD_ROLE.ADVISORY_BOARD, label: t('pages.boards.roles.advisoryBoard') },
    { key: BOARD_ROLE.MEMBER, label: t('pages.boards.roles.member') },
    { key: BOARD_ROLE.FORMER_MEMBER, label: t('pages.boards.roles.formerMember') },
  ];

  return rolesWithLabels
    .filter(roleWithLabel => roles.includes(roleWithLabel.key))
    .map(roleWithLabel => roleWithLabel.label)
    .join(', ');
};

// RawBoardMember interface is now defined in utils/board-transforms.ts

export async function fetchBoardPages(rvcode: string): Promise<IBoardPage[]> {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}/pages?pagination=false&rvcode=${rvcode}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch board pages: ${response.status}`);
    }

    const json = await response.json();
    const data = Array.isArray(json) ? json : json['hydra:member'] || [];

    return data
      .filter((page: IBoardPage) => boardTypes.includes(page.page_code as BOARD_TYPE))
      .sort(
        (a: IBoardPage, b: IBoardPage) =>
          boardTypes.indexOf(a.page_code as BOARD_TYPE) -
          boardTypes.indexOf(b.page_code as BOARD_TYPE)
      );
  } catch (error) {
    console.error('Error fetching board pages:', error);
    return [];
  }
}

export const fetchBoardMembers = async (rvcode: string): Promise<IBoardMember[]> => {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const url = `${apiUrl}/journals/boards/${rvcode}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        `[API] Board members not found or error ${response.status} for journal ${rvcode}`
      );
      return []; // Return empty instead of throwing to avoid breaking the build
    }

    const json = await response.json();
    const data: RawBoardMember[] = Array.isArray(json) ? json : json['hydra:member'] || [];
    //  console.log(`Successfully fetched ${data.length} board members`);

    // Use centralized transformation utility
    return transformBoardMembers(data);
  } catch (error) {
    console.error('Error fetching board members:', error);
    return [];
  }
};

// Mock data for development/testing when API isn't available
// ... existing code ...

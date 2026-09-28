import { logger } from '@/lib/logger';

const log = logger.child({ service: 'board' });
import { AvailableLanguage } from '@/utils/i18n';
import { getJournalApiUrl } from '@/utils/env-loader';
import { transformBoardMembers, RawBoardMember } from '@/utils/board-transforms';
import { CACHE_TTL } from '@/utils/cache-ttl';

export interface IBoardMemberAffiliation {
  label: string;
  rorId?: string;
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
  bluesky?: string;
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
  BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
  BOARD_TYPE.EDITORIAL_BOARD,
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
  COPYEDITOR = 'copyeditor',
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
  [BOARD_ROLE.COPYEDITOR]: 6,
  [BOARD_ROLE.SECRETARY]: 7,
  [BOARD_ROLE.ADVISORY_BOARD]: 8,
  [BOARD_ROLE.MEMBER]: 9,
  [BOARD_ROLE.FORMER_MEMBER]: 10,
};

export const getRolePriority = (role: string): number => {
  return ROLE_PRIORITIES[role] || 999;
};

/**
 * Sort roles in a canonical order so labels are consistent across members,
 * regardless of the order returned by the API:
 * member roles first (by ROLE_PRIORITIES), then board types (by boardTypes order),
 * then unknown values (original order preserved).
 */
export const sortBoardRoles = (roles: string[]): string[] => {
  const rank = (role: string): number => {
    if (role in ROLE_PRIORITIES) return ROLE_PRIORITIES[role];
    const typeIndex = boardTypes.indexOf(role as BOARD_TYPE);
    return typeIndex === -1 ? 2000 : 1000 + typeIndex;
  };
  return [...roles].sort((a, b) => rank(a) - rank(b));
};

export const defaultBoardRole = (t: (key: string) => string) => {
  return {
    key: BOARD_ROLE.MEMBER,
    label: t('pages.boards.roles.member'),
  };
};

export const getBoardRoles = (t: (key: string) => string, roles: string[]): string => {
  const labels: Record<string, string> = {
    // Board types
    [BOARD_TYPE.INTRODUCTION_BOARD]: t('pages.boards.types.introductionBoard'),
    [BOARD_TYPE.TECHNICAL_BOARD]: t('pages.boards.types.technicalBoard'),
    [BOARD_TYPE.EDITORIAL_BOARD]: t('pages.boards.types.editorialBoard'),
    [BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD]: t('pages.boards.types.scientificAdvisoryBoard'),
    [BOARD_TYPE.REVIEWERS_BOARD]: t('pages.boards.types.reviewersBoard'),
    [BOARD_TYPE.FORMER_MEMBERS]: t('pages.boards.types.formerMember'),
    [BOARD_TYPE.OPERATING_CHARTER_BOARD]: t('pages.boards.types.operatingCharterBoard'),

    // Member roles
    [BOARD_ROLE.CHIEF_EDITOR]: t('pages.boards.roles.chiefEditor'),
    [BOARD_ROLE.MANAGING_EDITOR]: t('pages.boards.roles.managingEditor'),
    [BOARD_ROLE.EDITOR]: t('pages.boards.roles.editor'),
    [BOARD_ROLE.HANDLING_EDITOR]: t('pages.boards.roles.handlingEditor'),
    [BOARD_ROLE.GUEST_EDITOR]: t('pages.boards.roles.guestEditor'),
    [BOARD_ROLE.COPYEDITOR]: t('pages.boards.roles.copyeditor'),
    [BOARD_ROLE.SECRETARY]: t('pages.boards.roles.secretary'),
    [BOARD_ROLE.ADVISORY_BOARD]: t('pages.boards.roles.advisoryBoard'),
    [BOARD_ROLE.MEMBER]: t('pages.boards.roles.member'),
    [BOARD_ROLE.FORMER_MEMBER]: t('pages.boards.roles.formerMember'),
  };

  return sortBoardRoles(roles)
    .map(role => labels[role])
    .filter(Boolean)
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
      next: { revalidate: CACHE_TTL.pages, tags: ['boards', `boards-${rvcode}`] },
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
    log.error('Error fetching board pages:', error);
    return [];
  }
}

export const fetchBoardMembers = async (rvcode: string): Promise<IBoardMember[]> => {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const url = `${apiUrl}/journals/boards/${rvcode}?pagination=0`;
    const response = await fetch(url, {
      next: {
        revalidate: CACHE_TTL.members,
        tags: ['members', `members-${rvcode}`, 'boards', `boards-${rvcode}`],
      },
    });

    if (!response.ok) {
      log.warn(`[API] Board members not found or error ${response.status} for journal ${rvcode}`);
      return []; // Return empty instead of throwing to avoid breaking the build
    }

    const json = await response.json();
    const data: RawBoardMember[] = Array.isArray(json) ? json : json['hydra:member'] || [];

    // Use centralized transformation utility
    return transformBoardMembers(data);
  } catch (error) {
    log.error('Error fetching board members:', error);
    return [];
  }
};

// Mock data for development/testing when API isn't available
// ... existing code ...

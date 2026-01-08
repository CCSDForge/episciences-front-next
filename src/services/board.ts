import { API_URL } from '@/config/api'
import { AvailableLanguage } from '@/utils/i18n';
import { getJournalApiUrl } from '@/utils/env-loader';

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

export interface IBoardPerTitle {
  title: string;
  description: string;
  members: IBoardMember[];
}

export enum BOARD_TYPE {
  EDITORIAL_BOARD = 'editorial-board',
  TECHNICAL_BOARD = 'technical-board',
  SCIENTIFIC_ADVISORY_BOARD = 'scientific-advisory-board',
  FORMER_MEMBERS = 'former-members'
}

export const boardTypes = [
  BOARD_TYPE.EDITORIAL_BOARD,
  BOARD_TYPE.TECHNICAL_BOARD,
  BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
  BOARD_TYPE.FORMER_MEMBERS
];

export enum BOARD_ROLE {
  MEMBER = 'member',
  GUEST_EDITOR = 'guest-editor',
  EDITOR = 'editor',
  CHIEF_EDITOR = 'chief-editor',
  SECRETARY = 'secretary',
  FORMER_MEMBER = 'former-member'
}

export const defaultBoardRole = (t: (key: string) => string) => {
  return {
    key: BOARD_ROLE.MEMBER,
    label: t('pages.boards.roles.member')
  };
};

export const getBoardRoles = (t: (key: string) => string, roles: string[]): string => {
  const rolesWithLabels = [
    { key: BOARD_TYPE.TECHNICAL_BOARD, label: t('pages.boards.types.technicalBoard') },
    { key: BOARD_TYPE.EDITORIAL_BOARD, label: t('pages.boards.types.editorialBoard') },
    { key: BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD, label: t('pages.boards.types.scientificAdvisoryBoard') },
    { key: BOARD_TYPE.FORMER_MEMBERS, label: t('pages.boards.types.formerMember') },
    { key: BOARD_ROLE.GUEST_EDITOR, label: t('pages.boards.roles.guestEditor') },
    { key: BOARD_ROLE.EDITOR, label: t('pages.boards.roles.editor') },
    { key: BOARD_ROLE.CHIEF_EDITOR, label: t('pages.boards.roles.chiefEditor') },
    { key: BOARD_ROLE.SECRETARY, label: t('pages.boards.roles.secretary') },
    { key: BOARD_ROLE.FORMER_MEMBER, label: t('pages.boards.roles.formerMember') }
  ];

  return rolesWithLabels
    .filter(roleWithLabel => roles.includes(roleWithLabel.key))
    .map(roleWithLabel => roleWithLabel.label)
    .join(', ');
};

interface RawBoardMember {
  id: number;
  firstname: string;
  lastname: string;
  email?: string;
  roles: string[][];
  orcid?: string;
  picture?: string;
  assignedSections?: {
    sid: number;
    titles: Record<AvailableLanguage, string>
  }[];
  additionalProfileInformation?: {
    biography?: string;
    affiliations: IBoardMemberAffiliation[];
    socialMedias?: string;
    webSites: string[];
  };
}

export async function fetchBoardPages(rvcode: string): Promise<IBoardPage[]> {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}/pages?pagination=false&rvcode=${rvcode}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch board pages: ${response.status}`);
    }

    const json = await response.json();
    const data = Array.isArray(json) ? json : (json['hydra:member'] || []);
    
    return data.filter((page: IBoardPage) => boardTypes.includes(page.page_code as BOARD_TYPE));
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
    console.warn(`[API] Board members not found or error ${response.status} for journal ${rvcode}`);
    return []; // Return empty instead of throwing to avoid breaking the build
  }

    const json = await response.json();
    const data: RawBoardMember[] = Array.isArray(json) ? json : (json['hydra:member'] || []);
  //  console.log(`Successfully fetched ${data.length} board members`);
    
    return data.map(board => {
      const roles = (board.roles && board.roles.length > 0) 
        ? board.roles[0].map(role => role.replace(/_/g, '-')) 
        : [];

      let twitter, mastodon;
      if (board.additionalProfileInformation?.socialMedias) {
        const atCount = (board.additionalProfileInformation?.socialMedias.match(/@/g) || []).length;
        
        if (atCount === 1) {
          twitter = `${process.env.NEXT_PUBLIC_TWITTER_HOMEPAGE}/${board.additionalProfileInformation?.socialMedias.slice(1)}`;
        }
        else if (atCount > 1) {
          const parts = board.additionalProfileInformation?.socialMedias.split('@');
          mastodon = `https://${parts[2]}/@${parts[1]}`;
        }
      }

      const memberWithDefaults: IBoardMember = {
        id: board.id || 0,
        firstname: board.firstname || '',
        lastname: board.lastname || '',
        email: board.email,
        biography: board.additionalProfileInformation?.biography || '',
        roles: roles,
        affiliations: (board.additionalProfileInformation?.affiliations || []).map(aff => ({
          label: aff.label || '',
          rorId: aff.rorId || ''
        })),
        assignedSections: (board.assignedSections || []).map(section => {
          return {
            sid: section.sid,
            titles: section.titles || { en: '', fr: '' }
          };
        }),
        orcid: board.orcid || '',
        picture: board.picture || '',
        twitter,
        mastodon,
        website: board.additionalProfileInformation?.webSites 
          ? board.additionalProfileInformation.webSites[0] 
          : undefined
      };

      return memberWithDefaults;
    });
  } catch (error) {
    console.error('Error fetching board members:', error);
    return [];
  }
}

// Mock data for development/testing when API isn't available
// ... existing code ... 
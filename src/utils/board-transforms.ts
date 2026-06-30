/**
 * Board Member Transformation Utilities
 *
 * Centralized logic for transforming raw board member data from the API
 * into the standardized IBoardMember interface.
 */

import {
  IBoardMember,
  IBoardMemberAffiliation,
  IBoardMemberAssignedSection,
  IBoardPage,
  getRolePriority,
  boardTypes,
  BOARD_TYPE,
  BOARD_ROLE,
} from '@/services/board';
import { AvailableLanguage } from '@/utils/i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
import { TWITTER_URL } from '@/config/external-urls';

/**
 * Raw board member data structure from the API
 */
export interface RawBoardMember {
  id?: number;
  uid?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  orcid?: string;
  picture?: string;
  roles?: string[][];
  assignedSections?: Array<{
    sid: number;
    titles?: Record<string, string>;
  }>;
  additionalProfileInformation?: {
    biography?: string;
    affiliations?: Array<{
      label?: string;
      rorId?: string;
    }>;
    socialMedias?: string;
    webSites?: string[];
  };
}

/**
 * Transform a single raw board member into the standardized IBoardMember format
 *
 * @param rawMember - Raw member data from the API
 * @returns Transformed board member with normalized structure
 */
export function transformBoardMember(rawMember: RawBoardMember): IBoardMember {
  // Transform roles: flatten nested arrays and replace underscores with hyphens
  const roles =
    rawMember.roles && rawMember.roles.length > 0
      ? rawMember.roles.flat().map((role: string) => role.replace(/_/g, '-'))
      : [];

  // Parse social media links
  let twitter: string | undefined;
  let mastodon: string | undefined;
  let bluesky: string | undefined;

  if (rawMember.additionalProfileInformation?.socialMedias) {
    const socialMedias = rawMember.additionalProfileInformation.socialMedias;

    // Check for Bluesky: contains bsky.social or bsky.app
    if (socialMedias.includes('bsky.social') || socialMedias.includes('bsky.app')) {
      // Handle formats: @handle.bsky.social, handle.bsky.social, or full URL
      const handle = socialMedias.replace(/^@/, '').replace(/^https?:\/\/bsky\.app\/profile\//, '');
      bluesky = `https://bsky.app/profile/${handle}`;
    } else {
      const atCount = (socialMedias.match(/@/g) || []).length;

      if (atCount === 1) {
        // Twitter/X format: @username
        twitter = `${TWITTER_URL}/${socialMedias.slice(1)}`;
      } else if (atCount > 1) {
        // Mastodon format: @username@instance.com
        const parts = socialMedias.split('@');
        mastodon = `https://${parts[2]}/@${parts[1]}`;
      }
    }
  }

  // Transform affiliations
  const affiliations: IBoardMemberAffiliation[] = (
    rawMember.additionalProfileInformation?.affiliations || []
  ).map(aff => ({
    label: aff.label || '',
    rorId: aff.rorId || '',
  }));

  // Transform assigned sections
  const assignedSections: IBoardMemberAssignedSection[] = (rawMember.assignedSections || []).map(
    section => ({
      sid: section.sid,
      titles: section.titles || { en: '', fr: '' },
    })
  );

  // Build the standardized member object
  return {
    id: rawMember.id || rawMember.uid || 0,
    firstname: rawMember.firstname || '',
    lastname: rawMember.lastname || '',
    email: rawMember.email,
    biography: rawMember.additionalProfileInformation?.biography || '',
    roles,
    affiliations,
    assignedSections,
    orcid: rawMember.orcid || '',
    picture: rawMember.picture || '',
    twitter,
    mastodon,
    bluesky,
    website: rawMember.additionalProfileInformation?.webSites?.[0],
  };
}

/**
 * Transform an array of raw board members
 *
 * @param rawMembers - Array of raw member data from the API
 * @returns Array of transformed board members
 */
export function transformBoardMembers(rawMembers: RawBoardMember[]): IBoardMember[] {
  return rawMembers.map(transformBoardMember);
}

/**
 * Compute the carousel display priority for a board member.
 * 1 = editorial-board + chief-editor (highest)
 * 2 = editorial-board only
 * 3 = scientific-advisory-board only
 * 4 = technical-board only
 * 5 = fallback
 */
function getCarouselMemberPriority(member: IBoardMember): number {
  const isEditorialBoard = member.roles.includes(BOARD_TYPE.EDITORIAL_BOARD);
  const isScientificAdvisoryBoard = member.roles.includes(BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD);
  const isTechnicalBoard = member.roles.includes(BOARD_TYPE.TECHNICAL_BOARD);
  const isChiefEditor = member.roles.includes(BOARD_ROLE.CHIEF_EDITOR);

  if (isEditorialBoard && isChiefEditor) return 1;
  if (isEditorialBoard) return 2;
  if (isScientificAdvisoryBoard) return 3;
  if (isTechnicalBoard) return 4;
  return 5;
}

/**
 * Filter and sort board members for the homepage carousel.
 *
 * Includes editorial-board, scientific-advisory-board, and technical-board members.
 * Sort order:
 *   Tier 1 — board priority (chief-editor of editorial board first)
 *   Tier 2 — lastname then firstname (French locale, accent/case insensitive)
 */
export function filterAndSortMembersForCarousel(members: IBoardMember[]): IBoardMember[] {
  const collator = new Intl.Collator('fr', { sensitivity: 'base' });

  return members
    .filter(
      member =>
        member.roles.includes(BOARD_TYPE.EDITORIAL_BOARD) ||
        member.roles.includes(BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD) ||
        member.roles.includes(BOARD_TYPE.TECHNICAL_BOARD)
    )
    .sort((a, b) => {
      const priorityDiff = getCarouselMemberPriority(a) - getCarouselMemberPriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      const lastNameCompare = collator.compare(a.lastname, b.lastname);
      if (lastNameCompare !== 0) return lastNameCompare;

      return collator.compare(a.firstname, b.firstname);
    });
}

/**
 * Board with title, description and members for display
 */
export interface IBoardPerTitle {
  page_code: string;
  title: string;
  description: string;
  members: IBoardMember[];
}

/**
 * Determine whether a member belongs to a given board type, applying the
 * same special-case rules used across the board pages (plural role match,
 * advisory-board, managing/handling editor, singular "former-member" role).
 */
function memberMatchesBoardType(member: IBoardMember, pageCode: string): boolean {
  const hasDirectRole = member.roles.includes(pageCode);
  const hasPluralRole = member.roles.includes(`${pageCode}s`);

  const isScientificAdvisorySpecial =
    pageCode === BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD && member.roles.includes('advisory-board');

  const isEditorialBoardSpecial =
    pageCode === BOARD_TYPE.EDITORIAL_BOARD &&
    (member.roles.includes('managing-editor') || member.roles.includes('handling-editor'));

  const isFormerMembersSpecial =
    pageCode === BOARD_TYPE.FORMER_MEMBERS && member.roles.includes('former-member');

  return (
    hasDirectRole ||
    hasPluralRole ||
    isScientificAdvisorySpecial ||
    isEditorialBoardSpecial ||
    isFormerMembersSpecial
  );
}

/**
 * Group board members by board page according to spec rules:
 * - Direct role match: member has role matching page_code or page_code + "s"
 * - Scientific Advisory Board: also includes members with role "advisory-board"
 * - Editorial Board: also includes members with roles "managing-editor" or "handling-editor"
 *
 * Members are sorted by role priority within each board.
 *
 * Board types that have no dedicated CMS page (e.g. the page was never created
 * for a journal) still get a group — without title/description — as long as at
 * least one member matches that board type, so members are never silently hidden.
 *
 * @param pages - Board pages fetched from API
 * @param members - Board members fetched from API
 * @param lang - Current language for title/description extraction
 * @returns Array of boards with their members
 */
export function getBoardsPerTitle(
  pages: IBoardPage[],
  members: IBoardMember[],
  lang: AvailableLanguage
): IBoardPerTitle[] {
  if ((!pages || pages.length === 0) && (!members || members.length === 0)) return [];

  // Determine which known board types have at least one matching member but no
  // dedicated CMS page, so members are never silently hidden for lack of a page.
  const realPageCodes = new Set((pages || []).map(page => page.page_code));
  const typesWithMembers = new Set<BOARD_TYPE>();
  (members || []).forEach(member => {
    boardTypes.forEach(type => {
      if (memberMatchesBoardType(member, type)) typesWithMembers.add(type);
    });
  });
  const syntheticCodes = boardTypes.filter(
    type => !realPageCodes.has(type) && typesWithMembers.has(type)
  );

  // Combine real pages with synthetic (page-less) entries for those board types.
  const sources: Array<{ page_code: string; page?: IBoardPage }> = [
    ...(pages || []).map(page => ({ page_code: page.page_code, page })),
    ...syntheticCodes.map(page_code => ({ page_code })),
  ];

  // Sort according to predefined boardTypes order to ensure consistency across journals:
  // 1. Introduction board
  // 2. Scientific Advisory Board
  // 3. Editorial Board
  // 4. Technical Board
  // 5. Reviewers Board
  // 6. Former members
  // 7. Operating charter
  const sortedSources = [...sources].sort((a, b) => {
    const aIndex = boardTypes.indexOf(a.page_code as BOARD_TYPE);
    const bIndex = boardTypes.indexOf(b.page_code as BOARD_TYPE);
    // If a type is not found in boardTypes, put it at the end
    const finalAIndex = aIndex === -1 ? 999 : aIndex;
    const finalBIndex = bIndex === -1 ? 999 : bIndex;
    return finalAIndex - finalBIndex;
  });

  return sortedSources.map(({ page_code, page }) => {
    // Extract localized title and description (empty when no CMS page exists for this type)
    const title = page ? getLocalizedContent(page.title, lang).value : '';
    const description = page ? getLocalizedContent(page.content, lang).value : '';

    // Filter members for this board page (handle empty members array)
    const pageMembers =
      !members || members.length === 0
        ? []
        : members.filter(member => memberMatchesBoardType(member, page_code));

    // Sort members by role priority (chief-editor first, then managing-editor, etc.)
    const sortedMembers = [...pageMembers].sort((a, b) => {
      // Get the highest priority role for each member (lowest number = highest priority)
      const aPriority = Math.min(...a.roles.map(getRolePriority));
      const bPriority = Math.min(...b.roles.map(getRolePriority));

      // Sort by priority (ascending: 1, 2, 3, ...)
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same priority, sort alphabetically by lastname
      return a.lastname.localeCompare(b.lastname);
    });

    return {
      page_code,
      title,
      description,
      members: sortedMembers,
    };
  });
}

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
} from '@/services/board';

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
      ? rawMember.roles[0].map((role: string) => role.replace(/_/g, '-'))
      : [];

  // Parse social media links
  let twitter: string | undefined;
  let mastodon: string | undefined;

  if (rawMember.additionalProfileInformation?.socialMedias) {
    const socialMedias = rawMember.additionalProfileInformation.socialMedias;
    const atCount = (socialMedias.match(/@/g) || []).length;

    if (atCount === 1) {
      // Twitter format: @username
      twitter = `${process.env.NEXT_PUBLIC_TWITTER_HOMEPAGE}/${socialMedias.slice(1)}`;
    } else if (atCount > 1) {
      // Mastodon format: @username@instance.com
      const parts = socialMedias.split('@');
      mastodon = `https://${parts[2]}/@${parts[1]}`;
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

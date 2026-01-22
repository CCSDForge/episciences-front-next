'use client';

import Image from 'next/image';
import { TFunction } from 'i18next';
import { Link } from '@/components/Link/Link';
import {
  UserIcon,
  OrcidIcon,
  TwitterIcon,
  MastodonIcon,
  BlueskyIcon,
  ExternalLinkBlackIcon,
  RorIcon,
} from '@/components/icons';
import { USER_PHOTO_BLUR } from '@/utils/image-placeholders';
import './BoardCard.scss';

import { IBoardMember, IBoardMemberAffiliation } from '@/types/board';
import { AvailableLanguage } from '@/utils/i18n';
import { defaultBoardRole, getBoardRoles } from '@/services/board';
import { handleKeyboardClick } from '@/utils/keyboard';

/**
 * Renders an affiliation with optional ROR link
 * If rorId is present, displays the ROR icon as a link followed by a non-breaking space and the label as plain text
 */
function AffiliationWithRor({ affiliation }: { affiliation: IBoardMemberAffiliation }): React.JSX.Element {
  if (affiliation.rorId) {
    return (
      <span className="boardCard-affiliation-with-ror">
        <Link
          href={affiliation.rorId}
          target="_blank"
          rel="noopener noreferrer"
          title={`ROR: ${affiliation.label}`}
          className="boardCard-affiliation-link"
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
        >
          <RorIcon
            size={14}
            className="boardCard-affiliation-ror-icon"
            ariaLabel="ROR (Research Organization Registry)"
          />
        </Link>
        {'\u00A0'}
        {affiliation.label}
      </span>
    );
  }
  return <span>{affiliation.label}</span>;
}

interface IBoardCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  member: IBoardMember;
  fullCard: boolean;
  blurCard: boolean;
  setFullMemberIndexCallback: () => void;
  rolesLabels?: Record<string, string>;
}

export default function BoardCard({
  language,
  t,
  member,
  fullCard,
  blurCard,
  setFullMemberIndexCallback,
  rolesLabels,
}: IBoardCardProps): React.JSX.Element {
  const getRoleLabel = (role: string) => {
    if (rolesLabels && rolesLabels[role]) return rolesLabels[role];
    // Fallback to t if rolesLabels is missing (or try to map if keys differ)
    // Actually getBoardRoles handles a list.
    return null;
  };

  const displayRoles = (roles: string[]) => {
    if (rolesLabels) {
      return roles
        .map(role => rolesLabels[role] || role)
        .filter(Boolean)
        .join(', ');
    }
    return getBoardRoles(t, roles);
  };

  const defaultRoleLabel = rolesLabels ? rolesLabels['member'] : defaultBoardRole(t).label;

  if (fullCard) {
    return (
      <div className="boardCard boardCard-full" 
        role="button"
        tabIndex={0}
        
        onClick={setFullMemberIndexCallback}        onKeyDown={(e) => handleKeyboardClick(e, setFullMemberIndexCallback)}>
        <div className="boardCard-full-initial">
          <div className="boardCard-full-initial-person">
            <div className="boardCard-full-initial-person-picture">
              {member.picture ? (
                <Image
                  src={member.picture}
                  alt={`${member.firstname} ${member.lastname}`}
                  width={80}
                  height={80}
                  placeholder="blur"
                  blurDataURL={USER_PHOTO_BLUR}
                />
              ) : (
                <UserIcon
                  size={80}
                  className="boardCard-person-picture-placeholder"
                  ariaLabel="User photo"
                />
              )}
            </div>
            <div className="boardCard-full-initial-person-title">
              <div className="boardCard-full-initial-person-title-name">
                <div className="boardCard-full-initial-person-title-name-text">
                  {member.firstname} {member.lastname}
                </div>
                {member.orcid && member.orcid.length > 0 && (
                  <Link
                    href={`${process.env.NEXT_PUBLIC_ORCID_HOMEPAGE}/${member.orcid}`}
                    title={member.orcid}
                    target="_blank"
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                  >
                    <OrcidIcon
                      size={16}
                      className="boardCard-full-initial-person-title-name-orcid"
                      ariaLabel="ORCID iD"
                    />
                  </Link>
                )}
              </div>
              {member.roles && member.roles.length > 0 ? (
                <div className="boardCard-full-initial-person-title-role">
                  {displayRoles(member.roles)}
                </div>
              ) : (
                <div className="boardCard-full-initial-person-title-role">{defaultRoleLabel}</div>
              )}
            </div>
          </div>
          {member.affiliations && member.affiliations.length > 0 && (
            <div className="boardCard-full-initial-affiliations">
              {member.affiliations.map((affiliation, idx) => (
                <div key={idx} className="boardCard-affiliation-item">
                  <AffiliationWithRor affiliation={affiliation} />
                </div>
              ))}
            </div>
          )}
          {member.assignedSections && member.assignedSections.length > 0 && (
            <div className="boardCard-full-initial-assignedSections">
              {member.assignedSections
                .map(assignedSection => assignedSection.titles[language])
                .join(', ')}
            </div>
          )}
        </div>
        <div className="boardCard-full-expanded">
          <div className="boardCard-full-expanded-biography">{member.biography}</div>
          <div className="boardCard-full-expanded-social">
            {(member.twitter || member.mastodon || member.bluesky) && (
              <div className="boardCard-full-expanded-social-networks">
                {member.twitter && (
                  <Link
                    href={member.twitter}
                    title={member.twitter}
                    target="_blank"
                    onClick={(e: any) => e.stopPropagation()}
                  >
                    <TwitterIcon
                      size={20}
                      className="boardCard-full-expanded-social-networks-icon"
                      ariaLabel="X (Twitter)"
                    />
                  </Link>
                )}
                {member.mastodon && (
                  <Link
                    href={member.mastodon}
                    title={member.mastodon}
                    target="_blank"
                    onClick={(e: any) => e.stopPropagation()}
                  >
                    <MastodonIcon
                      size={20}
                      className="boardCard-full-expanded-social-networks-icon"
                      ariaLabel="Mastodon"
                    />
                  </Link>
                )}
                {member.bluesky && (
                  <Link
                    href={member.bluesky}
                    title={member.bluesky}
                    target="_blank"
                    onClick={(e: any) => e.stopPropagation()}
                  >
                    <BlueskyIcon
                      size={20}
                      className="boardCard-full-expanded-social-networks-icon"
                      ariaLabel="Bluesky"
                    />
                  </Link>
                )}
              </div>
            )}
            {member.website && (
              <Link
                href={member.website}
                title={member.website}
                target="_blank"
                onClick={(e: any) => e.stopPropagation()}
              >
                <div className="boardCard-full-expanded-social-website">
                  <div>Website</div>
                  <ExternalLinkBlackIcon
                    size={16}
                    className="boardCard-full-expanded-social-website-img"
                    ariaLabel="External website"
                  />
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={blurCard ? 'boardCard boardCard-blur' : 'boardCard'}
      
        role="button"
        tabIndex={0}
        
        onClick={setFullMemberIndexCallback}        onKeyDown={(e) => handleKeyboardClick(e, setFullMemberIndexCallback)}>
      <div className="boardCard-person">
        <div className="boardCard-person-picture">
          {member.picture ? (
            <Image
              src={member.picture}
              alt={`${member.firstname} ${member.lastname}`}
              width={80}
              height={80}
              placeholder="blur"
              blurDataURL={USER_PHOTO_BLUR}
            />
          ) : (
            <UserIcon
              size={80}
              className="boardCard-person-picture-placeholder"
              ariaLabel="User photo"
            />
          )}
        </div>
        <div className="boardCard-person-title">
          <div className="boardCard-person-title-name">
            <div className="boardCard-person-title-name-text">
              {member.firstname} {member.lastname}
            </div>
            {member.orcid && member.orcid.length > 0 && (
              <Link
                href={`${process.env.NEXT_PUBLIC_ORCID_HOMEPAGE}/${member.orcid}`}
                title={member.orcid}
                target="_blank"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
              >
                <OrcidIcon
                  size={16}
                  className="boardCard-person-title-name-orcid"
                  ariaLabel="ORCID iD"
                />
              </Link>
            )}
          </div>
          {member.roles && member.roles.length > 0 ? (
            <div className="boardCard-person-title-role">{displayRoles(member.roles)}</div>
          ) : (
            <div className="boardCard-person-title-role">{defaultRoleLabel}</div>
          )}
        </div>
      </div>
      {member.affiliations && member.affiliations.length > 0 && (
        <div className="boardCard-affiliations">
          {member.affiliations.map((affiliation, idx) => (
            <div key={idx} className="boardCard-affiliation-item">
              <AffiliationWithRor affiliation={affiliation} />
            </div>
          ))}
        </div>
      )}
      {member.assignedSections && member.assignedSections.length > 0 && (
        <div className="boardCard-assignedSections">
          {member.assignedSections
            .map(assignedSection => {
              const sectionTitle =
                assignedSection.titles?.[language] || assignedSection.title?.[language];
              return sectionTitle;
            })
            .filter(Boolean)
            .join(', ')}
        </div>
      )}
    </div>
  );
}

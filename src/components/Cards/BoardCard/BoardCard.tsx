'use client';

import { TFunction } from 'i18next';
import { Link } from '@/components/Link/Link';
import './BoardCard.scss';

import at from '../../../../public/icons/at.svg';
import orcid from '../../../../public/icons/orcid.svg';
import externalLink from '../../../../public/icons/external-link-red.svg';
import twitter from '../../../../public/icons/twitter.svg';
import mastodon from '../../../../public/icons/mastodon.svg';
import user from '../../../../public/icons/user.svg';
import { IBoardMember } from "@/types/board";
import { AvailableLanguage } from '@/utils/i18n';
import { defaultBoardRole, getBoardRoles } from '@/utils/board';

interface IBoardCardProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>
  member: IBoardMember;
  fullCard: boolean;
  blurCard: boolean;
  setFullMemberIndexCallback: () => void;
  rolesLabels?: Record<string, string>;
}

export default function BoardCard({ language, t, member, fullCard, blurCard, setFullMemberIndexCallback, rolesLabels }: IBoardCardProps): JSX.Element {
  
  const getRoleLabel = (role: string) => {
    if (rolesLabels && rolesLabels[role]) return rolesLabels[role];
    // Fallback to t if rolesLabels is missing (or try to map if keys differ)
    // Actually getBoardRoles handles a list.
    return null; 
  };
  
  const displayRoles = (roles: string[]) => {
    if (rolesLabels) {
       return roles.map(role => rolesLabels[role] || role).filter(Boolean).join(', ');
    }
    return getBoardRoles(t, roles);
  };

  const defaultRoleLabel = rolesLabels ? rolesLabels['member'] : defaultBoardRole(t).label;

  if (fullCard) {
    return (
      <div className='boardCard boardCard-full' onClick={setFullMemberIndexCallback}>
        <div className='boardCard-full-initial'>
          <div className='boardCard-full-initial-person'>
            <div className='boardCard-full-initial-person-picture'>
              {member.picture ? (
                <img src={member.picture} alt={`${member.firstname} ${member.lastname} picture`}/>
              ) : (
                <img className='boardCard-person-picture-placeholder' src={user} alt='User icon' />
              )}
            </div>
            <div className='boardCard-full-initial-person-title'>
              <div className='boardCard-full-initial-person-title-name'>
                <div className='boardCard-full-initial-person-title-name-text'>{member.firstname} {member.lastname}</div>
                {member.orcid && member.orcid.length > 0 && (
                  <Link href={`${process.env.NEXT_PUBLIC_ORCID_HOMEPAGE}/${member.orcid}`} title={member.orcid} target='_blank' onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}>
                    <img className='boardCard-full-initial-person-title-name-orcid' src={orcid} alt='Orcid icon' />
                  </Link>
                )}
              </div>
              {member.roles && member.roles.length > 0 ? (
                <div className='boardCard-full-initial-person-title-role'>{displayRoles(member.roles)}</div>
              ) : (
                <div className='boardCard-full-initial-person-title-role'>{defaultRoleLabel}</div>
              )}
            </div>
          </div>
          {member.affiliations && member.affiliations.length > 0 && <div className='boardCard-full-initial-affiliations'>{member.affiliations[0].label}</div>}
          {member.assignedSections && member.assignedSections.length > 0 && <div className='boardCard-full-initial-assignedSections'>{member.assignedSections.map((assignedSection) => assignedSection.titles[language]).join(', ')}</div>}
        </div>
        <div className='boardCard-full-expanded'>
          {member.email && (
            <Link href={`mailto:${member.email}`} target='_blank' onClick={(e:any) => e.stopPropagation()}>
              <div className='boardCard-full-expanded-email'>
                <img className='boardCard-full-expanded-email-at' src={at} alt={`At ${member.email} icon`}/>
                <div>{member.email}</div>
              </div>
            </Link>
          )}
          <div className='boardCard-full-expanded-biography'>{member.biography}</div>
          <div className='boardCard-full-expanded-social'>
            {(member.twitter || member.mastodon) && (
              <div className='boardCard-full-expanded-social-networks'>
                {member.twitter && (
                  <Link href={member.twitter} title={member.twitter} target='_blank' onClick={(e:any) => e.stopPropagation()}>
                    <img className='boardCard-full-expanded-social-networks-icon' src={twitter} alt='Twitter icon' />
                  </Link>
                )}
                {member.mastodon && (
                  <Link href={member.mastodon} title={member.mastodon} target='_blank' onClick={(e:any) => e.stopPropagation()}>
                    <img className='boardCard-full-expanded-social-networks-icon' src={mastodon} alt='Mastodon icon' />
                  </Link>
                )}
              </div>
            )}
            {member.website && (
              <Link href={member.website} title={member.website} target='_blank' onClick={(e:any) => e.stopPropagation()}>
                <div className='boardCard-full-expanded-social-website'>
                  <div>Website</div>
                  <img className='boardCard-full-expanded-social-website-img' src={externalLink} alt='Website link icon' />
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={blurCard ? 'boardCard boardCard-blur' : 'boardCard'} onClick={setFullMemberIndexCallback}>
      <div className='boardCard-person'>
        <div className='boardCard-person-picture'>
          {member.picture ? (
            <img src={member.picture} alt={`${member.firstname} ${member.lastname} picture`}/>
          ) : (
            <img className='boardCard-person-picture-placeholder' src={user} alt='User icon' />
          )}
        </div>
        <div className='boardCard-person-title'>
          <div className='boardCard-person-title-name'>
            <div className='boardCard-person-title-name-text'>{member.firstname} {member.lastname}</div>
            {member.orcid && member.orcid.length > 0 && (
              <Link href={`${process.env.NEXT_PUBLIC_ORCID_HOMEPAGE}/${member.orcid}`} title={member.orcid} target='_blank' onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}>
                <img className='boardCard-person-title-name-orcid' src={orcid} alt='Orcid icon' />
              </Link>
            )}
          </div>
          {member.roles && member.roles.length > 0 ? (
            <div className='boardCard-person-title-role'>{displayRoles(member.roles)}</div>
          ) : (
            <div className='boardCard-person-title-role'>{defaultRoleLabel}</div>
          )}
        </div>
      </div>
      {member.affiliations && member.affiliations.length > 0 && <div className='boardCard-affiliations'>{member.affiliations[0].label}</div>}
      {member.assignedSections && member.assignedSections.length > 0 && (
        <div className='boardCard-assignedSections'>
          {member.assignedSections.map((assignedSection) => {
            const sectionTitle = assignedSection.titles?.[language] || assignedSection.title?.[language];
            return sectionTitle;
          }).filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  )
} 
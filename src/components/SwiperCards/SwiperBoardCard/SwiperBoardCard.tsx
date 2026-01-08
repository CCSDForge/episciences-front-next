'use client';

import { TFunction } from 'i18next';
import { Link } from '@/components/Link/Link';
import { OrcidIcon, UserIcon } from '@/components/icons';
import { IBoardMember } from '@/types/board';
import { AvailableLanguage } from '@/utils/i18n';
import { defaultBoardRole, getBoardRoles } from '@/utils/board';
import './SwiperBoardCard.scss';

export type SwiperBoardCardProps = IBoardMember;

interface ISwiperBoardCardProps {
  language: AvailableLanguage;
  t: TFunction<'translation', undefined>;
  member: IBoardMember;
}

export default function SwiperBoardCard({
  language,
  t,
  member,
}: ISwiperBoardCardProps): React.JSX.Element {
  return (
    <div className="swiperBoardCard">
      <div className="swiperBoardCard-person">
        <div className="swiperBoardCard-person-picture">
          {member.picture ? (
            <img src={member.picture} alt={`${member.firstname} ${member.lastname} picture`} />
          ) : (
            <UserIcon
              size={48}
              className="swiperBoardCard-person-picture-placeholder"
              ariaLabel="User"
            />
          )}
        </div>
        <div className="swiperBoardCard-person-title">
          <div className="swiperBoardCard-person-title-name">
            <div className="swiperBoardCard-person-title-name-text">
              {member.firstname} {member.lastname}
            </div>
            {member.orcid && member.orcid.length > 0 && (
              <Link
                href={`${process.env.NEXT_PUBLIC_ORCID_HOMEPAGE}/${member.orcid}`}
                title={member.orcid}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: any) => e.stopPropagation()}
                lang={language}
              >
                <OrcidIcon
                  size={16}
                  className="swiperBoardCard-person-title-name-orcid"
                  ariaLabel="ORCID"
                />
              </Link>
            )}
          </div>
          {member.roles && member.roles.length > 0 ? (
            <div className="swiperBoardCard-person-title-role">
              {getBoardRoles(t, member.roles)}
            </div>
          ) : (
            <div className="swiperBoardCard-person-title-role">{defaultBoardRole(t).label}</div>
          )}
        </div>
      </div>
      {member.affiliations && member.affiliations.length > 0 && (
        <div className="swiperBoardCard-affiliations">{member.affiliations[0].label}</div>
      )}
      {member.assignedSections && member.assignedSections.length > 0 && (
        <div className="swiperBoardCard-assignedSections">
          {member.assignedSections
            .filter(assignedSection => assignedSection.titles && assignedSection.titles[language])
            .map(assignedSection => assignedSection.titles[language])
            .filter(title => title && title.trim() !== '')
            .join(', ')}
        </div>
      )}
    </div>
  );
}

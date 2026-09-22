import { Fragment } from 'react';
import { TFunction } from 'i18next';
import { OrcidIcon } from '@/components/icons';
import { buildOrcidUrl } from '@/config/external-urls';
import { ICommitteeMember } from '@/types/committee';
import './CommitteeMembers.scss';

interface ICommitteeMembersProps {
  readonly members: ICommitteeMember[];
  readonly t: TFunction<'translation', undefined>;
}

/**
 * Inline, comma-separated list of committee members. Members with an ORCID get an icon
 * link whose accessible name identifies the person and warns it opens a new window.
 */
export default function CommitteeMembers({
  members,
  t,
}: ICommitteeMembersProps): React.JSX.Element {
  return (
    <>
      {members.map((member, index) => {
        const orcid = member.orcid?.trim();
        return (
          <Fragment key={member.uuid ?? member.screenName}>
            {index > 0 && ', '}
            <span className="committeeMembers-member">
              {member.screenName}
              {orcid && (
                <a
                  href={buildOrcidUrl(orcid)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={orcid}
                  className="committeeMembers-member-orcid"
                >
                  <OrcidIcon
                    size={16}
                    ariaLabel={`${t('common.orcidOf', { name: member.screenName })} ${t('components.header.newWindow')}`}
                  />
                </a>
              )}
            </span>
          </Fragment>
        );
      })}
    </>
  );
}

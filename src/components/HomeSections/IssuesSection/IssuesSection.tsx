'use client';

import { Fragment } from 'react';
import { TFunction } from 'i18next';
import { Link } from '@/components/Link/Link';
import { IIssue } from '@/types/issue';
import { IJournal } from '@/types/journal';
import { PATHS } from '@/config/paths';

import './IssuesSection.scss'

interface IIssuesSectionProps {
  language: string;
  t: TFunction<"translation", undefined>;
  issues: IIssue[];
  currentJournal: IJournal | null;
  journalId?: string;
}

export default function IssuesSection({ language, t, issues = [], currentJournal, journalId }: IIssuesSectionProps): JSX.Element {
  if (!issues || issues.length === 0) {
    return <></>;
  }

  const isValidIssue = (issue: IIssue) => {
    return !!issue && !!issue.id;
  };

  const displayJournalCode = (journalId || currentJournal?.code || '').toUpperCase();

  return (
    <div className="issuesSection">
      {issues.map((issue, index) => {
        if (!isValidIssue(issue)) return null;

        const issueYear = issue.year || '';
        const issueTitle = issue.title ? issue.title[language] : '';
        
        return (
          <div key={issue.id} className='issuesSection-card'>
            {issue.tileImageURL ? (
              <img className='issuesSection-card-tile' src={issue.tileImageURL} alt='Issue tile' />
            ) : (
              <div className="issuesSection-card-template">
                <div className="issuesSection-card-template-jpe">{displayJournalCode}</div>
                <div className="issuesSection-card-template-volume">{t('common.volumeCard.specialIssue')}</div>
                <div className="issuesSection-card-template-number">{issue.num}</div>
                <div className="issuesSection-card-template-year">{issueYear}</div>
              </div>
            )}
            <div className="issuesSection-card-text">
              <Link href={`${PATHS.volumes}/${issue.id}`}>
                <div className='issuesSection-card-text-volume'>{`${t('common.volumeCard.specialIssue')} ${issue.num}`}</div>
              </Link>
              <div className="issuesSection-card-text-title">{issueTitle}</div>
              <div className="issuesSection-card-text-year">{issueYear}</div>
              <div className="issuesSection-card-text-count">
                <img className="issuesSection-card-text-count-icon" src="/icons/file-grey.svg" alt='File icon' />
                <div className="issuesSection-card-text-count-text">
                  {issue.articles?.length > 1 
                    ? `${issue.articles.length} ${t('common.articles')}`
                    : `${issue.articles?.length} ${t('common.article')}`}
                </div>
              </div>
              {issue.downloadLink && (
                <Link href={issue.downloadLink} target='_blank' className="issuesSection-card-text-download">
                  <img className="issuesSection-card-text-download-icon" src="/icons/download-red.svg" alt='Download icon' />
                  <div className="issuesSection-card-text-download-text">{t('common.pdf')}</div>
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )
} 
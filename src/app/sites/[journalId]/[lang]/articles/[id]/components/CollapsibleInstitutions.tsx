"use client";

import { OrcidIcon, RorIcon, CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import {useState } from 'react';
import { Link } from '@/components/Link/Link';
import { IInstitution } from '@/types/article';

interface Author {
  fullname: string;
  orcid?: string;
  institutionsKeys: number[];
}

interface CollapsibleInstitutionsProps {
  authors: Author[];
  institutions: IInstitution[];
  isMobile: boolean;
}

export default function CollapsibleInstitutions({ authors, institutions, isMobile }: CollapsibleInstitutionsProps): React.JSX.Element {
  const [openedInstitutions, setOpenedInstitutions] = useState(true);

  const renderAuthors = () => {
    return authors.map((author, index) => {
      const authorName = (
        <>
          {author.fullname}
          {author.orcid && (
            <Link href={`${author.orcid}`} title={author.orcid} target='_blank' rel="noopener noreferrer">
              {' '}
              <OrcidIcon size={16} className='articleDetails-content-article-authors-author-orcid' ariaLabel="ORCID" />
            </Link>
          )}
        </>
      );

      const authorInstitutions = author.institutionsKeys.map((key, i) => (
        <sup key={i} className="articleDetails-content-article-authors-institution-key">{' '}({key + 1})</sup>
      ));

      return (
        <span key={index} className="articleDetails-content-article-authors-author">
          {authorName}
          {authorInstitutions}
          {index < authors.length - 1 && ', '}
        </span>
      );
    });
  };

  const renderInstitutions = () => {
    if (!institutions || !institutions.length) return null;
    if (!openedInstitutions) return null;

    return (
      <>
        {institutions.map((institution, index) => (
          <div key={index}>
            ({index + 1}) {institution.name}
            {institution.rorId && (
              <Link
                href={institution.rorId}
                title="Research Organization Registry"
                target='_blank'
                rel="noopener noreferrer"
              >
                {' '}
                <RorIcon
                  size={16}
                  className='articleDetails-content-article-institutions-ror'
                  ariaLabel="ROR"
                />
              </Link>
            )}
          </div>
        ))}
      </>
    );
  };

  return (
    <>
      {institutions.length > 0 ? (
        <>
          <div className={`articleDetails-content-article-authors articleDetails-content-article-authors-withInstitutions ${isMobile && 'articleDetails-content-article-authors-withInstitutions-mobile'}`}>
            <div>{renderAuthors()}</div>
            {openedInstitutions ? (
              <CaretUpGreyIcon
                size={16}
                className='articleDetails-content-article-authors-withInstitutions-caret'
                ariaLabel="Collapse institutions"
                onClick={(): void => setOpenedInstitutions(!openedInstitutions)}
              />
            ) : (
              <CaretDownGreyIcon
                size={16}
                className='articleDetails-content-article-authors-withInstitutions-caret'
                ariaLabel="Expand institutions"
                onClick={(): void => setOpenedInstitutions(!openedInstitutions)}
              />
            )}
          </div>
          <div className={`articleDetails-content-article-institutions ${isMobile && 'articleDetails-content-article-institutions-mobile'}`}>
            {renderInstitutions()}
          </div>
        </>
      ) : (
        <div className={`articleDetails-content-article-authors ${isMobile && 'articleDetails-content-article-authors-mobile'}`}>
          {renderAuthors()}
        </div>
      )}
    </>
  );
} 
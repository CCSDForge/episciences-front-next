"use client";

import { Fragment, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@/components/Link/Link';
import { IInstitution } from '@/types/article';
import orcid from '/public/icons/orcid.svg';
import ror from '/public/icons/ror.svg';
import caretUpGrey from '/public/icons/caret-up-grey.svg';
import caretDownGrey from '/public/icons/caret-down-grey.svg';

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

export default function CollapsibleInstitutions({ authors, institutions, isMobile }: CollapsibleInstitutionsProps): JSX.Element {
  const [openedInstitutions, setOpenedInstitutions] = useState(true);

  const renderAuthors = () => {
    return authors.map((author, index) => {
      const authorName = (
        <>
          {author.fullname}
          {author.orcid && (
            <Link href={`${author.orcid}`} title={author.orcid} target='_blank' rel="noopener noreferrer">
              {' '}
              <img className='articleDetails-content-article-authors-author-orcid' src={orcid} alt='Orcid icon' />
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
                <img
                  className='articleDetails-content-article-institutions-ror'
                  src={ror}
                  alt='ROR icon'
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
            <img 
              className='articleDetails-content-article-authors-withInstitutions-caret' 
              src={openedInstitutions ? caretUpGrey : caretDownGrey} 
              alt={openedInstitutions ? 'Caret up icon' : 'Caret down icon'} 
              onClick={(): void => setOpenedInstitutions(!openedInstitutions)} 
            />
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
'use client';

import { TFunction } from 'i18next';
import './AuthorCard.scss';

import caretRightBlack from '../../../../public/icons/caret-right-black.svg';
import caretRightRed from '../../../../public/icons/caret-right-red.svg';
import { IAuthor } from "@/types/author";

export interface IAuthorCardProps {
  t: TFunction<"translation", undefined>
  author: IAuthor;
  expandedCard: boolean;
  setExpandedAuthorIndexCallback: () => void;
}

export default function AuthorCard({ t, author, expandedCard, setExpandedAuthorIndexCallback }: IAuthorCardProps): JSX.Element {
  return (
    <div className="authorCard">
      <div className="authorCard-title">
        <div className="authorCard-title-name" onClick={setExpandedAuthorIndexCallback}>
          <div className={`authorCard-title-name-text ${expandedCard ? 'authorCard-title-name-text-expanded' : ''}`}>{author.name}</div>
          {expandedCard ? (
            <img className="authorCard-title-name-caret" src={caretRightRed} alt='Caret right icon' />
          ) : (
            <img className="authorCard-title-name-caret" src={caretRightBlack} alt='Caret right icon' />
          )}
        </div>
        <div className="authorCard-title-count">{author.count > 1 ? `${author.count} ${t('common.articles')}` : `${author.count} ${t('common.article')}`}</div>
      </div>
    </div>
  )
} 
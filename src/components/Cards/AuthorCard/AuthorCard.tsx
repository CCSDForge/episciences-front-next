'use client';

import { TFunction } from 'i18next';
import { CaretDownBlackIcon, CaretRightBlackIcon } from '@/components/icons';
import './AuthorCard.scss';

import { IAuthor } from '@/types/author';

export interface IAuthorCardProps {
  t: TFunction<'translation', undefined>;
  author: IAuthor;
  expandedCard: boolean;
  setExpandedAuthorIndexCallback: () => void;
}

export default function AuthorCard({
  t,
  author,
  expandedCard,
  setExpandedAuthorIndexCallback,
}: IAuthorCardProps): React.JSX.Element {
  return (
    <div className="authorCard">
      <div className="authorCard-title">
        <div className="authorCard-title-name" 
        role="button"
        tabIndex={0}
        
        onClick={setExpandedAuthorIndexCallback}        onKeyDown={(e) => handleKeyboardClick(e, setExpandedAuthorIndexCallback)}>
          <div
            className={`authorCard-title-name-text ${expandedCard ? 'authorCard-title-name-text-expanded' : ''}`}
          >
            {author.name}
          </div>
          {expandedCard ? (
            <CaretDownBlackIcon
              size={16}
              className="authorCard-title-name-caret"
              ariaLabel="Collapse author"
            />
          ) : (
            <CaretRightBlackIcon
              size={16}
              className="authorCard-title-name-caret"
              ariaLabel="Expand author"
            />
          )}
        </div>
        <div className="authorCard-title-count">
          {author.count > 1
            ? `${author.count} ${t('common.articles')}`
            : `${author.count} ${t('common.article')}`}
        </div>
      </div>
    </div>
  );
}

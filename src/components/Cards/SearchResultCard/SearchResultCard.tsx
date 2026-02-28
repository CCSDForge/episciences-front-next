'use client';

import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import {
  CaretUpBlackIcon,
  CaretDownBlackIcon,
  DownloadBlackIcon,
  QuoteBlackIcon,
} from '@/components/icons';
import './SearchResultCard.scss';

import { PATHS } from '@/config/paths';
import { IArticle, IArticleAbstracts } from '@/types/article';
import { getArticleTypeLabel } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { useCitationsDropdown } from '@/hooks/useCitationsDropdown';

export interface ISearchResultCard extends IArticle {
  openedAbstract: boolean;
}

interface ISearchResultCardProps {
  language: AvailableLanguage;
  rvcode?: string;
  t: TFunction<'translation', undefined>;
  searchResult: ISearchResultCard;
  toggleAbstractCallback: () => void;
}

export default function SearchResultCard({
  language,
  rvcode,
  t,
  searchResult,
  toggleAbstractCallback,
}: ISearchResultCardProps): React.JSX.Element {
  const {
    citations,
    showCitationsDropdown,
    citationsDropdownRef,
    copyCitation,
    handleTriggerMouseEnter,
    handleTriggerClick,
    handleContainerMouseLeave,
  } = useCitationsDropdown(searchResult.id, rvcode, t);

  // Helper to extract abstract string from union type
  const getAbstractString = (
    abstract: string | IArticleAbstracts | undefined
  ): string | undefined => {
    if (!abstract) return undefined;
    if (typeof abstract === 'string') return abstract;
    // If it's an object, try to get the current language or fallback
    return abstract[language] || abstract.en || abstract.fr || Object.values(abstract)[0];
  };

  return (
    <div className="searchResultCard">
      {searchResult.tag && (
        <div className="searchResultCardTag">
          {t(getArticleTypeLabel(searchResult.tag))}
        </div>
      )}
      <Link href={`/${PATHS.articles}/${searchResult.id}`} lang={language}>
        <div className="searchResultCardTitle">
          <MathJax dynamic>{searchResult.title}</MathJax>
        </div>
      </Link>
      <div className="searchResultCardAuthors">
        {searchResult.authors.map(author => author.fullname).join(', ')}
      </div>
      {searchResult.abstract && (
        <div className="searchResultCardAbstract">
          <button
            type="button"
            className={`searchResultCardAbstractTitle ${!searchResult.openedAbstract ? 'searchResultCardAbstractTitleClosed' : ''}`}
            onClick={toggleAbstractCallback}
          >
            <div className="searchResultCardAbstractTitleText">{t('common.abstract')}</div>
            {searchResult.openedAbstract ? (
              <CaretUpBlackIcon
                size={14}
                className="searchResultCardAbstractTitleCaret"
                ariaLabel="Collapse abstract"
              />
            ) : (
              <CaretDownBlackIcon
                size={14}
                className="searchResultCardAbstractTitleCaret"
                ariaLabel="Expand abstract"
              />
            )}
          </button>
          <div
            className={`searchResultCardAbstractContent ${searchResult.openedAbstract ? 'searchResultCardAbstractContentOpened' : ''}`}
          >
            <MathJax dynamic>{getAbstractString(searchResult.abstract)}</MathJax>
          </div>
        </div>
      )}
      <div className="searchResultCardAnchor">
        <div className="searchResultCardAnchorPublicationDate">
          {`${t('common.publishedOn')} ${formatDate(searchResult?.publicationDate!, language)}`}
        </div>
        <div className="searchResultCardAnchorIcons">
          {searchResult.pdfLink && (
            <a href={`/${language}/${PATHS.articles}/${searchResult.id}/download`}>
              <div className="searchResultCardAnchorIconsDownload">
                <DownloadBlackIcon
                  size={16}
                  className="searchResultCardAnchorIconsDownloadIcon"
                  ariaLabel="Download PDF"
                />
                <div className="searchResultCardAnchorIconsDownloadText">{t('common.pdf')}</div>
              </div>
            </a>
          )}
          {searchResult.id && (
            <div
              ref={citationsDropdownRef}
              className="searchResultCardAnchorIconsCite"
              onMouseLeave={handleContainerMouseLeave}
            >
              <button
                type="button"
                className="searchResultCardAnchorIconsCiteTrigger"
                onMouseEnter={handleTriggerMouseEnter}
                onClick={handleTriggerClick}
              >
                <QuoteBlackIcon
                  size={16}
                  className="searchResultCardAnchorIconsCiteIcon"
                  ariaLabel="Cite article"
                />
                <div className="searchResultCardAnchorIconsCiteText">{t('common.cite')}</div>
              </button>
              <div
                className={`searchResultCardAnchorIconsCiteContent ${showCitationsDropdown ? 'searchResultCardAnchorIconsCiteContentDisplayed' : ''}`}
              >
                <div className="searchResultCardAnchorIconsCiteContentLinks">
                  {citations.length > 0 ? (
                    citations.map(citation => (
                      <button
                        type="button"
                        key={citation.key}
                        onClick={(): void => copyCitation(citation)}
                        onTouchEnd={(): void => copyCitation(citation)}
                      >
                        {citation.key}
                      </button>
                    ))
                  ) : (
                    <span className="searchResultCardAnchorIconsCiteLoading">
                      {t('common.loading')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

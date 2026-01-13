'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';
import { IArticle, IArticleAbstracts } from '@/types/article';
import {
  CITATION_TEMPLATE,
  ICitation,
  METADATA_TYPE,
  articleTypes,
  copyToClipboardCitation,
  getCitations,
} from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { handleKeyboardClick } from '@/utils/keyboard';

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
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [showCitationsDropdown, setShowCitationsDropdown] = useState(false);

  // Helper to extract abstract string from union type
  const getAbstractString = (
    abstract: string | IArticleAbstracts | undefined
  ): string | undefined => {
    if (!abstract) return undefined;
    if (typeof abstract === 'string') return abstract;
    // If it's an object, try to get the current language or fallback
    return abstract[language] || abstract.en || abstract.fr || Object.values(abstract)[0];
  };

  const { data: metadataCSL } = useFetchArticleMetadataQuery(
    {
      rvcode: rvcode!,
      paperid: searchResult.id.toString(),
      type: METADATA_TYPE.CSL,
    },
    {
      skip: !searchResult.id || !rvcode,
    }
  );

  const { data: metadataBibTeX } = useFetchArticleMetadataQuery(
    {
      rvcode: rvcode!,
      paperid: searchResult.id.toString(),
      type: METADATA_TYPE.BIBTEX,
    },
    {
      skip: !searchResult.id || !rvcode,
    }
  );

  const citationsDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleTouchOutside = (event: TouchEvent): void => {
      if (
        citationsDropdownRef.current &&
        !citationsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCitationsDropdown(false);
      }
    };

    document.addEventListener('touchstart', handleTouchOutside);

    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [citationsDropdownRef]);

  useEffect(() => {
    const fetchCitations = async () => {
      const fetchedCitations = await getCitations(metadataCSL as string);

      // BibTeX is already added by getCitations with an empty citation,
      // and then updated if metadataBibTeX is available.
      // But here we need to make sure the citation is correctly filled
      const bibtexIndex = fetchedCitations.findIndex(
        citation => citation.key === CITATION_TEMPLATE.BIBTEX
      );
      if (bibtexIndex !== -1 && metadataBibTeX) {
        fetchedCitations[bibtexIndex].citation = metadataBibTeX as string;
      }

      setCitations(fetchedCitations);
    };

    if (metadataCSL && metadataBibTeX) {
      fetchCitations();
    }
  }, [metadataCSL, metadataBibTeX]);

  const copyCitation = (citation: ICitation): void => {
    copyToClipboardCitation(citation, t);
    setShowCitationsDropdown(false);
  };

  return (
    <div className="searchResultCard">
      {searchResult.tag && (
        <div className="searchResultCardTag">
          {t(articleTypes.find(tag => tag.value === searchResult.tag)?.labelPath!)}
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
          <div
            className={`searchResultCardAbstractTitle ${!searchResult.openedAbstract ? 'searchResultCardAbstractTitleClosed' : ''}`}
            role="button"
            tabIndex={0}
            onClick={toggleAbstractCallback}
            onKeyDown={(e) => handleKeyboardClick(e, toggleAbstractCallback)}
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
          </div>
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
          {citations.length > 0 && (
            <div
              ref={citationsDropdownRef}
              className="searchResultCardAnchorIconsCite"
              role="button"
              tabIndex={0}
              onMouseEnter={(): void => setShowCitationsDropdown(true)}
              onMouseLeave={(): void => setShowCitationsDropdown(false)}
              onClick={(): void => setShowCitationsDropdown(!showCitationsDropdown)}
              onKeyDown={(e) => handleKeyboardClick(e, () => setShowCitationsDropdown(!showCitationsDropdown))}
            >
              <QuoteBlackIcon
                size={16}
                className="searchResultCardAnchorIconsCiteIcon"
                ariaLabel="Cite article"
              />
              <div className="searchResultCardAnchorIconsCiteText">{t('common.cite')}</div>
              <div
                className={`searchResultCardAnchorIconsCiteContent ${showCitationsDropdown ? 'searchResultCardAnchorIconsCiteContentDisplayed' : ''}`}
              >
                <div className="searchResultCardAnchorIconsCiteContentLinks">
                  {citations.map((citation, index) => (
                    <span
                      key={index}
                      role="button"
                      tabIndex={0}
                      onClick={(): void => copyCitation(citation)}
                      onKeyDown={(e) => handleKeyboardClick(e, (): void => copyCitation(citation))}
                      onTouchEnd={(): void => copyCitation(citation)}
                    >
                      {citation.key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

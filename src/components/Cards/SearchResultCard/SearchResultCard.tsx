'use client';

import { useState, useEffect, useRef } from 'react';
import { Link } from '@/components/Link/Link';
import { TFunction } from 'i18next';
import { MathJax } from 'better-react-mathjax';
import './SearchResultCard.scss';

import caretUpIcon from '../../../../public/icons/caret-up-red.svg';
import caretDownIcon from '../../../../public/icons/caret-down-red.svg';
import downloadIcon from '../../../../public/icons/download-red.svg';
import quoteIcon from '../../../../public/icons/quote-red.svg';
import { PATHS } from '@/config/paths';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';
import { IArticle, IArticleAbstracts } from "@/types/article";
import { CITATION_TEMPLATE, ICitation, METADATA_TYPE, articleTypes, copyToClipboardCitation, getCitations } from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';

export interface ISearchResultCard extends IArticle {
  openedAbstract: boolean;
}

interface ISearchResultCardProps {
  language: AvailableLanguage;
  rvcode?: string;
  t: TFunction<"translation", undefined>
  searchResult: ISearchResultCard;
  toggleAbstractCallback: () => void;
}

export default function SearchResultCard({ language, rvcode, t, searchResult, toggleAbstractCallback }: ISearchResultCardProps): JSX.Element {
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [showCitationsDropdown, setShowCitationsDropdown] = useState(false);

  const isStaticBuild = process.env.NEXT_PUBLIC_STATIC_BUILD === 'true';

  // Helper to extract abstract string from union type
  const getAbstractString = (abstract: string | IArticleAbstracts | undefined): string | undefined => {
    if (!abstract) return undefined;
    if (typeof abstract === 'string') return abstract;
    // If it's an object, try to get the current language or fallback
    return abstract[language] || abstract.en || abstract.fr || Object.values(abstract)[0];
  };

  const { data: metadataCSL } = useFetchArticleMetadataQuery({ 
    rvcode: rvcode!, 
    paperid: searchResult.id.toString(), 
    type: METADATA_TYPE.CSL 
  }, { 
    skip: !searchResult.id || !rvcode || isStaticBuild 
  });

  const { data: metadataBibTeX } = useFetchArticleMetadataQuery({ 
    rvcode: rvcode!, 
    paperid: searchResult.id.toString(), 
    type: METADATA_TYPE.BIBTEX 
  }, { 
    skip: !searchResult.id || !rvcode || isStaticBuild 
  });

  const citationsDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleTouchOutside = (event: TouchEvent): void => {
      if (citationsDropdownRef.current && !citationsDropdownRef.current.contains(event.target as Node)) {
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
      fetchedCitations.push({
        key: CITATION_TEMPLATE.BIBTEX,
        citation: metadataBibTeX as string
      })

      setCitations(fetchedCitations);
    };

    if (metadataCSL && metadataBibTeX) {
      fetchCitations();
    }
  }, [metadataCSL, metadataBibTeX]);

  const copyCitation = (citation: ICitation): void => {
    copyToClipboardCitation(citation, t)
    setShowCitationsDropdown(false)
  }

  return (
    <div className="searchResultCard">
      {searchResult.tag && (
        <div className="searchResultCardTag">
          {t(articleTypes.find((tag) => tag.value === searchResult.tag)?.labelPath!)}
        </div>
      )}
      <Link href={`/${PATHS.articles}/${searchResult.id}`}>
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
            onClick={toggleAbstractCallback}
          >
            <div className="searchResultCardAbstractTitleText">
              {t('common.abstract')}
            </div>
            <img 
              className="searchResultCardAbstractTitleCaret" 
              src={searchResult.openedAbstract ? caretUpIcon : caretDownIcon} 
              alt={searchResult.openedAbstract ? 'Caret up icon' : 'Caret down icon'} 
            />
          </div>
          <div className={`searchResultCardAbstractContent ${searchResult.openedAbstract ? 'searchResultCardAbstractContentOpened' : ''}`}>
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
            <Link href={`/${PATHS.articles}/${searchResult.id}/download`}>
              <div className="searchResultCardAnchorIconsDownload">
                <img 
                  className="searchResultCardAnchorIconsDownloadIcon" 
                  src={downloadIcon} 
                  alt='Download icon' 
                />
                <div className="searchResultCardAnchorIconsDownloadText">
                  {t('common.pdf')}
                </div>
              </div>
            </Link>
          )}
          {citations.length > 0 && (
            <div
              ref={citationsDropdownRef}
              className="searchResultCardAnchorIconsCite"
              onMouseEnter={(): void => setShowCitationsDropdown(true)}
              onMouseLeave={(): void => setShowCitationsDropdown(false)}
              onTouchStart={(): void => setShowCitationsDropdown(!showCitationsDropdown)}
            >
              <img 
                className="searchResultCardAnchorIconsCiteIcon" 
                src={quoteIcon} 
                alt='Cite icon' 
              />
              <div className="searchResultCardAnchorIconsCiteText">
                {t('common.cite')}
              </div>
              <div className={`searchResultCardAnchorIconsCiteContent ${showCitationsDropdown ? 'searchResultCardAnchorIconsCiteContentDisplayed' : ''}`}>
                <div className="searchResultCardAnchorIconsCiteContentLinks">
                  {citations.map((citation, index) => (
                    <span 
                      key={index} 
                      onClick={(): void => copyCitation(citation)} 
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
  )
} 
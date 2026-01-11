'use client';

import { useState, useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import MathJax from '@/components/MathJax/MathJax';
import { Link } from '@/components/Link/Link';
import {
  CaretUpBlackIcon,
  CaretDownBlackIcon,
  DownloadBlackIcon,
  QuoteBlackIcon,
} from '@/components/icons';
import './ArticleCard.scss';

import { PATHS } from '@/config/paths';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';
import { IArticle } from '@/types/article';
import {
  CITATION_TEMPLATE,
  ICitation,
  METADATA_TYPE,
  articleTypes,
  copyToClipboardCitation,
  getCitations,
  getAbstractText,
} from '@/utils/article';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';

export interface IArticleCard extends IArticle {
  openedAbstract: boolean;
}

interface IArticleCardProps {
  language: AvailableLanguage;
  rvcode?: string;
  t: TFunction<'translation', undefined>;
  article: IArticleCard;
  toggleAbstractCallback: () => void;
}

export default function ArticleCard({
  language,
  rvcode,
  t,
  article,
  toggleAbstractCallback,
}: IArticleCardProps): React.JSX.Element {
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [showCitationsDropdown, setShowCitationsDropdown] = useState(false);

  const getArticlePath = () => {
    return `${PATHS.articles}/${article.id}`;
  };

  const { data: metadataCSL } = useFetchArticleMetadataQuery(
    {
      rvcode: rvcode!,
      paperid: article.id.toString(),
      type: METADATA_TYPE.CSL,
    },
    {
      skip: !article.id || !rvcode,
    }
  );

  const { data: metadataBibTeX } = useFetchArticleMetadataQuery(
    {
      rvcode: rvcode!,
      paperid: article.id.toString(),
      type: METADATA_TYPE.BIBTEX,
    },
    {
      skip: !article.id || !rvcode,
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
    <div className="articleCard">
      {article.tag && (
        <div className="articleCard-tag">
          {t(articleTypes.find(tag => tag.value === article.tag)?.labelPath!)}
        </div>
      )}
      <Link
        href={getArticlePath()}
        lang={language}
        className="articleCard-title"
        style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
      >
        <MathJax dynamic>{article.title}</MathJax>
      </Link>
      <div className="articleCard-authors">
        {article.authors.map(author => author.fullname).join(', ')}
      </div>
      {article.abstract && (
        <div className="articleCard-abstract">
          <div
            className={`articleCard-abstract-title ${!article.openedAbstract ? 'articleCard-abstract-title-closed' : ''}`}
            onClick={toggleAbstractCallback}
          >
            <div className="articleCard-abstract-title-text">{t('common.abstract')}</div>
            {article.openedAbstract ? (
              <CaretUpBlackIcon
                size={14}
                className="articleCard-abstract-title-caret"
                ariaLabel="Collapse abstract"
              />
            ) : (
              <CaretDownBlackIcon
                size={14}
                className="articleCard-abstract-title-caret"
                ariaLabel="Expand abstract"
              />
            )}
          </div>
          <div
            className={`articleCard-abstract-content ${article.openedAbstract ? 'articleCard-abstract-content-opened' : ''}`}
          >
            <MathJax dynamic>{getAbstractText(article.abstract, language)}</MathJax>
          </div>
        </div>
      )}
      <div className="articleCard-anchor">
        <div className="articleCard-anchor-publicationDate">
          {`${t('common.publishedOn')} ${formatDate(article?.publicationDate!, language)}`}
        </div>
        <div className="articleCard-anchor-icons">
          {article.pdfLink && (
            <Link
              href={`${PATHS.articles}/${article.id}/download`}
              lang={language}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="articleCard-anchor-icons-download">
                <DownloadBlackIcon
                  size={16}
                  className="articleCard-anchor-icons-download-icon"
                  ariaLabel="Download PDF"
                />
                <div className="articleCard-anchor-icons-download-text">{t('common.pdf')}</div>
              </div>
            </Link>
          )}
          {citations.length > 0 && (
            <div
              ref={citationsDropdownRef}
              className="articleCard-anchor-icons-cite"
              onMouseEnter={(): void => setShowCitationsDropdown(true)}
              onMouseLeave={(): void => setShowCitationsDropdown(false)}
              onTouchStart={(): void => setShowCitationsDropdown(!showCitationsDropdown)}
            >
              <QuoteBlackIcon
                size={16}
                className="articleCard-anchor-icons-cite-icon"
                ariaLabel="Cite article"
              />
              <div className="articleCard-anchor-icons-cite-text">{t('common.cite')}</div>
              <div
                className={`articleCard-anchor-icons-cite-content ${showCitationsDropdown ? 'articleCard-anchor-icons-cite-content-displayed' : ''}`}
              >
                <div className="articleCard-anchor-icons-cite-content-links">
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
  );
}

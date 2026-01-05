'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/components/Link/Link';
import { useRouter } from 'next/navigation';
import { TFunction } from 'i18next';
import { EmailShareButton, FacebookShareButton, LinkedinShareButton, TwitterShareButton } from 'react-share';
import { isMobileOnly } from 'react-device-detect';
import {
  ExternalLinkBlackIcon,
  DownloadBlackIcon,
  QuoteBlackIcon,
  ShareIcon,
  MailIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  CaretUpGreyIcon,
  CaretDownGreyIcon
} from '@/components/icons';

import { IArticle } from '@/types/article';
import { IVolume } from '@/types/volume';
import { ICitation, METADATA_TYPE, copyToClipboardCitation, getLicenseTranslations, getMetadataTypes } from '@/utils/article';
import { fetchArticleMetadata } from '@/services/article';
import { toast } from 'react-toastify';
import { useAppSelector } from '@/hooks/store';
import { formatDate } from '@/utils/date';
import { AvailableLanguage } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import { PATHS } from '@/config/paths';

import './ArticleDetailsSidebar.scss';

interface IArticleDetailsSidebarProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  article?: IArticle;
  relatedVolume?: IVolume;
  citations: ICitation[];
  metrics?: React.JSX.Element;
}

export default function ArticleDetailsSidebar({ language, t, article, relatedVolume, citations, metrics }: IArticleDetailsSidebarProps): React.JSX.Element {
  const router = useRouter();
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const [openedPublicationDetails, setOpenedPublicationDetails] = useState(true);
  const [showCitationsDropdown, setShowCitationsDropdown] = useState(false);
  const [showMetadatasDropdown, setShowMetadatasDropdown] = useState(false);
  const [showSharingDropdown, setShowSharingDropdown] = useState(false);
  const [openedFunding, setOpenedFunding] = useState(true);
  const [metadataTypes] = useState(getMetadataTypes());
  const [isDownloadingMetadata, setIsDownloadingMetadata] = useState(false);

  const citationsDropdownRef = useRef<HTMLDivElement | null>(null);
  const metadatasDropdownRef = useRef<HTMLDivElement | null>(null);
  const sharingDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleTouchOutsideCitations = (event: TouchEvent): void => {
      if (citationsDropdownRef.current && !citationsDropdownRef.current.contains(event.target as Node)) {
        setShowCitationsDropdown(false);
      }
    };

    const handleTouchOutsideMetadatas = (event: TouchEvent): void => {
      if (metadatasDropdownRef.current && !metadatasDropdownRef.current.contains(event.target as Node)) {
        setShowMetadatasDropdown(false);
      }
    };

    const handleTouchOutsideSharing = (event: TouchEvent): void => {
      if (sharingDropdownRef.current && !sharingDropdownRef.current.contains(event.target as Node)) {
        setShowSharingDropdown(false);
      }
    };
    
    document.addEventListener('touchstart', handleTouchOutsideCitations);
    document.addEventListener('touchstart', handleTouchOutsideMetadatas);
    document.addEventListener('touchstart', handleTouchOutsideSharing);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchOutsideCitations);
      document.removeEventListener('touchstart', handleTouchOutsideMetadatas);
      document.removeEventListener('touchstart', handleTouchOutsideSharing);
    };
  }, [citationsDropdownRef, metadatasDropdownRef, sharingDropdownRef]);

  const togglePublicationDetails = (): void => setOpenedPublicationDetails(!openedPublicationDetails);

  const toggleFunding = (): void => setOpenedFunding(!openedFunding);

  /**
   * Get multilingual title with language fallback
   * Priority: current language > english > first available language
   */
  const getMultilingualTitle = (titles: Record<AvailableLanguage, string>): string => {
    if (!titles) return '';

    // Try current language
    if (titles[language]) {
      return titles[language];
    }

    // Fallback to English
    if (titles['en']) {
      return titles['en'];
    }

    // Fallback to first available language
    const availableLanguages = Object.keys(titles) as AvailableLanguage[];
    if (availableLanguages.length > 0) {
      return titles[availableLanguages[0]];
    }

    return '';
  };

  const renderRelatedVolume = (relatedVolume?: IVolume): React.JSX.Element | null => {
    if (!relatedVolume) return null;

    let text = '';

    if (relatedVolume?.types && relatedVolume.types.length > 0) {
      if (relatedVolume.types.includes(VOLUME_TYPE.PROCEEDINGS)) {
        text += t('pages.articleDetails.volumeDetails.proceeding');
      }

      if (relatedVolume.types.includes(VOLUME_TYPE.SPECIAL_ISSUE)) {
        text += t('pages.articleDetails.volumeDetails.specialIssue');
      }
    } else {
      text += t('pages.articleDetails.volumeDetails.title');
    }

    return (
      <Link href={`/${PATHS.volumes}/${relatedVolume.id}`} className="articleDetailsSidebar-volumeDetails-number">{text} {relatedVolume.num}</Link>
    );
  };

  const renderRelatedSection = (): React.JSX.Element | null => {
    if (!article?.section) return null;

    const sectionTitle = getMultilingualTitle(article.section.title);

    if (!sectionTitle) return null;

    return (
      <div className="articleDetailsSidebar-volumeDetails-section">{sectionTitle}</div>
    );
  };

  const renderLicenseContent = (): React.JSX.Element | null => {
    if (!article?.license) return null;

    const licenseTranslations = getLicenseTranslations(t);
    const translatedLicense = licenseTranslations.find(lt => lt.value === article.license);

    if (!translatedLicense) return null;

    return (
      <div className="articleDetailsSidebar-volumeDetails-license">
        <div>{t('pages.articleDetails.license')}</div>
        {translatedLicense.isLink ? (
          <Link href={translatedLicense.value} className="articleDetailsSidebar-volumeDetails-license-content articleDetailsSidebar-volumeDetails-license-content-link" target="_blank" rel="noopener noreferrer">{translatedLicense.label}</Link>
        ) : (
          <div className="articleDetailsSidebar-volumeDetails-license-content">{translatedLicense.label}</div>
        )}
      </div>
    );
  };

  const copyCitation = (citation: ICitation): void => {
    copyToClipboardCitation(citation, t);
    setShowCitationsDropdown(false);
  };

  const getFileExtension = (type: METADATA_TYPE): string => {
    switch (type) {
      case METADATA_TYPE.BIBTEX:
        return 'bib';
      case METADATA_TYPE.JSON:
      case METADATA_TYPE.CSL:
      case METADATA_TYPE.JSON_LD:
        return 'json';
      case METADATA_TYPE.RIS:
        return 'ris';
      default:
        return 'xml';
    }
  };

  const downloadMetadata = async (metadata: { type: METADATA_TYPE; label: string }): Promise<void> => {
    if (!article?.id || !rvcode || isDownloadingMetadata) return;

    try {
      setIsDownloadingMetadata(true);
      const metadataContent = await fetchArticleMetadata({
        rvcode,
        paperid: article.id.toString(),
        type: metadata.type
      });

      if (!metadataContent) {
        toast.error(t('pages.articleDetails.metadata.downloadError'));
        return;
      }

      // Create blob and trigger download
      const blob = new Blob([metadataContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `article_${article.id}_metadata_${metadata.type}.${getFileExtension(metadata.type)}`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('pages.articleDetails.metadata.downloadSuccess', { format: metadata.label }));
      setShowMetadatasDropdown(false);
    } catch (error) {
      console.error('Error downloading metadata:', error);
      toast.error(t('pages.articleDetails.metadata.downloadError'));
    } finally {
      setIsDownloadingMetadata(false);
    }
  };

  return (
    <div className="articleDetailsSidebar">
      <div className="articleDetailsSidebar-links">
        {article?.pdfLink && (
          <>
            <a href={article.pdfLink} target="_blank" rel="noopener noreferrer">
              <div className="articleDetailsSidebar-links-link">
                <DownloadBlackIcon size={20} className="articleDetailsSidebar-links-link-icon" ariaLabel="Download PDF" />
                <div className="articleDetailsSidebar-links-link-text">{t('pages.articleDetails.actions.download')}</div>
              </div>
            </a>
          </>
        )}
        {article?.docLink && (
          <a
            href={article.docLink}
            target="_blank"
            rel="noopener noreferrer"
            className="articleDetailsSidebar-links-link"
          >
            <ExternalLinkBlackIcon
              size={20}
              className="articleDetailsSidebar-links-link-icon"
              ariaLabel="Open on repository"
            />
            <div className="articleDetailsSidebar-links-link-text">
              {t('pages.articleDetails.actions.openOn')} {article.repositoryName}
            </div>
          </a>
        )}
        
        {citations.length > 0 && (
          <div
            ref={citationsDropdownRef}
            className="articleDetailsSidebar-links-link articleDetailsSidebar-links-link-modal"
            onMouseEnter={(): void => setShowCitationsDropdown(true)}
            onMouseLeave={(): void => setShowCitationsDropdown(false)}
            onTouchStart={(): void => setShowCitationsDropdown(!showCitationsDropdown)}
          >
            <QuoteBlackIcon size={20} className="articleDetailsSidebar-links-link-icon" ariaLabel="Cite article" />
            <div className="articleDetailsSidebar-links-link-text">{t('pages.articleDetails.actions.cite')}</div>
            <div className={`articleDetailsSidebar-links-link-modal-content ${showCitationsDropdown && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}>
              <div className="articleDetailsSidebar-links-link-modal-content-links">
                {citations.map((citation, index) => (
                  <div
                    key={index}
                    className="articleDetailsSidebar-links-link-modal-content-links-link"
                    onClick={(): void => copyCitation(citation)}
                    onTouchEnd={(): void => copyCitation(citation)}
                  >{citation.key}</div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {metadataTypes.length > 0 && (
          <div
            ref={metadatasDropdownRef}
            className="articleDetailsSidebar-links-link articleDetailsSidebar-links-link-modal"
            onMouseEnter={(): void => setShowMetadatasDropdown(true)}
            onMouseLeave={(): void => setShowMetadatasDropdown(false)}
            onTouchStart={(): void => setShowMetadatasDropdown(!showMetadatasDropdown)}
          >
            <QuoteBlackIcon size={20} className="articleDetailsSidebar-links-link-icon" ariaLabel="Download metadata" />
            <div className="articleDetailsSidebar-links-link-text">{t('pages.articleDetails.actions.metadata')}</div>
            <div className={`articleDetailsSidebar-links-link-modal-content ${showMetadatasDropdown && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}>
              <div className="articleDetailsSidebar-links-link-modal-content-links">
                {metadataTypes.map((metadata, index) => (
                  <div
                    key={index}
                    className="articleDetailsSidebar-links-link-modal-content-links-link"
                    onClick={(): void => { void downloadMetadata(metadata); }}
                    onTouchEnd={(): void => { void downloadMetadata(metadata); }}
                  >{metadata.label}</div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div
          ref={sharingDropdownRef}
          className="articleDetailsSidebar-links-link articleDetailsSidebar-links-link-modal"
          onMouseEnter={(): void => setShowSharingDropdown(true)}
          onMouseLeave={(): void => setShowSharingDropdown(false)}
          onTouchStart={(): void => setShowSharingDropdown(!showSharingDropdown)}
        >
          <ShareIcon size={20} className="articleDetailsSidebar-links-link-icon" ariaLabel="Share article" />
          <div className="articleDetailsSidebar-links-link-text">{t('pages.articleDetails.actions.share.text')}</div>
          <div className={`articleDetailsSidebar-links-link-modal-content ${showSharingDropdown && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}>
            <div className="articleDetailsSidebar-links-link-modal-content-sharing">
              <EmailShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
                <MailIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share via email" />
              </EmailShareButton>
              <FacebookShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
                <FacebookIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on Facebook" />
              </FacebookShareButton>
              <TwitterShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
                <TwitterIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on X" />
              </TwitterShareButton>
              <LinkedinShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
                <LinkedinIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on LinkedIn" />
              </LinkedinShareButton>
            </div>
          </div>
        </div>
      </div>
      
      <div className="articleDetailsSidebar-publicationDetails">
        <div className="articleDetailsSidebar-publicationDetails-title" onClick={togglePublicationDetails}>
          <div className="articleDetailsSidebar-publicationDetails-title-text">{t('common.publicationDetails')}</div>
          {openedPublicationDetails ? (
            <CaretUpGreyIcon size={16} className="articleDetailsSidebar-publicationDetails-title-caret" ariaLabel="Collapse publication details" />
          ) : (
            <CaretDownGreyIcon size={16} className="articleDetailsSidebar-publicationDetails-title-caret" ariaLabel="Expand publication details" />
          )}
        </div>
        <div className={`articleDetailsSidebar-publicationDetails-content ${openedPublicationDetails && 'articleDetailsSidebar-publicationDetails-content-opened'}`}>
          {article?.submissionDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row">
              <div>{t('common.submittedOn')}</div>
              <div>{formatDate(article.submissionDate, language)}</div>
            </div>
          )}
          {article?.acceptanceDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row">
              <div>{t('common.acceptedOn')}</div>
              <div>{formatDate(article.acceptanceDate, language)}</div>
            </div>
          )}
          {article?.publicationDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row articleDetailsSidebar-publicationDetails-content-row-publicationDate">
              <div>{t('common.publishedOn')}</div>
              <div className="articleDetailsSidebar-publicationDetails-content-row-publicationDate-value">{formatDate(article.publicationDate, language)}</div>
            </div>
          )}
          {article?.modificationDate && (
            <div className="articleDetailsSidebar-publicationDetails-content-row">
              <div>{t('common.lastModifiedOn')}</div>
              <div>{formatDate(article.modificationDate, language)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="articleDetailsSidebar-volumeDetails">
        {renderRelatedVolume(relatedVolume)}
        {renderRelatedSection()}
        {renderLicenseContent()}
      </div>

      {article?.doi && article.doi.trim() !== '' && (
        <div className="articleDetailsSidebar-doi">
          <div className="articleDetailsSidebar-doi-label">{t('common.doi')}</div>
          <Link href={`https://doi.org/${article.doi}`} className="articleDetailsSidebar-doi-link" target="_blank" rel="noopener noreferrer">
            {article.doi}
          </Link>
        </div>
      )}

      {article?.fundings && article.fundings.length > 0 && (
        <div className="articleDetailsSidebar-funding">
          <div className="articleDetailsSidebar-funding-title" onClick={toggleFunding}>
            <div className="articleDetailsSidebar-funding-title-text">{t('pages.articleDetails.funding.title')}</div>
            {openedFunding ? (
              <CaretUpGreyIcon size={16} className="articleDetailsSidebar-funding-title-caret" ariaLabel="Collapse funding" />
            ) : (
              <CaretDownGreyIcon size={16} className="articleDetailsSidebar-funding-title-caret" ariaLabel="Expand funding" />
            )}
          </div>
          <div className={`articleDetailsSidebar-funding-content ${openedFunding && 'articleDetailsSidebar-funding-content-opened'}`}>
            {article.fundings.map((fund: any, index: number) => (
              <div key={index} className="articleDetailsSidebar-funding-content-row">
                <div>{fund.funder || fund}</div>
                {fund.award && <div>#{fund.award}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics}
    </div>
  );
} 
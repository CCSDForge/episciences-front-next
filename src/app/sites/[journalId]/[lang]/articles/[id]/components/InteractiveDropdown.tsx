'use client';

import { QuoteBlackIcon, ShareIcon, BlueskyIcon, MailIcon, FacebookIcon, TwitterIcon, LinkedinIcon, WhatsappIcon } from '@/components/icons';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { BlueskyShareButton, EmailShareButton, FacebookShareButton, LinkedinShareButton, TwitterShareButton, WhatsappShareButton } from 'react-share';

import { ICitation, METADATA_TYPE, copyToClipboardCitation, getMetadataTypes, getCitations, CITATION_TEMPLATE } from '@/utils/article';
import { fetchArticleMetadata } from '@/services/article';
import { toast } from 'react-toastify';
import { useAppSelector } from '@/hooks/store';

interface InteractiveDropdownProps {
  type: 'cite' | 'metadata' | 'share';
  metadataCSL?: string | null;
  metadataBibTeX?: string | null;
  articleId?: string;
  label?: string; // Optional pre-translated label
}

export default function InteractiveDropdown({ type, metadataCSL, metadataBibTeX, articleId, label }: InteractiveDropdownProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const [showDropdown, setShowDropdown] = useState(false);
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [isDownloadingMetadata, setIsDownloadingMetadata] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const metadataTypes = getMetadataTypes();

  // Generate citations client-side when metadata is available
  useEffect(() => {
    const generateCitations = async () => {
      if (type === 'cite' && (metadataCSL || metadataBibTeX)) {
        const fetchedCitations = await getCitations(metadataCSL as string);

        // Update the BibTeX citation with the proper content
        const bibtexIndex = fetchedCitations.findIndex(citation => citation.key === CITATION_TEMPLATE.BIBTEX);
        if (bibtexIndex !== -1 && metadataBibTeX) {
          fetchedCitations[bibtexIndex].citation = metadataBibTeX as string;
        }

        // Filter out citations with empty content
        const validCitations = fetchedCitations.filter(citation => citation.citation && citation.citation.trim() !== '');

        setCitations(validCitations);
      }
    };

    generateCitations();
  }, [type, metadataCSL, metadataBibTeX]);

  useEffect(() => {
    const handleTouchOutside = (event: TouchEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('touchstart', handleTouchOutside);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, []);

  const copyCitation = (citation: ICitation): void => {
    copyToClipboardCitation(citation, t);
    setShowDropdown(false);
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
    if (!articleId || !rvcode || isDownloadingMetadata) return;

    try {
      setIsDownloadingMetadata(true);
      const metadataContent = await fetchArticleMetadata({
        rvcode,
        paperid: articleId,
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
      a.download = `article_${articleId}_metadata_${metadata.type}.${getFileExtension(metadata.type)}`;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t('pages.articleDetails.metadata.downloadSuccess', { format: metadata.label }));
      setShowDropdown(false);
    } catch (error) {
      console.error('Error downloading metadata:', error);
      toast.error(t('pages.articleDetails.metadata.downloadError'));
    } finally {
      setIsDownloadingMetadata(false);
    }
  };

  const renderCiteDropdown = () => (
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
  );

  const renderMetadataDropdown = () => (
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
  );

  const renderShareDropdown = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
      <div className="articleDetailsSidebar-links-link-modal-content-links">
        <BlueskyShareButton url={currentUrl} className="articleDetailsSidebar-links-link-modal-content-links-link">
          <BlueskyIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on Bluesky" />
          <span>{t('pages.articleDetails.actions.share.bluesky')}</span>
        </BlueskyShareButton>
        <FacebookShareButton url={currentUrl} className="articleDetailsSidebar-links-link-modal-content-links-link">
          <FacebookIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on Facebook" />
          <span>{t('pages.articleDetails.actions.share.facebook')}</span>
        </FacebookShareButton>
        <LinkedinShareButton url={currentUrl} className="articleDetailsSidebar-links-link-modal-content-links-link">
          <LinkedinIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on LinkedIn" />
          <span>{t('pages.articleDetails.actions.share.linkedin')}</span>
        </LinkedinShareButton>
        <EmailShareButton url={currentUrl} className="articleDetailsSidebar-links-link-modal-content-links-link">
          <MailIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share via email" />
          <span>{t('pages.articleDetails.actions.share.email')}</span>
        </EmailShareButton>
        <WhatsappShareButton url={currentUrl} className="articleDetailsSidebar-links-link-modal-content-links-link">
          <WhatsappIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on WhatsApp" />
          <span>{t('pages.articleDetails.actions.share.whatsapp')}</span>
        </WhatsappShareButton>
        <TwitterShareButton url={currentUrl} className="articleDetailsSidebar-links-link-modal-content-links-link">
          <TwitterIcon size={20} className="articleDetailsSidebar-links-link-modal-content-sharing-icon" ariaLabel="Share on X (Twitter)" />
          <span>{t('pages.articleDetails.actions.share.twitter')}</span>
        </TwitterShareButton>
      </div>
    );
  };

  const getIcon = () => {
    const iconProps = {
      size: 20,
      className: "articleDetailsSidebar-links-link-icon",
      ariaLabel: `${type} icon`
    };

    switch (type) {
      case 'cite':
      case 'metadata':
        return <QuoteBlackIcon {...iconProps} />;
      case 'share':
        return <ShareIcon {...iconProps} />;
      default:
        return <QuoteBlackIcon {...iconProps} />;
    }
  };

  const getLabel = () => {
    // Use provided label if available (from server)
    if (label) return label;

    // Fallback to translation hook (for client-only usage)
    switch (type) {
      case 'cite':
        return t('pages.articleDetails.actions.cite');
      case 'metadata':
        return t('pages.articleDetails.actions.metadata');
      case 'share':
        return t('pages.articleDetails.actions.share.text');
      default:
        return '';
    }
  };

  const getDropdownContent = () => {
    switch (type) {
      case 'cite':
        return renderCiteDropdown();
      case 'metadata':
        return renderMetadataDropdown();
      case 'share':
        return renderShareDropdown();
      default:
        return null;
    }
  };

  // Don't render if no data is available
  if (type === 'cite' && citations.length === 0) return null;
  if (type === 'metadata' && metadataTypes.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="articleDetailsSidebar-links-link articleDetailsSidebar-links-link-modal"
      onMouseEnter={(): void => setShowDropdown(true)}
      onMouseLeave={(): void => setShowDropdown(false)}
      onTouchStart={(): void => setShowDropdown(!showDropdown)}
    >
      {getIcon()}
      <div className="articleDetailsSidebar-links-link-text">{getLabel()}</div>
      <div className={`articleDetailsSidebar-links-link-modal-content ${showDropdown && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}>
        {getDropdownContent()}
      </div>
    </div>
  );
}
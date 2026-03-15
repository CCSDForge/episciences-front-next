'use client';

import {
  QuoteBlackIcon,
  ShareIcon,
  BlueskyIcon,
  MailIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  WhatsappIcon,
} from '@/components/icons';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { handleKeyboardClick } from '@/utils/keyboard';
import {
  BlueskyShareButton,
  EmailShareButton,
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton,
  WhatsappShareButton,
} from 'react-share';

import {
  ICitation,
  METADATA_TYPE,
  copyToClipboardCitation,
  getMetadataTypes,
  getCitations,
  CITATION_TEMPLATE,
} from '@/utils/article';
import { fetchArticleMetadata } from '@/services/article';
import { toastSuccess, toastError } from '@/utils/toast';
import { useAppSelector } from '@/hooks/store';

interface InteractiveDropdownProps {
  type: 'cite' | 'metadata' | 'share';
  metadataCSL?: string | null;
  metadataBibTeX?: string | null;
  articleId?: string;
  label?: string; // Optional pre-translated label
}

export default function InteractiveDropdown({
  type,
  metadataCSL,
  metadataBibTeX,
  articleId,
  label,
}: InteractiveDropdownProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const [showDropdown, setShowDropdown] = useState(false);
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [isLoadingCitations, setIsLoadingCitations] = useState(false);
  const [citationsGenerated, setCitationsGenerated] = useState(false);
  const [isDownloadingMetadata, setIsDownloadingMetadata] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const citationAbortRef = useRef<AbortController | null>(null);
  const metadataAbortRef = useRef<AbortController | null>(null);

  const metadataTypes = getMetadataTypes();

  // Cancel in-flight requests on unmount
  useEffect(() => {
    return () => {
      citationAbortRef.current?.abort();
      metadataAbortRef.current?.abort();
    };
  }, []);

  // Generate citations ONLY when user opens the dropdown (lazy loading)
  const generateCitationsOnDemand = useCallback(async () => {
    if (citationsGenerated || type !== 'cite' || (!metadataCSL && !metadataBibTeX)) {
      return;
    }

    // Cancel any previous in-flight request
    citationAbortRef.current?.abort();
    const controller = new AbortController();
    citationAbortRef.current = controller;

    try {
      setIsLoadingCitations(true);
      const fetchedCitations = await getCitations(metadataCSL as string);

      if (controller.signal.aborted) return;

      // Update the BibTeX citation with the proper content
      const bibtexIndex = fetchedCitations.findIndex(
        citation => citation.key === CITATION_TEMPLATE.BIBTEX
      );
      if (bibtexIndex !== -1 && metadataBibTeX) {
        fetchedCitations[bibtexIndex].citation = metadataBibTeX as string;
      }

      // Filter out citations with empty content
      const validCitations = fetchedCitations.filter(
        citation => citation.citation && citation.citation.trim() !== ''
      );

      setCitations(validCitations);
      setCitationsGenerated(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('[InteractiveDropdown] Error generating citations:', error);
      toastError(t('pages.articleDetails.actions.citationError'));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingCitations(false);
      }
    }
  }, [citationsGenerated, type, metadataCSL, metadataBibTeX, t]);

  // Close dropdown on touch outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleTouchOutside = (event: TouchEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('touchstart', handleTouchOutside);
    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [showDropdown]);

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

  const downloadMetadata = useCallback(
    async (metadata: { type: METADATA_TYPE; label: string }): Promise<void> => {
      if (!articleId || !rvcode || isDownloadingMetadata) return;

      // Cancel any previous in-flight request
      metadataAbortRef.current?.abort();
      const controller = new AbortController();
      metadataAbortRef.current = controller;

      try {
        setIsDownloadingMetadata(true);
        const metadataContent = await fetchArticleMetadata({
          rvcode,
          paperid: articleId,
          type: metadata.type,
        });

        if (controller.signal.aborted) return;

        if (!metadataContent) {
          toastError(t('pages.articleDetails.metadata.downloadError'));
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

        toastSuccess(t('pages.articleDetails.metadata.downloadSuccess', { format: metadata.label }));
        setShowDropdown(false);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error downloading metadata:', error);
        toastError(t('pages.articleDetails.metadata.downloadError'));
      } finally {
        if (!controller.signal.aborted) {
          setIsDownloadingMetadata(false);
        }
      }
    },
    [articleId, rvcode, isDownloadingMetadata, t]
  );

  const renderCiteDropdown = () => {
    if (isLoadingCitations) {
      return (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keyboard nav handled when items load
        <div
          className="articleDetailsSidebar-links-link-modal-content-links"
          role="menu"
          onKeyDown={handleMenuKeyDown}
        >
          <div className="articleDetailsSidebar-links-link-modal-content-links-link">
            {t('common.loading')}...
          </div>
        </div>
      );
    }

    return (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keyboard navigation delegated from trigger
      <div
        className="articleDetailsSidebar-links-link-modal-content-links"
        role="menu"
        onKeyDown={handleMenuKeyDown}
      >
        {citations.map((citation, index) => (
          <button
            key={index}
            type="button"
            role="menuitem"
            className="articleDetailsSidebar-links-link-modal-content-links-link"
            onClick={(): void => copyCitation(citation)}
            onTouchEnd={(): void => copyCitation(citation)}
          >
            {citation.key}
          </button>
        ))}
      </div>
    );
  };

  const renderMetadataDropdown = () => (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- keyboard navigation delegated from trigger
    <div
      className="articleDetailsSidebar-links-link-modal-content-links"
      role="menu"
      onKeyDown={handleMenuKeyDown}
    >
      {metadataTypes.map((metadata, index) => (
        <button
          key={index}
          type="button"
          role="menuitem"
          className="articleDetailsSidebar-links-link-modal-content-links-link"
          onClick={(): void => {
            void downloadMetadata(metadata);
          }}
          onTouchEnd={(): void => {
            void downloadMetadata(metadata);
          }}
        >
          {metadata.label}
        </button>
      ))}
    </div>
  );

  const renderShareDropdown = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
      <div className="articleDetailsSidebar-links-link-modal-content-links" role="menu">
        <BlueskyShareButton
          url={currentUrl}
          className="articleDetailsSidebar-links-link-modal-content-links-link"
        >
          <BlueskyIcon
            size={14}
            className="articleDetailsSidebar-links-link-modal-content-sharing-icon"
            ariaLabel="Share on Bluesky"
          />
          <span>{t('pages.articleDetails.actions.share.bluesky')}</span>
        </BlueskyShareButton>
        <FacebookShareButton
          url={currentUrl}
          className="articleDetailsSidebar-links-link-modal-content-links-link"
        >
          <FacebookIcon
            size={14}
            className="articleDetailsSidebar-links-link-modal-content-sharing-icon"
            ariaLabel="Share on Facebook"
          />
          <span>{t('pages.articleDetails.actions.share.facebook')}</span>
        </FacebookShareButton>
        <LinkedinShareButton
          url={currentUrl}
          className="articleDetailsSidebar-links-link-modal-content-links-link"
        >
          <LinkedinIcon
            size={14}
            className="articleDetailsSidebar-links-link-modal-content-sharing-icon"
            ariaLabel="Share on LinkedIn"
          />
          <span>{t('pages.articleDetails.actions.share.linkedin')}</span>
        </LinkedinShareButton>
        <EmailShareButton
          url={currentUrl}
          className="articleDetailsSidebar-links-link-modal-content-links-link"
        >
          <MailIcon
            size={14}
            className="articleDetailsSidebar-links-link-modal-content-sharing-icon"
            ariaLabel="Share via email"
          />
          <span>{t('pages.articleDetails.actions.share.email')}</span>
        </EmailShareButton>
        <WhatsappShareButton
          url={currentUrl}
          className="articleDetailsSidebar-links-link-modal-content-links-link"
        >
          <WhatsappIcon
            size={14}
            className="articleDetailsSidebar-links-link-modal-content-sharing-icon"
            ariaLabel="Share on WhatsApp"
          />
          <span>{t('pages.articleDetails.actions.share.whatsapp')}</span>
        </WhatsappShareButton>
        <TwitterShareButton
          url={currentUrl}
          className="articleDetailsSidebar-links-link-modal-content-links-link"
        >
          <TwitterIcon
            size={14}
            className="articleDetailsSidebar-links-link-modal-content-sharing-icon"
            ariaLabel="Share on X (Twitter)"
          />
          <span>{t('pages.articleDetails.actions.share.twitter')}</span>
        </TwitterShareButton>
      </div>
    );
  };

  const getIcon = () => {
    const iconProps = {
      size: 14,
      className: 'articleDetailsSidebar-links-link-icon',
      ariaLabel: `${type} icon`,
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
  if (type === 'cite' && !metadataCSL && !metadataBibTeX) return null;
  if (type === 'metadata' && metadataTypes.length === 0) return null;

  const toggleDropdown = (): void => {
    const newState = !showDropdown;
    setShowDropdown(newState);

    // Generate citations when opening the dropdown for the first time
    if (newState && type === 'cite') {
      void generateCitationsOnDemand();
    }
  };

  const handleMouseEnter = (): void => {
    setShowDropdown(true);

    // Generate citations on hover for better UX
    if (type === 'cite') {
      void generateCitationsOnDemand();
    }
  };

  const getMenuItems = (): HTMLElement[] => {
    if (!dropdownRef.current) return [];
    return Array.from(dropdownRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  };

  const focusMenuItemByIndex = (index: number): void => {
    const items = getMenuItems();
    if (items.length === 0) return;
    items[(index + items.length) % items.length]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      if (type === 'cite') void generateCitationsOnDemand();
      requestAnimationFrame(() => focusMenuItemByIndex(0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowDropdown(true);
      if (type === 'cite') void generateCitationsOnDemand();
      requestAnimationFrame(() => focusMenuItemByIndex(-1));
      return;
    }
    handleKeyboardClick(e, toggleDropdown);
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const items = getMenuItems();
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusMenuItemByIndex(currentIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusMenuItemByIndex(currentIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusMenuItemByIndex(0);
        break;
      case 'End':
        e.preventDefault();
        focusMenuItemByIndex(items.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setShowDropdown(false);
        break;
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Mouse events are progressive enhancement; keyboard handled by button
    <div
      ref={dropdownRef}
      className="articleDetailsSidebar-links-link articleDetailsSidebar-links-link-modal"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={(): void => setShowDropdown(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className="articleDetailsSidebar-links-link-button"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
      >
        {getIcon()}
        <span className="articleDetailsSidebar-links-link-text">{getLabel()}</span>
      </button>
      <div
        className={`articleDetailsSidebar-links-link-modal-content ${showDropdown && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}
        role="presentation"
      >
        {getDropdownContent()}
      </div>
    </div>
  );
}

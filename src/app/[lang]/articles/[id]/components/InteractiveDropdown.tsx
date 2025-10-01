'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { EmailShareButton, FacebookShareButton, LinkedinShareButton, TwitterShareButton } from 'react-share';

import { ICitation, METADATA_TYPE, copyToClipboardCitation, getMetadataTypes } from '@/utils/article';
import { PATHS } from '@/config/paths';

// Import des icônes
import quote from '/public/icons/quote-black.svg';
import share from '/public/icons/share.svg';
import mail from '/public/icons/mail.svg';
import facebook from '/public/icons/facebook.svg';
import twitter from '/public/icons/twitter.svg';
import linkedin from '/public/icons/linkedin.svg';

interface InteractiveDropdownProps {
  type: 'cite' | 'metadata' | 'share';
  citations?: ICitation[];
  articleId?: string;
  label?: string; // Optional pre-translated label
}

export default function InteractiveDropdown({ type, citations = [], articleId, label }: InteractiveDropdownProps) {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  const metadataTypes = getMetadataTypes();

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

  const navigateToMetadata = (metadata: { type: METADATA_TYPE }): void => {
    if (articleId) {
      router.push(`/${PATHS.articles}/${articleId}/metadata`);
      setShowDropdown(false);
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
          onClick={(): void => navigateToMetadata(metadata)}
          onTouchEnd={(): void => navigateToMetadata(metadata)}
        >{metadata.label}</div>
      ))}
    </div>
  );

  const renderShareDropdown = () => (
    <div className="articleDetailsSidebar-links-link-modal-content-sharing">
      <EmailShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
        <img className="articleDetailsSidebar-links-link-modal-content-sharing-icon" src={mail} alt="Mail icon" />
      </EmailShareButton>
      <FacebookShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
        <img className="articleDetailsSidebar-links-link-modal-content-sharing-icon" src={facebook} alt="Facebook icon" />
      </FacebookShareButton>
      <TwitterShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
        <img className="articleDetailsSidebar-links-link-modal-content-sharing-icon" src={twitter} alt="X icon" />
      </TwitterShareButton>
      <LinkedinShareButton url={typeof window !== 'undefined' ? window.location.href : ''}>
        <img className="articleDetailsSidebar-links-link-modal-content-sharing-icon" src={linkedin} alt="Linkedin icon" />
      </LinkedinShareButton>
    </div>
  );

  const getIcon = () => {
    switch (type) {
      case 'cite':
      case 'metadata':
        return quote;
      case 'share':
        return share;
      default:
        return quote;
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
      <img className="articleDetailsSidebar-links-link-icon" src={getIcon()} alt={`${type} icon`} />
      <div className="articleDetailsSidebar-links-link-text">{getLabel()}</div>
      <div className={`articleDetailsSidebar-links-link-modal-content ${showDropdown && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}>
        {getDropdownContent()}
      </div>
    </div>
  );
}
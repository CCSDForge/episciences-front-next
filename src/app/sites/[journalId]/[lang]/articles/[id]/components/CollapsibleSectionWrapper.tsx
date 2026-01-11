'use client';

import React, { useState, ReactNode } from 'react';
import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';

interface CollapsibleSectionWrapperProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  sectionKey: string;
}

/**
 * Client-side wrapper for collapsible sections
 * Provides progressive enhancement: content is visible in HTML, JavaScript adds interactivity
 */
export default function CollapsibleSectionWrapper({
  title,
  children,
  initialOpen = true,
  sectionKey,
}: CollapsibleSectionWrapperProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className="articleDetails-content-article-section">
      <div
        className={`articleDetails-content-article-section-title ${!isOpen && 'articleDetails-content-article-section-closed'}`}
        onClick={(): void => setIsOpen(!isOpen)}
      >
        <div className="articleDetails-content-article-section-title-text">{title}</div>
        {isOpen ? (
          <CaretUpBlackIcon
            size={16}
            className="articleDetails-content-article-section-title-caret"
            ariaLabel="Collapse section"
          />
        ) : (
          <CaretDownBlackIcon
            size={16}
            className="articleDetails-content-article-section-title-caret"
            ariaLabel="Expand section"
          />
        )}
      </div>
      <div
        className={`articleDetails-content-article-section-content ${isOpen && 'articleDetails-content-article-section-content-opened'}`}
      >
        {children}
      </div>
    </div>
  );
}
